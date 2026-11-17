import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundFontPlayback} from '../src/audio/soundfont-playback.js';
import {createTransport} from '../src/audio/transport.js';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
function plan(tempo=120,notes=[{pitch:60,start:0,end:8},{pitch:72,start:0,end:6,channel:1,group:1},{pitch:64,start:4,end:6}]){
 notes=notes.map(n=>({channel:0,group:0,velocity:80,...n,duration:n.end-n.start}));
 const events=[{beat:0,type:'program',channel:0,program:0},{beat:0,type:'program',channel:1,program:65},{beat:0,type:'cc',channel:1,controller:64,value:127},...notes.flatMap(n=>[{beat:n.start,type:'on',channel:n.channel,pitch:n.pitch,velocity:n.velocity},{beat:n.end,type:'off',channel:n.channel,pitch:n.pitch}])];
 return{notes,events,channels:[{channel:0,group:0},{channel:1,group:1}],beats:12,duration:12*60/tempo,timeAt:beat=>beat*60/tempo,beatAt:time=>time*tempo/60};
}
function harness(latency=0){
 let serial=0;const intervals=new Map(),timeouts=new Map(),calls=[],delivered=[],queue=[],held=new Set(),frames=new Map();
 const ctx={currentTime:0,state:'running',sampleRate:8000,baseLatency:0,outputLatency:latency,destination:{},resume:async()=>{},getOutputTimestamp(){return{contextTime:Math.max(0,this.currentTime-latency),performanceTime:1000+this.currentTime*1000};},createGain(){return{gain:{value:1,setValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){}};},createConvolver(){return{connect(){},disconnect(){}};},createBuffer(_n,len){return{getChannelData:()=>new Float32Array(len)};}};
 const env={performance:{now:()=>1000+ctx.currentTime*1000},setInterval(fn){const id=++serial;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id),setTimeout(fn,ms){const id=++serial;timeouts.set(id,{fn,time:ctx.currentTime+ms/1000});return id;},clearTimeout:id=>timeouts.delete(id)};
 const synth={midiChannels:Array.from({length:128},()=>({setDrums(){}})),connectChannel(){},disconnectChannel(){},stopAll(){calls.push({type:'stop'});held.clear();}};
 for(const type of ['on','off','cc','program'])synth[{on:'noteOn',off:'noteOff',cc:'controllerChange',program:'programChange'}[type]]=(channel,a,b,c)=>{const options=type==='on'||type==='cc'?c:b,e={type,channel,time:options.time,...(type==='cc'?{controller:a,value:b}:type==='program'?{program:a}:{pitch:a})};calls.push(e);queue.push(e);queue.sort((a,b)=>a.time-b.time);};
 const api=createSoundFontPlayback({environment:env}),engine=new api.PlaybackEngine(ctx,synth);
 function deliver(){while(queue.length&&queue[0].time<=ctx.currentTime+1e-10){const e=queue.shift();delivered.push(e);const key=e.channel+':'+e.pitch;if(e.type==='on')held.add(key);if(e.type==='off')held.delete(key);if(e.type==='cc'&&e.controller===120)for(const key of [...held])if(key.startsWith(e.channel+':'))held.delete(key);}}
 return{ctx,env,engine,calls,delivered,held,frames,intervals,api:{getContext:()=>ctx,prepare:async()=>engine,stop:()=>engine.stop()},advance(to){while(ctx.currentTime<to-1e-10){ctx.currentTime=Math.min(to,ctx.currentTime+.025);deliver();for(const fn of [...intervals.values()])fn();deliver();for(const[id,t]of [...timeouts])if(t.time<=ctx.currentTime){timeouts.delete(id);t.fn();}for(const[id,fn]of [...frames]){frames.delete(id);fn();}}},raf(fn){const id=++serial;frames.set(id,fn);return id;},cancelRaf:id=>frames.delete(id)};
}

