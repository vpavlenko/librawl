import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
createRequire(require.resolve('react-dom16/package.json'))('scheduler');
const bundle=await build({stdin:{contents:"export {RawlMeasureHeader} from './src/notation/RawlNotation.jsx';",resolveDir:root,loader:'jsx'},bundle:true,write:false,format:'cjs',platform:'browser',jsx:'transform',external:['react','librawl/native']});
for(const version of [16,19])test('React'+version+' renders one actual modulation arrow and a tonic-only continuation beside the next measure number',async()=>{
 const React=require(version===16?'react16':'react'),dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{url:'http://localhost/',pretendToBeVisual:true}),w=dom.window,saved=Object.getOwnPropertyDescriptors(globalThis),keys=['window','document','navigator','HTMLElement'];Object.assign(globalThis,{window:w,document:w.document,HTMLElement:w.HTMLElement});Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});w.HTMLElement.prototype.getBoundingClientRect=()=>({width:800,left:0,right:800,top:0,bottom:100,height:100});
 const module={exports:{}};new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,name=>name==='react'?React:name==='librawl/native'?{}:require(name));const {RawlMeasureHeader}=module.exports;
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/marker-continuation/273.json',import.meta.url),'utf8')),rows=fixture.alignedRows.slice(1,3),host=w.document.querySelector('#root');let render,unmount;
 if(version===16){const file=require.resolve('react-dom16/cjs/react-dom.production.min.js'),local=createRequire(file),m={exports:{}};new Function('module','exports','require',fs.readFileSync(file,'utf8'))(m,m.exports,name=>name==='react'?React:local(name));render=node=>m.exports.render(node,host);unmount=()=>m.exports.unmountComponentAtNode(host);}else{const renderer=require('react-dom/client').createRoot(host),flush=require('react-dom').flushSync;render=node=>flush(()=>renderer.render(node));unmount=()=>flush(()=>renderer.unmount());}
 try{
  render(React.createElement(React.Fragment,null,...rows.map(row=>React.createElement(RawlMeasureHeader,{key:row.start,row,changes:fixture.changes,tonic:fixture.tonic,barBeats:fixture.barBeats}))));
  const onset=host.querySelector('.rawln-modulation[data-beat="62"]'),carry=host.querySelector('.rawln-modulation[data-origin-beat="62"]');assert.ok(onset);assert.equal(onset.querySelectorAll('svg').length,1);assert.equal(onset.querySelector('.rawln-modulation-label').textContent,'3 A');assert.equal(onset.getAttribute('data-onset-override'),'true');assert.ok(carry);assert.equal(carry.getAttribute('data-beat'),'64');assert.equal(carry.getAttribute('data-continued'),'true');assert.equal(carry.querySelectorAll('svg').length,0);assert.equal(carry.querySelector('.rawln-modulation-label').textContent,'A');assert.equal(carry.querySelector('.rawln-modulation-label').style.left,'26px');assert.equal(carry.querySelector('.rawln-modulation-flag').hasAttribute('data-degree'),false);assert.equal(carry.querySelector('.rawln-modulation-flag').style.background,'');assert.equal(carry.hasAttribute('data-join'),false);
  const measure=host.querySelectorAll('.rawln-measure-grid')[1].querySelector('.rawln-measure-number[data-beat="64"]');assert.equal(measure.textContent,'17');assert.equal(measure.getAttribute('data-modulation'),null);assert.equal(measure.style.color,'rgb(102, 102, 102)');assert.equal(onset.querySelector('.rawln-modulation-label').style.left,'0px');
 }finally{unmount();await new Promise(resolve=>setTimeout(resolve,20));w.close();for(const key of keys){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];}}
});
