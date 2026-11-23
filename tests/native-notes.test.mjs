import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {MODULATION_SNAP_CURSOR} from '../src/rawlnative/note-cursors.mjs';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const provenance=JSON.parse(fs.readFileSync(path.join(root,'docs/native-provenance.json')));
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
async function bundle(relative){
 const result=await build({entryPoints:[path.join(root,relative)],bundle:true,write:false,format:'cjs',platform:'node',target:'es2018',jsx:'transform',external:['react'],plugins:[{name:'reference-styled-global-only',setup(b){
  b.onResolve({filter:/^styled-components$/},()=>({path:'styled-components',namespace:'reference-global-style'}));
  b.onLoad({filter:/.*/,namespace:'reference-global-style'},()=>({contents:'export const createGlobalStyle=(parts,...values)=>Object.assign(()=>null,{css:parts.reduce((all,part,i)=>all+part+(values[i]??\"\"),\"\")});',loader:'js'}));
 }}]});return result.outputFiles[0].text;
}
const [nativeCode,referenceCode]=await Promise.all([bundle('src/rawlnative/index.ts'),bundle('tests/fixtures/native/entry.ts')]);
function load(code){
 const module={exports:{}};
 vm.runInNewContext('(function(module,exports,require){'+code+'\n})',{console,Map,Set,Number,Math},{filename:'native-notes-bundle.js'})(module,module.exports,require);
 return module.exports;
}
const note=(id='note',extras={})=>({id,span:[0,2],note:{midiNumber:60},voiceIndex:0,isDrum:false,isActive:true,color:'noteColor_0_colors',colorPitchClass:0,...extras});
const no=()=>{};
function rects(api,notes,options={}){
 return api.getNoteRectangles(notes,pitch=>300-pitch*3,2.5,options.click??no,options.enter??no,options.leave??no,seconds=>seconds*80,!!options.manual,options.hoveredColors??null,!!options.source,()=>28,options.hoveredVoiceIndex??null,options.endX,options.startX,options.attributes);
}
function wrap(api,nodes,options={}){
 return React.createElement(api.ModulationOnsetEditingContext.Provider,{value:{active:!!options.onsetEditing,isAllowed:n=>n.id==='allowed'}},
  React.createElement(api.StrumNotesContext.Provider,{value:new Set(options.strums??[])},
   React.createElement(api.VoiceZIndicesContext.Provider,{value:new Map(options.bands??[])},nodes)));
}
function staticMarkup(api,notes,options={}){
 return renderToStaticMarkup(wrap(api,React.createElement(React.Fragment,null,rects(api,notes,options)),options));
}
function cases(){
 const cases=[];
 for(const pitch of [36,60,63.5,84])for(const colorPitchClass of [0,1,3.5,6,'default'])for(const variant of [0,1,2,3]){
  const extras={note:{midiNumber:pitch},colorPitchClass,color:typeof colorPitchClass==='number'?`noteColor_${colorPitchClass}_colors`:'noteColor_default',displayVoiceIndex:2};
  if(variant===1)Object.assign(extras,{isActive:false});
  if(variant===2)Object.assign(extras,{noteUnderCursor:true});
  if(variant===3)Object.assign(extras,{isPlayingNow:true});
  cases.push({notes:[note('allowed',extras)],options:{source:true,onsetEditing:variant===2,bands:[[2,3000]]}});
 }
 for(const value of [6144,7168,8000,8192,9216,10240])for(const moving of [false,true])cases.push({notes:[note('bend',{pitchBend:moving?[{time:0,value:8192},{time:1,value},{time:1,value:10240}]:[{time:0,value}],colorPitchClass:5})],options:{startX:40,endX:120}});
 cases.push({notes:[note('zero',{span:[1,1]}),note('negative',{span:[2,1]}),note('tiny',{span:[1,1.000001]}),note('display',{span:[0,3],displaySpan:[-1,4],displayMidiNumber:72,sourceLocation:{row:3,col:5,command:'copy'}})],options:{startX:0,endX:160,source:true}});
 cases.push({notes:[note('strum',{span:[0,5]}),note('short',{span:[0,.1]}),note('same',{span:[0,.1],note:{midiNumber:72}})],options:{strums:['strum'],bands:[[0,4000]],hoveredColors:['noteColor_0_colors']}});
 for(const isActive of [true,false])for(const hoveredVoiceIndex of [null,0,1,[0,2]])cases.push({notes:[note('drum',{isDrum:true,note:{midiNumber:38},isActive}),note('allowed',{voiceIndex:2})],options:{hoveredVoiceIndex,onsetEditing:true,manual:true}});
 return cases;
}

