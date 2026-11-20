import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {buildSync} from 'esbuild';
import {createSoundFontPlayback} from '../src/audio/soundfont-playback.js';

const BASE={bytes:5758964,sha256:'f2a57c0c85d3b118b39d6cf6f5eb9447e8a22ec3884e6f616951412d7f5c3460'},SAX={url:'assets/soundfonts/GeneralUser-GS-alto-sax.sf2',name:'alto-sax',bytes:505140,sha256:'d7079d82a5fb6c985770578a89db8db153c20cefff38ed94270bb790bf3378e6'};
const profiles=[['Caplin',{}],['Insights',{additionalBanks:[SAX],allowAuditionPrograms:true}]];
const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function context(){
 return {state:'running',currentTime:10,sampleRate:8000,baseLatency:.04,outputLatency:.06,destination:{},resume:async()=>{},audioWorklet:{addModule:async()=>{}},createGain:()=>({gain:{value:1,setTargetAtTime(value){this.value=value;},setValueAtTime(value){this.value=value;}},connect(){},disconnect(){}}),createBuffer:(_channels,length,rate)=>{const channels=[new Float32Array(length),new Float32Array(length)];return{sampleRate:rate,getChannelData:i=>channels[i]};},createConvolver:()=>({normalize:true,buffer:null,connect(){},disconnect(){}})};
}
function environment(){
 let serial=0,wall=20000;const timers=new Map(),intervals=new Map();
 return {performance:{now:()=>wall},console,AbortController,document:{baseURI:'https://example.test/reader/index.html'},setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),setInterval(fn,ms){const id=++serial;intervals.set(id,{fn,ms});return id;},clearInterval:id=>intervals.delete(id),timers,intervals,setWall:value=>{wall=value;}};
}
function synthesizer(events=[]){
 return {midiChannels:Array.from({length:128},()=>({setDrums(){}})),stopAll(force){events.push({type:'stop',force});},connectChannel(mixer,channel){events.push({type:'connect',channel,mixer});},disconnectChannel(_mixer,channel){events.push({type:'disconnect',channel});},controllerChange(channel,controller,value,{time}){events.push({type:'cc',channel,controller,value,time});},programChange(channel,program,{time}){events.push({type:'program',channel,program,time});},noteOn(channel,pitch,velocity,{time}){events.push({type:'on',channel,pitch,velocity,time});},noteOff(channel,pitch,{time}){events.push({type:'off',channel,pitch,time});}};
}
function plan(tempo=120){
 const notes=[{pitch:60,start:0,duration:4,end:4,channel:0,group:0,velocity:74},{pitch:64,start:4,duration:2,end:6,channel:0,group:0,velocity:80},{pitch:67,start:7,duration:1,end:8,channel:0,group:0,velocity:70}];
 const events=[{beat:0,type:'cc',channel:0,controller:0,value:0},{beat:0,type:'program',channel:0,program:0},...notes.flatMap(n=>[{beat:n.start,type:'on',channel:n.channel,pitch:n.pitch,velocity:n.velocity},{beat:n.end,type:'off',channel:n.channel,pitch:n.pitch}])].sort((a,b)=>a.beat-b.beat);
 return {notes,events,channels:[{channel:0,group:0}],beats:8,duration:8*60/tempo,timeAt:beat=>beat*60/tempo,beatAt:seconds=>seconds*tempo/60};
}
function harness(options={},factory=createSoundFontPlayback){
 const env=environment(),ctx=context(),events=[],synth=synthesizer(events),api=factory({...options,environment:env});let output=9.9;
 ctx.getOutputTimestamp=()=>({contextTime:output,performanceTime:env.performance.now()});
 return {env,ctx,events,synth,api,engine:new api.PlaybackEngine(ctx,synth),setTime(render,audible=render-.1){ctx.currentTime=render;output=audible;env.setWall(env.performance.now()+20);},pump(){for(const {fn} of [...env.intervals.values()])fn();}};
}
function semanticEvents(events){return events.filter(e=>['on','off','cc','program'].includes(e.type));}

