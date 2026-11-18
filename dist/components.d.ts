import * as React from 'react';
export type {MeasureHeaderLayout,PositionedMeasure,KeyMarker,RowKeyMarker,TonalGridProps} from './notation';
export {RawlMeasureHeader,TonalGrid,PlaybackMeasureBorders,PlaybackMeasureLayer} from './notation';
export * from './piano-legend';
export interface TonicSymbolProps {left:number;number:number;previousTonic:number|null;modulationDiff:number|null;tonicStart:number|null;alignToOnset?:boolean;transpose?:number;renderArrow?:(shift:{direction:'up'|'down';semitones:number;modulationDiff:number})=>React.ReactNode;flagClassName?:string;labelClassName?:string;flagAttributes?:React.HTMLAttributes<HTMLDivElement>;labelAttributes?:React.HTMLAttributes<HTMLSpanElement>;}
export const TonicSymbol:React.FC<TonicSymbolProps>;
export interface PlaybackTimeline {
  sections?: readonly number[];
  phrases?: readonly number[];
  coloredMarks?: readonly {time: number; color: string}[];
  bassBars?: readonly {start: number; end: number; color: string}[];
}

/** All timeline positions and the duration are in seconds. Volume 1 is 100%. */
export interface PlaybackFooterProps {
  position: number;
  duration: number;
  playing: boolean;
  /** Read the live playback position in seconds while playing. */
  getPosition?: () => number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  rate?: number;
  onRateChange?: (rate: number) => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  volumeMax?: number;
  timeline?: PlaybackTimeline;
  keyboardShortcuts?: boolean;
  allowSpaceInInputs?: boolean;
  disabled?: boolean;
  beforeTimeline?: React.ReactNode;
  children?: React.ReactNode;
}
export const PlaybackFooter: React.FC<PlaybackFooterProps>;
/** Read and paint immediately, then on each animation frame until disposed. */
export function observePlaybackPosition(readPosition: () => number, paintPosition: (position: number) => void): () => void;

import type { RomanNumeralOptions, RomanNumeralTooltipOptions } from './roman-numerals';
export const RomanNumeral: React.FC<{notation: string; options?: RomanNumeralOptions; tooltip?: boolean | RomanNumeralTooltipOptions}>;
export interface ScoreSizeSlidersProps {
  noteHeight: number;
  timeSpacing: number;
  onNoteHeightChange: (height: number) => void;
  onTimeSpacingChange: (spacing: number) => void;
  keyboardShortcuts?: boolean;
  titles?: {noteHeight?: string; timeSpacing?: string};
}
export const ScoreSizeSliders: React.FC<ScoreSizeSlidersProps>;

export const ScorePinchContent: React.FC<{
  children?: React.ReactNode;
  activeRef: {current: boolean};
  fitWidth?: boolean;
}>;
/** Enable the Rawl axis-locked preview and deferred size commit on a score. */
export function useScorePinch(
  container: React.RefObject<HTMLDivElement | null>,
  noteHeight: number,
  timeSpacing: number,
  setNoteHeight: (height: number) => void,
  setTimeSpacing: (spacing: number) => void,
  enabled?: boolean
): {current: boolean};
