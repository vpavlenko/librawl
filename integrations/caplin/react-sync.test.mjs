import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {syncCaplinNotes} from './react-sync.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const edits=JSON.parse(await fs.readFile(new URL('./react-reader-edits.json',import.meta.url),'utf8'));
async function fixture(){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'librawl-caplin-react-'));await fs.mkdir(path.join(dir,'dist'));await fs.mkdir(path.join(dir,'content'));
 // A bounded source fixture uses exactly the reviewed replacement regions.
 const source=edits.map(edit=>edit.before).join('\n// untouched separator\n');
 await fs.writeFile(path.join(dir,'dist/reader.js'),source);
 await fs.writeFile(path.join(dir,'content/startup-shell.html'),'<script src="other.js" defer></script><script src="reader.js?old" defer></script>');
 const config={version:'old',textVersion:'approved-text',pages:[1,2],scripts:['other.js?old','reader.js?old']};
 await fs.writeFile(path.join(dir,'dist/index.html'),'approved prefix<script>window.ReaderStartup='+JSON.stringify(config)+';</script>approved suffix');
 return {dir,source};
}
test('guarded bridge sync is exact, idempotent, ordered and preserves text state',async()=>{
 const {dir,source}=await fixture();try{
  await assert.rejects(syncCaplinNotes({readerDir:dir}),/reviewed baseline/);
  assert.equal(await fs.readFile(path.join(dir,'dist/reader.js'),'utf8'),source);
  const result=await syncCaplinNotes({readerDir:dir,expectedReaderSha:sha(source)});assert.equal(result.status,'updated');assert.equal(result.textVersionUnchanged,true);
  const bytes=await fs.readFile(path.join(dir,'dist/librawl-caplin-notes.js')),built=await fs.readFile(new URL('../../dist/browser/caplin-notes.js',import.meta.url));assert.ok(bytes.equals(built));
  const index=await fs.readFile(path.join(dir,'dist/index.html'),'utf8'),config=JSON.parse(index.match(/window.ReaderStartup=(\{[^\n]*\});/)[1]);
  assert.deepEqual(config.pages,[1,2]);assert.equal(config.textVersion,'approved-text');assert.equal(config.scripts[0],'other.js?old');assert.ok(config.scripts[1].startsWith('librawl-caplin-notes.js?'));assert.ok(config.scripts[2].startsWith('reader.js?'));assert.ok(index.startsWith('approved prefix'));assert.ok(index.endsWith('approved suffix'));
  assert.equal((await syncCaplinNotes({readerDir:dir})).status,'unchanged');assert.equal((await syncCaplinNotes({readerDir:dir,check:true})).status,'verified');
  await fs.appendFile(path.join(dir,'dist/librawl-caplin-notes.js'),'drift');await assert.rejects(syncCaplinNotes({readerDir:dir,check:true}),/not synchronized/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
