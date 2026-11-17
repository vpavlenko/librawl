import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
test('legacy Webpack entries consistently select ESM so every host bridge shares the same native contexts',()=>{
 for(const name of ['components','geometry','palette','audio','native','native-audio'])assert.equal(fs.readFileSync(new URL('../'+name+'.js',import.meta.url),'utf8'),`export * from './dist/${name}.js';\n`);
 for(const name of ['index','components']){
  const esm=fs.readFileSync(new URL('../dist/'+name+'.js',import.meta.url),'utf8');
  assert.match(esm,/from "librawl\/native"/);assert.doesNotMatch(esm,/NotePlaybackContext =|createContext\(null\)/);
 }
});
test('installed ESM and CommonJS entrypoints expose the full native renderer and native transport without constructing browser objects',async()=>{
 const esm=await import('librawl/native'),cjs=require('librawl/native');
 for(const api of [esm,cjs])for(const key of ['NoteLayer','getNoteRectangles','useNotePlaybackClock','createSectionPlaybackClock','nativeColorStyles'])assert.equal(typeof api[key],'function');
 assert.equal(typeof (await import('librawl/native-audio')).createThreadedMIDIPlayerClass,'function');
 assert.equal(typeof require('librawl/native-audio').createThreadedMIDIPlayerClass,'function');
});
