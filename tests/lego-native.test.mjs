import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {nativeColorStyles} from '../src/rawlnative/native-style.mjs';
import {voiceShapeStyles} from '../src/rawlnative/voice-shapes.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:"export {RawlNotation} from './src/notation/RawlNotation.jsx';export {createSectionPlaybackClock} from './src/rawlnative/index.ts';export {createElement,createRef} from 'react';export {createRoot} from 'react-dom/client';export {flushSync} from 'react-dom';",resolveDir:root,loader:'jsx'},bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'native-public-subpath-source',setup(b){b.onResolve({filter:/^librawl\/native$/},()=>({path:path.join(root,'src/rawlnative/index.ts')}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function setup(){
 const dom=new JSDOM('<!doctype html><body><div id="mount"></div></body>',{url:'http://localhost/',pretendToBeVisual:true}),w=dom.window,saved=Object.getOwnPropertyDescriptors(globalThis),keys=['window','document','navigator','HTMLElement','requestAnimationFrame','cancelAnimationFrame'];
 Object.assign(globalThis,{window:w,document:w.document,HTMLElement:w.HTMLElement,requestAnimationFrame:w.requestAnimationFrame.bind(w),cancelAnimationFrame:w.cancelAnimationFrame.bind(w)});Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
 const css=w.document.createElement('style');css.textContent=fs.readFileSync(path.join(root,'src/notation/style.css'),'utf8')+nativeColorStyles()+voiceShapeStyles();w.document.head.append(css);
 let width=800;w.HTMLElement.prototype.getBoundingClientRect=function(){return {width,height:200,left:0,right:width,top:0,bottom:200,x:0,y:0};};
 const host=w.document.querySelector('#mount'),view=api.createRoot(host),ref=api.createRef();
 return {w,host,ref,setWidth(next){width=next;},render(props){api.flushSync(()=>view.render(api.createElement(api.RawlNotation,{ref,...props})));},async close(){api.flushSync(()=>view.unmount());await new Promise(resolve=>setTimeout(resolve,25));dom.window.close();for(const key of keys){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];}}};
}
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.ok(fn(),'Native Lego adapter did not settle');};

test('Lego delegates note elements and geometry to the public native renderer instead of retaining a second rectangle implementation',()=>{
 const source=fs.readFileSync(path.join(root,'src/notation/RawlNotation.jsx'),'utf8');assert.match(source,/from 'librawl\/native'/);assert.match(source,/<NoteLayer /);assert.doesNotMatch(source,/function updateNote|noteElements|<button key=/);
});

test('Lego native adapter preserves authored geometry, melody layering, colors, source IDs and section-scoped upward playback doubling',async()=>{
 const env=setup(),{host,ref}=env,notes=[{id:'held',pitch:48,start:0,duration:8,voice:0,velocity:74},{id:'sax',pitch:65,start:1,duration:2,voice:1,velocity:80}],rows=[{start:0,end:4},{start:4,end:8}],before=JSON.stringify(notes),props={notes,beats:8,rows,changes:[{beat:0,tonic:0},{beat:4,tonic:5}],barBeats:4};
 try{
  env.render(props);const [left,right]=host.querySelectorAll('[data-note="held"]'),sax=host.querySelector('[data-note="sax"]');assert.equal(left.dataset.noteId,'held');assert.equal(left.style.left,'0%');assert.equal(left.style.width,'100%');assert.equal(right.style.left,'0%');assert.equal(right.style.width,'100%');assert.equal(sax.style.left,'25%');assert.equal(sax.style.width,'50%');assert.equal(sax.getAttribute('aria-label'),'F4');assert.equal(host.querySelector('[data-note][title], [data-note] [title], [data-note] svg title'),null);assert.equal(left.style.height,'5px');assert.equal(left.style.background,'white');assert.equal(right.style.background,'rgb(120, 120, 120)');assert.equal(sax.style.background,'rgb(149, 0, 179)');assert.ok(Number(sax.style.zIndex)>Number(left.style.zIndex));assert.equal(left.dataset.pitch,'48');assert.equal(left.dataset.voice,'0');assert.equal(sax.dataset.voice,'1');
  const bottom=parseFloat(left.style.top)+5;ref.current.setPosition(2);assert.equal(left.style.height,'10px');assert.equal(parseFloat(left.style.top)+10,bottom);assert.equal(right.style.height,'5px');assert.equal(sax.style.height,'10px');assert.ok(left.classList.contains('rawln-sounding'));assert.ok(!right.classList.contains('rawln-sounding'));
  ref.current.setPosition(4);assert.equal(left.style.height,'5px');assert.equal(right.style.height,'10px');assert.equal(sax.style.height,'5px');assert.ok(!left.classList.contains('rawln-sounding'));assert.ok(right.classList.contains('rawln-sounding'));ref.current.setPosition(null);assert.equal(right.style.height,'5px');assert.equal(host.querySelector('.rawln-sounding'),null);
  assert.equal(ref.current.element,host.firstElementChild);assert.equal(host.querySelector('.rawln-playhead'),null);assert.equal(JSON.stringify(notes),before);
 }finally{await env.close();}
});

