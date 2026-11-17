import test from 'node:test';
import assert from 'node:assert/strict';
import {caplinNoteModel} from './react-model.mjs';
const fixture=()=>({data:{label:'fixture',tempo:90,beats:8,tonic:0,tonalityChanges:[{beat:4,tonic:5}],voiceGroups:[{id:'rh',voices:[0,2]},{id:'lh',voices:[1]}]},notes:[{pitch:60,start:0,duration:8,voice:0},{pitch:65,start:4,duration:2,voice:1},{pitch:62,start:3.5,duration:.5,voice:2,ornament:'appoggiatura',turnIndex:0}],axis:{pitchToY:pitch=>20+(72-pitch)*3}});
test('source notes and beats remain immutable while the complete Rawl model uses seconds',()=>{
 const f=fixture(),before=JSON.stringify(f),model=caplinNoteModel(f);
 assert.equal(JSON.stringify(f),before);assert.equal(model.notes.length,3);
 assert.deepEqual(model.notes[0].span,[0,8*60/90]);assert.deepEqual(model.notes[1].span,[4*60/90,6*60/90]);
 assert.equal(model.notes[2].voiceIndex,2);assert.equal(model.notes[2].displayVoiceIndex,0);
 assert.equal(model.getAttributes(model.notes[2])['data-ornament'],'appoggiatura');assert.equal(model.getAttributes(model.notes[2])['data-turn-index'],'0');
 assert.equal(model.getAttributes(model.notes[1])['data-start'],'4');assert.equal(model.getAttributes(model.notes[1])['data-end'],'6');
 assert.equal(model.getAttributes(model.notes[0]).style.top,56);assert.equal(model.getAttributes(model.notes[0]).style.height,undefined);
 assert.equal(model.toX(4*60/90,800),400);
});
test('section clipping keeps original sounding spans and aligns pickup prefixes without copying notes',()=>{
 const f=fixture(),model=caplinNoteModel({...f,row:{start:4,end:8,pad:.5,span:4.5}}),note=model.notes[0],attrs=model.getAttributes(note);
 assert.deepEqual(note.span,[0,8*60/90]);assert.deepEqual(note.displaySpan,[4*60/90,8*60/90]);
 assert.equal(attrs['data-start'],'0');assert.equal(attrs['data-end'],'8');assert.equal(attrs.style.left,.5/4.5*100+'%');
 assert.equal(attrs.style.width,`max(1px, calc(${4/4.5*100}% - 1px))`);assert.equal(model.toX(4*60/90,900),100);
 assert.equal(model.notes.length,2);
});
test('midpoint tonic selection retains the preceding region on an exact modulation boundary',()=>{
 const f=fixture(),model=caplinNoteModel(f),held=model.getAttributes(model.notes[0]),following=model.getAttributes(model.notes[1]);
 assert.equal(held['data-tonic'],'0');assert.equal(held['data-pitch-class'],'0');assert.equal(held.style.backgroundColor,'white');
 assert.equal(following['data-tonic'],'5');assert.equal(following['data-pitch-class'],'0');
 const stacking=new Map([[f.notes[0],4501]]);assert.equal(caplinNoteModel({...f,stacking}).getAttributes(model.notes[0]).style.zIndex,4501);
});
