import {markersForRow, measureSubdivisionBeats, tonicEvents, tonicMarkers, tonicRegions, tonalGuideLines, visibleBeatLines} from './score-grid.mjs';
export {TONIC_NAMES, guidePitches, markersForRow, measureSubdivisionBeats, tonicMarkers, tonicRegions, visibleBeatLines} from './score-grid.mjs';

// Pitch geometry follows Caplin packages/music/rawl-layout.js, based on Rawl.
// GPL-3.0-only. Note rectangles are 5 px high, with 3 px per semitone.
export const PITCH_STEP=3,NOTE_HEIGHT=5,TOP_CLEARANCE=20,BOTTOM_CLEARANCE=2;
export function pitchRange(notes,span=null,fallback={low:48,high:84}){
 const pitches=notes.filter(n=>!span||Math.min(span.end,n.start+n.duration)-Math.max(span.start,n.start)>1e-6).map(n=>n.pitch);
 return pitches.length?{low:Math.min(...pitches),high:Math.max(...pitches)}:{...fallback};
}
export function staveGeometry(range,{above=0,transpose=0,noteScale=1}={}){
 const scale=Number.isFinite(noteScale)&&noteScale>0?noteScale:1,pitchStep=PITCH_STEP*scale,glyphHeight=NOTE_HEIGHT*scale;
 const low=range.low+transpose,high=range.high+transpose,noteTop=TOP_CLEARANCE+above+Math.max(0,glyphHeight-NOTE_HEIGHT);
 const notesBottom=noteTop+(high-low)*pitchStep+glyphHeight+BOTTOM_CLEARANCE,noteHeight=notesBottom-above;
 return {low,high,noteTop,noteHeight,notesBottom,pitchStep,glyphHeight,guideTop:Math.max(0,noteTop-16),markerTop:noteTop-14,pitchToY:pitch=>noteTop+(high-pitch)*pitchStep};
}
export const mod=n=>((n%12)+12)%12;
export function tonicAt(tonic,changes,beat){let result=tonic;for(const c of changes){if(c.beat<beat)result=c.tonic;else break;}return result;}
// Rawl AnalysisGrid.NewTonicSymbol (73fe6ab): initial label clears the
// measure's digit count; later labels sit 30px after the flag. An explicit
// modulation-onset override anchors both flag and label at the musical onset.
export function modulationLabelOffset(beat,barBeats,{initial=beat===0,onsetOverride,continued=false}={}){
 const measure=beat/barBeats,override=onsetOverride??(Number.isFinite(measure)&&Math.abs(measure-Math.round(measure))>1e-7);
 if(override&&!continued)return 0;
 return initial?String(Math.floor(measure)+1).length*8+10:30;
}
export function keyMarkers(tonic,changes){
 return tonicMarkers(tonicEvents(tonic,changes));
}
export function recolorBoundary(changes,measureBeat,barBeats,measureMap){
 const measure=measureMap?.find(measure=>Math.abs(measure.start-measureBeat)<1e-7),end=measure?measure.start+measure.duration:measureBeat+barBeats;
 return changes.find(change=>change.beat>=measureBeat-1e-7&&change.beat<end-1e-7)?.beat??measureBeat;
}
/** Copy of AnalysisGrid's Measure/NewTonicSymbol layout in quarter beats.
 * Section starts use the phrase accent when they coincide with an existing bar.
 * Terminal phrase boundaries retain their bar without acquiring a number.
 * Pixel width is needed only for Rawl's 80px carried flag and beat density.
 */
