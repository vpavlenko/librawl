import * as React from 'react';
export interface MidiNote { id:string; pitch:number; start:number; duration:number; voice:number; velocity?:number; }
export interface ScoreRow { start:number; end:number; label?:number; style?:React.CSSProperties; }
export interface TonicChange { beat:number; tonic:number; join?:boolean; name?:string; onsetOverride?:boolean; }
export interface RawlNotationHandle { setPosition(beat:number|null):void; element:HTMLDivElement|null; }
export interface RawlNotationProps {
 notes:MidiNote[]; beats:number; rows?:ScoreRow[]; tonic?:number; changes?:TonicChange[];
 barBeats?:number; beatBeats?:number; phraseStarts?:number[]; hideInitialTonic?:boolean; position?:number|null; mutedVoices?:number[]; className?:string; style?:React.CSSProperties;
 onSeek?:(beat:number)=>void; onNote?:(note:MidiNote)=>void; onNoteHover?:(note:MidiNote|null)=>void;
 onMeasureSelect?:(beat:number)=>void; selectedMeasure?:number|null;
 renderHeader?:(row:ScoreRow)=>React.ReactNode; renderFooter?:(row:ScoreRow)=>React.ReactNode;
}
export const RawlNotation:React.ForwardRefExoticComponent<RawlNotationProps & React.RefAttributes<RawlNotationHandle>>;
export interface RawlMeasureHeaderProps {
 row:ScoreRow; height?:number|string; tonic?:number; changes?:TonicChange[]; barBeats?:number; beatBeats?:number;
 /** Absolute quarter-beat phrase starts; optional closing boundary has no label. */
 phraseStarts?:number[]; selectedMeasure?:number|null; onMeasureSelect?:(beat:number)=>void; hideInitialTonic?:boolean;
}
export const RawlMeasureHeader:React.FC<RawlMeasureHeaderProps>;
export function pitchRange(notes:MidiNote[],span?:ScoreRow|null,fallback?:{low:number;high:number}):{low:number;high:number};
export function staveGeometry(range:{low:number;high:number},options?:{above?:number;transpose?:number}):{low:number;high:number;noteTop:number;noteHeight:number;notesBottom:number;guideTop:number;markerTop:number;pitchToY:(pitch:number)=>number};
export function modulationLabelOffset(beat:number,barBeats:number,options?:{initial?:boolean;onsetOverride?:boolean;continued?:boolean}):number;
export const RAWL_COLORS:ReadonlyArray<{background:string;foreground:string;dot?:{color:string;size:number}}>;
