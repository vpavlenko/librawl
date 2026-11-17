import {useEffect,useState} from 'react';
const ROOTS=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
/** Rawl tonic selection changes analysis only, never source pitches or timing. */
export function recolorModulation(changes,beat,pitch){
 if(!Number.isFinite(beat)||beat<0||!Number.isFinite(pitch))return changes;
 const tonic=((Math.round(pitch)%12)+12)%12,existing=changes.find(change=>Math.abs(change.beat-beat)<1e-7),choice={...(existing??{beat}),tonic,root:ROOTS[tonic]};
 const events=[...changes.filter(change=>Math.abs(change.beat-beat)>=1e-7).map(change=>({...change})),choice].sort((a,b)=>a.beat-b.beat),result=[];
 for(const event of events)if(!result.length||result.at(-1).tonic!==event.tonic)result.push(event);
 return result;
}
export function recolorBoundary(changes,measureBeat,barBeats,measureMap){
 const measure=measureMap?.find(measure=>Math.abs(measure.start-measureBeat)<1e-7),end=measure?measure.start+measure.duration:measureBeat+barBeats;
 return changes.find(change=>change.beat>=measureBeat-1e-7&&change.beat<end-1e-7)?.beat??measureBeat;
}
const initial=source=>({source,committed:source,selectedMeasure:null,boundary:null,preview:null});
/** Each mounted score owns its selection, hover preview and committed colors.
 * Hosts can share this controller with harmony labels or persist onChange. */
export function useTonicRecoloring({changes,barBeats=4,measureMap,onChange}){
 const [stored,setStored]=useState(()=>initial(changes)),state=stored.source===changes?stored:initial(changes);
 const cancel=()=>setStored(previous=>({...previous,selectedMeasure:null,boundary:null,preview:null}));
 useEffect(()=>{if(state.selectedMeasure===null)return;const escape=event=>{if(event.key==='Escape')cancel();};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[state.selectedMeasure]);
 return {
  changes:state.preview??state.committed,selectedMeasure:state.selectedMeasure,
  selectMeasure(beat){setStored(previous=>{const current=previous.source===changes?previous:initial(changes),selectedMeasure=current.selectedMeasure===beat?null:beat;return {...current,selectedMeasure,boundary:selectedMeasure===null?null:recolorBoundary(current.committed,beat,barBeats,measureMap),preview:null};});},
  hoverNote(note){if(state.boundary===null)return;setStored(previous=>({...previous,preview:note?recolorModulation(state.committed,state.boundary,note.pitch):null}));},
  chooseNote(note){if(state.boundary===null)return false;const committed=recolorModulation(state.committed,state.boundary,note.pitch);setStored({...state,committed,preview:null,selectedMeasure:null,boundary:null});onChange?.(committed);return true;},
  cancel
 };
}