for(const [name,options] of profiles){
 test(name+' clock uses device presentation time, remains monotonic, and gates seek highlighting before the scheduled attack',()=>{
  const h=harness(options),p=plan(),start=h.engine.play(p,[h.ctx.createGain()]),clock=h.engine.createClock(p,start);
  assert.equal(clock.beat(),null);assert.equal(clock.position(),0);h.setTime(start+.3,start+.1);assert.ok(Math.abs(clock.beat()-.2)<1e-8);h.setTime(start+.4,start+.05);assert.ok(Math.abs(clock.beat()-.2)<1e-8);
  const next=h.engine.play(plan(80),[h.ctx.createGain()],2),seek=h.engine.createClock(plan(80),next,2);assert.equal(seek.beat(),null);assert.equal(seek.position(),2);h.setTime(next+.5,next+.2);assert.ok(Math.abs(seek.beat()-(2+.2/.75))<1e-8);h.engine.stop();assert.equal(h.env.intervals.size,0);
 });
 test(name+' scheduler preserves held notes on seek, bank/program ordering, queue fences and stalled-timer recovery',()=>{
  const h=harness(options),p=plan(),mixer=h.ctx.createGain(),start=h.engine.play(p,[mixer],2),initial=semanticEvents(h.events);
  assert.ok(initial.some(e=>e.type==='on'&&e.pitch===60&&e.time===start));assert.ok(initial.findIndex(e=>e.type==='cc'&&e.controller===0)<initial.findIndex(e=>e.type==='program'));assert.ok(initial.findIndex(e=>e.type==='program')<initial.findIndex(e=>e.type==='on'));
  const before=h.events.length;h.setTime(start+2.2,start+2.1);h.pump();const recovered=h.events.slice(before);assert.ok(recovered.some(e=>e.type==='cc'&&e.controller===120));assert.ok(!recovered.some(e=>e.type==='on'&&e.pitch===60),'Expired attack is not burst after a timer stall');
  const fence=h.engine.fence;h.engine.stop();const restarted=h.engine.play(p,[mixer]);assert.ok(restarted>=fence+.025);h.engine.stop();assert.equal(h.engine.connections.length,0);assert.equal(h.engine.roomNodes.length,0);assert.equal(h.env.intervals.size,0);
 });
 test(name+' audition isolates preview notes, honors its program policy and permits independent same-pitch overlap ports',()=>{
  const h=harness(options),finished=[];h.engine.audition({pitch:60,duration:1,program:65},reason=>finished.push(reason));assert.equal(h.events.findLast(e=>e.type==='program').program,name==='Caplin'?0:65);assert.equal(h.events.findLast(e=>e.type==='program').channel,9);
  h.engine.audition({pitch:60,duration:1,program:65});assert.deepEqual(finished,['cancelled']);assert.equal(h.env.timers.size,1,'Old preview release timer is cancelled');h.engine.stopAudition();assert.equal(h.env.timers.size,0);
  const first=h.engine.auditionOverlap({pitch:64,duration:1,program:65}),second=h.engine.auditionOverlap({pitch:64,duration:1,program:65}),ons=h.events.filter(e=>e.type==='on'&&e.pitch===64);assert.equal(ons.length,2);assert.notEqual(ons[0].channel,ons[1].channel);assert.equal((ons[1].channel-ons[0].channel)%16,0);first.cancel();assert.ok(h.engine.overlapAudition.entries.size===1);second.cancel();h.engine.stop();assert.equal(h.env.timers.size,0);
  if(name==='Insights')assert.throws(()=>h.engine.audition({pitch:60,duration:1,program:128}),/Invalid audition/);else{h.engine.audition({pitch:60,duration:1,program:128});assert.equal(h.events.findLast(e=>e.type==='program').program,0);h.engine.stopAudition();}
 });
}

