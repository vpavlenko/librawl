import * as React from 'react';
import type { NotePlaybackClock } from './native';
export interface MidiNote {
 id:string; pitch:number; start:number; duration:number; voice:number; velocity?:number;
 /** If set, highlight in playback-clock units while laying out start/duration in beats. */
 playbackSpan?:readonly [start:number,end:number];
}
export interface ScoreRow { start:number; end:number; anchor?:number; label?:number; style?:React.CSSProperties; }
export interface TonicChange {
 beat:number; tonic:number; join?:boolean; name?:string; onsetOverride?:boolean;
 /** Original measure start when beat was snapped to a note. */
 measureBeat?:number;
}
/** Place mid-measure flags at the following printed measure when a measure map is provided. */
export type ModulationMarkerPlacement = 'onset' | 'following-measure';
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
 barBeats?:number; beatBeats?:number; phraseStarts?:number[]; measureMap?:SourceMeasure[]; hideInitialTonic?:boolean; modulationMarkerPlacement?:ModulationMarkerPlacement; position?:number|null; mutedVoices?:number[]; className?:string; style?:React.CSSProperties;
 /** Name the destination tonic on each modulation flag. Defaults to false. */
 showModulationTonics?:boolean;
 /** Name the active tonic when a flag continues from the previous row. */
 showContinuedTonic?:boolean;
 /** An externally advanced clock. When position is omitted, its lifecycle belongs to the host. */
 playbackClock?:NotePlaybackClock & {seek?:(beat:number)=>void};
 showTonalGuides?:boolean; noteScale?:number;
 onSeek?:(beat:number)=>void; onNote?:(note:MidiNote,event?:React.MouseEvent)=>void; onNoteAudition?:(note:MidiNote)=>void; onNoteHover?:(note:MidiNote|null)=>void;
 onMeasureSelect?:(beat:number,measure:PositionedMeasure,element?:HTMLDivElement)=>void; selectedMeasure?:number|null;
 onChangesChange?:(changes:TonicChange[])=>void; recolorable?:boolean;
 /** Share one controller across multiple viewers of the same score. */
 recoloring?:ReturnType<typeof useTonicRecoloring>;
 /** Transient section editing is built in. Pass false to disable it or supply a custom editor. */
 sectionEditing?:MeasureSectionEditing|false;
 /** Musical section starts in order, when display rows also include wraps. */
 sectionStarts?:readonly number[];
 /** Called after the viewer applies a temporary section edit. */
 onSectionEdit?:()=>void;
 /** Observe the edited layout, or null when the original rows are shown. */
 onSectionRowsChange?:(rows:ScoreRow[]|null)=>void;
 renderMeasureExtras?:RenderMeasureExtras;
 renderHeader?:(row:ScoreRow)=>React.ReactNode;
 renderUnderlay?:(row:ScoreRow,axis:ReturnType<typeof staveGeometry>)=>React.ReactNode;
 renderFooter?:(row:ScoreRow,context:{changes:TonicChange[];selectedMeasure:number|null})=>React.ReactNode;
}
export function RawlNotation(props:RawlNotationProps):React.ReactElement;
export interface PositionedMeasure {
 beat:number; number?:number|string|null; left:number|string; barLeft?:number|string; width?:number;
 isPhraseStart?:boolean; terminal?:boolean; showLabel?:boolean; color?:string; highlighted?:boolean;
 labelOffset?:number; hasModulation?:boolean;
 /** Sounding beat of a displaced flag displayed on this measure. */
 modulationBeat?:number;
 /** Selection beat after accounting for flags displayed on other measures. */
 recolorBeat?:number;
}
export interface KeyMarker {
 beat:number; tonic:number; previousTonic:number|null; delta:number|null;
 number?:number|string|null; onsetOverride?:boolean; name?:string; join?:boolean;
 /** Beat of the measure number this modulation controls. */
 measureBeat?:number;
}
export interface RowKeyMarker extends KeyMarker {
 originBeat?:number; overflowCopy?:boolean; continued:boolean; initial:boolean; pixelOffset:number; labelOffset:number;
}
export interface PositionedKeyMarker extends KeyMarker {
 left:number|string; continued?:boolean; initial?:boolean; originBeat?:number; labelOffset?:number; overflowCopy?:boolean;
}
export interface MeasureHeaderLayout {
 measures:readonly PositionedMeasure[];
 beats:readonly {beat:number;left:number|string}[];
 markers:readonly PositionedKeyMarker[];
}
export interface MeasureSectionEditing {
 /** Section starts in score coordinates, including the first section. */
 sectionStarts:readonly number[];
 /** Override the default requirement that a split fall on a phrase start. */
 canSplit?:(measure:PositionedMeasure)=>boolean;
 /** Restrict merges at section starts that cannot join their predecessor. */
 canMerge?:(measure:PositionedMeasure)=>boolean;
 onSplit:(measure:PositionedMeasure)=>void;
 onGlue:(measure:PositionedMeasure)=>void;
}
export type MeasureSectionAction = 'split' | 'merge';
export type RenderMeasureExtras = (measure:PositionedMeasure, onSectionKeyDown?:React.KeyboardEventHandler<HTMLInputElement>, sectionAction?:MeasureSectionAction)=>React.ReactNode;
export type RawlMeasureHeaderProps = ({
 row:ScoreRow; layout?:never; tonic?:number; changes?:TonicChange[]; barBeats?:number; beatBeats?:number;
 /** Absolute quarter-beat phrase starts; optional closing boundary has no label. */
 phraseStarts?:number[]; measureMap?:SourceMeasure[]; hideInitialTonic?:boolean; modulationMarkerPlacement?:ModulationMarkerPlacement;
} | {layout:MeasureHeaderLayout; row?:never}) & {
 height?:number|string; selectedMeasure?:number|null; onMeasureSelect?:(beat:number,measure:PositionedMeasure,element?:HTMLDivElement)=>void;
 /** Name the destination tonic on each modulation flag. Defaults to false. */
 showModulationTonics?:boolean;
 /** Name the active tonic when a flag continues from the previous row. */
 showContinuedTonic?:boolean;
 showHeader?:boolean; transpose?:number; sectionEditing?:MeasureSectionEditing; renderMeasureExtras?:RenderMeasureExtras;
};
export const RawlMeasureHeader:React.FC<RawlMeasureHeaderProps>;
export interface TonalGridProps {
 regions:readonly {tonic:number|null; left:number|string; width:number|string}[];
 range:{low:number;high:number};
 pitchToY:(pitch:number)=>number;
 tonicHeight?:number;
}
export const TonalGrid:React.FC<TonalGridProps>;
export function pitchRange(notes:MidiNote[],span?:ScoreRow|null,fallback?:{low:number;high:number}):{low:number;high:number};
export function staveGeometry(range:{low:number;high:number},options?:{above?:number;transpose?:number;noteScale?:number}):{low:number;high:number;noteTop:number;noteHeight:number;notesBottom:number;pitchStep:number;glyphHeight:number;guideTop:number;markerTop:number;pitchToY:(pitch:number)=>number};
export function modulationLabelOffset(beat:number,barBeats:number,options?:{initial?:boolean;onsetOverride?:boolean;continued?:boolean}):number;
export const RAWL_COLORS:ReadonlyArray<{background:string;foreground:string;dot?:{color:string;size:number}}>;

export function recolorModulation(changes:TonicChange[],beat:number,pitch:number):TonicChange[];
export function recolorBoundary(changes:TonicChange[],measureBeat:number,barBeats:number,measureMap?:SourceMeasure[]):number;
export function useTonicRecoloring(options:{changes:TonicChange[];barBeats?:number;measureMap?:SourceMeasure[];onChange?:(changes:TonicChange[])=>void}):{changes:TonicChange[];selectedMeasure:number|null;onsetEditing:ReturnType<typeof import('./native').useModulationOnsetEditing<MidiNote>>;selectMeasure(beat:number,measure?:PositionedMeasure,element?:HTMLDivElement):void;hoverNote(note:MidiNote|null):void;chooseNote(note:MidiNote,event?:{shiftKey:boolean}):boolean;cancel():void};
