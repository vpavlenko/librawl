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
test('partial-row carried context still uses the row opening',()=>{
 const result=measureHeaderLayout({row:{start:5.1,end:9},barBeats:4,width:390,measureMap:pickup,changes:[{beat:5,tonic:7}]});
 const context=result.markers.find(marker=>marker.continued);
 assert.equal(context.left,0);assert.equal(context.labelOffset,18);assert.equal(context.delta,null);assert.equal(context.previousTonic,null);assert.equal(context.originBeat,5);assert.equal(context.beat,5.1);
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

test('recording-time grid keeps irregular beats and measures at their annotated positions',()=>{
 const measureMap=[
  {start:0,duration:1.2,sourceNumber:1,beatPositions:[0.2,0.55,0.86]},
  {start:1.2,duration:0.8,sourceNumber:2,beatPositions:[1.42,1.7,1.84]},
  {start:2,duration:0.4,sourceNumber:3,beatPositions:[]},
 ];
 const grid=measureHeaderLayout({row:{start:0.4,end:2.4},measureMap,width:600,phraseStarts:[]});
 assert.deepEqual(grid.measures.map(m=>[m.beat,m.number]),[[1.2,2],[2,3]]);
 assert.deepEqual(grid.beats,[0.55,0.86,1.42,1.7,1.84]);
 for(const beatPositions of [[1.2],[2],[1.7,1.42],[1.42,1.42],[NaN]]){
  assert.throws(()=>validateMeasureMap([measureMap[0],{...measureMap[1],beatPositions}]),/Invalid measure map/);
 }
});


test('a section-start bar uses the phrase accent without changing the authored selection rules', () => {
 const props={row:{start:5,end:12},measureMap:pickup,width:700,phraseStarts:[9,12],selectedMeasure:5};
 const {measures}=measureHeaderLayout(props);
 assert.deepEqual(measures.map(({beat,number,isPhraseStart,color})=>[beat,number,isPhraseStart,color]),[
  [5,'2',true,'red'],[9,'3',true,'#666'],[12,null,true,'#666'],
 ]);
 const clipped=measureHeaderLayout({...props,row:{start:5.5,end:12}});
 assert.deepEqual(clipped.measures.map(({beat})=>beat),[9,12]);
 const regular=measureHeaderLayout({row:{start:4,end:12},width:800});
 assert.deepEqual(regular.measures.map(({beat,isPhraseStart})=>[beat,isPhraseStart]),[[4,true],[8,false]]);
});
