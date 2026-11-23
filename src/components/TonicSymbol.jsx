// Extracted from Rawl AnalysisGrid.NewTonicSymbol, GPL-3.0-only.
// The defaults intentionally retain Rawl's markup, classes and inline styles.
import * as React from 'react';
import {MODULATION_BADGE_WIDTH, TONIC_NAMES} from '../notation/score-grid.mjs';

export const MODULATION_BADGE_HEIGHT = 12;

export function TonicSymbol({left,number,previousTonic,modulationDiff,tonicStart,alignToOnset=false,transpose=0,renderArrow,flagClassName,labelClassName,flagAttributes,labelAttributes,showLabel=true,showTonicName=true}){
 const displayedTonic=tonicStart==null?tonicStart:((tonicStart+transpose)%12+12)%12;
 const {style:labelStyle,className:attributeLabelClass,...labelRest}=labelAttributes??{};
 const {style:flagStyle,className:attributeFlagClass,...flagRest}=flagAttributes??{};
 const labelClass=[attributeLabelClass,labelClassName].filter(Boolean).join(' ')||undefined;
 const flagClass=[`noteColor_${modulationDiff}_colors`,attributeFlagClass,flagClassName].filter(Boolean).join(' ');
 return <>
  {showLabel && <span
   {...labelRest}
   className={labelClass}
   style={{
    color:'white',
    position:'absolute',
    top:-2,
    left:alignToOnset?left:left+(previousTonic===null?String(number).length*8+10:30),
    fontSize:12,
    zIndex:100,
    fontWeight:700,
    userSelect:'none',
    pointerEvents:'none',
    textAlign:'left',
    whiteSpace:'nowrap',
    ...labelStyle,
   }}
  >
   {previousTonic!==null&&(renderArrow?<>{renderArrow({direction:modulationDiff>6?'down':'up',semitones:modulationDiff>6?Math.abs(modulationDiff-12):modulationDiff,modulationDiff})}{modulationDiff>6?Math.abs(modulationDiff-12):modulationDiff}{showTonicName?' ':''}</>:<>{`${modulationDiff>6?`↓${Math.abs(modulationDiff-12)}`:`↑${modulationDiff}`}${showTonicName?' ':''}`}</>)}
   {showTonicName&&TONIC_NAMES[displayedTonic]}
  </span>}
  <div
   {...flagRest}
   className={flagClass}
   style={{
    width:MODULATION_BADGE_WIDTH,
    height:MODULATION_BADGE_HEIGHT,
    position:'absolute',
    top:0,
    left:left,
    zIndex:3,
    userSelect:'none',
    pointerEvents:'none',
    maskImage:'linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)',
    WebkitMaskImage:'linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)',
    ...flagStyle,
   }}
  />
 </>;
}
