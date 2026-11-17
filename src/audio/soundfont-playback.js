/* One reusable SF2 synthesizer; independent MIDI voices feed the reader's staff mixers. */
export function createSoundFontPlayback(options={}){
 const global=options.environment??globalThis;
 const setTimeout=(...args)=>(global.setTimeout??globalThis.setTimeout).apply(global,args),clearTimeout=(...args)=>(global.clearTimeout??globalThis.clearTimeout).apply(global,args),setInterval=(...args)=>(global.setInterval??globalThis.setInterval).apply(global,args),clearInterval=(...args)=>(global.clearInterval??globalThis.clearInterval).apply(global,args);
 const fetch=(options.fetch??global.fetch??globalThis.fetch)?.bind(global),AbortController=global.AbortController??globalThis.AbortController;
 const reference=global.document?.baseURI??global.location?.href??import.meta.url;
 const resolveAsset=value=>options.assetBase?new URL(String(value),new URL(String(options.assetBase),reference)).href:String(value);
 const libraryUrl=resolveAsset(options.libraryUrl??'./vendor/spessasynth/index.js'),workletUrl=resolveAsset(options.workletUrl??'vendor/spessasynth/spessasynth_processor.min.js');
 const importLibrary=options.importLibrary??(url=>import(url));
 const additionalBanks=(options.additionalBanks??[]).map(bank=>{
  if(!bank||typeof bank.url!=='string'||!bank.name||!Number.isInteger(bank.bytes)||bank.bytes<=0||!/^[a-f0-9]{64}$/.test(bank.sha256))throw new Error('Invalid SoundFont bank descriptor');
  return {...bank,url:resolveAsset(bank.url)};
 });
 const auditionProgram=program=>options.allowAuditionPrograms?program:0;
 const HORIZON=.14,INTERVAL=25,MASTER_GAIN=3,AUDITION_CHANNEL=9;
 // One conservative audition room for every excerpt. This is a wet amplitude
 // coefficient, not a claim to recover a recording's unidentifiable wet mix.
 const ROOM=Object.freeze({wet:.14,seconds:1.1,decaySeconds:.85,preDelay:.014,seed:241024});
 const BANK={bytes:5758964,sha256:'f2a57c0c85d3b118b39d6cf6f5eb9447e8a22ec3884e6f616951412d7f5c3460'};
 let engine,pending,audioContext,phase='idle',lastError=null;
 const aborted=()=>Object.assign(new Error('SoundFont initialization cancelled'),{name:'AbortError'});
 function bounded(promise,milliseconds,stage,signal){
  return new Promise((resolve,reject)=>{
   let done=false;
   const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);fn(value);};
   const cancel=()=>finish(reject,aborted()),timer=setTimeout(()=>finish(reject,new Error('SoundFont '+stage+' timeout')),milliseconds);
   signal?.addEventListener('abort',cancel,{once:true});
   // Observe even a late rejected import/addModule: it cannot become an
   // unhandled rejection after this attempt has timed out or been cancelled.
   Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
   if(signal?.aborted)cancel();
  });
 }
 // Web Audio getOutputTimestamp identifies the sample at the OUTPUT device,
 // unlike currentTime's render-ahead position. Its performanceTime shares
 // performance.now's origin (Web Audio1.1, getOutputTimestamp).
 function presentationTime(context){
  const render=context.currentTime;
  try{
   const stamp=context.getOutputTimestamp?.(),now=global.performance?.now?.();
   if(stamp&&Number.isFinite(now)&&Number.isFinite(stamp.contextTime)&&stamp.contextTime>=0&&Number.isFinite(stamp.performanceTime)&&stamp.performanceTime>0&&stamp.performanceTime<=now&&now-stamp.performanceTime<1000){
    const projected=stamp.contextTime+(now-stamp.performanceTime)/1000;
    if(projected<=render+.005)return Math.min(render,projected);
   }
  }catch{}
  const latency=[context.baseLatency,context.outputLatency].reduce((sum,value)=>sum+(Number.isFinite(value)&&value>0?value:0),0);
  return Math.max(0,render-latency);
 }
 function soundingIntervals(plan,note){
  const EPS=1e-6;
  return plan.notes.filter(n=>n.group===note.group&&n.pitch===note.pitch&&n.start<=note.start+EPS&&n.start<note.end-EPS&&n.start+n.duration>note.start+EPS).map(n=>[Math.max(n.start,note.start),n.start+n.duration>note.end+EPS?Math.min(n.end,note.end):n.end]).filter(([start,end])=>end>start);
 }
 function roomImpulse(context){
  const rate=context.sampleRate,length=Math.ceil(rate*ROOM.seconds),buffer=context.createBuffer(2,length,rate),delay=Math.ceil(rate*ROOM.preDelay);let random=ROOM.seed;
  // Fixed stereo diffuse tail, low-passed and energy-normalized. normalize=false
  // avoids browser-dependent convolver gain normalization; dry path is untouched.
  for(let channel=0;channel<2;channel++){
   const samples=buffer.getChannelData(channel);let previous=0,energy=0;
   for(let i=delay;i<length;i++){random=(Math.imul(random,1664525)+1013904223)>>>0;previous=.58*previous+.42*(random/2147483648-1);const t=(i-delay)/rate; samples[i]=previous*Math.exp(-Math.log(1000)*t/ROOM.decaySeconds);energy+=samples[i]*samples[i];}
   const scale=1/Math.sqrt(energy||1);for(let i=delay;i<length;i++)samples[i]*=scale;
  }
  return buffer;
 }
 class PlaybackEngine{
  constructor(context,synth){this.context=context;this.synth=synth;this.connections=[];this.fence=0;this.interval=null;this.roomConnections=[];this.roomNodes=[];this.roomBuffer=null;this.auditionState=null;this.auditionFence=0;this.overlapAudition=null;}
  stopAudition(){
   this.stopOverlapAudition();
   const entry=this.auditionState;if(!entry)return;
   this.auditionState=null;clearTimeout(entry.offTimer);clearTimeout(entry.cleanupTimer);
   // Cancel only the reserved preview channel, including a queued attack.
   // Neither the excerpt scheduler nor its channel mixers are touched.
   if(entry.connected){
    const time=Math.max(this.context.currentTime,this.auditionFence)+.001;
    this.auditionFence=time;try{this.synth.controllerChange(AUDITION_CHANNEL,120,0,{time});}catch{}
    try{this.synth.disconnectChannel(entry.output,AUDITION_CHANNEL);}catch{}
   }
   for(const node of entry.nodes)try{node.disconnect();}catch{}
   if(!entry.ended){entry.ended=true;try{entry.onEnd('cancelled');}catch(error){console.error(error);}}
   try{entry.onDispose();}catch(error){console.error(error);}
  }
  audition({pitch,duration,velocity=72,program=0},onEnd=()=>{},onDispose=()=>{}){
   program=auditionProgram(program);
   if(!Number.isInteger(pitch)||pitch<0||pitch>127||!Number.isFinite(duration)||duration<=0||!Number.isFinite(velocity)||!Number.isInteger(program)||program<0||program>127)throw new Error('Invalid audition note');
   if(typeof this.synth.midiChannels?.[AUDITION_CHANNEL]?.setDrums!=='function')throw new Error('Audition channel unavailable');
   this.stopAudition();
   const context=this.context,start=Math.max(context.currentTime+.01,this.auditionFence+.005),end=start+duration;
   const entry={nodes:[],output:null,connected:false,onEnd,onDispose,ended:false,offTimer:null,cleanupTimer:null};this.auditionState=entry;
   try{
    const output=context.createGain();entry.output=output;entry.nodes.push(output);output.gain.value=0;output.gain.setValueAtTime(MASTER_GAIN,start);output.connect(context.destination);
    if(context.createConvolver&&context.createBuffer){
     this.roomBuffer??=roomImpulse(context);
     const convolver=context.createConvolver(),wet=context.createGain();entry.nodes.push(convolver,wet);convolver.normalize=false;convolver.buffer=this.roomBuffer;wet.gain.value=ROOM.wet;
     output.connect(convolver);convolver.connect(wet);wet.connect(context.destination);
    }
    entry.connected=true;this.synth.connectChannel(output,AUDITION_CHANNEL);
    this.synth.midiChannels[AUDITION_CHANNEL].setDrums(false);
    for(const [controller,value]of [[0,0],[32,0],[7,100],[10,64],[11,127],[64,0]])this.synth.controllerChange(AUDITION_CHANNEL,controller,value,{time:start});
    this.synth.programChange(AUDITION_CHANNEL,program,{time:start});
    this.synth.noteOn(AUDITION_CHANNEL,pitch,Math.max(1,Math.min(127,Math.round(velocity))),{time:start});this.auditionFence=start;
    // Keep note-off outside the worklet's future queue. Replacing a preview
    // must never leave an old same-pitch note-off capable of cutting the new one.
    const release=()=>{
     if(this.auditionState!==entry)return;entry.offTimer=null;
     // A suspended context can lag the wall timer. Wait for its audio clock
     // instead of queuing a distant off that could outlive this preview.
     if(context.currentTime<end){entry.offTimer=setTimeout(release,Math.max(1,(end-context.currentTime)*1000));return;}
     const time=context.currentTime;
     try{this.synth.noteOff(AUDITION_CHANNEL,pitch,{time});}catch(error){this.stopAudition();console.error(error);return;}
     this.auditionFence=Math.max(this.auditionFence,time);
     entry.ended=true;
     entry.cleanupTimer=setTimeout(()=>{if(this.auditionState===entry)this.stopAudition();},(ROOM.seconds+.1)*1000);
     try{entry.onEnd('ended');}catch(error){console.error(error);}
    };
    entry.offTimer=setTimeout(release,Math.max(0,(end-context.currentTime)*1000));
   }catch(error){this.stopAudition();throw error;}
   return{start,end,cancel:()=>{if(this.auditionState===entry)this.stopAudition();}};
  }
  stopOverlapAudition(){
   const bus=this.overlapAudition;if(!bus)return;
   for(const entry of [...bus.entries])entry.cancel();
  }
  auditionOverlap({pitch,duration,velocity=72,program=0},onEnd=()=>{},onDispose=()=>{}){
   program=auditionProgram(program);
   if(!Number.isInteger(pitch)||pitch<0||pitch>127||!Number.isFinite(duration)||duration<=0||!Number.isFinite(velocity)||!Number.isInteger(program)||program<0||program>127)throw new Error('Invalid audition note');
   if(typeof this.synth.midiChannels?.[AUDITION_CHANNEL]?.setDrums!=='function')throw new Error('Audition channel unavailable');
   // A Shift sweep owns one continuously connected dry/room graph. MIDI ports
   // have independent keys but share reserved output9, so two attacks of the
   // same pitch can finish independently without a channel-wide interruption.
   if(!this.overlapAudition){
    this.stopAudition();
    const bus={nodes:[],entries:new Set(),connected:false,output:null};this.overlapAudition=bus;
    try{
     const output=this.context.createGain();bus.output=output;bus.nodes.push(output);output.gain.value=0;output.connect(this.context.destination);
     if(this.context.createConvolver&&this.context.createBuffer){
      this.roomBuffer??=roomImpulse(this.context);
      const convolver=this.context.createConvolver(),wet=this.context.createGain();bus.nodes.push(convolver,wet);convolver.normalize=false;convolver.buffer=this.roomBuffer;wet.gain.value=ROOM.wet;
      output.connect(convolver);convolver.connect(wet);wet.connect(this.context.destination);
     }
     bus.connected=true;this.synth.connectChannel(output,AUDITION_CHANNEL);
    }catch(error){
     this.overlapAudition=null;if(bus.connected)try{this.synth.disconnectChannel(bus.output,AUDITION_CHANNEL);}catch{}
     for(const node of bus.nodes)try{node.disconnect();}catch{}throw error;
    }
   }
   const bus=this.overlapAudition,context=this.context;let channel=AUDITION_CHANNEL;
   while([...bus.entries].some(entry=>entry.channel===channel))channel+=16;
   if(channel>=this.synth.midiChannels.length){
    if(typeof this.synth.addNewChannel!=='function')throw new Error('Audition polyphony unavailable');
    while(channel>=this.synth.midiChannels.length)this.synth.addNewChannel();
   }
   const start=Math.max(context.currentTime+.01,this.auditionFence+.005),end=start+duration;
   const entry={channel,offTimer:null,cleanupTimer:null,ended:false,cancel:null};bus.entries.add(entry);
   const finish=reason=>{if(entry.ended)return;entry.ended=true;try{onEnd(reason);}catch(error){console.error(error);}};
   const dispose=()=>{
    if(!bus.entries.delete(entry))return;clearTimeout(entry.offTimer);clearTimeout(entry.cleanupTimer);
    if(!bus.entries.size&&this.overlapAudition===bus){
     this.overlapAudition=null;
     if(bus.connected)try{this.synth.disconnectChannel(bus.output,AUDITION_CHANNEL);}catch{}
     for(const node of bus.nodes)try{node.disconnect();}catch{}
    }
    try{onDispose();}catch(error){console.error(error);}
   };
   entry.cancel=()=>{
    if(!bus.entries.has(entry))return;
    const time=Math.max(context.currentTime,start,this.auditionFence)+.001;this.auditionFence=time;
    try{this.synth.controllerChange(channel,120,0,{time});}catch{}
    finish('cancelled');dispose();
   };
   try{
    if(bus.entries.size===1){
     bus.output.gain.setValueAtTime(0,start);
     // Fade in the bus once; later notes use their original piano attack and
     // never reset a gain, channel, convolver or a preceding note's lifetime.
     if(bus.output.gain.linearRampToValueAtTime)bus.output.gain.linearRampToValueAtTime(MASTER_GAIN,start+.005);
     else bus.output.gain.setValueAtTime(MASTER_GAIN,start);
    }
    this.synth.midiChannels[channel].setDrums(false);
    // Added MIDI ports start with zeroed modifier controllers; reset them to
    // neutral before applying the same piano setup as the original preview.
    this.synth.controllerChange(channel,121,0,{time:start});
    for(const controller of [8,71,72,73,74,75,76,77,78,81,83])this.synth.controllerChange(channel,controller,64,{time:start});
    for(const controller of [100,101])this.synth.controllerChange(channel,controller,127,{time:start});
    for(const [controller,value]of [[0,0],[32,0],[7,100],[10,64],[11,127],[64,0]])this.synth.controllerChange(channel,controller,value,{time:start});
    this.synth.programChange(channel,program,{time:start});
    this.synth.noteOn(channel,pitch,Math.max(1,Math.min(127,Math.round(velocity))),{time:start});this.auditionFence=start;
    const release=()=>{
     if(!bus.entries.has(entry))return;entry.offTimer=null;
     if(context.currentTime<end){entry.offTimer=setTimeout(release,Math.max(1,(end-context.currentTime)*1000));return;}
     try{this.synth.noteOff(channel,pitch,{time:context.currentTime});}catch(error){entry.cancel();console.error(error);return;}
     finish('ended');entry.cleanupTimer=setTimeout(dispose,(ROOM.seconds+.1)*1000);
    };
    entry.offTimer=setTimeout(release,Math.max(0,(end-context.currentTime)*1000));
   }catch(error){entry.cancel();throw error;}
   return{start,end,cancel:entry.cancel};
  }
  createClock(plan,start,offset=0){
   const offsetTime=plan.timeAt(offset),end=plan.beats??plan.beatAt(plan.duration);let previous=offset;
   const beat=()=>{
    const now=presentationTime(this.context);if(now<start)return null;
    previous=Math.max(previous,Math.min(end,plan.beatAt(offsetTime+now-start)));return previous;
   };
   return{beat,position:()=>beat()??offset};
  }
  stop(){
   this.stopAudition();
   clearInterval(this.interval);this.interval=null;
   for(const [mixer,convolver] of this.roomConnections)try{mixer.disconnect(convolver);}catch{}
   for(const node of this.roomNodes)try{node.disconnect();}catch{}
   this.roomConnections=[];this.roomNodes=[];
   const channels=new Set(this.connections.map(([channel])=>channel));
   for(const [channel,mixer] of this.connections){try{this.synth.disconnectChannel(mixer,channel);}catch{}}
   this.connections=[];this.synth.stopAll(true);
   // A queued note-on can outlive the cancelled JS pump. Clear it after the queue fence.
   if(channels.size){const time=Math.max(this.context.currentTime,this.fence)+.001;for(const channel of channels)this.synth.controllerChange(channel,120,0,{time});this.fence=time;}
  }
  play(plan,mixers,offset=0,output=this.context.destination){
   if(plan.channels.some(channel=>channel.channel===AUDITION_CHANNEL))throw new Error('Reserved audition channel');
   this.stop();
   const context=this.context,start=Math.max(context.currentTime+.045,this.fence+.025),offsetTime=plan.timeAt(offset);
   // Feed the room AFTER staff gains: mute, solo preview, dynamics and hand
   // balance affect both dry and wet. A fresh convolver clears tails on Stop,
   // pause, seek or an excerpt switch; only its immutable impulse is reused.
   if(context.createConvolver&&context.createBuffer){
    this.roomBuffer??=roomImpulse(context);
    const convolver=context.createConvolver(),wet=context.createGain();convolver.normalize=false;convolver.buffer=this.roomBuffer;wet.gain.value=ROOM.wet;
    this.roomNodes=[convolver,wet];convolver.connect(wet);wet.connect(output);
    for(const mixer of new Set(mixers)){mixer.connect(convolver);this.roomConnections.push([mixer,convolver]);}
   }
   // All old queued events precede this fence; clear them before the next excerpt begins.
   for(const channel of plan.channels){this.synth.controllerChange(channel.channel,120,0,{time:start-.003});this.synth.connectChannel(mixers[channel.group],channel.channel);this.connections.push([channel.channel,mixers[channel.group]]);}
   const snapshotAt=beat=>{const snapshot=new Map();for(const event of plan.events)if(event.beat<=beat&&['program','cc'].includes(event.type))snapshot.set([event.channel,event.type,event.controller??''].join(':'),{...event,beat});return [...snapshot.values()];};
   const heldAt=beat=>plan.notes.filter(n=>n.start<beat&&n.end>beat).map(n=>({beat,type:'on',channel:n.channel,pitch:n.pitch,velocity:n.velocity}));
   const events=[...snapshotAt(offset),...heldAt(offset),...plan.events.filter(e=>e.beat>=offset&&(e.type==='on'||e.type==='off')||e.beat>offset&&e.type==='cc')];
   const priority=e=>e.type==='cc'&&[0,32].includes(e.controller)?-1:{program:0,cc:1,off:2,on:3}[e.type];events.sort((a,b)=>a.beat-b.beat||priority(a)-priority(b));
   let cursor=0;
   const send=(event,time)=>{
    this.fence=Math.max(this.fence,time);const options={time};
    if(event.type==='program')this.synth.programChange(event.channel,event.program,options);
    else if(event.type==='cc')this.synth.controllerChange(event.channel,event.controller,event.value,options);
    else if(event.type==='on')this.synth.noteOn(event.channel,event.pitch,event.velocity,options);
    else this.synth.noteOff(event.channel,event.pitch,options);
   };
   const pump=()=>{
    const until=context.currentTime+HORIZON;
    // A throttled/background JS timer must not burst all expired attacks into
    // the current audio quantum. Recover the current score state, preserving
    // the original absolute timeline and the following scheduled onsets.
    if(cursor<events.length&&start+plan.timeAt(events[cursor].beat)-offsetTime<context.currentTime-HORIZON){
     const time=context.currentTime+.01,beat=plan.beatAt(offsetTime+time-start);
     for(const channel of plan.channels)this.synth.controllerChange(channel.channel,120,0,{time});
     [...snapshotAt(beat),...heldAt(beat)].sort((a,b)=>priority(a)-priority(b)).forEach(event=>send(event,time));
     while(cursor<events.length&&events[cursor].beat<beat)cursor++;
    }
    while(cursor<events.length){
     const event=events[cursor],time=start+(plan.timeAt(event.beat)-offsetTime);if(time>until)break;cursor++;
     send(event,time);
    }
    if(cursor===events.length){clearInterval(this.interval);this.interval=null;}
   };
   this.interval=setInterval(pump,INTERVAL);pump();return start;
  }
 }
 async function prepare(context){
  if(context.state==='closed')throw new Error('AudioContext closed');
  audioContext??=context;
  if(audioContext!==context)throw new Error('Shared AudioContext required');
  if(engine)return engine;
  if(pending)return pending.promise;
  const attempt={controller:new AbortController(),synth:null,warmup:null,cleanup:[]},signal=attempt.controller.signal;
  pending=attempt;lastError=null;
  function dispose(){
   for(const cleanup of attempt.cleanup.splice(0))try{cleanup();}catch{}
   try{attempt.warmup?.disconnect();}catch{}
   if(attempt.synth){try{attempt.synth.destroy();}catch{}attempt.synth=null;}
  }
  attempt.promise=(async()=>{
   try{
    if(!context.audioWorklet)throw new Error('AudioWorklet unavailable');
    if(context.state&&context.state!=='running'){phase='resume';await bounded(context.resume(),10000,'resume',signal);}
    phase='assets';
    const loadBank=async(url,lock)=>{
     const response=await fetch(url+(url.includes('?')?'&':'?')+'sha256='+lock.sha256,{signal});
     if(!response.ok)throw new Error('SoundFont HTTP '+response.status);
     const bytes=new Uint8Array(await response.arrayBuffer());
     if(bytes.length!==lock.bytes)throw new Error('SoundFont bank length '+bytes.length);
     if(global.crypto?.subtle){const digest=await global.crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');if(hash!==lock.sha256)throw new Error('SoundFont bank checksum');}
     return bytes;
    };
    const banks=[{url:resolveAsset('assets/soundfonts/GeneralUser-GS-v4.sf2.1'),name:'caplin',...BANK},...additionalBanks];
    const [library,...bankBytes]=await bounded(Promise.all([importLibrary(libraryUrl),...banks.map(bank=>loadBank(bank.url,bank))]),30000,'assets',signal);
    phase='module';await bounded(context.audioWorklet.addModule(workletUrl),10000,'module',signal);
    let fail;
    const failure=new Promise((_,reject)=>{fail=error=>reject(error instanceof Error?error:new Error(String(error)));});failure.catch(()=>{});
    const synth=new library.WorkletSynthesizer(context,{oneOutput:false,eventsEnabled:false,audioNodeCreators:{worklet(ctx,name,options){
     const node=new global.AudioWorkletNode(ctx,name,options),processorError=()=>fail(new Error('SoundFont worklet processor error')),messageError=()=>fail(new Error('SoundFont worklet message error'));
     node.addEventListener('processorerror',processorError);node.port.addEventListener('messageerror',messageError);
     attempt.cleanup.push(()=>{node.removeEventListener('processorerror',processorError);node.port.removeEventListener('messageerror',messageError);});return node;
    }}});
    attempt.synth=synth;
    // SpessaSynth reports bank parse failure as an event, while its loading
    // promise only resolves on success. Bridge the error into our await.
    synth.eventHandler.addEvent('soundBankError','caplin-initialization',fail);
    attempt.cleanup.push(()=>synth.eventHandler.removeEvent('soundBankError','caplin-initialization'));
    // Keep the worklet in the live graph before waiting for its decoder and
    // bank handshake. Some browsers do not service disconnected worklets.
    const warmup=context.createGain();attempt.warmup=warmup;warmup.gain.value=0;warmup.connect(context.destination);synth.connect(warmup);
    phase='ready';await bounded(Promise.race([synth.isReady,failure]),10000,'ready',signal);
    synth.setLogLevel(false,false,false);
    for(let i=0;i<banks.length;i++){phase='bank';await bounded(Promise.race([synth.soundBankManager.addSoundBank(bankBytes[i].buffer,banks[i].name),failure]),10000,i?'additional bank':'bank',signal);}
    if(signal.aborted)throw aborted();
    synth.setSystemParameter('effectsEnabled',false);synth.setSystemParameter('gain',.8);
    synth.disconnect(warmup);warmup.disconnect();attempt.warmup=null;
    for(const cleanup of attempt.cleanup.splice(0))cleanup();
    engine=new PlaybackEngine(context,synth);attempt.synth=null;phase='ready';return engine;
   }catch(error){attempt.controller.abort();dispose();if(pending===attempt){phase=error.name==='AbortError'?'idle':'failed';lastError=String(error);}throw error;}
  })();
  try{return await attempt.promise;}finally{if(pending===attempt)pending=null;}
 }
 function stop(){if(pending){const attempt=pending;pending=null;attempt.controller.abort();phase='idle';}engine?.stop();}
 return {prepare,stop,stopAudition:()=>engine?.stopAudition(),getContext:()=>audioContext,getPreparationState:()=>({phase,pending:!!pending,error:lastError}),PlaybackEngine,presentationTime,soundingIntervals,room:ROOM,roomImpulse,masterGain:MASTER_GAIN};
}
