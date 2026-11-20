/** Rawl Roman numeral roots indexed by semitones above the tonic. */
export const ROMAN_NUMERAL_DEGREES: readonly string[];

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

export type GuitarChordOptions = Pick<RomanNumeralOptions,
  'theme' | 'rootPitch' | 'bassPitch' | 'figurePitches' | 'colorRoots' | 'colorFigures' | 'colorQuality'>;

/** Format a letter-name chord using colors relative to the supplied tonic pitch class. */
export function guitarChordHTML(notation: string, options?: GuitarChordOptions & { tonic?: number }): string;

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
