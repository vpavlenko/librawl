import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {transformSync} from 'esbuild';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const fixture=name=>fs.readFileSync(path.join(root,'tests/fixtures/native-audio',name),'utf8');
const playerSource=fs.readFileSync(path.join(root,'src/audio/native/ThreadedMIDIPlayer.ts'),'utf8');
const worklet=fs.readFileSync(path.join(root,'src/audio/native/midi-output-worklet.js'),'utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),plain=value=>JSON.parse(JSON.stringify(value));

test('native audio sources remain pinned; only explicit host environment seams change',()=>{
 const provenance=JSON.parse(fs.readFileSync(path.join(root,'docs/native-audio-provenance.json'),'utf8'));
 for(const source of provenance.sources)assert.equal(sha(fixture(path.basename(source.path))),source.sha256);
 assert.equal(worklet,fixture('midi-output-worklet.js'));
 const original=fixture('ThreadedMIDIPlayer.ts');
 let expected=original.slice(original.indexOf('type PlaybackState'));
 expected=expected.replace('export default class ThreadedMIDIPlayer extends EventEmitter {','export function createThreadedMIDIPlayerClass(environment: ThreadedMIDIEnvironment) {\n const { EventEmitter } = environment;\n const console = environment.console ?? globalThis.console;\n return class ThreadedMIDIPlayer extends EventEmitter {');
 expected=expected.replace(original.match(/^    const assetBase = new URL.*$/m)[0],"    const assetBase = typeof environment.assetBase === 'function' ? environment.assetBase() : environment.assetBase;");
 expected=expected.replace('new AudioWorkletNode(this.context,','new environment.AudioWorkletNode(this.context,').replace('new SynthWorker()','environment.createWorker()').replace('new MessageChannel()','new environment.MessageChannel()');
 assert.equal(playerSource.slice(playerSource.indexOf('type PlaybackState')),expected+'}\n');
 assert.ok(!playerSource.includes('worker-loader'));assert.ok(!playerSource.includes('process.env'));assert.ok(!playerSource.includes('window.location'));
});

function harness(native,{noWorklet=false,addModuleFailure=false}={}){
 const commands=[],audio=[],modules=[],events=[],errors=[];let worker,node,channels=0;
 const context={currentTime:1,sampleRate:48000,audioWorklet:noWorklet?null:{async addModule(url){modules.push(url);if(addModuleFailure)throw Error('module failure');}}};
 const port=id=>({id,closed:false,postMessage(message,transfer){audio.push({port:id,message:plain(message),transfer:transfer?.map(p=>p.id)});},close(){this.closed=true;}});
 class MockNode{constructor(ctx,name,options){node=this;this.port=port('node');this.context=ctx;this.name=name;this.options=options;}connect(destination){this.destination=destination;}disconnect(){this.disconnected=true;}}
 class MockWorker{constructor(){worker=this;}postMessage(message,transfer){commands.push({...message,transfer:transfer?.map(p=>p.id)});if(message.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'reply',id:message.id,result:true,state:{}}}));}terminate(){this.terminated=true;}}
 class MockChannel{constructor(){this.port1=port('channel-'+(++channels)+'-1');this.port2=port('channel-'+channels+'-2');}}
 const globals={console:{debug(){},error(...args){errors.push(args.map(a=>a?.message??a));}},URL,process:{env:{PUBLIC_URL:'/app'}},window:{location:{href:'https://test.example/rawl/'}},AudioWorkletNode:MockNode,MessageChannel:MockChannel};
 const source=native?playerSource:fixture('ThreadedMIDIPlayer.ts'),compiled=transformSync(source,{loader:'ts',format:'cjs',target:'es2020'}).code,module={exports:{}};
 vm.runInNewContext('(function(require,module,exports){'+compiled+'\n})',globals)(name=>name.startsWith('worker-loader')?MockWorker:require(name),module,module.exports);
 const Player=native?module.exports.createThreadedMIDIPlayerClass({EventEmitter,createWorker:()=>new MockWorker(),assetBase:()=>new URL('/app/',globals.window.location.href).href,AudioWorkletNode:MockNode,MessageChannel:MockChannel,console:globals.console}):module.exports.default;
 const player=new Player(context);player.on('playerStateUpdate',state=>events.push(plain(state)));player.on('playerError',error=>errors.push(error));
 return{player,context,commands,audio,modules,events,errors,get node(){return node;},get worker(){return worker;},reply(id,state={},result=true,error){worker.onmessage({data:{type:'reply',id,state,result,error}});},receive(message){node.port.onmessage({data:message});}};
}

