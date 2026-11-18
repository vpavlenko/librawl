export {pitchRange,staveGeometry,modulationLabelOffset} from './notation';
export const PITCH_STEP:3;export const NOTE_HEIGHT:5;export const TOP_CLEARANCE:20;export const BOTTOM_CLEARANCE:2;
export function mod(n:number):number;
export function tonicAt(tonic:number,changes:Array<{beat:number;tonic:number}>,beat:number):number;
export const TONIC_NAMES:string[];
import type {ScoreRow} from './notation';
export function alignScoreRows<Row extends ScoreRow & {anchor?:number}>(rows:readonly Row[]):{width:number;rows:Row[]};

import type {KeyMarker,RowKeyMarker} from './notation';
export function markersForRow(events:readonly KeyMarker[], options:{
 start:number; end:number; toPixels?:(beat:number)=>number; numberAt:(beat:number)=>number|string;
 hideInitialTonic?:boolean;
}):RowKeyMarker[];
export function visibleBeatLines(barTimes:readonly number[],beatTimes:number[],toPixels:(beat:number)=>number):number[];
export function guidePitches(low:number,high:number,tonic:number|null,fifthInterval?:number):{kind:'tonic'|'fifth';pitch:number}[];
export interface TonicEvent {
 beat:number; tonic:number|null; number?:number|string|null; onsetOverride?:boolean;
}
export function tonicMarkers<T extends TonicEvent>(events:readonly T[]):(T & {
 previousTonic:number|null; delta:number|null;
})[];
export function tonicRegions<T extends TonicEvent>(events:readonly T[],start:number,end:number):(T & {
 start:number; end:number;
})[];
export function measureSubdivisionBeats(start:number,end:number,step:number,epsilon?:number):number[];