test('output-latency fallback, deterministic room and reserved audition channel match the original contract',()=>{
 const h=harness();delete h.ctx.getOutputTimestamp;assert.equal(h.api.presentationTime(h.ctx),9.9);const p=plan(),start=h.engine.play(p,[h.ctx.createGain()]),clock=h.engine.createClock(p,start);assert.equal(clock.beat(),null);h.setTime(start+.2);assert.ok(Math.abs(clock.beat()-.2)<1e-7);
 assert.deepEqual(h.api.room,{wet:.14,seconds:1.1,decaySeconds:.85,preDelay:.014,seed:241024});const first=h.api.roomImpulse(h.ctx),second=h.api.roomImpulse(h.ctx);for(let channel=0;channel<2;channel++)assert.deepEqual(first.getChannelData(channel),second.getChannelData(channel));assert.notDeepEqual(first.getChannelData(0),first.getChannelData(1));
 assert.throws(()=>h.engine.play({...p,channels:[{channel:9,group:0}]},[h.ctx.createGain()]),/Reserved audition channel/);h.engine.stop();
});

test('Queue-aware worklet starts and replaces previews without accumulating a fence',()=>{
 const h=harness(),p=plan(),mixer=h.ctx.createGain(),clears=[];
 const engine=new h.api.PlaybackEngine(h.ctx,h.synth,channels=>clears.push(channels));
 assert.ok(engine.canDiscardQueuedEvents);
 const first=engine.play(p,[mixer]);
 const next=engine.play(p,[mixer],4);
 assert.equal(next,first,'The pending first run does not delay the next run');
 assert.equal(next,h.ctx.currentTime+.015);
 assert.deepEqual(clears,[undefined,undefined,undefined,undefined]);
 const preview=engine.audition({pitch:60,duration:1});
 const latest=engine.audition({pitch:64,duration:1});
 assert.equal(latest.start,preview.start);
 assert.deepEqual(clears[4],[9],'Replacing a preview does not cancel the score queue');
 engine.stop();
});

test('SpessaSynth worklet registration wraps only its new processor name and clears queued MIDI by channel',()=>{
 const processors=new Map(),stopped=[],forwarded=[];
 const scope={
  registerProcessor(name,processor){processors.set(name,processor);},
  BaseProcessor:class{
   constructor(){
    const midiChannels=Array.from({length:32},(_,channel)=>({stopAllNotes:force=>stopped.push([channel,force])}));
    const eventQueue=[{message:[0x90],channelOffset:0},{message:[0x99],channelOffset:0},
     {message:[0x99],channelOffset:16},{message:[0xf9],channelOffset:0}];
    this.core={synthesizer:{synthCore:{midiChannels,eventQueue}},handleMessage:message=>forwarded.push(message)};
   }
  },
 };
 const source=fs.readFileSync(new URL('../src/audio/spessasynth-seek-registration.js',import.meta.url),'utf8');
 vm.runInNewContext(source+"\nregisterProcessor('spessasynth-worklet-processor',BaseProcessor);",scope);
 assert.equal(processors.get('spessasynth-worklet-processor'),scope.BaseProcessor);
 const Wrapped=processors.get('librawl-spessasynth-worklet-processor'),processor=new Wrapped();
 const core=processor.core,synth=core.synthesizer.synthCore;
 const normalMessage={type:'midiMessage'};
 core.handleMessage(normalMessage);
 assert.deepEqual(forwarded,[normalMessage]);
 core.handleMessage({type:'librawlClearMidi',channels:[9,25]});
 assert.deepEqual(synth.eventQueue.map(event=>event.message[0]),[0x90,0xf9]);
 assert.deepEqual(stopped,[[9,true],[25,true]]);
 core.handleMessage({type:'librawlClearMidi'});
 assert.equal(synth.eventQueue.length,0);
});

