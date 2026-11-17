import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {transformSync} from 'esbuild';

const require=createRequire(import.meta.url),base=fileURLToPath(new URL('.',import.meta.url));
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const reference=read('fixtures/tonic-symbol-reference.tsx'),source=read('../src/components/TonicSymbol.jsx');

function compile(text,React,loader){
 const code=transformSync(text,{loader,format:'cjs',target:'es2018',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).code;
 const module={exports:{}};
 vm.runInNewContext('(function(module,exports,require){'+code+'\n})',{},{filename:'tonic-symbol-test.js'})(module,module.exports,name=>name==='react'?React:require(name));
 return module.exports;
}
function legacyRenderer(React){
 // The aliased React16 renderer must receive its matching React singleton,
 // rather than resolving the host's newer React through its peer dependency.
 const filename=require.resolve('react-dom16/cjs/react-dom-server.node.production.min.js'),localRequire=createRequire(filename),module={exports:{}};
 vm.runInNewContext('(function(module,exports,require){'+fs.readFileSync(filename,'utf8')+'\n})',{process:{env:{NODE_ENV:'production'}}},{filename})(module,module.exports,name=>name==='react'?React:localRequire(name));
 return module.exports;
}
const React16=require('react16');
const runtimes=[{name:'React16',React:React16,server:legacyRenderer(React16)},{name:'host React',React:require('react'),server:require('react-dom/server')}];
function cases(){
 const values=[];
 for(const number of [1,12,103])for(const left of [-1,64.5])for(const alignToOnset of [false,true])for(const transpose of [-13,0,25])for(const previousTonic of [null,0,7])for(const modulationDiff of previousTonic===null?[null]:Array.from({length:12},(_,i)=>i)){
  values.push({left,number,previousTonic,modulationDiff,tonicStart:previousTonic===null?11:(previousTonic+modulationDiff)%12,alignToOnset,transpose});
 }
 values.push({left:0,number:1,previousTonic:null,modulationDiff:null,tonicStart:null,transpose:0});
 return values;
}

test('the portable reference fixture retains the recorded upstream source excerpt',()=>{
 const provenance=JSON.parse(read('fixtures/tonic-symbol-reference.json'));
 assert.equal(hash(reference),provenance.fixtureSha256);
 const component=reference.slice(reference.indexOf('export const NewTonicSymbol:')).trimEnd()+'\n';
 assert.equal(hash(component),provenance.componentSha256);assert.equal(provenance.componentStartLine,299);
 assert.equal(provenance.commit,'c5c9bb0407534d9b7eb9a8267078c006fa340ee6');assert.equal(provenance.license,'GPL-3.0-only');
});

for(const runtime of runtimes)test(runtime.name+' defaults match Rawl byte-for-byte across initial, shifts, digits, onset and transpose',()=>{
 const {React,server}=runtime,{TonicSymbol}=compile(source,React,'jsx'),{NewTonicSymbol,AnalysisTransposeContext}=compile(reference,React,'tsx');
 for(const props of cases()){
  const {transpose,...originalProps}=props;
  const expected=server.renderToStaticMarkup(React.createElement(AnalysisTransposeContext.Provider,{value:transpose},React.createElement(NewTonicSymbol,originalProps)));
  const actual=server.renderToStaticMarkup(React.createElement(TonicSymbol,props));
  assert.equal(actual,expected,JSON.stringify(props));
  const styles=[...actual.matchAll(/style="([^"]*)"/g)].map(match=>match[1]);assert.equal(styles.length,2);
  const labelLeft=props.alignToOnset?props.left:props.left+(props.previousTonic===null?String(props.number).length*8+10:30);
  assert.ok(styles[0].includes('left:'+labelLeft+'px;'));assert.ok(styles[0].includes('top:-2px;'));assert.ok(styles[0].includes('z-index:100;'));
  assert.ok(styles[1].includes('width:80px;height:12px;'));assert.ok(styles[1].includes('left:'+props.left+(props.left===0?'':'px')+';'));assert.ok(styles[1].includes('z-index:3;'));
 }
});

test('arrow and host attribute slots preserve the default geometry and Rawl color class',()=>{
 const {React,server}=runtimes[0],{TonicSymbol}=compile(source,React,'jsx'),seen=[];
 const markup=server.renderToStaticMarkup(React.createElement(TonicSymbol,{left:13,number:12,previousTonic:0,modulationDiff:10,tonicStart:10,renderArrow:info=>{seen.push(info);return React.createElement('svg',{'data-direction':info.direction,'aria-hidden':true});},flagClassName:'host-flag',labelClassName:'host-label',flagAttributes:{'data-degree':'10',style:{background:'orange'}},labelAttributes:{'data-label':'12'}}));
 assert.equal(seen.length,1);assert.equal(seen[0].direction,'down');assert.equal(seen[0].semitones,2);assert.equal(seen[0].modulationDiff,10);
 assert.ok(markup.includes('noteColor_10_colors host-flag'));assert.ok(markup.includes('class="host-label"'));assert.ok(markup.includes('data-degree="10"'));assert.ok(markup.includes('data-label="12"'));
 assert.ok(markup.includes('<svg data-direction="down" aria-hidden="true"></svg>2 B♭'));assert.ok(!markup.includes('↓'));
 assert.ok(markup.includes('width:80px;height:12px;'));assert.ok(markup.includes('left:43px;'));assert.ok(markup.includes('background:orange'));
 const initial=server.renderToStaticMarkup(React.createElement(TonicSymbol,{left:0,number:1,previousTonic:null,modulationDiff:null,tonicStart:0,renderArrow:()=>{throw Error('Initial tonic has no arrow');}}));assert.ok(initial.includes('>C</span>'));
});
