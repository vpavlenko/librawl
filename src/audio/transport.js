/** Host transport; renderer package remains independent of this audio engine. */
export function createTransport({makePlan,audio:providedAudio,onState=()=>{},onPosition=()=>{},onError=()=>{}}={}){
 if(typeof makePlan!=='function')throw new TypeError('makePlan is required');
 const audioEngine=()=>providedAudio??globalThis.SoundFontPlayback;
 let data=null,engine=null,context=null,clock=null,position=0,tempo=120,state='idle',token=0,frame=null,nodes=[],mixers=[],output=null,muted=new Set(),auditionVoice=null,auditionGeneration=0;
 const emit=s=>{state=s;onState(s);};
 function disconnect(){for(const n of nodes)try{n.disconnect();}catch{}nodes=[];mixers=[];output=null;}
 function cancel(){token++;cancelAnimationFrame(frame);frame=null;clock=null;auditionGeneration++;auditionVoice=null;audioEngine()?.stop();disconnect();}
 // Caplin's clock separates a transport position from an audible beat. The
 // scheduled attack (and output device latency) can still be ahead of us;
 // position() returns the seek offset then, while beat() correctly returns null.
 function tick(){if(state!=='playing'||!clock)return;const beat=clock.beat();if(beat!==null)position=beat;onPosition(beat);if(beat!==null&&beat>=data.beats-.001){cancel();position=0;emit('idle');onPosition(null);return;}frame=requestAnimationFrame(tick);}
 async function play(){
  if(!data)return;if(position>=data.beats)position=0;const run=++token;emit('loading');onPosition(null);
  try{
   const audio=audioEngine();if(!audio)throw Error('Playback engine missing');
   context??=audio.getContext()??new (globalThis.AudioContext||globalThis.webkitAudioContext)();
   await context.resume();if(run!==token)return;
   engine=await audio.prepare(context);if(run!==token)return;
   output=context.createGain();output.gain.value=.28;output.connect(context.destination);nodes=[output];
   mixers=[0,1].map(i=>{const n=context.createGain();n.gain.value=muted.has(i)?0:1;n.connect(output);nodes.push(n);return n;});
   const plan=makePlan(data,tempo),start=engine.play(plan,mixers,position,output);clock=engine.createClock(plan,start,position);emit('playing');tick();
  }catch(error){if(run!==token||error.name==='AbortError')return;cancel();emit('error');onError(error);}
 }
 function pause(){if(clock)position=clock.position();cancel();emit('paused');onPosition(null);}
 function stop(){cancel();position=0;emit('idle');onPosition(null);}
 function seek(beat){const resume=state==='playing';if(clock)position=clock.position();cancel();position=Math.max(0,Math.min(data?.beats??0,beat));onPosition(null);if(resume)void play();else emit('paused');}
 return {
  load(next){stop();data=next;tempo=next.tempo;muted.clear();},
  play,pause,stop,seek,
  toggle(){if(state==='playing'||state==='loading')pause();else return play();},
  setTempo(value){const next=Math.max(40,Math.min(260,Number(value)||120)),resume=state==='playing';if(clock)position=clock.position();if(state==='playing'||state==='loading')cancel();tempo=next;if(resume)void play();else if(state==='loading')emit('paused');},
  setMuted(voice,value){if(value)muted.add(voice);else muted.delete(voice);if(mixers[voice])mixers[voice].gain.setTargetAtTime(value?0:1,context.currentTime,.008);if(value&&auditionVoice===voice){auditionGeneration++;engine?.stopAudition?.();auditionVoice=null;}},
  async audition(note){const run=token,voice=note.voice??0;if(muted.has(voice))return;try{const audio=audioEngine();context??=audio.getContext()??new (globalThis.AudioContext||globalThis.webkitAudioContext)();await context.resume();engine=await audio.prepare(context);if(run!==token||muted.has(voice))return;const supplied=data?.voices?.find(v=>v.voice===voice)?.program,program=Number.isInteger(supplied)&&supplied>=0&&supplied<=127?supplied:(voice===1?65:0);const audition=++auditionGeneration;auditionVoice=voice;engine.audition({pitch:note.pitch,duration:Math.min(2,note.duration*60/tempo),velocity:note.velocity??(voice===1?80:74),program},()=>{if(audition===auditionGeneration)auditionVoice=null;});}catch(error){if(run===token&&error.name!=='AbortError')onError(error);}},
  destroy(){stop();data=null;},
  get state(){return state;},get position(){return position;},get tempo(){return tempo;},get data(){return data;},get mutedVoices(){return [...muted];}
 };
}
