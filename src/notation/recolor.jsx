import {useEffect,useState} from 'react';
import {recolorBoundary} from './geometry.mjs';
export {recolorBoundary};
const ROOTS=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
/** Rawl tonic selection changes analysis only, never source pitches or timing. */
export function recolorModulation(changes,beat,pitch){
 if(!Number.isFinite(beat)||beat<0||!Number.isFinite(pitch))return changes;
 const tonic=((Math.round(pitch)%12)+12)%12,existing=changes.find(change=>Math.abs(change.beat-beat)<1e-7),choice={...(existing??{beat}),tonic,root:ROOTS[tonic]};
 const events=[...changes.filter(change=>Math.abs(change.beat-beat)>=1e-7).map(change=>({...change})),choice].sort((a,b)=>a.beat-b.beat),result=[];
 for(const event of events)if(!result.length||result.at(-1).tonic!==event.tonic)result.push(event);
 return result;
}
const clearedSelection={selectedMeasure:null,selectedElement:null,boundary:null,preview:null};
const initial=source=>({source,committed:source,...clearedSelection});
/** Each mounted score owns its selection, hover preview and committed colors.
 * Hosts can share this controller with harmony labels or persist onChange. */
export function useTonicRecoloring({changes,barBeats=4,measureMap,onChange}){
 const [stored,setStored]=useState(()=>initial(changes)),state=stored.source===changes?stored:initial(changes);
 const cancel=()=>setStored(previous=>({...previous,...clearedSelection}));
 useEffect(()=>{
  if(state.selectedMeasure===null)return;
  const {selectedElement}=state,ownerDocument=selectedElement?.ownerDocument??document;
  const escape=event=>{
   if(event.key!=='Escape')return;
   cancel();
   if(selectedElement&&ownerDocument.activeElement===selectedElement)selectedElement.blur();
  };
  ownerDocument.addEventListener('keydown',escape);
  return()=>ownerDocument.removeEventListener('keydown',escape);
 },[state.selectedMeasure,state.selectedElement]);
 return {
  changes:state.preview??state.committed,selectedMeasure:state.selectedMeasure,
  selectMeasure(beat,measure,element){
   setStored(previous=>{
    const current=previous.source===changes?previous:initial(changes);
    if(current.selectedMeasure===beat)return {...current,...clearedSelection};
    const boundary=measure?.recolorBeat??measure?.modulationBeat??recolorBoundary(current.committed,beat,barBeats,measureMap);
    return {...current,selectedMeasure:beat,selectedElement:element??null,boundary,preview:null};
   });
  },
  hoverNote(note){if(state.boundary===null)return;setStored(previous=>({...previous,preview:note?recolorModulation(state.committed,state.boundary,note.pitch):null}));},
  chooseNote(note){if(state.boundary===null)return false;const committed=recolorModulation(state.committed,state.boundary,note.pitch);setStored({...state,committed,...clearedSelection});onChange?.(committed);return true;},
  cancel
 };
}
