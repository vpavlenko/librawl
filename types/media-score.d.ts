import * as React from 'react';
import type {PlaybackLabels} from './components';
import type {RawlNotationProps} from './notation';

export interface MediaScoreProps {
  score: Omit<RawlNotationProps, 'position' | 'playbackClock' | 'onSeek'>;
  src: string;
  secondsPerBeat: number;
  /** Strictly increasing pairs of written and performed quarter-note beats. */
  beatAnchors?: readonly (readonly [displayBeat: number, playedBeat: number])[];
  label?: string;
  labels?: PlaybackLabels & {error?: string};
}

/** Inline audio and notation sharing the score's quarter-beat clock. */
export const MediaScore: React.FC<MediaScoreProps>;