test('native source fixtures retain every recorded upstream source byte and complete renderer body',()=>{
 for(const source of provenance.sources){const filename=path.join(root,'tests/fixtures/native',path.basename(source.path));assert.equal(hash(fs.readFileSync(filename)),source.sha256,source.path);}
 const model=fs.readFileSync(path.join(root,provenance.typeModel.excerpt),'utf8');
 assert.equal(hash(model),provenance.typeModel.excerptSha256);
 const sourceTypes=fs.readFileSync(path.join(root,'src/rawlnative/types.ts'),'utf8')
  .replace('export type TonalPitchStop = {\n  offset: number;\n  pitchClass: number;\n};\n\n','')
  .replace('  /** Rendering only. Ordered tonal pitch classes starting at fractions of the visible note width. */\n  tonalPitchStops?: readonly TonalPitchStop[];\n','');
 assert.ok(sourceTypes.includes(model));
 let extracted=fs.readFileSync(path.join(root,'src/rawlnative/getNoteRectangles.tsx'),'utf8').replace('from "./voiceHover"','from "./instrumentVoiceGroups"').replaceAll('from "./types"','from "./Rawl"').replace('import { ColoredNote, Note, PitchBendPoint } from "./Rawl";','import { ColoredNote, Note, PitchBendPoint } from "./parseMidi";').replace('from "./voiceOrderContext"','from "./voiceOrder"').replace('      title={undefined}\n','').replace('}${attributes?.className ? ` ${attributes.className}` : ""}`}','}`}');
 // The opt-in tonal stops leave the original rectangle and pitch-bend behavior intact.
 extracted=extracted
  .replace('import { applyTonalPitchStops } from "./tonalPitchStops";\n','')
  .replace('  tonalPitchStops?: ColoredNote["tonalPitchStops"];\n','')
  .replace('  tonalPitchStops,\n','')
  .replace('  const colorStops = tonalPitchStops?.length ? applyTonalPitchStops(stops, tonalPitchStops, basePitch, width) : stops;\n','')
  .replace('colorStops.map((stop, index) => (','stops.map((stop, index) => (')
  .replace('          tonalPitchStops={note.tonalPitchStops}\n','')
  .replace('import { MODULATION_SNAP_CURSOR } from "./note-cursors.mjs";\n','')
  .replace('onsetEditing.isAllowed(note) ? MODULATION_SNAP_CURSOR', 'onsetEditing.isAllowed(note) ? "crosshair"');
 assert.equal(extracted,fs.readFileSync(path.join(root,'tests/fixtures/native/getNoteRectangles.tsx'),'utf8'));
 for(const filename of ['playbackIndex.ts','notePlayback.ts','drumPlayback.ts','strumContext.ts'])assert.equal(fs.readFileSync(path.join(root,'src/rawlnative',filename),'utf8'),fs.readFileSync(path.join(root,'tests/fixtures/native',filename),'utf8'));
});
test('React 19 complete native rendering equals original Rawl across pitches, bends, voices, drums, strums and source metadata',()=>{
 const actual=load(nativeCode),original=load(referenceCode),all=cases();
 for(const [i,entry]of all.entries()){
  const expected=staticMarkup(original,entry.notes,entry.options).replaceAll('cursor:crosshair','cursor:'+MODULATION_SNAP_CURSOR.replaceAll('"','&quot;'));
  assert.equal(staticMarkup(actual,entry.notes,entry.options),expected,`case ${i}`);
 }
 const zero=staticMarkup(actual,[note('zero',{span:[0,0],displaySpan:[0,8]}),note('drumzero',{span:[1,1],isDrum:true})]);assert.equal(zero,'');
 assert.ok(all.length>=100);
});