test('Lego hover and mute behavior survive native rendering, source-preserving recolors and imperative playback positions',async()=>{
 const env=setup(),{host,ref,w}=env,notes=[{id:'piano',pitch:61,start:0,duration:4,voice:0},{id:'melody',pitch:72,start:0,duration:4,voice:1}],hover=[],click=[],seek=[],props={notes,beats:4,rows:[{start:0,end:4}],onNoteHover:note=>hover.push(note?.id??null),onNote:note=>click.push(note),onSeek:beat=>seek.push(beat)};
 try{
  env.render(props);const piano=()=>host.querySelector('[data-note="piano"]'),melody=()=>host.querySelector('[data-note="melody"]');const bottom=parseFloat(piano().style.top)+5;piano().dispatchEvent(new w.MouseEvent('mouseover',{bubbles:true,clientX:100}));await wait(()=>piano().style.height==='10px');assert.equal(parseFloat(piano().style.top)+10,bottom);piano().dispatchEvent(new w.MouseEvent('mousemove',{bubbles:true,clientX:110}));assert.deepEqual(hover,['piano']);piano().dispatchEvent(new w.MouseEvent('mouseout',{bubbles:true,relatedTarget:w.document.body}));await wait(()=>piano().style.height==='5px');assert.deepEqual(hover,['piano',null]);piano().click();assert.equal(click[0],notes[0]);assert.deepEqual(seek,[]);
  ref.current.setPosition(1);assert.equal(piano().style.height,'10px');env.render({...props,mutedVoices:[0]});assert.equal(piano().style.height,'0.5px');assert.equal(parseFloat(piano().style.top)+.5,bottom);assert.ok(piano().classList.contains('rawln-muted'));assert.ok(!piano().classList.contains('rawln-sounding'));assert.equal(melody().style.height,'10px');
  env.render({...props,tonic:2});assert.equal(piano().dataset.degree,'11');assert.equal(piano().style.height,'10px');assert.ok(piano().classList.contains('rawln-sounding'));assert.equal(melody().style.height,'10px');ref.current.setPosition(null);assert.equal(piano().style.height,'5px');
  env.render({...props,notes:[]});ref.current.setPosition(1);assert.equal(host.querySelector('[data-note]'),null);
 }finally{await env.close();}
});

test('Lego uses the shared moving-bend renderer and scales its ribbon with row width',async()=>{
 const env=setup(),{host,ref,w}=env,note={id:'bend',pitch:60,start:0,duration:2,voice:0,pitchBend:[{time:0,value:8192},{time:1,value:10240}]};
 try{
  env.render({notes:[note],beats:4,rows:[{start:0,end:4}]});const element=host.querySelector('[data-note="bend"]');await wait(()=>element.querySelector('svg')?.getAttribute('width')==='400');assert.equal(element.style.width,'50%');assert.ok(element.classList.contains('pitch-bend-note'));assert.equal(element.style.background,'');
  api.flushSync(()=>ref.current.setPosition(1));assert.equal(element.style.height,'10px');assert.equal(element.querySelector('svg').getAttribute('height'),'10');env.setWidth(1200);w.dispatchEvent(new w.Event('resize'));await wait(()=>element.querySelector('svg').getAttribute('width')==='600');assert.equal(element.style.width,'50%');
 }finally{await env.close();}
});

test('Hovering and seeking keep unrelated score rows and playback subscriptions stable', async () => {
 const env = setup();
 const {host, w} = env;
 const clock = api.createSectionPlaybackClock();
 let registers = 0;
 let unregisters = 0;
 let headers = 0;
 const playbackClock = {
  ...clock,
  register(...args) {
   registers++;
   const unregister = clock.register(...args);
   return () => { unregisters++; unregister(); };
  },
 };
 const notes = [
  {id: 'a', pitch: 60, start: 0, duration: 2, voice: 0, playbackSpan: [1, 2]},
  {id: 'b', pitch: 64, start: 4, duration: 2, voice: 0, playbackSpan: [3, 4]},
 ];
 try {
  env.render({notes, beats: 8, rows: [{start: 0, end: 4}, {start: 4, end: 8}], playbackClock,
   renderHeader() { headers++; return null; },
  });
  const [first, second] = host.querySelectorAll('[data-note]');
  const baseline = [registers, unregisters, headers];
  first.dispatchEvent(new w.MouseEvent('mouseover', {bubbles: true}));
  await wait(() => first.classList.contains('note-under-cursor'));
  clock.advance(1.5);
  clock.advance(3.5);
  assert.equal(first.classList.contains('rawln-sounding'), false);
  assert.equal(second.classList.contains('rawln-sounding'), true);
  first.dispatchEvent(new w.MouseEvent('mouseout', {bubbles: true, relatedTarget: second}));
  await wait(() => second.classList.contains('note-under-cursor'));
  assert.equal(first.classList.contains('note-under-cursor'), false);
  assert.deepEqual([registers, unregisters, headers], baseline);
 } finally {
  await env.close();
 }
});

