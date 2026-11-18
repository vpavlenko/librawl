import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const caplinArtifacts = new Map([
  ['soundfont-playback.js', ['dist/browser/soundfont-playback.js', 'soundfontArtifactSha256']],
  ['librawl-caplin-notes.js', ['dist/browser/caplin-notes.js', 'browserArtifactSha256']],
  ['librawl-tempo-keys.js', ['dist/browser/tempo-keys.js', 'tempoArtifactSha256']],
  ['librawl-native.css', ['dist/native.css', 'nativeStyleArtifactSha256']],
]);
const hash = (bytes, algorithm = 'sha256', encoding = 'hex') =>
  createHash(algorithm).update(bytes).digest(encoding);
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function prepareStartup(reader, operations) {
  // Run the reader's generator outside its checkout. Only librawl artifacts
  // and the generated startup output need to change in the real reader.
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'librawl-caplin-startup-'));
  try {
    const dist = path.join(reader, 'dist');
    for (const directory of ['scripts', 'content', 'dist/data']) {
      fs.mkdirSync(path.join(sandbox, directory), {recursive: true});
    }
    fs.copyFileSync(path.join(reader, 'scripts/prepare-startup.cjs'),
      path.join(sandbox, 'scripts/prepare-startup.cjs'));
    fs.symlinkSync(path.join(reader, 'content/startup-shell.html'),
      path.join(sandbox, 'content/startup-shell.html'));
    for (const [directory, omit] of [['dist', 'data'], ['dist/data', 'startup']]) {
      for (const name of fs.readdirSync(path.join(reader, directory))) {
        if (name === omit) continue;
        const source = path.join(reader, directory, name);
        const target = path.join(sandbox, directory, name);
        const next = operations.get(source);
        if (next) fs.writeFileSync(target, next);
        else if (name !== 'index.html' && name !== 'startup-manifest.json') fs.symlinkSync(source, target);
      }
    }
    for (const [file, bytes] of operations) {
      if (path.dirname(file) === dist && !fs.existsSync(file)) {
        fs.writeFileSync(path.join(sandbox, 'dist', path.basename(file)), bytes);
      }
    }
    execFileSync(process.execPath, [path.join(sandbox, 'scripts/prepare-startup.cjs')], {
      cwd: sandbox,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    for (const name of ['index.html', 'startup-manifest.json']) {
      operations.set(path.join(dist, name), fs.readFileSync(path.join(sandbox, 'dist', name)));
    }
    const previews = path.join(sandbox, 'dist/data/startup');
    for (const name of fs.readdirSync(previews)) {
      operations.set(path.join(dist, 'data/startup', name), fs.readFileSync(path.join(previews, name)));
    }
  } finally {
    fs.rmSync(sandbox, {recursive: true, force: true});
  }
}

function atomicWrite(file, bytes) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temporary = fs.mkdtempSync(path.join(path.dirname(file), '.librawl-sync-'));
  try {
    const staged = path.join(temporary, path.basename(file));
    fs.writeFileSync(staged, bytes);
    fs.renameSync(staged, file);
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

function sameBytes(file, bytes) {
  return fs.existsSync(file) && fs.readFileSync(file).equals(bytes);
}

export function syncStaticConsumers({repos, libraryRoot, archive, version, sha256, integrity, dryRun = false}) {
  const root = path.join(repos, 'caplin');
  const reader = path.join(root, 'reader');
  const lockPath = path.join(reader, 'source/librawl-package-lock.json');
  if (!fs.existsSync(lockPath)) {
    console.log('Static readers skipped (Caplin checkout absent)');
    return [];
  }

  const archiveBytes = fs.readFileSync(archive);
  const archiveSha256 = hash(archiveBytes);
  const archiveIntegrity = 'sha512-' + hash(archiveBytes, 'sha512', 'base64');
  if ((sha256 && sha256 !== archiveSha256) || (integrity && integrity !== archiveIntegrity)) {
    throw Error('Static librawl consumers received an archive different from the verified build');
  }
  const extract = name => execFileSync('tar', ['-xOf', archive, 'package/' + name], {maxBuffer: 8 * 1024 * 1024});
  const packed = JSON.parse(extract('package.json'));
  if (packed.name !== 'librawl' || packed.version !== version) {
    throw Error('Wrong librawl package for static readers');
  }

  const oldLock = readJSON(lockPath);
  const artifact = 'vendor/' + path.basename(archive);
  const nextLock = {...oldLock, version, commit: null, artifact, archiveSha256,
    archiveIntegrity, archiveBytes: archiveBytes.length, artifactCopies: []};
  if (oldLock.archiveSha256 !== archiveSha256 || !oldLock.sourceBaseCommit) {
    try {
      nextLock.sourceBaseCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: libraryRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      delete nextLock.sourceBaseCommit;
    }
  }

  const operations = new Map();
  const mirrorSource = 'packages/music/soundfont-playback.js';
  const mirrorName = 'reader/dist/soundfont-playback.js';
  const sharedManifest = path.join(root, 'packages/shared-modules.json');
  const shared = readJSON(sharedManifest);
  const mirror = shared.modules.find(item => item.source === mirrorSource && item.caplinMirror === mirrorName);
  if (!mirror) throw Error('Caplin SoundFont compatibility mirror is absent');

  for (const [destination, [packageEntry, fingerprint]] of caplinArtifacts) {
    const bytes = extract(packageEntry);
    const target = 'dist/' + destination;
    nextLock.artifactCopies.push({destination: target, packageEntry});
    nextLock[fingerprint] = hash(bytes);
    operations.set(path.join(reader, target), bytes);
  }

  const soundfont = operations.get(path.join(root, mirrorName));
  const original = fs.readFileSync(path.join(root, mirrorSource));
  const compatibility = fs.readFileSync(path.join(root, mirrorName));
  const expectedHashes = new Set([mirror.sha256, oldLock.soundfontArtifactSha256, hash(soundfont)]);
  // Either side can already be at the new hash after an interrupted sync.
  if (!original.equals(compatibility) &&
      !(expectedHashes.has(hash(original)) && expectedHashes.has(hash(compatibility)))) {
    throw Error('Caplin SoundFont compatibility mirror drifted; inspect it before syncing librawl');
  }
  operations.set(path.join(root, mirrorSource), soundfont);
  mirror.sha256 = hash(soundfont);
  operations.set(sharedManifest, json(shared));
  operations.set(path.join(reader, artifact), archiveBytes);

  const mortensen = path.join(root, 'books/mortensen/reader');
  const mortensenPreview = path.join(root, 'deployments/mortensen/dist');
  if (fs.existsSync(path.join(mortensen, 'index.html'))) {
    const keys = extract('dist/browser/playback-keys.js');
    if (fs.existsSync(path.join(mortensenPreview, 'index.html'))) {
      operations.set(path.join(mortensenPreview, 'librawl-playback-keys.js'), keys);
      for (const filename of ['soundfont-playback.js', 'librawl-caplin-notes.js', 'librawl-native.css']) {
        operations.set(path.join(mortensenPreview, filename), operations.get(path.join(reader, 'dist', filename)));
      }
    }
  }

  const needStartup = [...caplinArtifacts].some(([name, [, fingerprint]]) => {
    const target = path.join(reader, 'dist', name);
    return oldLock[fingerprint] !== nextLock[fingerprint] || !sameBytes(target, operations.get(target));
  });
  if (needStartup && !dryRun) prepareStartup(reader, operations);
  operations.set(lockPath, json(nextLock));

  const updated = [];
  for (const [file, bytes] of operations) {
    if (sameBytes(file, bytes)) continue;
    updated.push(path.relative(root, file));
    if (!dryRun) atomicWrite(file, bytes);
  }
  const readers = fs.existsSync(mortensen) ? 'Caplin and Mortensen' : 'Caplin';
  console.log(`Static librawl consumers (${readers}): ${dryRun ? 'would update' : 'updated'} ${updated.length} file(s)${needStartup && dryRun ? ' and regenerate Caplin startup' : ''}`);
  return updated;
}
