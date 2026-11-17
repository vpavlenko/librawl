import type * as React from "react";
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

export type ColoredNote = Note & {
  // Presentation identity; voiceIndex remains the original MIDI/source index.
  displayVoiceIndex?: number;
  color: string;
  isActive: boolean;
  colorPitchClass: number | "default" | "drum";
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