function preparation(options={}){
 const env=environment(),ctx=context(),requests=[],imports=[],modules=[],banks=[],instances=[],worklets=[],messages=[];ctx.audioWorklet.addModule=async url=>{modules.push(url);};
 env.AudioWorkletNode=class{
  constructor(context,name,options){worklets.push({context,name,options});this.port={addEventListener(){},removeEventListener(){},postMessage:message=>messages.push(message)};}
  addEventListener(){}
  removeEventListener(){}
 };
 class FakeSynth{
  constructor(context,options){options.audioNodeCreators.worklet(context,'spessasynth-worklet-processor',{numberOfOutputs:17});this.isReady=Promise.resolve();this.eventHandler={addEvent(){},removeEvent(){}};this.soundBankManager={addSoundBank:async(bytes,name)=>{banks.push({name,bytes:bytes.byteLength});}};instances.push(this);}
  connect(){}disconnect(){}setLogLevel(){}setSystemParameter(){}destroy(){this.destroyed=true;}stopAll(){}
 }
 const api=createSoundFontPlayback({...options,environment:env,fetch:async url=>{requests.push(url);const sax=url.includes('alto-sax');return{ok:true,arrayBuffer:async()=>new ArrayBuffer(sax?SAX.bytes:BASE.bytes)};},importLibrary:async url=>{imports.push(url);return{WorkletSynthesizer:FakeSynth};}});
 return {api,env,ctx,requests,imports,modules,banks,instances,worklets,messages};
}
for(const [name,options]of profiles)test(name+' preparation loads only configured pinned banks and keeps independent factories/context ownership',async()=>{
 const p=preparation(options),first=p.api.prepare(p.ctx),same=p.api.prepare(p.ctx),[a,b]=await Promise.all([first,same]);assert.equal(a,b);assert.equal(p.instances.length,1);assert.equal(p.api.getContext(),p.ctx);assert.deepEqual(p.imports,['./vendor/spessasynth/index.js']);assert.deepEqual(p.modules,['vendor/spessasynth/spessasynth_processor.min.js']);assert.equal(p.requests[0],'assets/soundfonts/GeneralUser-GS-v4.sf2.1?sha256='+BASE.sha256);assert.deepEqual(p.banks,name==='Caplin'?[{name:'caplin',bytes:BASE.bytes}]:[{name:'caplin',bytes:BASE.bytes},{name:'alto-sax',bytes:SAX.bytes}]);assert.equal(p.api.getPreparationState().phase,'ready');await assert.rejects(p.api.prepare(context()),/Shared AudioContext/);assert.equal(createSoundFontPlayback().getContext(),undefined);p.api.stop();
});

test('The queue-aware profile initializes its own audio worklet and sends cancellation there',async()=>{
 const p=preparation({clearQueuedMidi:true}),engine=await p.api.prepare(p.ctx);
 assert.deepEqual(p.modules,['spessasynth-seek-processor.js']);
 assert.deepEqual(p.worklets.map(node=>node.name),['librawl-spessasynth-worklet-processor']);
 assert.equal(p.worklets[0].options.numberOfOutputs,17);
 assert.ok(engine.canDiscardQueuedEvents);
 engine.stop();
 assert.deepEqual(p.messages,[{type:'librawlClearMidi',channels:undefined}]);
});

test('asset base and explicit URLs relocate every fetch/worklet without changing bank identity',async()=>{
 const p=preparation({assetBase:'https://cdn.test/librawl/',libraryUrl:'vendor/library.js',workletUrl:'https://worklet.test/processor.js',additionalBanks:[SAX]});await p.api.prepare(p.ctx);assert.deepEqual(p.imports,['https://cdn.test/librawl/vendor/library.js']);assert.deepEqual(p.modules,['https://worklet.test/processor.js']);assert.ok(p.requests.every(url=>url.startsWith('https://cdn.test/librawl/assets/soundfonts/')));assert.deepEqual(p.banks.map(b=>b.name),['caplin','alto-sax']);p.api.stop();
});

test('stopping pending preparation rejects promptly and observes late import rejection without restarting playback',async()=>{
 const env=environment(),ctx=context();let failImport;const api=createSoundFontPlayback({environment:env,fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(BASE.bytes)}),importLibrary:()=>new Promise((_,reject)=>{failImport=reject;})}),pending=api.prepare(ctx);await settle();api.stop();await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(api.getPreparationState(),{phase:'idle',pending:false,error:null});failImport(new Error('Late module rejection'));await settle();assert.equal(api.getPreparationState().phase,'idle');assert.equal(env.timers.size,0);
});

