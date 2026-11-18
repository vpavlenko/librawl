export interface RomanNumeralOptions {
  theme?: 'light' | 'dark';
  /** Use the shared sans-serif face and its accidental spacing. */
  font?: 'serif' | 'sans-serif';
  /** Jazz figures denote extensions instead of classical inversions. */
  jazz?: boolean;
  rootPitch?: number;
  /** Tonic-relative pitch of an explicit bass, rather than an applied target. */
  bassPitch?: number | null;
  figurePitches?: Readonly<Record<string, number>>;
  colorRoots?: boolean;
  colorFigures?: boolean;
  colorQuality?: boolean;
  colorOffset?: number;
  mode?: 'major' | 'minor';
  seventhInterval?: 9 | 10 | 11;
  cadentialSixFour?: boolean;
  contextChord?: string;
  hideAppliedTarget?: boolean;
}

export interface RomanNumeralTooltipOptions {
  /** Tonic-relative semitone offsets. Keep octaves to show the desired voicing. */
  pitches: readonly number[];
  /** Optional comparison voicing for a chord with a non-root bass. */
  rootPitches?: readonly number[];
  rootNotation?: string;
  inversion?: number;
}
export function romanNumeralHTML(notation: string, options?: RomanNumeralOptions): string;
export function romanNumeralContent(notation: string, options?: RomanNumeralOptions): string;
