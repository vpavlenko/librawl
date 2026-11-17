// Pitch geometry follows Caplin packages/music/rawl-layout.js, based on Rawl.
// GPL-3.0-only. Note rectangles are 5 px high, with 3 px per semitone.
export const PITCH_STEP=3,NOTE_HEIGHT=5,TOP_CLEARANCE=20,BOTTOM_CLEARANCE=2;
export function pitchRange(notes,span=null,fallback={low:48,high:84}){
 const pitches=notes.filter(n=>!span||Math.min(span.end,n.start+n.duration)-Math.max(span.start,n.start)>1e-6).map(n=>n.pitch);
 return pitches.length?{low:Math.min(...pitches),high:Math.max(...pitches)}:{...fallback};
}
export function staveGeometry(range,{above=0,transpose=0}={}){
 const low=range.low+transpose,high=range.high+transpose,noteTop=TOP_CLEARANCE+above;
 const noteHeight=(high-low)*PITCH_STEP+TOP_CLEARANCE+NOTE_HEIGHT+BOTTOM_CLEARANCE;
 return {low,high,noteTop,noteHeight,notesBottom:noteHeight+above,guideTop:Math.max(0,noteTop-16),markerTop:noteTop-14,pitchToY:pitch=>noteTop+(high-pitch)*PITCH_STEP};
}
export const mod=n=>((n%12)+12)%12;
export function tonicAt(tonic,changes,beat){let result=tonic;for(const c of changes){if(c.beat<beat)result=c.tonic;else break;}return result;}
export const TONIC_NAMES=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
// Rawl AnalysisGrid.NewTonicSymbol (73fe6ab): initial label clears the
// measure's digit count; later labels sit 30px after the flag. An explicit
// modulation-onset override anchors both flag and label at the musical onset.
export function modulationLabelOffset(beat,barBeats,{initial=beat===0,onsetOverride,continued=false}={}){
 const measure=beat/barBeats,override=onsetOverride??(Number.isFinite(measure)&&Math.abs(measure-Math.round(measure))>1e-7);
 if(override&&!continued)return 0;
 return initial?String(Math.floor(measure)+1).length*8+10:30;
}
export function keyMarkers(tonic,changes){
 const events=[{beat:0,tonic},...changes].sort((a,b)=>a.beat-b.beat),onsets=[];
 for(const event of events){if(onsets.at(-1)?.beat===event.beat)onsets[onsets.length-1]=event;else onsets.push(event);}
 return onsets.map((event,i)=>{const previousTonic=i?onsets[i-1].tonic:null,delta=previousTonic===null?null:mod(event.tonic-previousTonic);return {...event,previousTonic,delta:delta!==null&&delta>6?delta-12:delta};});
}
/** Copy of AnalysisGrid's Measure/NewTonicSymbol layout in quarter beats.
 * Terminal phrase boundaries retain their bar without acquiring a number.
 * Pixel width is needed only for Rawl's 80px carried flag and beat density.
 */