test('optional native host class/attributes/style remain additive and source note identities stay immutable',()=>{
 const api=load(nativeCode),notes=[note('source-id',{voiceIndex:3,displayVoiceIndex:1,displaySpan:[-1,4],displayMidiNumber:72})],before=JSON.stringify(notes);
 const markup=staticMarkup(api,notes,{attributes:()=>({className:'rawl-note host-note','data-host':'one',style:{opacity:.8,width:'50%'}})});
 assert.match(markup,/voiceShape-1.*rawl-note host-note/);assert.match(markup,/data-note-id="source-id"/);assert.match(markup,/data-host="one"/);assert.match(markup,/width:50%/);assert.match(markup,/opacity:0.8/);assert.equal(JSON.stringify(notes),before);
});

test('native playback indexes equal the original trace for half-open boundaries, long held-note seeks, section copies and teardown',()=>{
 const api=load(nativeCode),original=load(referenceCode);
 function run(module){const clock=module.createSectionPlaybackClock(),trace=[],remove=[];for(let i=0;i<48;i++){const start=i%8*.25,end=start+(i%3?2:36000);remove.push(clock.register(start,end,on=>trace.push([i,on]),i%4?[0,4]:[4,8]));}for(const time of [-1,0,.25,1.75,3.999,4,5.5,7.999,8,18000,3,2,2,0])clock.advance(time);clock.reset();remove.forEach(fn=>fn());clock.advance(2);return trace;}
 assert.deepEqual(run(api),run(original));
 const clock=api.createSectionPlaybackClock(),trace=[];clock.register(1,12,on=>trace.push(['left',on]),[0,10]);clock.register(1,12,on=>trace.push(['right',on]),[10,20]);trace.length=0;clock.advance(9);clock.advance(10);clock.advance(12);assert.deepEqual(trace,[['left',true],['left',false],['right',true],['right',false]]);
 assert.equal(api.findPlaybackMeasure([0,2,4],2),2);assert.equal(api.findPlaybackMeasure([0,2,4],-1),null);
});

test('native pitch-bend samples, sounding pitch, color interpolation and quartertone windows match the source',()=>{
 const api=load(nativeCode),original=load(referenceCode);
 const css=api.nativeColorStyles().replaceAll(':where(:not([data-modulation-flag]))','');
 assert.doesNotMatch(css,/!important/);
 assert.match(css,/\[data-pitch-class="1"\]::after/);
 assert.match(css,/\[data-pitch-class="6"\]::after/);
 const classRules=css.replace(/\[data-pitch-class="\d+"\](?:::after)?, /g,'').replaceAll(':where(:not([data-pitch-class]))','');
 assert.equal(classRules,original.RawlColorStyles.css.replaceAll(' !important',''));
 for(let pitch=-24;pitch<=84;pitch+=.125){assert.equal(api.notePitchDotClass(pitch),original.notePitchDotClass(pitch));assert.equal(api.getQuarterToneMarkerPosition(pitch),original.getQuarterToneMarkerPosition(pitch));assert.equal(api.interpolatedPitchColor(pitch),original.interpolatedPitchColor(pitch));}
 const n=note('bent',{pitchBend:[{time:-1,value:6144},{time:0,value:8192},{time:1,value:10240},{time:1,value:6144}]});for(const time of [-1,0,.5,1,1.5,2,3])assert.equal(api.getNotePitchAtTime(n,time),original.getNotePitchAtTime(n,time));assert.deepEqual(JSON.parse(JSON.stringify(api.getPitchBendSamples(n.pitchBend,n.span))),JSON.parse(JSON.stringify(original.getPitchBendSamples(n.pitchBend,n.span))));
});