export function measureHeaderLayout({row,tonic=0,changes=[],barBeats=4,beatBeats=1,phraseStarts,measureMap,width=0,selectedMeasure=null,hideInitialTonic=false,modulationMarkerPlacement}){
 const EPS=1e-7,span=row.end-row.start,ppb=width/span,x=beat=>(beat-row.start)/span*100;
 const explicit=measureMap===undefined?null:validateMeasureMap(measureMap);
 const numberAt=beat=>explicit?.findLast(measure=>measure.start<=beat+EPS)?.sourceNumber??Math.floor(beat/barBeats)+1;
 const boundary=beat=>phraseStarts===undefined?Math.abs(beat/(4*barBeats)-Math.round(beat/(4*barBeats)))<EPS:phraseStarts.some(start=>Math.abs(start-beat)<EPS);
 const selectedPhrase=selectedMeasure!==null&&boundary(selectedMeasure),measures=[],barlines=[],beats=[];
 const grid=explicit?explicit.map(measure=>({beat:measure.start,number:measure.sourceNumber})).concat([{beat:explicit.at(-1).start+explicit.at(-1).duration,number:null}]):Array.from({length:Math.max(0,Math.floor((row.end-Math.max(0,Math.ceil((row.start-EPS)/barBeats)*barBeats)+EPS)/barBeats)+1)},(_,i)=>{const beat=Math.max(0,Math.ceil((row.start-EPS)/barBeats)*barBeats)+i*barBeats;return {beat,number:Math.round(beat/barBeats)+1};});
 for(const {beat,number} of grid){
  if(beat<row.start-EPS||beat>row.end+EPS)continue;
  barlines.push(beat);
  const terminal=Math.abs(beat-row.end)<EPS;
  const isPhraseStart=boundary(beat)||(!terminal&&Math.abs(beat-row.start)<EPS);
  if(!terminal||isPhraseStart)measures.push({beat,number,left:x(beat),terminal,isPhraseStart,color:selectedMeasure===beat?'red':selectedPhrase&&Math.abs(beat-selectedMeasure)<=4*barBeats+EPS?'orange':'#666'});
 }
 if(beatBeats>0){
  if(explicit){
   for(const measure of explicit){
    if(measure.beatPositions){
     beats.push(...measure.beatPositions.filter(beat=>beat>=row.start-EPS&&beat<=row.end+EPS));
     continue;
    }
    const unit=measure.beatBeats??beatBeats;
    for(const beat of measureSubdivisionBeats(measure.start,measure.start+measure.duration,unit,EPS))if(beat>=row.start-EPS&&beat<=row.end+EPS)beats.push(beat);
   }
  }
  else for(let beat=Math.ceil((row.start-EPS)/beatBeats)*beatBeats;beat<=row.end+EPS;beat+=beatBeats)if(Math.abs(beat/barBeats-Math.round(beat/barBeats))>EPS)beats.push(beat);
 }
 const actualEvents=keyMarkers(tonic,changes);
 const events=actualEvents.map((marker,index)=>{
  const onsetOverride=marker.onsetOverride??(explicit
   ? !explicit.some(measure=>Math.abs(measure.start-marker.beat)<EPS)
   : Math.abs(marker.beat/barBeats-Math.round(marker.beat/barBeats))>EPS);
  if(modulationMarkerPlacement==='following-measure'&&explicit&&onsetOverride&&marker.onsetOverride!==true&&marker.delta!==null){
   // Move the flag within the header only. If a newer event takes effect by
   // that bar, keep this marker at its own onset so the flags do not coincide.
   const next=explicit.find(measure=>measure.start>marker.beat+EPS);
   if(next&&(actualEvents[index+1]?.beat??Infinity)>next.start+EPS){
    return {...marker,beat:next.start,originBeat:marker.beat,number:next.sourceNumber,onsetOverride:false};
   }
  }
  return {...marker,onsetOverride};
 });
 // A displaced onset is editable from the header that displays the flag.
 const displacedOnsets=new Set(events.map(marker=>marker.originBeat).filter(Number.isFinite));
 const localChanges=displacedOnsets.size?changes.filter(change=>!displacedOnsets.has(change.beat)):changes;
 const markers=markersForRow(events,{...row,numberAt,hideInitialTonic,toPixels:width>0?beat=>beat*ppb:null})
  .map(marker=>({...marker,left:x(marker.beat)}));
 for(const measure of measures){
  const modulation=markers.find(marker=>marker.beat===measure.beat&&marker.delta!==null);
  measure.hasModulation=!!modulation;
  if(modulation?.originBeat!==undefined)measure.modulationBeat=modulation.originBeat;
  if(displacedOnsets.size)measure.recolorBeat=measure.modulationBeat??recolorBoundary(localChanges,measure.beat,barBeats,explicit);
  if(measure.color==='#666'&&modulation)measure.color='black';
 }
 return {measures,beats:visibleBeatLines(barlines,beats,beat=>beat*ppb),markers};
}
export function tonalSegments(tonic,changes,start,end){
 return tonicRegions(tonicEvents(tonic,changes),start,end).map(({start,end,tonic})=>({start,end,tonic}));
}
export function tonalLines(range,axis,tonic){
 return tonalGuideLines(range,pitch=>axis.pitchToY(pitch)+axis.pitchStep,tonic).map(({kind,y})=>({kind,y}));
}

/** Authored boundaries are geometry only: note/playback times are unchanged. */
export function validateMeasureMap(measures){
 if(!Array.isArray(measures)||!measures.length)throw Error('Invalid measure map');
 let cursor=0;for(const measure of measures){
  if(!Number.isFinite(measure.start)||Math.abs(measure.start-cursor)>1e-7||!Number.isFinite(measure.duration)||measure.duration<=0||!['number','string'].includes(typeof measure.sourceNumber)||measure.beatBeats!==undefined&&(!Number.isFinite(measure.beatBeats)||measure.beatBeats<=0))throw Error('Invalid measure map');
  cursor=measure.start+measure.duration;
  if(measure.beatPositions!==undefined){
   let previous=measure.start;
   if(!Array.isArray(measure.beatPositions))throw Error('Invalid measure map');
   for(const beat of measure.beatPositions){
    if(!Number.isFinite(beat)||beat<=previous||beat>=cursor)throw Error('Invalid measure map');
    previous=beat;
   }
  }
 }
 return measures;
}
// Place each row's musical anchor at the same x while keeping the beat scale uniform.
export function alignScoreRows(rows){
 const offsets=rows.map(({start,end,anchor=start})=>Math.max(0,Math.min(end,anchor)-start));
 const pickup=Math.max(0,...offsets);
 const width=pickup+Math.max(0,...rows.map(({start,end},index)=>end-start-offsets[index]));
 return {width,rows:rows.map((row,index)=>({
  ...row,style:{...row.style,width:width?(row.end-row.start)/width*100+'%':'0%',
   marginLeft:width?(pickup-offsets[index])/width*100+'%':'0%'},
 }))};
}