for(const latency of [0,.1])test(`rate changes preserve held piano/sax, graph and audible clock (latency${latency})`,()=>{
 const h=harness(latency),p=plan(),start=h.engine.play(p,[h.ctx.createGain(),h.ctx.createGain()]),clock=h.engine.createClock(p,start),room=h.engine.roomNodes,connections=h.engine.connections;
 h.advance(start+.5);const beat=clock.position(),ons=h.calls.filter(e=>e.type==='on').length,stops=h.calls.filter(e=>e.type==='stop').length;
 h.engine.setRate(2);assert.equal(h.engine.createClock(p,start),clock);close(clock.position(),beat);assert.equal(h.engine.roomNodes,room);assert.equal(h.engine.connections,connections);assert.equal(h.calls.filter(e=>e.type==='on').length,ons);assert.equal(h.calls.filter(e=>e.type==='stop').length,stops);assert.ok(h.held.has('0:60')&&h.held.has('1:72'));
 const end=start+.5+(6-.5)/2;close(clock.endTime(),end);close(clock.remaining(),end-(h.ctx.currentTime-latency));
 h.advance(start+1);close(clock.position(),(0.5+(0.5-latency)*2)*2);
 h.advance(start+1.4);close(h.calls.find(e=>e.type==='on'&&e.pitch===64).time,start+1.25);
 h.advance(start+2.3);assert.equal(h.delivered.filter(e=>e.type==='on'&&e.pitch===60).length,1);close(h.delivered.find(e=>e.type==='off'&&e.pitch===60).time,start+2.25);assert.equal(h.calls.filter(e=>e.type==='program').length,2);assert.equal(h.calls.filter(e=>e.type==='cc'&&e.controller===64).length,1);h.engine.stop();assert.equal(h.intervals.size,0);
});

test('queued events stay committed; rapid changes coalesce at their fence and unsent offs/onsets replan',()=>{
 const h=harness(),p=plan(120,[{pitch:60,start:0,end:8},{pitch:64,start:2,end:3},{pitch:67,start:4,end:5}]),start=h.engine.play(p,[h.ctx.createGain(),h.ctx.createGain()]),clock=h.engine.createClock(p,start);
 h.advance(start+.92);const committed=h.calls.find(e=>e.type==='on'&&e.pitch===64);assert.ok(committed&&committed.time>h.ctx.currentTime);const beat=clock.position();
 h.engine.setRate(2);h.engine.setRate(3);h.engine.setRate(.5);close(clock.position(),beat);assert.equal(h.engine.getRate(),.5);close(clock.endTime(),start+11);
 h.advance(start+3.2);close(h.calls.find(e=>e.type==='on'&&e.pitch===67).time,start+3);assert.equal(h.delivered.filter(e=>e.type==='on'&&e.pitch===64).length,1);close(committed.time,start+1);assert.equal(h.delivered.filter(e=>e.type==='on'&&e.pitch===60).length,1);
 h.engine.setRate(2);h.advance(start+3.5);close(clock.position(),(2.1+.3*2)*2);assert.equal(h.calls.filter(e=>e.type==='stop').length,1);h.engine.stop();
});

test('rate remains relative to the initial plan, including a non120 BPM start and multiple anchors',()=>{
 const h=harness(),p=plan(80),start=h.engine.play(p,[h.ctx.createGain(),h.ctx.createGain()]),clock=h.engine.createClock(p,start);h.advance(start+.6);close(clock.position(),.8);h.engine.setRate(120/80);h.advance(start+1.2);close(clock.position(),2);h.engine.setRate(40/80);h.advance(start+1.8);close(clock.position(),2.4);h.engine.stop();assert.equal(h.engine.remaining(),0);assert.equal(h.engine.getRate(),1);assert.throws(()=>h.engine.setRate(0),/positive/);assert.throws(()=>h.engine.setRate(NaN),/positive/);
});

test('a tempo change before the scheduled first attack preserves the start gate and initial offset',()=>{
 const h=harness(.1),p=plan(),start=h.engine.play(p,[h.ctx.createGain(),h.ctx.createGain()],2),clock=h.engine.createClock(p,start,2);h.engine.setRate(2);assert.equal(clock.beat(),null);assert.equal(clock.position(),2);h.advance(start+.2);close(clock.position(),2.4);assert.equal(h.delivered.filter(e=>e.type==='on'&&e.pitch===60).length,1);h.engine.stop();
});

