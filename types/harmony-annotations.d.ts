import type {RomanNumeralOptions} from './roman-numerals';
export {romanNumeralHTML, romanNumeralContent} from './roman-numerals';

export interface HarmonyAnnotation {
  id?: string;
  beat: number;
  notation: string;
  position?: 'above' | 'below';
  options?: RomanNumeralOptions;
}

export interface HarmonyAnnotationOptions {
  start: number;
  end: number;
  annotations?: readonly HarmonyAnnotation[];
  arrows?: readonly {from: string; to: string}[];
  endInclusive?: boolean;
}

export function mountHarmonyAnnotations(score: HTMLElement, options: HarmonyAnnotationOptions): () => void;

type Point = readonly [number, number];
export function arrowCurve(from: Point, to: Point, direction?: 1 | -1): number[];
export function arrowGeometry(coordinates: readonly number[] | readonly Point[], routed?: boolean): {
  shaftPath: string;
  headPath: string;
  headPoints: Point[];
  tip: Point;
  tangent: Point;
  shaftEnd: Point;
  headLength: number;
};
