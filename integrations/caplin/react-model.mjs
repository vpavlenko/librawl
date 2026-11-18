import {tonicAt} from '../../src/notation/geometry.mjs';

const EPS=1e-6,pc=n=>((n%12)+12)%12;

/** Adapter only: source beats/notes, staff identity and Caplin's axis stay host-owned. */
export function caplinNoteModel({data,notes,row,axis,stacking=new Map()}){
 if(!data||!Array.isArray(notes)||!(data.tempo>0)||!(data.beats>0)||typeof axis?.pitchToY!=='function')throw new TypeError('Invalid Caplin note model');
 const groups=data.voiceGroups??[],groupFor=new Map(groups.flatMap((group,staff)=>group.voices.map(voice=>[voice,staff])));
 const view=row??{start:0,end:data.beats,pad:0,span:data.beats},span=view.span??view.end-view.start,pad=view.pad??0,secondsPerBeat=60/data.tempo;
 if(!(span>0)||!(view.end>view.start))throw new TypeError('Invalid Caplin row');
 const sectioned=view.start!==0||view.end!==data.beats||pad!==0||span!==data.beats;
 const sourceById=new Map(),attributesById=new Map();
 const nativeNotes=notes.flatMap((source,index)=>{
  const start=Math.max(source.start,view.start),end=Math.min(source.start+source.duration,view.end);
  if(!(end-start>EPS))return [];
  const staff=groupFor.get(source.voice);if(staff===undefined)throw new TypeError('Unmapped Caplin voice');
  const id=`${data.label??''}:${index}`,tonic=tonicAt(data.tonic,data.tonalityChanges??[],source.start+source.duration/2),degree=pc(source.pitch-tonic);
  const left=(start-view.start+pad)/span*100,width=(end-start)/span*100;
  sourceById.set(id,source);
  attributesById.set(id,{
   className:`rawl-note voice-shape-${staff}`,
   'data-voice':String(source.voice),'data-staff':String(staff),'data-pitch':String(source.pitch),
   'data-tonic':String(tonic),'data-pitch-class':String(degree),
   'data-start':String(source.start),'data-end':String(source.start+source.duration),
   ...(source.ornament?{'data-ornament':source.ornament,'data-turn-index':String(source.turnIndex)}:{}),
   style:{
    left:sectioned?left+'%':`max(0px, calc(${left}% - 0px))`,
    width:`max(1px, calc(${width}% - 1px))`,top:axis.pitchToY(source.pitch),
    zIndex:stacking.get(source)??10,
    // Caplin's existing classes own 5px resting/10px MIDI or audition/12px recording.
    // Native note geometry still supplies the full Rawl component and interactions.
    height:undefined,boxShadow:undefined,cursor:undefined,display:undefined,
   },
  });
  return [{id,note:{midiNumber:source.pitch},span:[source.start*secondsPerBeat,(source.start+source.duration)*secondsPerBeat],displaySpan:[start*secondsPerBeat,end*secondsPerBeat],voiceIndex:source.voice,displayVoiceIndex:staff,isDrum:false,isActive:true,isPlayingNow:false,noteUnderCursor:false,color:`noteColor_${degree}_colors`,colorPitchClass:degree}];
 });
 return {
  notes:nativeNotes,sourceById,row:view,secondsPerBeat,
  toX:(seconds,width)=>(seconds/secondsPerBeat-view.start+pad)/span*width,
  getAttributes:note=>attributesById.get(note.id),
 };
}
