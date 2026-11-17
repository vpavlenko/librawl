import * as React from 'react';
export {RawlMeasureHeader} from './notation';
export interface TonicSymbolProps {left:number;number:number;previousTonic:number|null;modulationDiff:number|null;tonicStart:number|null;alignToOnset?:boolean;transpose?:number;renderArrow?:(shift:{direction:'up'|'down';semitones:number;modulationDiff:number})=>React.ReactNode;flagClassName?:string;labelClassName?:string;flagAttributes?:React.HTMLAttributes<HTMLDivElement>;labelAttributes?:React.HTMLAttributes<HTMLSpanElement>;}
export const TonicSymbol:React.FC<TonicSymbolProps>;
