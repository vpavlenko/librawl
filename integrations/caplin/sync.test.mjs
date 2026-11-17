import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {syncCaplin,originalCaplinSha256} from './sync.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'librawl-caplin-sync-')),canonicalRepo=path.join(directory,'canonical'),readerDir=path.join(directory,'reader'),canonical=path.join(canonicalRepo,'packages/music/soundfont-playback.js'),mirror=path.join(readerDir,'dist/soundfont-playback.js'),manifest=path.join(canonicalRepo,'packages/shared-modules.json'),artifact=path.join(directory,'artifact.js'),source=await fs.readFile(new URL('../../src/audio/soundfont-playback.js',import.meta.url)),version=JSON.parse(await fs.readFile(new URL('../../package.json',import.meta.url),'utf8')).version,original=await fs.readFile(new URL('../../tests/fixtures/soundfont-caplin-reference.js',import.meta.url));
 assert.equal(sha(original),originalCaplinSha256);await fs.mkdir(path.dirname(canonical),{recursive:true});await fs.mkdir(path.dirname(mirror),{recursive:true});await fs.writeFile(canonical,original);await fs.writeFile(mirror,original);await fs.writeFile(manifest,JSON.stringify({version:1,extra:'Preserved',modules:[{source:'packages/music/other.js',caplinMirror:'reader/dist/other.js',sha256:'1'.repeat(64)},{source:'packages/music/soundfont-playback.js',caplinMirror:'reader/dist/soundfont-playback.js',sha256:originalCaplinSha256}]},null,2)+'\n');await fs.writeFile(artifact,`/* librawl version: ${version}; audio source sha256: ${sha(source)} */\nglobalThis.SoundFontPlayback={};\n`);
 return {directory,canonicalRepo,readerDir,canonical,mirror,manifest,artifact,async snapshot(){return Promise.all([canonical,mirror,manifest].map(p=>fs.readFile(p)));},async cleanup(){await fs.rm(directory,{recursive:true,force:true});}};
}
test('sync updates one canonical module, its exact mirror and only the matching manifest SHA; check/idempotent modes preserve bytes',async()=>{
 const f=await fixture();try{const before=await f.snapshot(),result=await syncCaplin(f),after=await f.snapshot(),generated=await fs.readFile(f.artifact);assert.equal(result.status,'updated');assert.ok(after[0].equals(generated));assert.ok(after[1].equals(after[0]));assert.equal(after[2].toString(),before[2].toString().replace(originalCaplinSha256,sha(generated)));assert.equal((await syncCaplin({...f,check:true})).status,'verified');assert.equal((await syncCaplin(f)).status,'unchanged');assert.deepEqual(await f.snapshot(),after);}finally{await f.cleanup();}
});
test('canonical/mirror drift, stale manifest, unknown expected bytes and stale artifact provenance fail before any write',async()=>{
 for(const condition of ['mirror','manifest','expected','artifact']){const f=await fixture();try{
  if(condition==='mirror')await fs.appendFile(f.mirror,'changed');
  if(condition==='manifest')await fs.writeFile(f.manifest,(await fs.readFile(f.manifest,'utf8')).replace(originalCaplinSha256,'2'.repeat(64)));
  if(condition==='expected'){const modified=Buffer.concat([await fs.readFile(f.canonical),Buffer.from('\nchanged')]);await fs.writeFile(f.canonical,modified);await fs.writeFile(f.mirror,modified);await fs.writeFile(f.manifest,(await fs.readFile(f.manifest,'utf8')).replace(originalCaplinSha256,sha(modified)));}
  if(condition==='artifact')await fs.writeFile(f.artifact,(await fs.readFile(f.artifact,'utf8')).replace(/audio source sha256: [a-f0-9]{64}/,'audio source sha256: '+'0'.repeat(64)));
  const before=await f.snapshot();await assert.rejects(syncCaplin(f),/drifted|manifest SHA|expected SHA|digest is stale/);assert.deepEqual(await f.snapshot(),before,condition);
 }finally{await f.cleanup();}}
});
test('a new generated artifact requires an explicitly reviewed previous hash, and check never performs a pending upgrade',async()=>{
 const f=await fixture();try{await syncCaplin(f);const before=await f.snapshot(),previousSha=sha(before[0]);await fs.appendFile(f.artifact,'// newer generated build\n');await assert.rejects(syncCaplin({...f,check:true}),/does not match/);await assert.rejects(syncCaplin(f),/expected SHA/);assert.deepEqual(await f.snapshot(),before);assert.equal((await syncCaplin({...f,expectedSha:previousSha})).status,'updated');assert.equal((await syncCaplin({...f,check:true})).status,'verified');}finally{await f.cleanup();}
});
