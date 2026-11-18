import * as React from 'react';
import type { NotePlaybackClock } from './native';
export interface MidiNote {
 id:string; pitch:number; start:number; duration:number; voice:number; velocity?:number;
 /** If set, highlight in playback-clock units while laying out start/duration in beats. */
 playbackSpan?:readonly [start:number,end:number];
}
export interface ScoreRow { start:number; end:number; label?:number; style?:React.CSSProperties; }
export interface TonicChange { beat:number; tonic:number; join?:boolean; name?:string; onsetOverride?:boolean; }
export interface SourceMeasure {
 start:number; duration:number; sourceNumber:number|string; beatBeats?:number;
 /** Absolute positions of annotated beats inside the measure, in display units. Overrides beatBeats. */
 beatPositions?:readonly number[];
 /** Half-open spans in playback clock units. Omit to follow display beats. */
 playbackSpans?:readonly (readonly [start:number,end:number])[];
}
export interface PlaybackMeasureBordersProps {
 left?:React.CSSProperties['left']; width?:React.CSSProperties['width'];
 top?:boolean; bottom?:boolean; hidden?:boolean; ref?:React.Ref<HTMLDivElement>;
}
export function PlaybackMeasureBorders(props:PlaybackMeasureBordersProps):React.ReactElement;
/** Tracks the current measure in a host-rendered relative score row. */
export const PlaybackMeasureLayer:React.FC<{row:ScoreRow;clock:NotePlaybackClock;measureMap?:readonly SourceMeasure[];barBeats?:number}>;
export interface RawlNotationHandle { setPosition(beat:number|null):void; element:HTMLDivElement|null; }
export interface RawlNotationProps {
 ref?:React.Ref<RawlNotationHandle>;
 notes:MidiNote[]; beats:number; rows?:ScoreRow[]; tonic?:number; changes?:TonicChange[];
 barBeats?:number; beatBeats?:number; phraseStarts?:number[]; measureMap?:SourceMeasure[]; hideInitialTonic?:boolean; position?:number|null; mutedVoices?:number[]; className?:string; style?:React.CSSProperties;
 /** An externally advanced clock. When position is omitted, its lifecycle belongs to the host. */
 playbackClock?:NotePlaybackClock & {seek?:(beat:number)=>void};
 showTonalGuides?:boolean; noteScale?:number;
 onSeek?:(beat:number)=>void; onNote?:(note:MidiNote)=>void; onNoteAudition?:(note:MidiNote)=>void; onNoteHover?:(note:MidiNote|null)=>void;
 onMeasureSelect?:(beat:number)=>void; selectedMeasure?:number|null;
 onChangesChange?:(changes:TonicChange[])=>void; recolorable?:boolean;
 renderHeader?:(row:ScoreRow)=>React.ReactNode;
 renderUnderlay?:(row:ScoreRow,axis:ReturnType<typeof staveGeometry>)=>React.ReactNode;
 renderFooter?:(row:ScoreRow,context:{changes:TonicChange[];selectedMeasure:number|null})=>React.ReactNode;
}
export function RawlNotation(props:RawlNotationProps):React.ReactElement;
export interface RawlMeasureHeaderProps {
 row:ScoreRow; height?:number|string; tonic?:number; changes?:TonicChange[]; barBeats?:number; beatBeats?:number;
 /** Absolute quarter-beat phrase starts; optional closing boundary has no label. */
 phraseStarts?:number[]; measureMap?:SourceMeasure[]; selectedMeasure?:number|null; onMeasureSelect?:(beat:number)=>void; hideInitialTonic?:boolean;
}
export const RawlMeasureHeader:React.FC<RawlMeasureHeaderProps>;
export function pitchRange(notes:MidiNote[],span?:ScoreRow|null,fallback?:{low:number;high:number}):{low:number;high:number};
export function staveGeometry(range:{low:number;high:number},options?:{above?:number;transpose?:number;noteScale?:number}):{low:number;high:number;noteTop:number;noteHeight:number;notesBottom:number;pitchStep:number;glyphHeight:number;guideTop:number;markerTop:number;pitchToY:(pitch:number)=>number};
export function modulationLabelOffset(beat:number,barBeats:number,options?:{initial?:boolean;onsetOverride?:boolean;continued?:boolean}):number;
export const RAWL_COLORS:ReadonlyArray<{background:string;foreground:string;dot?:{color:string;size:number}}>;

export function recolorModulation(changes:TonicChange[],beat:number,pitch:number):TonicChange[];
export function recolorBoundary(changes:TonicChange[],measureBeat:number,barBeats:number,measureMap?:SourceMeasure[]):number;
export function useTonicRecoloring(options:{changes:TonicChange[];barBeats?:number;measureMap?:SourceMeasure[];onChange?:(changes:TonicChange[])=>void}):{changes:TonicChange[];selectedMeasure:number|null;selectMeasure(beat:number):void;hoverNote(note:MidiNote|null):void;chooseNote(note:MidiNote):boolean;cancel():void};
