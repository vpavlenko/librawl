import {bindPlaybackKeys} from './playback-keys.js';

/** Host transport; renderer package remains independent of this audio engine. */
export function createTransport({makePlan,audio:providedAudio,onState=()=>{},onPosition=()=>{},onError=()=>{},keyboardTarget=globalThis.document}={}){
 if(typeof makePlan!=='function')throw new TypeError('makePlan is required');
 const audioEngine=()=>providedAudio??globalThis.SoundFontPlayback;
 let data=null,engine=null,context=null,clock=null,plan=null,position=0,tempo=120,planTempo=120,state='idle',token=0,frame=null,seekFrame=null,seekPending=false,nodes=[],mixers=[],output=null,muted=new Set(),auditionVoice=null,auditionGeneration=0;
 const keys=keyboardTarget?bindPlaybackKeys({target:keyboardTarget,pause}):null;
 const emit=s=>{state=s;keys?.setActive(s==='playing'||s==='loading');onState(s);};
 function disconnect(){for(const n of nodes)try{n.disconnect();}catch{}nodes=[];mixers=[];output=null;}
 function cancelFrame(){if(frame!==null)cancelAnimationFrame(frame);frame=null;}
 function cancel(){
  token++;
  cancelFrame();
  if(seekFrame!==null)cancelAnimationFrame(seekFrame);
  seekFrame=null;
  clock=null;
  seekPending=false;
  auditionGeneration++;
  auditionVoice=null;
  audioEngine()?.stop();
  disconnect();
 }
 // Caplin's clock separates a transport position from an audible beat. The
 // scheduled attack (and output device latency) can still be ahead of us;
 // position() returns the seek offset then, while beat() correctly returns null.
 function tick(){
  frame=null;
  if(state!=='playing'||!clock)return;
  const beat=clock.beat();
  if(beat!==null){
   position=beat;
   onPosition(beat);
  }
  if(state!=='playing'||!clock)return;
  if(beat!==null&&beat>=data.beats-.001){stop();return;}
  frame=requestAnimationFrame(tick);
 }
 function startPrepared(restoreGain=false){
  if(!output){
   output=context.createGain();
   output.gain.value=.28;
   output.connect(context.destination);
   nodes=[output];
   mixers=[0,1].map(i=>{
    const mixer=context.createGain();
    mixer.gain.value=muted.has(i)?0:1;
    mixer.connect(output);
    nodes.push(mixer);
    return mixer;
   });
  }
  if(!plan||planTempo!==tempo){plan=makePlan(data,tempo);planTempo=tempo;}
  const start=engine.play(plan,mixers,position,output);
  if(restoreGain)output.gain.setValueAtTime(.28,start);
  clock=engine.createClock(plan,start,position);
  if(state!=='playing')emit('playing');
  tick();
 }
 function fail(error,run){
  if(run!==token||error.name==='AbortError')return;
  cancel();
  emit('error');
  onPosition(null);
  onError(error);
 }
 async function play(){
  if(!data||state==='loading'||state==='playing')return;
  if(position>=data.beats){position=0;onPosition(null);}
  const run=++token;
  emit('loading');
  try{
   const audio=audioEngine();if(!audio)throw Error('Playback engine missing');
   context??=audio.getContext()??new (globalThis.AudioContext||globalThis.webkitAudioContext)();
   if(context.state!=='running')await context.resume();
   if(run!==token)return;
   const prepared=engine??await audio.prepare(context);
   if(run!==token)return;
   engine=prepared;
   startPrepared();
  }catch(error){fail(error,run);}
 }
 function pause(){if(clock)position=clock.position();cancel();emit('paused');onPosition(data?position:null);}
 function stop(){cancel();position=0;emit('idle');onPosition(null);}
 function seek(beat){
  if(!data||!Number.isFinite(beat))return;
  position=Math.max(0,Math.min(data.beats,beat));
  auditionGeneration++;
  auditionVoice=null;
  engine?.stopAudition?.();
  if(state==='playing'&&!seekPending){
   seekPending=true;
   cancelFrame();
   clock=null;
   const run=token;
   try{
    // Keep the context, plan and mixers. Real worklet cancellation lets the
    // latest seek start on the following frame. Older backends wait out the
    // posts already sent to their worklet instead of extending their queue.
    let fence=0;
    const restoreGain=!!engine.canDiscardQueuedEvents;
    if(restoreGain){
     output.gain.cancelScheduledValues(context.currentTime);
     output.gain.setValueAtTime(0,context.currentTime);
    }else{
     engine.stop();
     fence=engine.fence??0;
    }
    function restart(){
     seekFrame=null;
     if(run!==token||!seekPending)return;
     if(context.currentTime<fence){seekFrame=requestAnimationFrame(restart);return;}
     seekPending=false;
     try{startPrepared(restoreGain);}catch(error){fail(error,run);}
    }
    if(context.state&&context.state!=='running'){
     void context.resume().then(()=>{if(run===token)seekFrame=requestAnimationFrame(restart);},error=>fail(error,run));
    }else if(run===token)seekFrame=requestAnimationFrame(restart);
   }catch(error){fail(error,run);return;}
  }else if(state==='idle'||state==='error'){
   emit('paused');
  }
  onPosition(state==='paused'?position:null);
 }
 return {
  load(next){stop();data=next;plan=null;tempo=next.tempo;muted.clear();},
  play,pause,stop,seek,
  toggle(){if(state==='playing'||state==='loading')pause();else return play();},
  setTempo(value){const next=Math.max(40,Math.min(260,Number(value)||120));if(clock)position=clock.position();tempo=next;if(state==='playing'&&clock)engine.setRate(next/planTempo);},
  setMuted(voice,value){if(value)muted.add(voice);else muted.delete(voice);if(mixers[voice])mixers[voice].gain.setTargetAtTime(value?0:1,context.currentTime,.008);if(value&&auditionVoice===voice){auditionGeneration++;engine?.stopAudition?.();auditionVoice=null;}},
  async audition(note){
   const run=token,voice=note.voice??0;
   if(muted.has(voice))return;
   const audition=++auditionGeneration;
   auditionVoice=voice;
   const current=()=>run===token&&audition===auditionGeneration&&!muted.has(voice);
   try{
    const audio=audioEngine();
    context??=audio.getContext()??new (globalThis.AudioContext||globalThis.webkitAudioContext)();
    if(context.state!=='running')await context.resume();
    if(!current())return;
    const prepared=engine??await audio.prepare(context);
    if(!current())return;
    engine=prepared;
    const supplied=data?.voices?.find(v=>v.voice===voice)?.program;
    const program=Number.isInteger(supplied)&&supplied>=0&&supplied<=127?supplied:(voice===1?65:0);
    engine.audition({pitch:note.pitch,duration:Math.min(2,note.duration*60/tempo),velocity:note.velocity??(voice===1?80:74),program},()=>{
     if(audition===auditionGeneration)auditionVoice=null;
    });
   }catch(error){
    if(!current())return;
    auditionVoice=null;
    if(error.name!=='AbortError')onError(error);
   }
  },
  destroy(){keys?.destroy();stop();data=null;},
  get state(){return state;},get position(){return position;},get tempo(){return tempo;},get data(){return data;},get mutedVoices(){return [...muted];}
 };
}
