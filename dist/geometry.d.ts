export {pitchRange,staveGeometry,modulationLabelOffset} from './notation';
export const PITCH_STEP:3;export const NOTE_HEIGHT:5;export const TOP_CLEARANCE:20;export const BOTTOM_CLEARANCE:2;
export function mod(n:number):number;
export function tonicAt(tonic:number,changes:Array<{beat:number;tonic:number}>,beat:number):number;
export const TONIC_NAMES:string[];
