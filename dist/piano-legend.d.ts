import type { FC, ReactNode } from 'react';

export type PianoLegendAudition = (
  pitches: number[],
  options: { kind: 'note' | 'chord' | 'scale'; onActiveNote?: (index: number | null) => void }
) => void | (() => void);
export interface PianoLegendProps {
  currentTonic?: number;
  inline?: boolean;
  enabledPitches?: readonly number[];
  activePitch?: number | null;
  /** Pitches use the Rawl C3 register (MIDI = 48 + pitch). */
  onAudition?: PianoLegendAudition;
}
export const PianoLegend: FC<PianoLegendProps>;
export const InlinePianoLegend: FC<Omit<PianoLegendProps, 'inline'>>;
export interface PianoLegendMode {
  title: string;
  chords: readonly {
    name: string;
    pitches: readonly number[];
    /** Optional pre-voiced tonic-relative register, used for drawing and audition. */
    positions?: readonly number[];
    romanLabel?: ReactNode;
  }[];
}
export const FoldablePianoLegend: FC<{
  currentTonic?: number;
  modes?: readonly PianoLegendMode[];
  onAudition?: PianoLegendAudition;
  setHoveredColors?: (colors: string[] | null) => void;
  /** Override the preference key. New users start with the legend folded. */
  storageKey?: string;
}>;