export function measureHeaderLayout({row,tonic=0,changes=[],barBeats=4,beatBeats=1,phraseStarts,measureMap,width=0,selectedMeasure=null,hideInitialTonic=false}){
 const EPS=1e-7,span=row.end-row.start,ppb=width/span,x=beat=>(beat-row.start)/span*100;
 const explicit=measureMap===undefined?null:validateMeasureMap(measureMap);
 const numberAt=beat=>explicit?.findLast(measure=>measure.start<=beat+EPS)?.sourceNumber??Math.floor(beat/barBeats)+1;
 const boundary=beat=>phraseStarts===undefined?Math.abs(beat/(4*barBeats)-Math.round(beat/(4*barBeats)))<EPS:phraseStarts.some(start=>Math.abs(start-beat)<EPS);
 const selectedPhrase=selectedMeasure!==null&&boundary(selectedMeasure),measures=[],barlines=[],beats=[];
 const grid=explicit?explicit.map(measure=>({beat:measure.start,number:measure.sourceNumber})).concat([{beat:explicit.at(-1).start+explicit.at(-1).duration,number:null}]):Array.from({length:Math.max(0,Math.floor((row.end-Math.max(0,Math.ceil((row.start-EPS)/barBeats)*barBeats)+EPS)/barBeats)+1)},(_,i)=>{const beat=Math.max(0,Math.ceil((row.start-EPS)/barBeats)*barBeats)+i*barBeats;return {beat,number:Math.round(beat/barBeats)+1};});
 for(const {beat,number} of grid){
  if(beat<row.start-EPS||beat>row.end+EPS)continue;
  barlines.push(beat);
  const terminal=Math.abs(beat-row.end)<EPS,isPhraseStart=boundary(beat);
  if(!terminal||isPhraseStart)measures.push({beat,number,left:x(beat),terminal,isPhraseStart,color:selectedMeasure===beat?'red':selectedPhrase&&Math.abs(beat-selectedMeasure)<=4*barBeats+EPS?'orange':'#666'});
 }
 if(beatBeats>0){
  if(explicit){for(const measure of explicit){const unit=measure.beatBeats??beatBeats;for(let beat=measure.start+unit;beat<measure.start+measure.duration-EPS;beat+=unit)if(beat>=row.start-EPS&&beat<=row.end+EPS)beats.push(beat);}}
  else for(let beat=Math.ceil((row.start-EPS)/beatBeats)*beatBeats;beat<=row.end+EPS;beat+=beatBeats)if(Math.abs(beat/barBeats-Math.round(beat/barBeats))>EPS)beats.push(beat);
 }
 const relevant=[...barlines,...beats].filter(beat=>beat!==0).sort((a,b)=>a-b),showBeats=relevant.length>1&&(relevant.at(-1)-relevant[0])*ppb/(relevant.length+1)>=10;
 const events=keyMarkers(tonic,changes).filter(marker=>marker.delta!==0);
 const activeAtStart=events.findLast(marker=>marker.beat<=row.start);
 const markers=events.flatMap(marker=>{
  if((hideInitialTonic&&marker.previousTonic===null)||marker.beat>=row.end)return [];
  const initial=marker.previousTonic===null,measure=marker.beat/barBeats,onsetOverride=!initial&&(marker.onsetOverride??(explicit?!explicit.some(m=>Math.abs(m.start-marker.beat)<EPS):Math.abs(measure-Math.round(measure))>EPS)),badgeLeft=(marker.beat-row.start)*ppb-(onsetOverride?0:1),continued=marker.beat<row.start&&marker===activeAtStart&&width>0&&badgeLeft+80>0;
  if(marker.beat<row.start&&!continued)return [];
  // A carried badge supplies current-tonic context, never another modulation.
  // Use the original initial-tonic label and the current row's measure number.
  if(continued)return [{...marker,originBeat:marker.beat,beat:row.start,number:numberAt(row.start),previousTonic:null,delta:null,join:false,name:undefined,initial:true,onsetOverride:false,continued:true,left:0,pixelOffset:-1,labelOffset:String(numberAt(row.start)).length*8+10}];
  return [{...marker,number:numberAt(marker.beat),initial,onsetOverride,continued:false,left:x(marker.beat),pixelOffset:!onsetOverride?-1:0,labelOffset:initial&&explicit?String(numberAt(marker.beat)).length*8+10:modulationLabelOffset(marker.beat,barBeats,{initial,onsetOverride})}];
 });
 for(const measure of measures){measure.hasModulation=markers.some(marker=>marker.beat===measure.beat&&marker.delta!==null);if(measure.color==='#666'&&measure.hasModulation)measure.color='black';}
 return {measures,beats:showBeats?beats:[],markers};
}
export function tonalSegments(tonic,changes,start,end){
 const events=[{beat:0,tonic},...changes].sort((a,b)=>a.beat-b.beat),result=[];
 let current=tonic,cursor=start;
 for(const e of events){if(e.beat<=start){current=e.tonic;continue;}if(e.beat>=end)break;if(e.tonic!==current){result.push({start:cursor,end:e.beat,tonic:current});cursor=e.beat;current=e.tonic;}}
 result.push({start:cursor,end,tonic:current});return result;
}
export function tonalLines(range,axis,tonic){
 const result=[];const rawlY=p=>axis.pitchToY(p)+PITCH_STEP;
 for(let octave=Math.ceil((range.low+7-tonic)/12);octave<=Math.floor((range.high+12-tonic)/12);octave++){
  const midi=tonic+octave*12;
  if(midi-12>=range.low&&midi-12<=range.high)result.push({kind:'tonic',y:rawlY(midi-13+.5)});
  if(midi-7>=range.low&&midi-7<=range.high)result.push({kind:'fifth',y:rawlY(midi-6)-.5});
 }
 return result;
}

/** Authored boundaries are geometry only: note/playback times are unchanged. */
export function validateMeasureMap(measures){
 if(!Array.isArray(measures)||!measures.length)throw Error('Invalid measure map');
 let cursor=0;for(const measure of measures){
  if(!Number.isFinite(measure.start)||Math.abs(measure.start-cursor)>1e-7||!Number.isFinite(measure.duration)||measure.duration<=0||!['number','string'].includes(typeof measure.sourceNumber)||measure.beatBeats!==undefined&&(!Number.isFinite(measure.beatBeats)||measure.beatBeats<=0))throw Error('Invalid measure map');
  cursor=measure.start+measure.duration;
 }
 return measures;
}
