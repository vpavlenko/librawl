import test from 'node:test';
import assert from 'node:assert/strict';
import {measureHeaderLayout,validateMeasureMap} from '../src/notation/geometry.mjs';
const pickup=[{start:0,duration:1,sourceNumber:'0'},{start:1,duration:4,sourceNumber:'1'},{start:5,duration:4,sourceNumber:'2'},{start:9,duration:3,sourceNumber:'3'}];
test('source pickup and final partial boundaries use true beat positions and source labels',()=>{
 const input={row:{start:0,end:12},barBeats:4,width:1200,measureMap:pickup,phraseStarts:[1,9],changes:[{beat:5,tonic:7}]},result=measureHeaderLayout(input);
 assert.deepEqual(result.measures.map(m=>[m.beat,m.number]),[[0,'0'],[1,'1'],[5,'2'],[9,'3']]);
 result.measures.forEach(m=>assert.ok(Math.abs(m.left-m.beat/12*100)<1e-10));
 assert.deepEqual(result.beats,[2,3,4,6,7,8,10,11]);
 const marker=result.markers.find(m=>m.beat===5);assert.equal(marker.number,'2');assert.equal(marker.onsetOverride,false);assert.equal(marker.labelOffset,30);
 assert.equal(result.measures.find(m=>m.beat===5).color,'black');
 assert.equal(result.measures.find(m=>m.beat===1).isPhraseStart,true);
 assert.deepEqual(input.measureMap,pickup);
});
test('carried flags and partial-row cuts retain Rawl flag geometry',()=>{
 const result=measureHeaderLayout({row:{start:5.1,end:9},barBeats:4,width:390,measureMap:pickup,changes:[{beat:5,tonic:7}]});
 assert.equal(result.markers[0].continued,true);assert.equal(result.markers[0].left,0);assert.equal(result.markers[0].labelOffset,30);
});
test('regular authored boundaries have identical header geometry to default grid',()=>{
 const map=Array.from({length:16},(_,i)=>({start:i*4,duration:4,sourceNumber:i+1}));
 for(const row of [{start:0,end:32},{start:8,end:36},{start:8.5,end:35.5}])for(const width of [0,200,1600]){
  const props={row,width,barBeats:4,changes:[{beat:8,tonic:5},{beat:18,tonic:7}]};
  assert.deepEqual(measureHeaderLayout({...props,measureMap:map}),measureHeaderLayout(props));
 }
});
test('gaps, overlaps, zero durations and missing labels are rejected',()=>{
 for(const map of [[],[{start:1,duration:4,sourceNumber:1}],[{start:0,duration:0,sourceNumber:1}],[{start:0,duration:4}],[pickup[0],{start:2,duration:4,sourceNumber:1}]])assert.throws(()=>validateMeasureMap(map),/Invalid measure map/);
});

test('authored cut/common meter changes retain exact boundaries and per-measure beat grouping',()=>{
 const map=[{start:0,duration:4,sourceNumber:1,beatBeats:2},{start:4,duration:4,sourceNumber:2,beatBeats:1},{start:8,duration:3,sourceNumber:3,beatBeats:1}];
 const grid=measureHeaderLayout({row:{start:0,end:11},barBeats:4,beatBeats:2,measureMap:map,width:1100,phraseStarts:[]});
 assert.deepEqual(grid.measures.map(m=>[m.beat,m.number]),[[0,1],[4,2],[8,3]]);assert.deepEqual(grid.beats,[2,5,6,7,9,10]);
 for(const beatBeats of [0,-1,NaN,Infinity])assert.throws(()=>validateMeasureMap([{start:0,duration:4,sourceNumber:1,beatBeats}]),/Invalid measure map/);
});
