#!/usr/bin/env node
/** Optional private-corpus verification. No book data is copied into librawl. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {caplinNoteModel} from './react-model.mjs';
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--reader-dir')throw Error('Use --reader-dir PATH');
const root=path.resolve(args[1]),scope={window:{}};vm.createContext(scope);
for(const name of ['performance.js','rawl-layout.js','period-sections.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',name),'utf8'),scope,{filename:name});
const {ScorePerformance:performance,RawlLayout:layout,PeriodSections:sections}=scope.window;
const raw=fs.readFileSync(path.join(root,'dist/data/rawl.json')),corpus=JSON.parse(raw);
let datasets=0,rows=0,sourceNotes=0,rectangles=0,ornaments=0,clipped=0;
for(const entries of Object.values(corpus))for(const data of entries){
 const before=JSON.stringify(data),notes=performance.realizeNotes(data),noteBefore=JSON.stringify(notes),range=layout.pitchRange(notes),stacking=layout.noteStacking(data,notes);
 const views=sections.plan(data)?.rows??[{start:0,end:data.beats,pad:0,span:data.beats}];
 sourceNotes+=notes.length;datasets++;
 for(const row of views){
  rows++;const axis=layout.staveGeometry(layout.pitchRange(notes,row,range)),model=caplinNoteModel({data,notes,row,axis,stacking});
  const expected=notes.filter(n=>Math.min(n.start+n.duration,row.end)-Math.max(n.start,row.start)>1e-6);
  assert.equal(model.notes.length,expected.length,data.label+': row population');
  for(const native of model.notes){
   rectangles++;const n=model.sourceById.get(native.id),attrs=model.getAttributes(native),tonic=(data.tonalityChanges??[]).reduce((t,c)=>c.beat<n.start+n.duration/2?c.tonic:t,data.tonic),degree=((n.pitch-tonic)%12+12)%12;
   assert.equal(attrs['data-pitch'],String(n.pitch));assert.equal(attrs['data-start'],String(n.start));assert.equal(attrs['data-end'],String(n.start+n.duration));assert.equal(attrs['data-tonic'],String(tonic));assert.equal(attrs['data-pitch-class'],String(degree));
   assert.equal(attrs.style.top,axis.pitchToY(n.pitch));assert.equal(attrs.style.zIndex,stacking.get(n)??10);
   assert.equal(native.span[0],n.start*(60/data.tempo));assert.equal(native.span[1],(n.start+n.duration)*(60/data.tempo));
   assert.equal(native.displaySpan[0],Math.max(n.start,row.start)*(60/data.tempo));assert.equal(native.displaySpan[1],Math.min(n.start+n.duration,row.end)*(60/data.tempo));
   if(n.ornament){ornaments++;assert.equal(attrs['data-ornament'],n.ornament);assert.equal(attrs['data-turn-index'],String(n.turnIndex));}
   if(n.start<row.start||n.start+n.duration>row.end)clipped++;
  }
 }
 assert.equal(JSON.stringify(data),before,data.label+': source changed');assert.equal(JSON.stringify(notes),noteBefore,data.label+': realized performance changed');
}
console.log(JSON.stringify({datasets,rows,sourceNotes,rectangles,ornaments,clipped,sourceSha256:createHash('sha256').update(raw).digest('hex')}));
