import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const React=require('react'),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom');
const bundle=await build({stdin:{contents:"export {RawlMeasureHeader} from './src/notation/RawlNotation.jsx';",resolveDir:root,loader:'jsx'},bundle:true,write:false,format:'cjs',platform:'browser',jsx:'transform',external:['react','librawl/native']});
test('a repeated flag keeps its full label, color and negative beat position',async()=>{
 const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{url:'http://localhost/',pretendToBeVisual:true}),w=dom.window,saved=Object.getOwnPropertyDescriptors(globalThis),keys=['window','document','navigator','HTMLElement'];Object.assign(globalThis,{window:w,document:w.document,HTMLElement:w.HTMLElement});Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});w.HTMLElement.prototype.getBoundingClientRect=()=>({width:800,left:0,right:800,top:0,bottom:100,height:100});
 const module={exports:{}};new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,name=>name==='react'?React:name==='librawl/native'?{}:require(name));const {RawlMeasureHeader}=module.exports;
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/marker-continuation/273.json',import.meta.url),'utf8')),rows=fixture.alignedRows.slice(1,3),host=w.document.querySelector('#root'),renderer=createRoot(host);
 try{
  flushSync(()=>renderer.render(React.createElement(React.Fragment,null,...rows.map(row=>React.createElement(RawlMeasureHeader,{key:row.start,row,changes:fixture.changes,tonic:fixture.tonic,barBeats:fixture.barBeats,showModulationTonics:true})))));
  const onset=host.querySelector('.rawln-modulation[data-beat="62"]'),carry=host.querySelector('.rawln-modulation[data-origin-beat="62"]');assert.ok(onset);assert.equal(onset.querySelectorAll('svg').length,1);assert.equal(onset.querySelector('.rawln-modulation-label').textContent,'3 A');assert.equal(onset.getAttribute('data-onset-override'),'true');assert.ok(carry);assert.equal(carry.getAttribute('data-beat'),'64');assert.equal(carry.getAttribute('data-continued'),'true');assert.equal(carry.querySelectorAll('svg').length,0);assert.equal(carry.querySelector('.rawln-modulation-label'),null);assert.equal(carry.querySelector('.rawln-modulation-flag').hasAttribute('data-degree'),false);assert.equal(carry.querySelector('.rawln-modulation-flag').style.background,'');assert.equal(carry.hasAttribute('data-join'),false);
  const repeat=host.querySelector('.rawln-modulation[data-overflow-copy]');
  assert.equal(repeat.dataset.beat,onset.dataset.beat);
  assert.equal(repeat.getAttribute('aria-hidden'),'true');
  assert.ok(parseFloat(repeat.style.left)<0);
  const flag=marker=>marker.querySelector('.rawln-modulation-flag');
  assert.equal(flag(repeat).style.width,flag(onset).style.width);
  assert.equal(flag(repeat).style.background,flag(onset).style.background);
  assert.equal(flag(repeat).style.maskImage,flag(onset).style.maskImage);
  assert.equal(flag(repeat).style.pointerEvents,'none');
  assert.equal(repeat.querySelector('.rawln-modulation-label').innerHTML,onset.querySelector('.rawln-modulation-label').innerHTML);
  const measure=host.querySelectorAll('.rawln-measure-grid')[1].querySelector('.rawln-measure-number[data-beat="64"]');assert.equal(measure.textContent,'17');assert.equal(measure.getAttribute('data-modulation'),null);assert.equal(measure.style.color,'rgb(102, 102, 102)');assert.equal(onset.querySelector('.rawln-modulation-label').style.left,'0px');
 }finally{flushSync(()=>renderer.unmount());await new Promise(resolve=>setTimeout(resolve,20));w.close();for(const key of keys){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];}}
});

test('a positioned header places attached intervals beside digits and moves only colliding snapped text', async () => {
 const dom = new JSDOM('<style>.rawln-measure-grid{width:160px}</style><main></main>', {pretendToBeVisual:true});
 const {window} = dom;
 const globals = {window:globalThis.window,document:globalThis.document};
 const {document} = window;
 Object.assign(globalThis, {window,document});
 const rectangle = (left,width) => ({left,right:left+width,width});
 window.HTMLElement.prototype.getBoundingClientRect = function() {
  if (this.classList.contains('rawln-measure-grid')) return rectangle(0,160);
  if (this.classList.contains('rawln-measure-digits')) return rectangle(Number(this.parentElement.dataset.beat) === 0 ? 6 : 66, 14);
  if (this.classList.contains('rawln-modulation-label')) return rectangle(0,16);
  return rectangle(parseFloat(this.style.left) || 0,0);
 };
 const module = {exports:{}};
 new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,
  name=>name==='react'?React:name==='librawl/native'?{}:require(name));
 const {RawlMeasureHeader} = module.exports;
 const host = document.querySelector('main');
 const root = createRoot(host);
 const layout = {
  measures: [{beat:0,number:25,left:0},{beat:4,number:26,left:60,hasModulation:true}],
  beats: [],
  markers: [
   {beat:0,left:0,tonic:1,previousTonic:null,delta:null,initial:true},
   {beat:3.9,left:60,tonic:2,previousTonic:1,delta:1,number:26,onsetOverride:true},
   {beat:4,left:59,tonic:3,previousTonic:2,delta:1},
  ],
 };
 try {
  flushSync(() => root.render(React.createElement(RawlMeasureHeader,{layout})));
  const marker = beat => host.querySelector(`.rawln-modulation[data-beat="${beat}"]`);
  const label = beat => marker(beat).querySelector('.rawln-modulation-label');
  const shift = beat => parseFloat(label(beat).style.getPropertyValue('--rawln-label-shift'));
  assert.equal(label(0).textContent,'D♭');
  assert.equal(shift(0),20);
  assert.equal(label(4).textContent,'1');
  assert.equal(shift(4),21);
  assert.equal(marker(3.9).style.left,'60px');
  assert.equal(shift(3.9),-10);
  const flag = marker(3.9).querySelector('.rawln-modulation-flag');
  assert.equal(flag.style.left,'0px');
  assert.equal(flag.style.pointerEvents,'none');

  const selected = [];
  const onMeasureSelect = (...args) => selected.push(args);
  flushSync(() => root.render(React.createElement(RawlMeasureHeader,{layout,onMeasureSelect})));
  const control = host.querySelector('.rawln-measure-number[data-beat="4"]');
  assert.equal(flag.style.pointerEvents,'auto');
  flushSync(() => {
   flag.click();
   label(3.9).querySelector('path').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
   control.click();
  });
  assert.deepEqual(selected, Array(3).fill([4,layout.measures[1],control]));
  assert.equal(document.activeElement,control);
 } finally {
  flushSync(() => root.unmount());
  await new Promise(resolve => setTimeout(resolve, 20));
  Object.assign(globalThis,globals);
  dom.window.close();
 }
});
