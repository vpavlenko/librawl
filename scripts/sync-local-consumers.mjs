import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync,
  rmSync, statSync, writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values: options } = parseArgs({ options: {
  repos: { type: 'string', default: join(homedir(), 'repos') },
  watch: { type: 'boolean' },
  'dry-run': { type: 'boolean' },
  'skip-build': { type: 'boolean' },
  'when-enabled': { type: 'boolean' },
  'skip-static': { type: 'boolean' },
  consumer: { type: 'string', multiple: true },
} });
const libraryRoot = fileURLToPath(new URL('../', import.meta.url));
if (options['when-enabled'] && !existsSync(join(libraryRoot, '.git', 'librawl-sync-local'))) {
  process.exit(0);
}
const repos = resolve(options.repos);
const dryRun = options['dry-run'];
const consumers = ['12', 'rawl', 'lego/insights-roadmaps'];
const selected = options.consumer ?? consumers;
for (const name of selected) {
  if (!consumers.includes(name)) throw new Error(`Unknown npm consumer ${name}`);
}

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${result.status ?? result.signal}`);
  return result.stdout;
}

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const digest = (algorithm, bytes, encoding = 'hex') => createHash(algorithm).update(bytes).digest(encoding);
const updateJSON = (path, data) => updateFile(path, Buffer.from(JSON.stringify(data, null, 2) + '\n'));

function updateFile(path, bytes) {
  if (existsSync(path) && readFileSync(path).equals(bytes)) return;
  const pending = `${path}.${process.pid}.tmp`;
  writeFileSync(pending, bytes, { flag: 'wx' });
  try {
    renameSync(pending, path);
  } finally {
    rmSync(pending, { force: true });
  }
}

function syncInstalled(root, archive, locked) {
  const modules = join(root, 'node_modules');
  if (!existsSync(modules)) return false;
  const installed = join(modules, 'librawl');
  const hiddenLockPath = join(modules, '.package-lock.json');
  const hiddenLock = existsSync(hiddenLockPath) ? json(hiddenLockPath) : null;
  const current = hiddenLock?.packages?.['node_modules/librawl'];
  const stamp = join(installed, '.librawl-local-integrity');
  const installedPackage = join(installed, 'package.json');
  if (existsSync(installedPackage) && json(installedPackage).version === locked.version &&
      (current?.integrity === locked.integrity ||
        (existsSync(stamp) && readFileSync(stamp, 'utf8') === locked.integrity))) return false;

  if (existsSync(installed) && lstatSync(installed).isSymbolicLink()) {
    throw new Error(`${installed} is linked. Preserve the link or replace it with the packed dependency before syncing.`);
  }
  const work = mkdtempSync(join(modules, '.librawl-sync-'));
  const next = join(work, 'next');
  const previous = join(work, 'previous');
  try {
    mkdirSync(next);
    run('tar', ['-xzf', archive, '--strip-components=1', '-C', next], root);
    writeFileSync(join(next, '.librawl-local-integrity'), locked.integrity);
    if (existsSync(installed)) renameSync(installed, previous);
    try {
      renameSync(next, installed);
    } catch (error) {
      if (existsSync(previous)) renameSync(previous, installed);
      throw error;
    }
    if (hiddenLock?.packages) {
      hiddenLock.packages['node_modules/librawl'] = locked;
      updateJSON(hiddenLockPath, hiddenLock);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  return true;
}

function syncConsumer(name, artifact) {
  const root = join(repos, name);
  const packagePath = join(root, 'package.json');
  if (!existsSync(packagePath)) {
    console.log(`${name} skipped. Checkout unavailable.`);
    return;
  }
  const lockPath = join(root, 'package-lock.json');
  const pkg = json(packagePath);
  const lock = json(lockPath);
  const current = lock.packages?.['node_modules/librawl'];
  if (!pkg.dependencies?.librawl?.startsWith('file:vendor/') || !current || !lock.packages['']?.dependencies) {
    throw new Error(`${name} lacks the expected vendored librawl pin.`);
  }
  const archiveName = basename(artifact.archive);
  const resolved = `file:vendor/${archiveName}`;
  const changedPin = current.resolved !== resolved || current.integrity !== artifact.integrity;
  if (dryRun) {
    console.log(`${name} ${changedPin ? 'would pin' : 'already pins'} ${archiveName}`);
    return;
  }

  const locked = {
    ...current,
    version: artifact.version,
    resolved,
    integrity: artifact.integrity,
    license: artifact.pkg.license,
    peerDependencies: artifact.pkg.peerDependencies,
  };
  const archive = join(root, 'vendor', archiveName);
  mkdirSync(join(root, 'vendor'), { recursive: true });
  updateFile(archive, artifact.bytes);
  const installedChanged = syncInstalled(root, archive, locked);
  pkg.dependencies.librawl = resolved;
  lock.packages[''].dependencies.librawl = resolved;
  lock.packages['node_modules/librawl'] = locked;
  if (lock.dependencies?.librawl) {
    lock.dependencies.librawl = { ...lock.dependencies.librawl, version: resolved, integrity: artifact.integrity };
  }
  updateJSON(packagePath, pkg);
  updateJSON(lockPath, lock);

  if (name === 'rawl' && existsSync(join(root, 'node_modules', 'librawl'))) {
    run('node', ['scripts/rawl/sync-librawl.cjs', '--check'], root);
  }
  if (name === 'lego/insights-roadmaps' && existsSync(join(root, 'node_modules', 'librawl'))) {
    const provenance = join(root, 'dist', 'librawl-provenance.json');
    const built = join(libraryRoot, 'dist', 'provenance.json');
    if (changedPin || installedChanged || !existsSync(provenance) ||
        !readFileSync(provenance).equals(readFileSync(built))) {
      run('npm', ['run', 'build', '--', '--librawl-only'], root);
      run('node', ['--test', 'tests/library-consumer.test.mjs'], root);
    }
  }
  const reload = installedChanged && name !== 'lego/insights-roadmaps' ? ' Restart any running dev server.' : '';
  console.log(`${name} pinned ${archiveName}.${reload}`);
}

async function sync() {
  if (!options['skip-build'] && !dryRun) run(process.execPath, ['scripts/build.mjs'], libraryRoot);
  const work = mkdtempSync(join(tmpdir(), 'librawl-pack-'));
  try {
    const pkg = json(join(libraryRoot, 'package.json'));
    const [packed] = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--cache', join(work, 'npm-cache'), '--pack-destination', work], libraryRoot, true));
    const packedPath = join(work, basename(packed.filename));
    const bytes = readFileSync(packedPath);
    const sha256 = digest('sha256', bytes);
    const archive = join(work, `librawl-${pkg.version}-${sha256.slice(0, 12)}.tgz`);
    renameSync(packedPath, archive);
    const artifact = { pkg, archive, bytes, version: pkg.version, sha256,
      integrity: `sha512-${digest('sha512', bytes, 'base64')}` };
    const failures = [];
    for (const consumer of new Set(selected)) {
      try {
        syncConsumer(consumer, artifact);
      } catch (error) {
        failures.push(new Error(`${consumer}: ${error.message}`));
      }
    }
    if (!options['skip-static'] && !options.consumer) {
      try {
        const { syncStaticConsumers } = await import('./sync-static-consumers.mjs');
        await syncStaticConsumers({ repos, libraryRoot, ...artifact, dryRun });
      } catch (error) {
        failures.push(new Error(`Reader assets: ${error.message}`));
      }
    }
    if (failures.length) throw new AggregateError(failures, 'Some local librawl consumers could not be synced');
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (options.watch) {
  if (dryRun || options['skip-build']) throw new Error('--watch requires building before sync.');
  const tracked = ['src', 'types', 'integrations'];
  const filesIn = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
  function sourceStamp() {
    const pkg = json(join(libraryRoot, 'package.json'));
    const paths = [
      ...tracked.flatMap(directory => filesIn(join(libraryRoot, directory))),
      ...['package.json', 'scripts/build.mjs', 'scripts/sync-static-consumers.mjs',
        ...pkg.files.filter(name => name !== 'dist')].map(name => join(libraryRoot, name)),
    ];
    return paths.sort().map(path => {
      const state = statSync(path, { bigint: true, throwIfNoEntry: false });
      return `${path}\t${state?.mtimeNs}\t${state?.size}`;
    }).join('\n');
  }
  // Poll this small source tree so the workflow also works where native file
  // watches are unavailable. Generated output is outside the snapshot.
  let previous;
  let running = false;
  async function update() {
    if (running) return;
    try {
      const next = sourceStamp();
      if (next === previous) return;
      previous = next;
      running = true;
      await sync();
    } catch (error) {
      console.error(error);
    } finally {
      running = false;
    }
  }
  console.log(`Watching librawl source and syncing local consumers under ${repos}.`);
  await update();
  setInterval(() => void update(), 750);
} else {
  await sync();
}
