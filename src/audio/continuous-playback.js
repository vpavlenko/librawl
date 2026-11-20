/** Add live rate changes without changing the frozen Caplin setup/cleanup code.
 * SpessaSynth's public API cannot cancel queued worklet messages. Already sent
 * events stay committed; a new rate starts at that queue fence, at most one
 * scheduler horizon ahead. No sounding note or room graph is reconstructed.
 */
export function attachContinuousPlayback(engine,{setInterval,clearInterval,presentationTime,discardQueuedMidi,horizon=.14,interval=25}){
 const play=engine.play.bind(engine),stop=engine.stop.bind(engine),createClock=engine.createClock.bind(engine);
 let session=null;
 const priority=e=>e.type==='cc'&&[0,32].includes(e.controller)?-1:{program:0,cc:1,off:2,on:3}[e.type];
 function scoreAt(s,time){const segment=[...s.segments].reverse().find(a=>a.time<=time)??s.segments[0];return segment.score+(time-segment.time)*segment.rate;}
 function timeAt(s,score){const segment=[...s.segments].reverse().find(a=>a.score<=score+1e-10)??s.segments[0];return segment.time+(score-segment.score)/segment.rate;}
 engine.stop=()=>{
  session=null;
  stop();
  if(discardQueuedMidi){
   discardQueuedMidi();
   engine.fence=engine.context.currentTime;
  }
 };
 engine.play=(plan,mixers,offset=0,output=engine.context.destination)=>{
  // Reuse the original connection, room, cancellation and seek fence setup.
  // Its empty pump cannot put any score note into the worklet queue.
  let start=play({...plan,events:[],notes:[]},mixers,offset,output);
  if(discardQueuedMidi){
   // Remove the legacy before-start guards. The preceding stop already cut
   // the old voices and queue, so a long scheduling lead is unnecessary.
   discardQueuedMidi();
   start=engine.context.currentTime+.015;
  }
  const offsetTime=plan.timeAt(offset);
  const snapshotAt=beat=>{const snapshot=new Map();for(const event of plan.events)if(event.beat<=beat&&['program','cc'].includes(event.type))snapshot.set([event.channel,event.type,event.controller??''].join(':'),{...event,beat});return [...snapshot.values()];};
  const heldAt=beat=>plan.notes.filter(n=>n.start<beat&&n.end>beat).map(n=>({beat,type:'on',channel:n.channel,pitch:n.pitch,velocity:n.velocity}));
  const events=[...snapshotAt(offset),...heldAt(offset),...plan.events.filter(e=>e.beat>=offset&&(e.type==='on'||e.type==='off')||e.beat>offset&&e.type==='cc')].sort((a,b)=>a.beat-b.beat||priority(a)-priority(b));
  const s={plan,start,offset,segments:[{time:start,score:offsetTime,rate:1}],requestedRate:1,committedUntil:start,cursor:0,clock:null,pump:null,dynamic:false,sent:[]};session=s;
  let previous=offset;
  const end=plan.beats??plan.beatAt(plan.duration),endTime=()=>timeAt(s,plan.timeAt(end));
  const beat=()=>{const now=presentationTime(engine.context);if(now<start)return null;previous=Math.max(previous,Math.min(end,plan.beatAt(scoreAt(s,now))));return previous;};
  s.clock={beat,position:()=>beat()??offset,endTime,remaining:()=>Math.max(0,endTime()-presentationTime(engine.context))};
  const send=(event,time)=>{
   s.committedUntil=Math.max(s.committedUntil,time);engine.fence=Math.max(engine.fence,time);s.sent.push({event,time});const options={time},synth=engine.synth;
   if(event.type==='program')synth.programChange(event.channel,event.program,options);
   else if(event.type==='cc')synth.controllerChange(event.channel,event.controller,event.value,options);
   else if(event.type==='on')synth.noteOn(event.channel,event.pitch,event.velocity,options);
   else synth.noteOff(event.channel,event.pitch,options);
  };
  s.pump=()=>{
   if(session!==s)return;
   const now=engine.context.currentTime,until=now+horizon;
   if(s.cursor<events.length&&timeAt(s,plan.timeAt(events[s.cursor].beat))<now-horizon){
    const time=now+.01,currentBeat=plan.beatAt(scoreAt(s,time));
    if(s.dynamic){
     // A tempo key can arrive just after a background timer stall. Reconcile
     // only missing/expired notes; never reset a channel and reattack a note
     // whose on was already committed. Retain sustain and room state too.
     const active=new Map(),settings=new Map(),key=e=>e.channel+':'+e.pitch,setting=e=>[e.channel,e.type,e.controller??''].join(':');
     for(const {event:e,time:at}of s.sent)if(at<=time){if(e.type==='on')active.set(key(e),e);else if(e.type==='off')active.delete(key(e));else settings.set(setting(e),e);}
     const expected=heldAt(currentBeat),wanted=new Set(expected.map(key));
     for(const e of active.values())if(!wanted.has(key(e)))send({...e,beat:currentBeat,type:'off'},time);
     for(const e of snapshotAt(currentBeat)){const old=settings.get(setting(e));if(!old||(e.type==='program'?old.program!==e.program:old.value!==e.value))send(e,time);}
     for(const e of expected)if(!active.has(key(e)))send(e,time);
    }else{
     for(const channel of plan.channels)engine.synth.controllerChange(channel.channel,120,0,{time});
     [...snapshotAt(currentBeat),...heldAt(currentBeat)].sort((a,b)=>priority(a)-priority(b)).forEach(event=>send(event,time));
    }
    while(s.cursor<events.length&&events[s.cursor].beat<currentBeat)s.cursor++;
   }
   while(s.cursor<events.length){const event=events[s.cursor],time=timeAt(s,plan.timeAt(event.beat));if(time>until)break;s.cursor++;send(event,time);}
   if(s.cursor===events.length){clearInterval(engine.interval);engine.interval=null;}
  };
  engine.interval=setInterval(s.pump,interval);s.pump();return start;
 };
 engine.createClock=(plan,start,offset=0)=>session?.plan===plan&&session.start===start&&session.offset===offset?session.clock:createClock(plan,start,offset);
 // Absolute multiplier of the ORIGINAL plan's timeAt/beatAt mapping, never
 // a multiplier of the preceding setRate call. A new play starts at rate1.
 engine.setRate=rate=>{
  if(!Number.isFinite(rate)||rate<=0)throw new RangeError('Playback rate must be positive');
  const s=session;if(!s)return;
  if(rate===s.requestedRate)return;
  // Replace an uncommitted future anchor on rapid key repeats. If the pump
  // has already committed later events, their old timing becomes the new fence.
  const time=Math.max(engine.context.currentTime,s.start,s.committedUntil),score=scoreAt(s,time);
  s.segments=s.segments.filter(a=>a.time<time);s.segments.push({time,score,rate});s.requestedRate=rate;s.dynamic=true;s.pump();
 };
 engine.getRate=()=>session?.requestedRate??1;
 engine.remaining=()=>session?.clock.remaining()??0;
 return engine;
}
