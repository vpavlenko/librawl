import * as React from 'react';
export type SecondsSpan = [number, number];
export type SecondsConverter = (seconds:number)=>number;
export interface SourceLocation {
  row: number;
  col: number;
  command: string;
}

export type Note = {
  note: {
    midiNumber: number;
    relativeNumber?: number;
  };
  isDrum: boolean;
  id: string;
  span: SecondsSpan;
  // Rendering only; playback and note audition continue to use span.
  displaySpan?: SecondsSpan;
  // Rendering only; preserve the source pitch for playback and annotations.
  displayMidiNumber?: number;
  tickSpan?: [number, number]; // [startTick, endTick]
  pitchBend?: PitchBendPoint[];
  voiceIndex: number;
  velocity?: number;
  sourceLocation?: SourceLocation;
  noteUnderCursor?: boolean;
  isPlayingNow?: boolean;
};

export type TonalPitchStop = {
  offset: number;
  pitchClass: number;
};

export type ColoredNote = Note & {
  // Presentation identity; voiceIndex remains the original MIDI/source index.
  displayVoiceIndex?: number;
  color: string;
  isActive: boolean;
  colorPitchClass: number | "default" | "drum";
  /** Rendering only. Ordered tonal pitch classes starting at fractions of the visible note width. */
  tonalPitchStops?: readonly TonalPitchStop[];
  sourceLocation?: SourceLocation;
  noteUnderCursor?: boolean;
  isPlayingNow?: boolean;
};

export type PitchBendPoint = {
  time: number;
  value: number;
};

export type NotesInVoices = Note[][];

export type ColoredNotesInVoices = ColoredNote[][];


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

export function NoteLayer(props:NoteLayerProps):React.ReactElement;
export function getNoteRectangles(notes:ColoredNote[],midiNumberToY:(pitch:number)=>number,noteHeight:number,handleNoteClick:((note:Note,event?:React.MouseEvent,time?:number)=>void)|null,handleMouseEnter:(note:Note,event?:React.MouseEvent,time?:number)=>void,handleMouseLeave:()=>void,secondsToX:SecondsConverter,enableManualRemeasuring:boolean,hoveredColors:string[]|null,showSourceLocation?:boolean,drumNoteToY?:(note:Note)=>number,hoveredVoiceIndex?:number|number[]|null,sectionEndX?:number,sectionStartX?:number,getNoteAttributes?:(note:ColoredNote)=>React.HTMLAttributes<HTMLDivElement>):React.ReactElement[];
export type MouseHandlers={handleNoteClick:((note:Note,event?:React.MouseEvent,time?:number)=>void)|null;handleMouseEnter:(note:Note,event?:React.MouseEvent,time?:number)=>void;handleMouseLeave:()=>void;hoveredNote:Note|null;systemClickHandler:(event:React.MouseEvent,xToSeconds?:(x:number)=>number)=>void;};
export type RegisterNote=(start:number,end:number,update:(playing:boolean)=>void,section?:readonly[number,number]|null)=>()=>void;
export interface NotePlaybackClock {register:RegisterNote;reset():void;advance(time:number):void;}
export interface DrumPlaybackClock {register(startSeconds:number,pulse:()=>void):()=>void;reset():void;advance(time:number):void;}
export const NotePlaybackContext:React.Context<RegisterNote|null>;
export const PlaybackSectionContext:React.Context<readonly[number,number]|null>;
export const DrumPlaybackContext:React.Context<DrumPlaybackClock['register']|null>;
export const StrumNotesContext:React.Context<ReadonlySet<string>>;
export const VoiceZIndicesContext:React.Context<ReadonlyMap<number,number>>;
export const ModulationOnsetEditingContext:React.Context<{active:boolean;isAllowed:(note:Note)=>boolean}>;
export function useNotePlaybackClock():NotePlaybackClock;
export function useDrumPlaybackClock():DrumPlaybackClock;
export function createNotePlaybackIndex():NotePlaybackClock;
export function createSectionPlaybackClock():NotePlaybackClock;
export function findPlaybackMeasure(measures:number[],time:number):number|null;
export const QUARTER_TONE_MARKER_SIZE:1;
export const QUARTER_TONE_MARKER_OFFSET:2;
export function pitchBendToSemitones(value:number):number;
export function isQuarterTonePitch(pitch:number):boolean;
export function getQuarterToneMarkerPosition(pitch:number):'above'|'below'|null;
export function getPitchBendSamples(points:PitchBendPoint[],span:SecondsSpan):Array<{time:number;bend:number}>;
export function getStaticPitchBend(note:Note):number|null;
export function getNotePitchAtTime(note:Note,time?:number):number;
export const RAWL_COLORS:ReadonlyArray<{background:string;foreground:string;dot?:{color:string;size:number}}>;
export function pitchColor(pitch:number):string;
export function interpolatedPitchColor(pitch:number):string;
export function maqamTonicOffset(name:string):number;
export function noteColorClass(pitch:number|'default'|'drum'):string;
export function notePitchDotClass(pitch:number):string;
export function noteLetterColors(prefix?:string):string;
export type VoiceHover=number|number[]|null;
export function voiceHoverContains(hover:VoiceHover,index:number):boolean;

export function nativeColorStyles():string;

export interface ShiftHoverAuditionOptions<N,E={shiftKey?:boolean;type?:string}> {audition?:(note:N,event:E,time?:number)=>void;isEnabled?:(note:N,event:E,time?:number)=>boolean;keyForNote?:(note:N)=>unknown;}
export interface ShiftHoverAudition<N,E={shiftKey?:boolean;type?:string}> {enter(note:N,event?:E,time?:number):boolean;leave():void;reset():void;}
export function createShiftHoverAudition<N,E={shiftKey?:boolean;type?:string}>(options:ShiftHoverAuditionOptions<N,E>):ShiftHoverAudition<N,E>;

export const modulationOnsetStyles:string;
export function isModulationOnsetAllowed(start:number,range:readonly [number,number]|null):boolean;
export function useModulationOnsetEditing<N>(options:{
 getRange:()=>readonly [number,number]|null; noteStart:(note:N)=>number; onChoose:(note:N)=>void;
}):{
 active:boolean; isAllowed:(note:N)=>boolean;
 chooseNote:(note:N,event?:{shiftKey:boolean})=>boolean;
 onClickCapture:React.MouseEventHandler;
};