test('a tempo key after a stalled pump preserves held notes and skips expired attacks without resetting sustain',()=>{
 const h=harness(),p=plan(120,[{pitch:60,start:0,end:12},{pitch:64,start:2,end:3},{pitch:67,start:4,end:6}]),start=h.engine.play(p,[h.ctx.createGain(),h.ctx.createGain()]),clock=h.engine.createClock(p,start);
 h.advance(start+.2);const before=h.calls.length;h.ctx.currentTime=start+1.6;h.engine.setRate(2);const changed=h.calls.slice(before);
 assert.ok(!changed.some(e=>e.type==='on'&&[60,64].includes(e.pitch)));assert.ok(!changed.some(e=>e.type==='cc'||e.type==='program'||e.type==='stop'));close(clock.position(),3.2);
 h.advance(start+1.9);close(h.calls.find(e=>e.type==='on'&&e.pitch===67).time,start+1.8);assert.equal(h.delivered.filter(e=>e.type==='on'&&e.pitch===60).length,1);assert.equal(h.delivered.filter(e=>e.type==='on'&&e.pitch===64).length,0);h.engine.stop();
});

test('end clock still changes after all note offs have been committed and the pump has finished',()=>{
 const h=harness(),p=plan(120,[{pitch:60,start:0,end:1}]),start=h.engine.play(p,[h.ctx.createGain(),h.ctx.createGain()]),clock=h.engine.createClock(p,start);h.advance(start+.8);assert.equal(h.intervals.size,0);const beat=clock.position();h.engine.setRate(2);close(clock.position(),beat);close(clock.endTime(),start+.8+(6-.8)/2);assert.equal(h.calls.filter(e=>e.type==='on').length,1);assert.equal(h.intervals.size,0);h.engine.stop();
});

async function globals(h,fn){const raf=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame;globalThis.requestAnimationFrame=h.raf;globalThis.cancelAnimationFrame=h.cancelRaf;try{await fn();}finally{globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=cancel;}}
test('host transport changes BPM in place, then pause/resume uses the latest plan tempo exactly once',async()=>{
 const h=harness(),made=[],states=[];await globals(h,async()=>{
  const t=createTransport({audio:h.api,makePlan:(_data,bpm)=>{made.push(bpm);return plan(bpm);},onState:s=>states.push(s)});t.load({tempo:80,beats:12});await t.play();const start=h.calls.find(e=>e.type==='on').time;h.advance(start+.6);const position=t.position,ons=h.calls.filter(e=>e.type==='on').length; t.setTempo(120);assert.equal(t.state,'playing');close(t.position,position);assert.equal(h.engine.getRate(),1.5);assert.deepEqual(made,[80]);assert.equal(h.calls.filter(e=>e.type==='on').length,ons);
  h.advance(start+1.2);close(t.position,2);t.pause();close(t.position,2);t.setTempo(160);await t.play();assert.deepEqual(made,[80,160]);assert.equal(h.engine.getRate(),1);const resumed=t.position;t.setTempo(80);assert.equal(h.engine.getRate(),.5);close(t.position,resumed);t.stop();assert.equal(t.position,0);assert.equal(t.state,'idle');assert.equal(h.frames.size,0);assert.equal(h.intervals.size,0);t.destroy();
 });
});

test('pending preparation retains latest tempo without cancelling loading or starting twice',async()=>{
 const h=harness(),made=[],states=[];let resolve;const pending=new Promise(r=>{resolve=r;});h.api.prepare=()=>pending;await globals(h,async()=>{
  const t=createTransport({audio:h.api,makePlan:(_data,bpm)=>{made.push(bpm);return plan(bpm);},onState:s=>states.push(s)});t.load({tempo:80,beats:12});const playing=t.play();await Promise.resolve();t.setTempo(120);t.setTempo(160);assert.equal(t.state,'loading');assert.deepEqual(made,[]);resolve(h.engine);await playing;assert.equal(t.state,'playing');assert.deepEqual(made,[160]);assert.equal(h.engine.getRate(),1);assert.equal(states.filter(s=>s==='loading').length,1);t.stop();
 });
});