async function scenario(native){
 const h=harness(native),p=h.player;await p.initialize({destination:true});
 assert.deepEqual(h.modules,['https://test.example/app/midi-output-worklet.js']);assert.equal(h.node.name,'rawl-midi-output');
 let starts=0;p.setPlaybackStartedCallback(()=>starts++);
 const load=p.loadData(new Uint8Array([1,2]),'source.mid',true,[1],[9],2,'qanun');
 const loadId=h.commands.at(-1).id;p.setTempo(1.5);const tempoId=h.commands.at(-1).id;
 h.reply(loadId,{durationMs:5000,numVoices:2,voiceNames:['Piano','Sax'],metadata:{source:'source.mid'},isPlaying:false});await load;
 assert.equal(p.getDurationMs(),5000);assert.equal(p.getVoiceName(1),'Sax');assert.equal(p.isPlaying(),true);
 h.reply(tempoId,{tempo:1.5});
 const generation=h.audio.filter(x=>x.message.type==='invalidate').at(-1).message.generation;
 h.receive({type:'position',generation:generation-1,positionMs:9000,contextTime:1,speed:1,limitMs:10000});assert.equal(p.getPositionMs(),0);
 h.receive({type:'position',generation,positionMs:100,contextTime:1,speed:1.5,limitMs:800,underruns:0});assert.equal(starts,1);
 h.context.currentTime=1.2;assert.ok(Math.abs(p.getPositionMs()-400)<1e-8);h.context.currentTime=2;assert.equal(p.getPositionMs(),800);
 p.pause();assert.equal(p.getPositionMs(),800);assert.equal(p.isPaused(),true);
 h.receive({type:'position',generation,positionMs:4000,contextTime:2,speed:1,limitMs:5000});assert.equal(p.getPositionMs(),800);
 p.togglePause();assert.equal(p.isPlaying(),true);p.seekMs(-1);p.seekMs(6000);p.seekMs(1200);assert.equal(p.getPositionMs(),1200);
 p.setTempo(10);assert.equal(p.getTempo(),4);p.setTempo(-2);assert.equal(p.getTempo(),.1);
 const mask=[true,false];p.setVoiceMask(mask);mask[0]=false;assert.equal(p.getVoiceMask()[0],true);
 p.setDrumVoices([1]);p.setForcedPanning(true);p.setTranspose(3);p.setParameter('reverb',.2);p.setParameter('soundfont','bank.sf2');
 const sf=p.loadSoundfont('bank.sf2',new ArrayBuffer(4)),sfId=h.commands.at(-1).id;h.reply(sfId,{},'loaded');assert.equal(await sf,'loaded');
 p.stop();assert.equal(p.getPositionMs(),0);assert.equal(p.isPlaying(),false);
 const log={commands:plain(h.commands),audio:plain(h.audio),events:h.events};p.dispose();assert.equal(h.worker.terminated,true);assert.equal(h.node.disconnected,true);assert.equal(h.node.port.closed,true);
 await Promise.resolve();return log;
}
test('injected transport matches pinned Rawl worker protocol, generations and consumed-audio clock',async()=>{assert.deepEqual(await scenario(true),await scenario(false));});

test('pending requests reject and resources close on processor failure or disposal',async()=>{
 const h=harness(true),p=h.player;await p.initialize({});const pending=p.loadData(new Uint8Array([1]),'pending.mid');
 const rejected=assert.rejects(pending,/audio output processor stopped/);h.node.onprocessorerror();await rejected;
 assert.equal(h.worker.terminated,true);assert.equal(p.isPlaying(),false);assert.ok(h.errors.some(error=>typeof error==='string'&&error.includes('audio output processor stopped')));
 const before=h.commands.length;await assert.rejects(p.loadSoundfont('bank',new ArrayBuffer(0)),/unavailable/);assert.equal(h.commands.length,before);p.dispose();assert.equal(h.node.port.closed,true);
 const a=harness(true);await a.player.initialize({});const load=a.player.loadData(new Uint8Array([1]),'dispose.mid');const disposed=assert.rejects(load,/disposed/);a.player.dispose();await disposed;
 const b=harness(true,{noWorklet:true});await assert.rejects(b.player.initialize({}),/AudioWorklet support/);
 const c=harness(true,{addModuleFailure:true});await assert.rejects(c.player.initialize({}),/module failure/);
});

test('the unchanged Rawl output-worklet protocol gate passes against the shared byte-identical copy',()=>{
 const gate=fixture('check-midi-output.cjs');let passed=false;
 vm.runInNewContext(gate,{__dirname:'/pinned/scripts/rawl',Float32Array,require(name){if(name==='node:fs')return{readFileSync(filename){assert.equal(filename,'/pinned/public/midi-output-worklet.js');return worklet;}};return require(name);},console:{log(message){assert.equal(message,'MIDI output protocol checks passed.');passed=true;}}});
 assert.equal(passed,true);
});