test('standalone score recolors from a measure number with hover, commit, escape and per-instance source reset',async()=>{
 const env=setup(),{host,w}=env,notes=[{id:'C',pitch:60,start:0,duration:4,voice:0},{id:'F',pitch:65,start:4,duration:4,voice:0},{id:'G',pitch:67,start:8,duration:4,voice:0}],changes=[{beat:0,tonic:0,root:'C'},{beat:4,tonic:5,root:'F'},{beat:8,tonic:7,root:'G'}],commits=[],auditions=[],source=JSON.stringify({notes,changes}),props={notes,beats:12,changes,onChangesChange:next=>commits.push(next),onNote:note=>auditions.push(note)};
 const note=id=>host.querySelector('[data-note="'+id+'"]'),measure=beat=>host.querySelector('.rawln-measure-number[data-beat="'+beat+'"]');
 try{
  env.render(props);measure(4).click();await wait(()=>measure(4).getAttribute('aria-pressed')==='true');
  note('G').dispatchEvent(new w.MouseEvent('mouseover',{bubbles:true}));await wait(()=>note('F').dataset.degree==='10');assert.equal(note('C').dataset.degree,'0');assert.equal(note('G').dataset.degree,'0');
  note('G').dispatchEvent(new w.MouseEvent('mouseout',{bubbles:true,relatedTarget:w.document.body}));await wait(()=>note('F').dataset.degree==='0');
  note('G').click();await wait(()=>measure(4).getAttribute('aria-pressed')==='false');assert.equal(note('F').dataset.degree,'10');assert.deepEqual(commits[0].map(c=>[c.beat,c.tonic]),[[0,0],[4,7]]);assert.deepEqual(auditions,[]);
  measure(0).focus();measure(0).dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await wait(()=>measure(0).getAttribute('aria-pressed')==='true');
  measure(0).dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait(()=>measure(0).getAttribute('aria-pressed')==='false');
  assert.equal(w.document.activeElement,w.document.body);assert.equal(measure(0).tabIndex,0);note('C').click();assert.equal(auditions[0],notes[0]);
  env.render({...props,changes:[{beat:0,tonic:0,root:'C'}]});assert.equal(note('F').dataset.degree,'5');assert.equal(JSON.stringify({notes,changes}),source);
 }finally{await env.close();}
});

test('held notes paint sharp tonal changes at the sounding beat with one playback and click target',async()=>{
 const env=setup(),{host,ref}=env;
 const held={id:'held',pitch:60,start:1,duration:4,voice:0,playbackSpan:[10,14]};
 const bend={...held,id:'bend',voice:1,pitchBend:[{time:1,value:8192},{time:5-0.25,value:12288}]};
 const notes=[held,{...bend,playbackSpan:undefined}];
 const changes=[{beat:2,measureBeat:4,tonic:1,onsetOverride:true},{beat:4,tonic:3}];
 const clicks=[];
 try {
  env.render({notes,changes,beats:8,showTonalGuides:false,rows:[{start:0,end:8}],onNote:note=>clicks.push(note)});
  const element=host.querySelector('[data-note="held"]');
  assert.equal(element.style.backgroundImage,'linear-gradient(to right, white 0%, white 25%, #ffff00 25%, #ffff00 75%, #03b9d5 75%, #03b9d5 100%)');
  assert.equal(host.querySelectorAll('[data-note="held"]').length,1);
  element.click();
  assert.equal(clicks[0],held);
  ref.current.setPosition(13.5);
  assert.ok(element.classList.contains('rawln-sounding'));
  const gradient=host.querySelector('[data-note="bend"] linearGradient');
  for (const offset of ['0.25','0.75']) {
   const stops=[...gradient.querySelectorAll('stop')].filter(s=>s.getAttribute('offset')===offset);
   assert.equal(stops.length,2);
   assert.notEqual(stops[0].getAttribute('stop-color'),stops[1].getAttribute('stop-color'));
  }
 } finally {await env.close();}
});
