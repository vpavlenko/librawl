import assert from 'node:assert/strict';
import test from 'node:test';
import {createTransport} from '../src/audio/transport.js';

function harness(t,{fast=true}={}){
  let frameId=0, resolvePreparation, planCount=0;
  const frames=new Map(), starts=[], positions=[], auditions=[], gains=[];
  t.mock.method(globalThis,'requestAnimationFrame',callback=>{
    frames.set(++frameId,callback);
    return frameId;
  });
  t.mock.method(globalThis,'cancelAnimationFrame',id=>frames.delete(id));
  const context={
    state:'running',currentTime:10,destination:{},
    createGain(){
      const automation=[];
      const node={
        gain:{
          value:1,automation,
          cancelScheduledValues(time){automation.push(['cancel',time]);},
          setValueAtTime(value,time){automation.push([value,time]);},
        },
        connect(){},disconnect(){},
      };
      gains.push(node);
      return node;
    },
  };
  const engine={
    canDiscardQueuedEvents:fast,
    play(plan,mixers,offset){
      starts.push({plan,mixers,offset});
      return context.currentTime+.045;
    },
    createClock(_plan,start,offset){
      const beat=()=>context.currentTime>=start?offset+context.currentTime-start:null;
      return {beat,position:()=>beat()??offset};
    },
    stop(){this.fence=context.currentTime+.14;},
    audition(note){auditions.push(note);},
  };
  const preparation=new Promise(resolve=>{resolvePreparation=()=>resolve(engine);});
  const transport=createTransport({
    audio:{prepare:()=>preparation,stop(){},getContext:()=>context},
    keyboardTarget:false,
    makePlan:(data,tempo)=>({data,tempo,id:++planCount}),
    onPosition:beat=>positions.push({beat,position:transport.position}),
    onError:error=>{throw error;},
  });
  transport.load({beats:32,tempo:160,voices:[{voice:1,program:66}]});
  return {context,frames,gains,starts,positions,auditions,transport,resolvePreparation,
    nextFrame(time){
      context.currentTime=time;
      for(const [id,callback] of [...frames]){
        if(!frames.delete(id))continue;
        callback();
      }
    },
  };
}

// Node does not install browser animation-frame functions.
globalThis.requestAnimationFrame ??= () => {};
globalThis.cancelAnimationFrame ??= () => {};

test('Cold preparation and warm seek bursts start only the latest position',async t=>{
  const h=harness(t),{transport}=h;
  const playing=transport.play();
  for(const beat of [1,3,7])transport.seek(beat);
  assert.equal(transport.state,'loading');
  assert.equal(transport.position,7);
  assert.deepEqual(h.positions.at(-1),{beat:null,position:7});
  h.resolvePreparation();
  await playing;
  assert.deepEqual(h.starts.map(start=>start.offset),[7]);
  assert.deepEqual(h.positions.at(-1),{beat:null,position:7},'No sounding highlight before output starts');
  h.nextFrame(10.2);
  assert.ok(h.positions.at(-1).beat>7);

  for(const beat of [5,10,15])transport.seek(beat);
  assert.equal(h.frames.size,1);
  assert.equal(transport.state,'playing');
  assert.deepEqual(h.positions.at(-1),{beat:null,position:15});
  assert.equal(h.gains.length,3);
  h.nextFrame(10.21);
  assert.deepEqual(h.starts.map(start=>start.offset),[7,15]);
  assert.equal(h.starts[0].plan,h.starts[1].plan);
  assert.equal(h.starts[0].mixers,h.starts[1].mixers);
  assert.deepEqual(h.gains[0].gain.automation,[['cancel',10.2],[0,10.2],[.28,10.21+.045]]);
  assert.deepEqual(h.positions.at(-1),{beat:null,position:15});

  transport.seek(20);
  transport.pause();
  h.nextFrame(10.3);
  assert.equal(h.starts.length,2);
  assert.equal(h.frames.size,0);
  assert.equal(transport.position,20);
});

test('Legacy synth commits the latest seek after its existing fence once',async t=>{
  const h=harness(t,{fast:false}),{transport}=h;
  const playing=transport.play();
  h.resolvePreparation();
  await playing;
  transport.seek(3);
  h.nextFrame(10.06);
  transport.seek(9);
  h.nextFrame(10.1);
  transport.seek(11);
  assert.equal(h.frames.size,1);
  assert.deepEqual(h.starts.map(start=>start.offset),[0]);
  h.nextFrame(10.141);
  assert.deepEqual(h.starts.map(start=>start.offset),[0,11]);
  transport.destroy();
});

test('Only the latest note audition sounds after shared cold preparation',async t=>{
  const h=harness(t),{transport}=h;
  const requests=[60,61,62,63].map(pitch=>transport.audition({pitch,duration:1,voice:1}));
  h.resolvePreparation();
  await Promise.all(requests);
  assert.deepEqual(h.auditions,[{pitch:63,duration:.375,velocity:80,program:66}]);
  transport.destroy();
});

test('A score seek supersedes an audition still waiting for the synth',async t=>{
  const h=harness(t),{transport}=h;
  const audition=transport.audition({pitch:60,duration:1});
  transport.seek(5);
  h.resolvePreparation();
  await audition;
  assert.deepEqual(h.auditions,[]);
  assert.equal(transport.position,5);
  transport.destroy();
});
