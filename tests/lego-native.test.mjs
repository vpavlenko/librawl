import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {nativeColorStyles} from '../src/rawlnative/native-style.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:"export {RawlNotation} from './src/notation/RawlNotation.jsx';export {createElement,createRef} from 'react';export {createRoot} from 'react-dom/client';export {flushSync} from 'react-dom';",resolveDir:root,loader:'jsx'},bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'native-public-subpath-source',setup(b){b.onResolve({filter:/^librawl\/native$/},()=>({path:path.join(root,'src/rawlnative/index.ts')}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function setup(){
 const dom=new JSDOM('<!doctype html><body><div id="mount"></div></body>',{url:'http://localhost/',pretendToBeVisual:true}),w=dom.window,saved=Object.getOwnPropertyDescriptors(globalThis),keys=['window','document','navigator','HTMLElement','requestAnimationFrame','cancelAnimationFrame'];
 Object.assign(globalThis,{window:w,document:w.document,HTMLElement:w.HTMLElement,requestAnimationFrame:w.requestAnimationFrame.bind(w),cancelAnimationFrame:w.cancelAnimationFrame.bind(w)});Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
 const css=w.document.createElement('style');css.textContent=fs.readFileSync(path.join(root,'src/notation/style.css'),'utf8')+nativeColorStyles()+fs.readFileSync(path.join(root,'src/rawlnative/voice-shapes.css'),'utf8');w.document.head.append(css);
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
  env.render(props);const [left,right]=host.querySelectorAll('[data-note="held"]'),sax=host.querySelector('[data-note="sax"]');assert.equal(left.dataset.noteId,'held');assert.equal(left.style.left,'0%');assert.equal(left.style.width,'100%');assert.equal(right.style.left,'0%');assert.equal(right.style.width,'100%');assert.equal(sax.style.left,'25%');assert.equal(sax.style.width,'50%');assert.equal(sax.getAttribute('aria-label'),'F4');assert.equal(left.style.height,'5px');assert.equal(left.style.background,'white');assert.equal(sax.style.background,'rgb(149, 0, 179)');assert.ok(Number(sax.style.zIndex)>Number(left.style.zIndex));assert.equal(left.dataset.pitch,'48');assert.equal(left.dataset.voice,'0');assert.equal(sax.dataset.voice,'1');
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

test('Lego adapter carries the original native moving-bend implementation and scales its ribbon with row width',async()=>{
 const env=setup(),{host,ref,w}=env,note={id:'bend',pitch:60,start:0,duration:2,voice:0,pitchBend:[{time:0,value:8192},{time:1,value:10240}]};
 try{
  env.render({notes:[note],beats:4,rows:[{start:0,end:4}]});const element=host.querySelector('[data-note="bend"]');await wait(()=>element.querySelector('svg')?.getAttribute('width')==='400');assert.equal(element.style.width,'50%');assert.ok(element.classList.contains('pitch-bend-note'));assert.equal(element.style.background,'');
  api.flushSync(()=>ref.current.setPosition(1));assert.equal(element.style.height,'10px');assert.equal(element.querySelector('svg').getAttribute('height'),'10');env.setWidth(1200);w.dispatchEvent(new w.Event('resize'));await wait(()=>element.querySelector('svg').getAttribute('width')==='600');assert.equal(element.style.width,'50%');
 }finally{await env.close();}
});
