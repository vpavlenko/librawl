import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
const result=await build({entryPoints:[fileURLToPath(new URL('./react-notes.jsx',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',target:'es2018',jsx:'transform',external:['react','react-dom','react-dom/client']});
let exports;
function fixture(){const data={label:'fixture',tempo:90,beats:8,tonic:0,voiceGroups:[{voices:[0]},{voices:[1]}]},notes=[{pitch:60,start:0,duration:8,voice:0},{pitch:65,start:4,duration:2,voice:1}];return{data,notes,axis:{pitchToY:pitch=>20+(72-pitch)*3}};}
function environment(){
 const dom=new JSDOM('<!doctype html><head><style>.rawl-note{position:absolute;height:5px;box-shadow:none}.rawl-note.rawl-playing,.rawl-note.rawl-auditioning{height:10px;transform:translateY(-5px)}.rawl-note.recording-playing{height:12px;transform:translateY(-6px)}.rawl-note.collapsed{height:1px;transform:translateY(4px)}</style></head><body><div id="score"></div></body>',{pretendToBeVisual:true,url:'http://localhost/'}),w=dom.window;
 Object.assign(globalThis,{window:w,document:w.document});Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});
 const module={exports:{}};vm.runInThisContext('(function(module,exports,require){'+result.outputFiles[0].text+'\n})',{filename:'caplin-react-notes-test.cjs'})(module,module.exports,require);exports=module.exports;
 const score=w.document.querySelector('#score');score.getBoundingClientRect=()=>({width:800,height:120,left:0,right:800,top:0,bottom:120});return{dom,w,score};
}
test('actual Rawl note rectangles retain Caplin DOM identity, geometry, audition routing and CSS playback policies',()=>{
 const {dom,w,score}=environment(),f=fixture(),events=[];
 const handle=exports.mount(score,{...f,bindNote(node,note){node.onclick=event=>{event.stopPropagation();events.push(note);};}});
 try{
  const nodes=handle.notes;assert.equal(nodes.length,2);assert.ok(score.querySelector('.librawl-caplin-note-layer'));assert.ok(nodes.every(node=>node.parentElement===handle.element));
  assert.equal(nodes[0].dataset.voice,'0');assert.equal(nodes[0].dataset.staff,'0');assert.equal(nodes[0].dataset.pitch,'60');assert.equal(nodes[0].dataset.start,'0');assert.equal(nodes[0].dataset.end,'8');assert.equal(nodes[0].style.top,'56px');
  assert.equal(nodes[0].style.height,'');assert.equal(w.getComputedStyle(nodes[0]).height,'5px');assert.equal(nodes[0].style.backgroundColor,'white');assert.ok(nodes[0].classList.contains('voice-shape-0'));assert.ok(nodes[0].classList.contains('voiceShape-0'));
  nodes[0].classList.add('rawl-playing');assert.equal(w.getComputedStyle(nodes[0]).height,'10px');assert.equal(w.getComputedStyle(nodes[0]).transform,'translateY(-5px)');
  nodes[0].classList.remove('rawl-playing');nodes[0].classList.add('recording-playing');assert.equal(w.getComputedStyle(nodes[0]).height,'12px');
  nodes[0].click();assert.deepEqual(events,[f.notes[0]]);handle.update({});assert.equal(handle.notes[0],nodes[0]);assert.ok(nodes[0].classList.contains('recording-playing'));
  nodes[1].hidden=true;nodes[1].classList.add('collapsed');handle.update({data:{...f.data,tonic:5}});assert.equal(nodes[1].hidden,true);assert.ok(nodes[1].classList.contains('collapsed'));assert.ok(nodes[0].classList.contains('recording-playing'));assert.equal(w.getComputedStyle(nodes[1]).height,'1px');
 }finally{handle.destroy();handle.destroy();assert.equal(score.children.length,0);dom.window.close();}
});
test('one root per final row clips sustained copies without changing absolute sounding identities',()=>{
 const {dom,score}=environment(),f=fixture(),second=score.ownerDocument.createElement('div');second.getBoundingClientRect=score.getBoundingClientRect;score.after(second);
 const a=exports.mount(score,{...f,row:{start:0,end:4,pad:0,span:4.5}}),b=exports.mount(second,{...f,row:{start:4,end:8,pad:.5,span:4.5}});
 try{
  assert.equal(a.notes.length,1);assert.equal(b.notes.length,2);assert.notEqual(a.notes[0],b.notes[0]);assert.equal(a.notes[0].dataset.noteId,b.notes[0].dataset.noteId);
  assert.equal(a.notes[0].dataset.start,'0');assert.equal(b.notes[0].dataset.start,'0');assert.equal(b.notes[0].dataset.end,'8');
  assert.equal(b.notes[0].style.left,.5/4.5*100+'%');assert.equal(b.notes[0].style.top,'56px');
  b.destroy();assert.ok(a.notes[0].isConnected);assert.equal(second.children.length,0);
 }finally{a.destroy();b.destroy();dom.window.close();}
});
test('resize retains host transpose, hover recoloring, recording state and captured note references',()=>{
 const {dom,w,score}=environment(),f=fixture();let resize,disconnected=false;
 w.ResizeObserver=class{constructor(fn){resize=fn;}observe(){}disconnect(){disconnected=true;}};
 const handle=exports.mount(score,f),node=handle.notes[0];
 try{
  node.style.top='50px';node.style.backgroundColor='red';node.dataset.pitch='62';node.dataset.tonic='2';node.dataset.pitchClass='0';node.classList.add('recording-playing');node.hidden=true;
  resize([{target:score,contentRect:{width:900}}]);
  assert.equal(handle.notes[0],node);assert.equal(node.style.top,'50px');assert.equal(node.style.backgroundColor,'red');assert.equal(node.dataset.pitch,'62');assert.equal(node.dataset.tonic,'2');assert.equal(node.dataset.pitchClass,'0');assert.ok(node.classList.contains('recording-playing'));assert.equal(node.hidden,true);
 }finally{handle.destroy();assert.equal(disconnected,true);dom.window.close();}
});
