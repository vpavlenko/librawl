import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {createShiftHoverAudition} from '../src/shift-hover-audition.js';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:"export {RawlNotation} from './src/notation/RawlNotation.jsx';export {NoteLayer,ModulationOnsetEditingContext} from './src/rawlnative/index.ts';",resolveDir:root,loader:'jsx'},bundle:true,write:false,format:'cjs',platform:'browser',jsx:'transform',external:['react'],plugins:[{name:'native-source',setup(b){b.onResolve({filter:/^librawl\/native$/},()=>({path:path.join(root,'src/rawlnative/index.ts')}));}}]});
function load(code,React){const module={exports:{}};new Function('module','exports','require',code)(module,module.exports,name=>name==='react'?React:require(name));return module.exports;}
// Load React16's scheduler before JSDOM so its idle loop uses disposable timers.
createRequire(require.resolve('react-dom16/package.json'))('scheduler');
const runtimes=[{name:'React16',React:require('react16')},{name:'React19',React:require('react')}];
function setup(runtime){
 const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{url:'http://localhost/',pretendToBeVisual:true}),w=dom.window,saved=Object.getOwnPropertyDescriptors(globalThis),keys=['window','document','navigator','HTMLElement','requestAnimationFrame','cancelAnimationFrame'];
 Object.assign(globalThis,{window:w,document:w.document,HTMLElement:w.HTMLElement,requestAnimationFrame:w.requestAnimationFrame.bind(w),cancelAnimationFrame:w.cancelAnimationFrame.bind(w)});Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
 w.HTMLElement.prototype.getBoundingClientRect=()=>({width:800,height:200,left:0,right:800,top:0,bottom:200,x:0,y:0});
 const api=load(bundle.outputFiles[0].text,runtime.React),host=w.document.querySelector('#root');
 let render,unmount,flush;
 if(runtime.name==='React16'){
  const f=require.resolve('react-dom16/cjs/react-dom.production.min.js'),local=createRequire(f),module={exports:{}};
  new Function('module','exports','require',fs.readFileSync(f,'utf8'))(module,module.exports,name=>name==='react'?runtime.React:local(name));
  const renderer=module.exports;render=node=>renderer.render(node,host);unmount=()=>renderer.unmountComponentAtNode(host);flush=fn=>renderer.flushSync(fn);
 }else{const renderer=require('react-dom/client').createRoot(host);flush=require('react-dom').flushSync;render=node=>flush(()=>renderer.render(node));unmount=()=>flush(()=>renderer.unmount());}
 return {w,host,api,render:(component,props)=>render(runtime.React.createElement(component,props)),node:runtime.React.createElement,flush,event(el,type,shiftKey=false){flush(()=>el.dispatchEvent(new w.MouseEvent(type,{bubbles:true,shiftKey,relatedTarget:type==='mouseout'?w.document.body:null})));},async close(){unmount();await new Promise(resolve=>setTimeout(resolve,20));w.close();for(const k of keys){if(saved[k])Object.defineProperty(globalThis,k,saved[k]);else delete globalThis[k];}}};
}
test('shared Shift hover calls host audio once per visit and never on pointer movement or disabled hover',()=>{
 const note={id:'one',pitch:64},calls=[];let enabled=true;
 const gesture=createShiftHoverAudition({audition:(...args)=>calls.push(args),isEnabled:()=>enabled});
 assert.equal(gesture.enter(note,{type:'mouseenter',shiftKey:false}),false);assert.equal(calls.length,0);
 assert.equal(gesture.enter(note,{type:'mousemove',shiftKey:true}),false);assert.equal(gesture.enter(note,{type:'pointermove',shiftKey:true}),false);
 gesture.leave();const event={type:'pointerenter',shiftKey:true};assert.equal(gesture.enter(note,event,1.25),true);assert.equal(calls[0][0],note);assert.equal(calls[0][1],event);assert.equal(calls[0][2],1.25);
 assert.equal(gesture.enter(note,event),false);gesture.leave();enabled=false;assert.equal(gesture.enter(note,event),false);enabled=true;gesture.reset();assert.equal(gesture.enter(note,event),true);assert.equal(calls.length,2);
});
test('main, native and the Caplin browser bridge expose the same host-audio gesture API',()=>{
 const apis=[require('../dist/index.cjs'),require('../dist/native.cjs'),new Function(fs.readFileSync(path.join(root,'dist/browser/caplin-notes.js'),'utf8')+';return LibrawlCaplinNotes;')()];
 for(const api of apis){const calls=[],note={id:'public',pitch:72};assert.equal(typeof api.createShiftHoverAudition,'function');const gesture=api.createShiftHoverAudition({audition:n=>calls.push(n)});gesture.enter(note,{type:'mouseenter',shiftKey:true});gesture.enter(note,{type:'mousemove',shiftKey:true});assert.deepEqual(calls,[note]);}
});
for(const runtime of runtimes){
 test(runtime.name+' native layer shares Shift audition while preserving ordinary hover/click, muted and editing guards',async()=>{
  const env=setup(runtime),calls=[],hover=[],click=[],note={id:'native',note:{midiNumber:64},span:[0,1],voiceIndex:0,isDrum:false,isActive:true,color:'noteColor_4_colors',colorPitchClass:4},props={notes:[note],midiNumberToY:()=>40,noteHeight:2.5,secondsToX:t=>t*100,onNoteAudition:n=>calls.push(n),handleMouseEnter:n=>hover.push(n),handleNoteClick:n=>click.push(n)};
  try{
   env.render(env.api.NoteLayer,props);const element=()=>env.host.querySelector('[data-note-id]');env.event(element(),'mouseover');env.event(element(),'mousemove',true);assert.equal(calls.length,0);assert.ok(hover.length>=1);env.event(element(),'mouseout');env.event(element(),'mouseover',true);assert.equal(calls.length,1);assert.equal(calls[0],note);
   env.event(element(),'mousemove',true);env.event(element(),'mousemove',true);assert.equal(calls.length,1);env.event(element(),'mouseout');env.event(element(),'mouseover',true);assert.equal(calls.length,2);env.event(element(),'click');assert.equal(click[0],note);
   for(const extra of [{auditionEnabled:false},{enableManualRemeasuring:true},{notes:[{...note,isActive:false}]}]){env.event(element(),'mouseout');env.render(env.api.NoteLayer,{...props,...extra});env.event(element(),'mouseover',true);assert.equal(calls.length,2);}
   env.event(element(),'mouseout');env.render(env.api.ModulationOnsetEditingContext.Provider,{value:{active:true,isAllowed:()=>true},children:env.node(env.api.NoteLayer,props)});env.event(element(),'mouseover',true);assert.equal(calls.length,2);
  }finally{await env.close();}
 });
 test(runtime.name+' RawlNotation auditions exact original MIDI notes via original onNote, suppresses selected measures and muted voices',async()=>{
  const env=setup(runtime),calls=[],explicit=[],notes=[{id:'piano',pitch:60,start:0,duration:4,voice:0,velocity:73},{id:'melody',pitch:66,start:4,duration:4,voice:1,velocity:82}],before=JSON.stringify(notes),props={notes,beats:8,changes:[{beat:0,tonic:0},{beat:4,tonic:5}],onNote:n=>calls.push(n)};
  try{
   env.render(env.api.RawlNotation,props);const piano=()=>env.host.querySelector('[data-note="piano"]'),melody=()=>env.host.querySelector('[data-note="melody"]');env.event(piano(),'mouseover',true);assert.equal(calls.length,1);assert.equal(calls[0],notes[0]);env.event(piano(),'mousemove',true);assert.equal(calls.length,1);env.event(piano(),'mouseout');env.event(piano(),'mouseover',true);assert.equal(calls.length,2);
   env.event(piano(),'mouseout');env.render(env.api.RawlNotation,{...props,onNoteAudition:n=>explicit.push(n)});env.event(melody(),'mouseover',true);assert.equal(explicit[0],notes[1]);assert.equal(calls.length,2);
   env.event(melody(),'mouseout');env.render(env.api.RawlNotation,{...props,selectedMeasure:4,onMeasureSelect:()=>{}});env.event(piano(),'mouseover',true);assert.equal(calls.length,2);
   env.event(piano(),'mouseout');env.render(env.api.RawlNotation,{...props,mutedVoices:[0]});env.event(piano(),'mouseover',true);assert.equal(calls.length,2);
   env.event(piano(),'mouseout');env.render(env.api.RawlNotation,props);env.event(env.host.querySelector('.rawln-measure-number[data-beat="4"]'),'click');env.event(melody(),'mouseover',true);assert.equal(calls.length,2);env.event(melody(),'click');assert.equal(calls.length,2);assert.equal(JSON.stringify(notes),before);
  }finally{await env.close();}
 });
}