test('React19 native layer preserves real events, upward playback doubling, context identity and section-scoped sustained copies',async()=>{
 const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{url:'http://localhost/',pretendToBeVisual:true}),w=dom.window;
 const saved=Object.getOwnPropertyDescriptors(globalThis),keys=['window','document','navigator','HTMLElement','requestAnimationFrame','cancelAnimationFrame'];
 Object.assign(globalThis,{window:w,document:w.document,HTMLElement:w.HTMLElement,requestAnimationFrame:w.requestAnimationFrame.bind(w),cancelAnimationFrame:w.cancelAnimationFrame.bind(w)});Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
 const api=load(nativeCode),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom'),clock=api.createSectionPlaybackClock(),host=w.document.querySelector('#root'),rootView=createRoot(host),events=[];
 const n=note('held',{span:[0,4]});
 function tree(){return React.createElement(api.NotePlaybackContext.Provider,{value:clock.register},React.createElement(React.Fragment,null,...[[0,2],[2,4]].map((section,i)=>React.createElement(api.PlaybackSectionContext.Provider,{value:section,key:i},React.createElement(api.NoteLayer,{notes:[n],midiNumberToY:p=>300-p*3,noteHeight:2.5,secondsToX:s=>s*80,handleNoteClick:(note,event)=>events.push(['click',note.id,event.type]),handleMouseEnter:(note,event,time)=>events.push(['hover',note.id,event.type,time]),handleMouseLeave:()=>events.push(['leave']),getNoteAttributes:()=>({'data-copy':i,className:'rawl-note'})})))));}
 try{
  flushSync(()=>rootView.render(tree()));const [a,b]=host.querySelectorAll('[data-note-id]');assert.equal(a.style.height,'5px');const bottom=parseFloat(a.style.top)+5;clock.advance(1);assert.equal(a.style.height,'10px');assert.equal(parseFloat(a.style.top)+10,bottom);assert.equal(b.style.height,'5px');clock.advance(2);assert.equal(a.style.height,'5px');assert.equal(b.style.height,'10px');clock.advance(4);assert.equal(b.style.height,'5px');
  a.getBoundingClientRect=()=>({left:0,width:320,right:320,top:0,bottom:5,height:5});a.dispatchEvent(new w.MouseEvent('mouseover',{bubbles:true,clientX:160}));a.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));a.dispatchEvent(new w.MouseEvent('mouseout',{bubbles:true,relatedTarget:w.document.body}));assert.ok(events.some(e=>e[0]==='hover'&&e[1]==='held'&&e[3]===2));assert.ok(events.some(e=>e[0]==='click'&&e[1]==='held'));assert.ok(events.some(e=>e[0]==='leave'));
  flushSync(()=>rootView.unmount());clock.advance(1);assert.equal(host.children.length,0);await new Promise(resolve=>setTimeout(resolve,25));
 }finally{try{flushSync(()=>rootView.unmount());}catch{}await new Promise(resolve=>setTimeout(resolve,25));dom.window.close();for(const key of keys){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];}}
});

