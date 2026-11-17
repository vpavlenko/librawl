import * as React from 'react';
import {getNoteRectangles,ModulationOnsetEditingContext} from './getNoteRectangles';
import {createShiftHoverAudition} from '../shift-hover-audition.js';
import type {ColoredNote,Note,SecondsConverter} from './types';
export interface NoteLayerProps {
 notes:ColoredNote[];
 midiNumberToY:(number:number)=>number;
 noteHeight:number;
 handleNoteClick?:((note:Note,event?:React.MouseEvent,time?:number)=>void)|null;
 handleMouseEnter?:(note:Note,event?:React.MouseEvent,time?:number)=>void;
 handleMouseLeave?:()=>void;
 onNoteAudition?:(note:Note,event?:React.MouseEvent,time?:number)=>void;
 auditionEnabled?:boolean|((note:Note,event?:React.MouseEvent,time?:number)=>boolean);
 secondsToX:SecondsConverter;
 enableManualRemeasuring?:boolean;
 hoveredColors?:string[]|null;
 showSourceLocation?:boolean;
 drumNoteToY?:(note:Note)=>number;
 hoveredVoiceIndex?:number|number[]|null;
 sectionEndX?:number;
 sectionStartX?:number;
 getNoteAttributes?:(note:ColoredNote)=>React.HTMLAttributes<HTMLDivElement>;
}
const noop=()=>{};
/** The original Rawl note renderer. Coordinates and sounding spans stay host-owned. */
export function NoteLayer({notes,midiNumberToY,noteHeight,handleNoteClick=null,handleMouseEnter=noop,handleMouseLeave=noop,onNoteAudition,auditionEnabled=true,secondsToX,enableManualRemeasuring=false,hoveredColors=null,showSourceLocation=false,drumNoteToY,hoveredVoiceIndex=null,sectionEndX,sectionStartX,getNoteAttributes}:NoteLayerProps){
 const onsetEditing=React.useContext(ModulationOnsetEditingContext);
 const current=React.useRef({onNoteAudition,auditionEnabled,enableManualRemeasuring,onsetEditing});
 current.current={onNoteAudition,auditionEnabled,enableManualRemeasuring,onsetEditing};
 const gesture=React.useMemo(()=>createShiftHoverAudition({
  audition:(note:Note,event?:React.MouseEvent,time?:number)=>current.current.onNoteAudition?.(note,event,time),
  isEnabled:(note:ColoredNote,event?:React.MouseEvent,time?:number)=>{
   const state=current.current;
   return !!state.onNoteAudition&&!state.enableManualRemeasuring&&!state.onsetEditing.active&&note.isActive!==false&&(typeof state.auditionEnabled==='function'?state.auditionEnabled(note,event,time):state.auditionEnabled);
  },
 }),[]);
 const enter=(note:Note,event?:React.MouseEvent,time?:number)=>{gesture.enter(note,event,time);handleMouseEnter(note,event,time);};
 const leave=()=>{gesture.leave();handleMouseLeave();};
 return <>{getNoteRectangles(notes,midiNumberToY,noteHeight,handleNoteClick,enter,leave,secondsToX,enableManualRemeasuring,hoveredColors,showSourceLocation,drumNoteToY,hoveredVoiceIndex,sectionEndX,sectionStartX,getNoteAttributes)}</>;
}
