import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {PlaybackMeasureBorders,RawlNotation} from 'librawl';
import {createSectionPlaybackClock} from 'librawl/native';

function mount(t){
 const {window}=new JSDOM('<div id="root"></div>');
 globalThis.window=window;
 globalThis.document=window.document;
 const host=document.getElementById('root'),root=createRoot(host);
 t.after(async()=>{
  flushSync(()=>root.unmount());
  await new Promise(resolve=>setTimeout(resolve,20));
  window.close();
  delete globalThis.document;
  delete globalThis.window;
 });
 return {
  host,
  render:(Component,props)=>flushSync(()=>root.render(React.createElement(Component,props))),
  active:()=>[...host.querySelectorAll('.rawln-playback-measure:not([hidden])')],
 };
}

test('the displayed current measure follows the beat clock across splits, rests and seeks',t=>{
 const {host,render,active}=mount(t),clock=createSectionPlaybackClock();
 render(RawlNotation,{notes:[],beats:12,rows:[{start:0,end:6},{start:6,end:12}],phraseStarts:[12],playbackClock:clock});
 const bar=beat=>host.querySelector(`.rawln-bar[data-beat="${beat}"]`);
 assert.equal(bar(0).style.left,'0px');
 assert.equal(bar(0).dataset.phraseBoundary,'true');
 assert.match(bar(4).style.left,/^calc\(66\.666[^%]*% - 1px\)$/);
 assert.equal(bar(12).dataset.terminal,'true');
 assert.equal(bar(12).style.left,'calc(100% - 1px)');
 assert.equal(active().length,0);
 const current=(measure,row,width,beginsRow)=>{
  const [border]=active();
  assert.equal(active().length,1);
  assert.equal(border.dataset.measure,String(measure));
  assert.equal(border.closest('.rawln-row').dataset.start,String(row));
  const widthPattern=beginsRow?/^([\d.]+)%$/:/^calc\(([\d.]+)% \+ 1px\)$/;
  const widthParts=widthPattern.exec(border.style.width);
  if(beginsRow)assert.equal(border.style.left,'0px');
  else assert.match(border.style.left,/^calc\([\d.]+% - 1px\)$/);
  assert(widthParts);
  assert(Math.abs(Number(widthParts[1])-width)<1e-3);
  assert.equal(border.style.borderTopWidth,'1px');
  assert.equal(border.style.borderBottomWidth,'1px');
  assert.equal(border.style.borderTopColor,'rgb(68, 68, 68)');
  assert.equal(border.style.pointerEvents,'none');
 };
 clock.advance(0);
 current(1,0,4/6*100,true);
 clock.advance(4);
 current(2,0,2/6*100,false);
 clock.advance(6);
 current(2,6,2/6*100,true);
 clock.advance(8);
 current(3,6,4/6*100,false);
 clock.advance(12);
 assert.equal(active().length,0);
 clock.advance(2);
 current(1,0,4/6*100,true);
 clock.reset();
 assert.equal(active().length,0);
});

test('authored playback intervals follow recording time and repeated overlay passes',t=>{
 const {render,active}=mount(t),clock=createSectionPlaybackClock();
 const measureMap=[
  {start:0,duration:2,sourceNumber:'pickup',playbackSpans:[[10,13],[12,13.5],[50,52]]},
  {start:2,duration:3,sourceNumber:1,playbackSpans:[[14,20],[52,57]]},
  {start:5,duration:3,sourceNumber:2,playbackSpans:[]},
 ];
 const playing=()=>active().map(el=>[el.dataset.measure,el.closest('.rawln-row').dataset.start]);
 clock.advance(12.5);
 render(RawlNotation,{
  notes:[],beats:8,rows:[{start:0,end:3},{start:3,end:8}],playbackClock:clock,measureMap,
 });
 assert.deepEqual(playing(),[['pickup','0']]);
 clock.advance(13);
 assert.deepEqual(playing(),[['pickup','0']]);
 clock.advance(13.5);
 assert.deepEqual(playing(),[]);
 clock.advance(14);
 assert.deepEqual(playing(),[['1','0']]);
 clock.advance(16);
 assert.deepEqual(playing(),[['1','3']]);
 clock.advance(50);
 assert.deepEqual(playing(),[['pickup','0']]);
 clock.advance(57);
 assert.deepEqual(playing(),[]);
 clock.advance(6);
 assert.deepEqual(playing(),[]);
});

test('controlled position and Rawl’s independent edge flags share the visual primitive',t=>{
 const {render,active}=mount(t);
 const props={notes:[],beats:8};
 render(RawlNotation,{...props,position:4});
 assert.equal(active()[0].dataset.measure,'2');
 render(RawlNotation,{...props,position:null});
 assert.equal(active().length,0);
 render(PlaybackMeasureBorders,{left:23,width:100,top:false});
 const border=active()[0];
 assert.equal(border.style.left,'23px');
 assert.equal(border.style.width,'100px');
 assert.equal(border.style.borderTopWidth,'');
 assert.equal(border.style.borderBottomWidth,'1px');
});
