import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {basename} from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('the shared qanun exports resolve to the calibrated SoundFont', () => {
  const descriptor = require('librawl/soundfonts/qanun.json');
  const path = require.resolve('librawl/soundfonts/qanun.sf2');
  const bytes = readFileSync(path);
  assert.equal(basename(path), descriptor.file);
  assert.equal(bytes.length, descriptor.bytes);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'sfbk');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), descriptor.sha256);
  assert.ok(descriptor.file.includes(descriptor.sha256.slice(0, 12)));
});
