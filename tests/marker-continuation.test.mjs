import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {keyMarkers,measureHeaderLayout} from '../src/notation/geometry.mjs';
const fixtures=[273,303].map(id=>JSON.parse(fs.readFileSync(new URL('./fixtures/marker-continuation/'+id+'.json',import.meta.url),'utf8')));
const actual=markers=>markers.filter(marker=>marker.delta!==null).map(({beat,tonic,delta})=>({beat,tonic,delta}));
for(const fixture of fixtures)test(fixture.index+' source/performance and aligned rows render every actual key change exactly once',()=>{
 const expected=actual(keyMarkers(fixture.tonic,fixture.changes)).filter(marker=>marker.delta!==0),before=JSON.stringify(fixture);
 assert.deepEqual(fixture.sourceRows,fixture.performanceRows.map(({start,end})=>({start,end})));
 for(const rows of [fixture.performanceRows,fixture.alignedRows])for(const width of [160,320,640,1200]){
  const layouts=rows.map(row=>measureHeaderLayout({...fixture,row,width}));
  assert.deepEqual(actual(layouts.flatMap(layout=>layout.markers)),expected);
  for(let i=0;i<layouts.length;i++)for(const marker of layouts[i].markers.filter(m=>m.continued)){
   assert.equal(marker.previousTonic,null);assert.equal(marker.delta,null);assert.equal(marker.join,false);assert.equal(marker.beat,rows[i].start);assert.ok(marker.originBeat<rows[i].start);assert.equal(marker.number,Math.floor(rows[i].start/fixture.barBeats)+1);
  }
 }
 assert.equal(JSON.stringify(fixture),before);
});
test('a midmeasure modulation belongs to its actual onset; the next row carries only tonic context',()=>{
 const props={tonic:0,changes:[{beat:3.5,tonic:9}],barBeats:4,width:320},first=measureHeaderLayout({...props,row:{start:0,end:4}}),next=measureHeaderLayout({...props,row:{start:4,end:8}});
 assert.deepEqual(actual(first.markers),[{beat:3.5,tonic:9,delta:-3}]);const onset=first.markers.find(m=>m.beat===3.5);assert.equal(onset.onsetOverride,true);assert.equal(onset.pixelOffset,0);assert.equal(onset.labelOffset,0);
 assert.deepEqual(actual(next.markers),[]);assert.equal(next.markers.length,1);const context=next.markers[0];assert.equal(context.tonic,9);assert.equal(context.originBeat,3.5);assert.equal(context.number,2);assert.equal(context.labelOffset,18);assert.equal(next.measures[0].number,2);assert.equal(next.measures[0].color,'#666');assert.equal(next.measures[0].hasModulation,false);
});
test('an actual boundary change supersedes carried context and same-beat normalization retains the final actual tonic',()=>{
 const row={start:4,end:8},changes=[{beat:3.5,tonic:9},{beat:4,tonic:9},{beat:4,tonic:2}];
 const layout=measureHeaderLayout({row,width:320,changes});assert.deepEqual(actual(layout.markers),[{beat:4,tonic:2,delta:5}]);assert.equal(layout.markers.length,1);assert.equal(layout.markers[0].continued,false);assert.equal(layout.measures[0].color,'black');assert.equal(layout.measures[0].hasModulation,true);
});
test('only the currently active tonic can carry; later actual changes stay visible and zero joins stay silent',()=>{
 const changes=[{beat:3.25,tonic:7},{beat:3.5,tonic:9},{beat:4,tonic:9},{beat:6,tonic:2},{beat:7,tonic:2}],layout=measureHeaderLayout({row:{start:4,end:8},width:160,changes});
 assert.equal(layout.markers.filter(m=>m.continued).length,1);assert.equal(layout.markers[0].tonic,9);assert.equal(layout.markers[0].originBeat,3.5);assert.deepEqual(actual(layout.markers),[{beat:6,tonic:2,delta:5}]);assert.equal(layout.markers.find(m=>m.beat===6).onsetOverride,true);
 const initial=measureHeaderLayout({row:{start:0,end:4},width:320,changes:[{beat:0,tonic:0}]});assert.equal(initial.markers.length,1);assert.equal(initial.markers[0].initial,true);assert.equal(initial.markers[0].tonic,0);assert.equal(initial.markers[0].delta,null);
 assert.equal(measureHeaderLayout({row:{start:.1,end:4},width:320,changes:[],hideInitialTonic:true}).markers.length,0);
});