test('React19 native moving ribbons follow playback height while drum onsets pulse once and dispose on unmount',async()=>{
 const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{url:'http://localhost/',pretendToBeVisual:true}),w=dom.window,saved=Object.getOwnPropertyDescriptors(globalThis),keys=['window','document','navigator','HTMLElement','requestAnimationFrame','cancelAnimationFrame'];
 Object.assign(globalThis,{window:w,document:w.document,HTMLElement:w.HTMLElement,requestAnimationFrame:w.requestAnimationFrame.bind(w),cancelAnimationFrame:w.cancelAnimationFrame.bind(w)});Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
 const api=load(nativeCode),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom'),noteClock=api.createSectionPlaybackClock(),rootView=createRoot(w.document.querySelector('#root')),animations=[];let drumClock,cancels=0;
 w.HTMLElement.prototype.animate=function(frames,options){animations.push({frames,options});return {cancel(){cancels++;}};};
 const notes=[note('ribbon',{pitchBend:[{time:0,value:8192},{time:1,value:10240}]}),note('drum',{span:[0,.01],note:{midiNumber:38},isDrum:true})];
 function Harness(){drumClock=api.useDrumPlaybackClock();return React.createElement(api.DrumPlaybackContext.Provider,{value:drumClock.register},React.createElement(api.NotePlaybackContext.Provider,{value:noteClock.register},React.createElement(api.NoteLayer,{notes,midiNumberToY:p=>300-p*3,noteHeight:2.5,secondsToX:s=>s*80,handleNoteClick:no,getNoteAttributes:n=>({'data-host-id':n.id})})));}
 try{
  flushSync(()=>rootView.render(React.createElement(Harness)));const ribbon=w.document.querySelector('[data-note-id="ribbon"]');assert.ok(ribbon.querySelector('svg path'));assert.equal(ribbon.style.height,'5px');flushSync(()=>noteClock.advance(.5));assert.equal(ribbon.style.height,'10px');assert.equal(ribbon.querySelector('svg').getAttribute('height'),'10');flushSync(()=>noteClock.advance(2));assert.equal(ribbon.style.height,'5px');
  drumClock.advance(0);drumClock.advance(.1);assert.equal(animations.length,1);assert.equal(animations[0].options.duration,1000);assert.equal(animations[0].frames[0].height,'30px');drumClock.advance(.11);assert.equal(animations.length,1);drumClock.advance(1);assert.equal(animations.length,1);drumClock.reset();drumClock.advance(0);drumClock.advance(.1);assert.equal(animations.length,2);
  flushSync(()=>rootView.unmount());assert.ok(cancels>=2);drumClock.reset();drumClock.advance(0);drumClock.advance(.1);assert.equal(animations.length,2);await new Promise(resolve=>setTimeout(resolve,25));
 }finally{try{flushSync(()=>rootView.unmount());}catch{}await new Promise(resolve=>setTimeout(resolve,25));dom.window.close();for(const key of keys){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];}}
});

test('React 19 native notes suppress host tooltips through plain, bent, quartertone and drum DOM while retaining labels and source metadata',()=>{
 const api=load(nativeCode),attributes=Object.freeze({title:'host note tooltip','aria-label':'source pitch','data-source-row':'7'}),notes=[note('plain'),note('bend',{pitchBend:[{time:0,value:8192},{time:1,value:10240}]}),note('quartertone',{note:{midiNumber:63.5},colorPitchClass:3.5}),note('drum',{isDrum:true,note:{midiNumber:38}})],before=JSON.stringify(notes);
 const markup=staticMarkup(api,notes,{attributes:()=>attributes,source:true});
 const dom=new JSDOM('<!doctype html><body>'+markup+'</body>');
 try{
  const pitched=dom.window.document.querySelectorAll('[data-note-id]');assert.equal(pitched.length,3);
  for(const element of pitched){assert.equal(element.hasAttribute('title'),false);assert.equal(element.querySelector('[title],title'),null);assert.equal(element.getAttribute('aria-label'),'source pitch');assert.equal(element.getAttribute('data-source-row'),'7');}
  assert.equal(dom.window.document.querySelector('[title],svg title'),null);assert.ok(dom.window.document.querySelector('svg path'));assert.match(dom.window.document.body.textContent,/🥁/);assert.equal(attributes.title,'host note tooltip');assert.equal(JSON.stringify(notes),before);
 }finally{dom.window.close();}
});
