import * as React from 'react';
import {getNoteRectangles} from './getNoteRectangles';
import type {ColoredNote,Note,SecondsConverter} from './types';
export interface NoteLayerProps {
 notes:ColoredNote[];
 midiNumberToY:(number:number)=>number;
 noteHeight:number;
 handleNoteClick?:((note:Note,event?:React.MouseEvent,time?:number)=>void)|null;
 handleMouseEnter?:(note:Note,event?:React.MouseEvent,time?:number)=>void;
 handleMouseLeave?:()=>void;
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
export function NoteLayer({notes,midiNumberToY,noteHeight,handleNoteClick=null,handleMouseEnter=noop,handleMouseLeave=noop,secondsToX,enableManualRemeasuring=false,hoveredColors=null,showSourceLocation=false,drumNoteToY,hoveredVoiceIndex=null,sectionEndX,sectionStartX,getNoteAttributes}:NoteLayerProps){
 return <>{getNoteRectangles(notes,midiNumberToY,noteHeight,handleNoteClick,handleMouseEnter,handleMouseLeave,secondsToX,enableManualRemeasuring,hoveredColors,showSourceLocation,drumNoteToY,hoveredVoiceIndex,sectionEndX,sectionStartX,getNoteAttributes)}</>;
}