test('asset deadlines and bank byte/checksum failures are bounded and leave no live preparation',async()=>{
 const env=environment(),ctx=context(),api=createSoundFontPlayback({environment:env,fetch:()=>new Promise(()=>{}),importLibrary:async()=>({})}),pending=api.prepare(ctx);await settle();env.timers.values().next().value.fn();await assert.rejects(pending,/assets timeout/);assert.equal(api.getPreparationState().phase,'failed');assert.equal(api.getPreparationState().pending,false);
 const short=createSoundFontPlayback({fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}),importLibrary:async()=>({})});await assert.rejects(short.prepare(context()),/bank length 1/);
 const mismatch=createSoundFontPlayback({environment:{...environment(),crypto:{subtle:{digest:async()=>new Uint8Array(32).buffer}}},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(BASE.bytes)}),importLibrary:async()=>({})});await assert.rejects(mismatch.prepare(context()),/bank checksum/);
});

test('source remains importable without installing globals and protected Caplin scheduler/clock/room blocks remain unchanged',()=>{
 const source=fs.readFileSync(new URL('../src/audio/soundfont-playback.js',import.meta.url),'utf8');assert.ok(!source.includes('global.SoundFontPlayback='));assert.equal(typeof createSoundFontPlayback,'function');
 const provenance=JSON.parse(fs.readFileSync(new URL('../docs/audio-provenance.json',import.meta.url),'utf8'));
 for(const region of provenance.protectedRegions){const start=source.indexOf(region.start),end=source.indexOf(region.end,start);assert.ok(start>=0&&end>start);assert.equal(createHash('sha256').update(source.slice(start,end)).digest('hex'),region.sha256,region.name);}
});

// The verbatim source fixture is committed, so trace parity is mandatory in
// standalone clones as well as the protected-region hash checks above.
const caplinPath=new URL('./fixtures/soundfont-caplin-reference.js',import.meta.url);
test('factory default profile produces the same scheduler and clock trace as the pinned Caplin source',()=>{
 const source=fs.readFileSync(caplinPath,'utf8'),provenance=JSON.parse(fs.readFileSync(new URL('../docs/audio-provenance.json',import.meta.url),'utf8'));assert.equal(createHash('sha256').update(source).digest('hex'),provenance.source.caplin.sha256);function original(options){const env=options.environment;vm.runInNewContext(source,env);return env.SoundFontPlayback;}
 const actual=harness({},createSoundFontPlayback),expected=harness({},original),p=plan();for(const h of [actual,expected]){const start=h.engine.play(p,[h.ctx.createGain()],1),clock=h.engine.createClock(p,start,1);assert.equal(clock.beat(),null);h.setTime(start+.3,start+.2);assert.ok(Math.abs(clock.beat()-1.4)<1e-8);h.pump();h.engine.stop();}
 assert.deepEqual(semanticEvents(actual.events),semanticEvents(expected.events));
});

test('legacy Caplin VM can install the factory with only outer interval timers and a separate window object',()=>{
 const source=buildSync({entryPoints:[new URL('../src/audio/soundfont-playback.js',import.meta.url).pathname],bundle:true,write:false,format:'iife',globalName:'LibrawlAudio',define:{'import.meta.url':JSON.stringify('https://example.test/soundfont-playback.js')},logLevel:'silent'}).outputFiles[0].text;
 const callbacks=new Map();let serial=0;const scope={window:{},setInterval:fn=>{callbacks.set(++serial,fn);return serial;},clearInterval:id=>callbacks.delete(id),console};vm.runInNewContext(source+'\nwindow.SoundFontPlayback=LibrawlAudio.createSoundFontPlayback({environment:window});',scope);
 const engine=new scope.window.SoundFontPlayback.PlaybackEngine({currentTime:0},synthesizer()),p=plan();engine.play(p,[{}]);assert.equal(callbacks.size,1);engine.stop();assert.equal(callbacks.size,0);
});
