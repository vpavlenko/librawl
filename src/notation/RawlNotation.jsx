import React,{useImperativeHandle,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {pitchRange,staveGeometry,tonalSegments,tonalLines,tonicAt,mod,TONIC_NAMES,measureHeaderLayout} from './geometry.mjs';
import {RAWL_COLORS} from './palette.mjs';
import {TonicSymbol} from '../components/TonicSymbol.jsx';
import {PlaybackMeasureBorders} from './PlaybackMeasureBorders.jsx';
import {NoteLayer,NotePlaybackContext,PlaybackSectionContext,createSectionPlaybackClock} from 'librawl/native';

import {useTonicRecoloring} from './recolor.jsx';

const EMPTY_CHANGES=[];
const atRowStart=(beat,start)=>Math.abs(beat-start)<1e-7;
const names=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const noteName=p=>names[mod(p)]+(Math.floor(p/12)-1);

export {PlaybackMeasureBorders} from './PlaybackMeasureBorders.jsx';

export function PlaybackMeasureLayer({row,clock,measureMap,barBeats=4}){
 const border=useRef(null),{start,end}=row;
 useLayoutEffect(()=>{
  const element=border.current,span=end-start;
  if(!(span>0))return;
  const active=new Set(),unregister=[];
  const first=Math.max(0,Math.floor(start/barBeats))*barBeats;
  const measures=measureMap??(Number.isFinite(barBeats)&&barBeats>0
   ? Array.from({length:Math.ceil((end-first)/barBeats)},(_,index)=>({
     start:first+index*barBeats,duration:barBeats,sourceNumber:first/barBeats+index+1,
    }))
   : []);
  const rowSection=[start,end];
  element.hidden=true;
  delete element.dataset.measure;
  for(const measure of measures){
   const from=Math.max(start,measure.start),to=Math.min(end,measure.start+measure.duration);
   if(to<=from)continue;
   // Internal barlines occupy the pixel before their beat. The opening
   // line uses the first visible pixel, and the right edge still meets its barline.
   const beginsRow=atRowStart(from,start);
   const left=beginsRow?'0px':`calc(${(from-start)/span*100}% - 1px)`;
   const widthPercent=`${(to-from)/span*100}%`;
   const width=beginsRow?widthPercent:`calc(${widthPercent} + 1px)`;
   const times=measure.playbackSpans??[[measure.start,measure.start+measure.duration]];
   for(const [timeStart,timeEnd] of times){
    const scale=(timeEnd-timeStart)/measure.duration;
    const entry={left,width,number:measure.sourceNumber};
    unregister.push(clock.register(
     timeStart+(from-measure.start)*scale,timeStart+(to-measure.start)*scale,
     playing=>{
      if(playing)active.add(entry);
      else if(!active.delete(entry))return;
      const current=Array.from(active).at(-1);
      element.hidden=!current;
      if(!current){delete element.dataset.measure;return;}
      element.dataset.measure=current.number;
      element.style.left=current.left;
      element.style.width=current.width;
     },measure.playbackSpans===undefined?rowSection:null,
    ));
   }
  }
  return ()=>unregister.forEach(remove=>remove());
 },[start,end,clock,measureMap,barBeats]);
 return <PlaybackMeasureBorders ref={border} hidden/>;
}

/** Rawl AnalysisGrid's header and vertical grid, shared by all host views. */
export function RawlMeasureHeader({row,height='100%',tonic=0,changes=EMPTY_CHANGES,barBeats=4,beatBeats=1,phraseStarts,measureMap,selectedMeasure=null,onMeasureSelect,hideInitialTonic=false}){
 const element=useRef(null),[width,setWidth]=useState(0);
 useLayoutEffect(()=>{
  const el=element.current,view=el.ownerDocument.defaultView,fit=()=>{const next=el.getBoundingClientRect().width||el.clientWidth;setWidth(previous=>previous===next?previous:next);},Observer=view?.ResizeObserver??globalThis.ResizeObserver;
  fit();const observer=Observer?new Observer(fit):null;observer?.observe(el);view?.addEventListener('resize',fit);
  return()=>{observer?.disconnect();view?.removeEventListener('resize',fit);};
 },[]);
 const {measures,beats,markers}=useMemo(()=>measureHeaderLayout({row,tonic,changes,barBeats,beatBeats,phraseStarts,measureMap,width,selectedMeasure,hideInitialTonic}),[row,tonic,changes,barBeats,beatBeats,phraseStarts,measureMap,width,selectedMeasure,hideInitialTonic]);
 const x=beat=>(beat-row.start)/(row.end-row.start)*100;
 return <div ref={element} className="rawln-measure-grid" style={{height}}>
  {measures.map(measure=><div className={'rawln-bar'+(measure.isPhraseStart?' rawln-phrase-bar':'')} key={'bar-'+measure.beat} data-beat={measure.beat} data-phrase-boundary={measure.isPhraseStart?'true':undefined} data-terminal={measure.terminal?'true':undefined} style={{left:atRowStart(measure.beat,row.start)?0:`calc(${measure.left}% - 1px)`}}/>)}
  {beats.map(beat=><div className="rawln-beat-bar" key={'beat-'+beat} data-beat={beat} style={{left:x(beat)+'%'}}/>)}
  <div className="rawln-modulations">
   {markers.map(marker=><div key={marker.beat} className="rawln-modulation" data-beat={marker.beat} data-tonic={marker.tonic} data-join={marker.join?marker.name:undefined} data-onset-override={marker.onsetOverride?'true':undefined} data-origin-beat={marker.originBeat} data-continued={marker.continued?'true':undefined} style={{left:marker.pixelOffset?`calc(${marker.left}% - 1px)`:marker.left+'%'}} title={marker.name}>
    <TonicSymbol left={0} number={marker.number} previousTonic={marker.previousTonic} modulationDiff={marker.delta===null?null:mod(marker.delta)} tonicStart={marker.tonic} alignToOnset={marker.onsetOverride&&!marker.continued} labelClassName="rawln-modulation-label" flagClassName="rawln-modulation-flag" labelAttributes={{style:{left:marker.labelOffset}}} flagAttributes={{'data-degree':marker.delta===null?undefined:mod(marker.delta),style:{background:marker.delta===null?undefined:RAWL_COLORS[mod(marker.delta)].background}}} renderArrow={({direction})=><svg viewBox="0 0 24 24" aria-hidden="true">{direction==='down'?<><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>:<><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></>}</svg>}/>
   </div>)}
  </div>
  <div className="rawln-measure-labels" aria-hidden={onMeasureSelect?undefined:true}>
   {measures.filter(measure=>!measure.terminal).map(measure=><div
    className="rawln-measure-position" key={measure.beat}
    style={{gridTemplateColumns:`minmax(0, calc(${measure.left}% + 6px)) max-content`}}>
    <div className="rawln-measure-number"
     role={onMeasureSelect?'button':undefined} tabIndex={onMeasureSelect?0:undefined}
     aria-pressed={onMeasureSelect?selectedMeasure===measure.beat:undefined}
     onClick={onMeasureSelect?event=>{event.stopPropagation();onMeasureSelect(measure.beat);}:undefined}
     onKeyDown={onMeasureSelect?event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onMeasureSelect(measure.beat);}
     }:undefined}
     data-beat={measure.beat} data-modulation={measure.hasModulation?'true':undefined}
     style={{color:measure.color,pointerEvents:onMeasureSelect?'auto':undefined,cursor:onMeasureSelect?'pointer':undefined}}>
     <span>{measure.number}</span>
    </div>
   </div>)}
  </div>
 </div>;
}

function notePlaybackSpan(note,row,independentPlayback){
 if(!independentPlayback)return [note.start,note.start+note.duration];
 const [start,end]=note.playbackSpan??[note.start,note.start+note.duration];
 const scale=(end-start)/note.duration;
 return [start+Math.max(0,row.start-note.start)*scale,end-Math.max(0,note.start+note.duration-row.end)*scale];
}

/** Adapt authored quarter beats to the native renderer without changing source data. */
function BeatNoteLayer({visible,row,axis,tonic,changes,mutedVoices,hoveredKey,setHoveredKey,hoveredRef,onNote,onNoteAudition,auditionEnabled,onNoteHover,clock}){
 const host=useRef(null),[pixelWidth,setPixelWidth]=useState(100),span=row.end-row.start,section=useMemo(()=>[row.start,row.end],[row.start,row.end]);
 const independentPlayback=visible.some(note=>note.playbackSpan!==undefined),playbackSection=independentPlayback?null:section;
 useLayoutEffect(()=>{
  const element=host.current.parentElement,view=element.ownerDocument.defaultView,fit=()=>{const width=element.getBoundingClientRect().width||element.clientWidth||100;setPixelWidth(previous=>previous===width?previous:width);},Observer=view?.ResizeObserver??globalThis.ResizeObserver;
  fit();const observer=Observer?new Observer(fit):null;observer?.observe(element);view?.addEventListener('resize',fit);
  return()=>{observer?.disconnect();view?.removeEventListener('resize',fit);};
 },[]);
 const sourceById=useMemo(()=>new Map(visible.map(note=>[String(note.id),note])),[visible]);
 const nativeNotes=useMemo(()=>visible.map(note=>{
  const degree=mod(note.pitch-tonicAt(tonic,changes,note.start+note.duration/2)),muted=mutedVoices.includes(note.voice);
  return {id:String(note.id),note:{midiNumber:note.pitch},span:notePlaybackSpan(note,row,independentPlayback),displaySpan:[Math.max(row.start,note.start),Math.min(row.end,note.start+note.duration)],voiceIndex:note.voice??0,displayVoiceIndex:note.voice??0,isDrum:false,isActive:!muted,color:`noteColor_${degree}_colors`,colorPitchClass:degree,noteUnderCursor:hoveredKey===`${note.id}:${row.start}`,velocity:note.velocity,...(note.pitchBend?{pitchBend:note.pitchBend}:{}),...(note.sourceLocation?{sourceLocation:note.sourceLocation}:{})};
 }),[visible,row.start,row.end,independentPlayback,tonic,changes,mutedVoices,hoveredKey]);
 // Preserve the host's compatibility class without duplicating note geometry.
 // Both the native renderer and this small notification use the same index.
 useLayoutEffect(()=>{
  const nativeById=new Map(nativeNotes.map(note=>[note.id,note]));
  const unregister=[...host.current.querySelectorAll('[data-note]')].map(element=>{
   const note=nativeById.get(element.dataset.note);
   return clock.register(...note.span,active=>element.classList.toggle('rawln-sounding',active&&note.isActive),playbackSection);
  });
  return()=>unregister.forEach(remove=>remove());
 },[clock,nativeNotes,playbackSection]);
 const hover=note=>{
  const original=sourceById.get(note.id),key=`${original.id}:${row.start}`;
  if(hoveredRef.current===key)return;
  hoveredRef.current=key;setHoveredKey(key);onNoteHover?.(original);
 };
 const leave=()=>{if(hoveredRef.current===null)return;hoveredRef.current=null;setHoveredKey(null);onNoteHover?.(null);};
 return <div ref={host} style={{display:'contents'}}><PlaybackSectionContext.Provider value={playbackSection}><NoteLayer notes={nativeNotes} midiNumberToY={pitch=>axis.pitchToY(pitch)+axis.glyphHeight/2} noteHeight={axis.glyphHeight/2} secondsToX={beat=>(beat-row.start)/span*pixelWidth} handleNoteClick={note=>onNote?.(sourceById.get(note.id))} handleMouseEnter={hover} handleMouseLeave={leave} onNoteAudition={onNoteAudition?note=>onNoteAudition(sourceById.get(note.id)):undefined} auditionEnabled={auditionEnabled} getNoteAttributes={note=>{
  const original=sourceById.get(note.id),start=note.displaySpan[0],end=note.displaySpan[1],degree=note.colorPitchClass,muted=mutedVoices.includes(original.voice);
  return {role:'button',tabIndex:-1,'aria-label':noteName(original.pitch),'data-note':original.id,'data-pitch':original.pitch,'data-degree':degree,'data-voice':original.voice,className:`rawln-note rawln-voice-${original.voice}${muted?' rawln-muted':''}`,style:{left:(start-row.start)/span*100+'%',width:(end-start)/span*100+'%',...(!note.pitchBend?.length&&RAWL_COLORS[degree]?{background:RAWL_COLORS[degree].background}:{}),zIndex:100+(84-original.pitch)+(original.voice===1?128:0)}};
 }}/></PlaybackSectionContext.Provider></div>;
}

/** A host-independent Rawl score. Times are quarter-note beats, pitches MIDI. */
export function RawlNotation({notes,beats,rows,tonic=0,changes=EMPTY_CHANGES,barBeats=4,beatBeats=1,phraseStarts,measureMap,hideInitialTonic=false,showTonalGuides=true,noteScale=1,position,playbackClock,mutedVoices=[],onSeek,onNote,onNoteAudition,onNoteHover,onMeasureSelect,selectedMeasure=null,onChangesChange,recolorable=true,renderHeader,renderUnderlay,renderFooter,className='',style,ref}){
 const root=useRef(null),hoveredRef=useRef(null),[hoveredKey,setHoveredKey]=useState(null),ownClock=useMemo(createSectionPlaybackClock,[]),clock=playbackClock??ownClock;
 const audition=onNoteAudition??onNote;
 const seek=onSeek??(beat=>playbackClock?.seek?playbackClock.seek(beat):clock.advance(beat));
 const editor=useTonicRecoloring({changes,barBeats,measureMap,onChange:onChangesChange}),automatic=recolorable&&!onMeasureSelect;
 if(automatic){changes=editor.changes;selectedMeasure=editor.selectedMeasure;onMeasureSelect=editor.selectMeasure;const originalHover=onNoteHover;onNoteHover=note=>{editor.hoverNote(note);originalHover?.(note);};}
 const spans=rows?.length?rows:[{start:0,end:beats,label:1}];
 const prepared=useMemo(()=>spans.map(row=>{
  const visible=notes.filter(n=>n.start<row.end-1e-6&&n.start+n.duration>row.start+1e-6),range=pitchRange(visible),axis=staveGeometry(range,{noteScale});
  return {row,visible,range,axis,regions:showTonalGuides?tonalSegments(tonic,changes,row.start,row.end):[]};
 }),[notes,rows,beats,tonic,changes,noteScale,showTonalGuides]);
 const setPosition=beat=>Number.isFinite(beat)?clock.advance(beat):clock.reset();
 useImperativeHandle(ref,()=>({setPosition,element:root.current}),[clock]);
 useLayoutEffect(()=>{if(position!==undefined||!playbackClock)setPosition(position);},[position,clock,playbackClock]);
 useLayoutEffect(()=>()=>ownClock.reset(),[ownClock]);
 return <NotePlaybackContext.Provider value={clock.register}><div className={'rawln'+(className?' '+className:'')} style={style} ref={root}>
  {prepared.map(({row,visible,range,axis,regions})=>{
   const span=row.end-row.start,x=beat=>(beat-row.start)/span*100;
   return <div className="rawln-row" data-section={row.section} key={`${row.start}-${row.end}`} data-start={row.start} data-end={row.end} style={row.style}>
    {renderHeader&&<div className="rawln-header">{renderHeader(row)}</div>}
    <div className="rawln-score" data-seekable={selectedMeasure===null||undefined} role="group" aria-label="Rawl notation" style={{height:axis.notesBottom}} onClick={e=>{if(selectedMeasure!==null)return;const box=e.currentTarget.getBoundingClientRect();if(box.width>0)seek(row.start+Math.max(0,Math.min(1,(e.clientX-box.left)/box.width))*span);}}>
     <PlaybackMeasureLayer row={row} clock={clock} measureMap={measureMap} barBeats={barBeats}/>
     <div className="rawln-grid" aria-hidden="true">
      {regions.flatMap((region,i)=>tonalLines(range,axis,region.tonic).map((line,j)=><div key={`${i}-${j}`} data-tonic={region.tonic} className={`rawln-${line.kind}-line`} style={{left:x(region.start)+'%',width:(region.end-region.start)/span*100+'%',top:line.y}}/>))}
     </div>
     {renderUnderlay?.(row,axis)}
     <RawlMeasureHeader row={row} height={axis.notesBottom} tonic={tonic} changes={changes} barBeats={barBeats} beatBeats={beatBeats} phraseStarts={phraseStarts} measureMap={measureMap} selectedMeasure={selectedMeasure} onMeasureSelect={onMeasureSelect} hideInitialTonic={hideInitialTonic}/>
     <BeatNoteLayer visible={visible} row={row} axis={axis} tonic={tonic} changes={changes} mutedVoices={mutedVoices} hoveredKey={hoveredKey} setHoveredKey={setHoveredKey} hoveredRef={hoveredRef} onNote={note=>{if(automatic&&editor.chooseNote(note))return;if(onNote)onNote(note);else if(selectedMeasure===null)seek(Math.max(row.start,note.start));}} onNoteAudition={audition} auditionEnabled={selectedMeasure==null} onNoteHover={onNoteHover} clock={clock}/>
    </div>
    {renderFooter&&<div className="rawln-footer">{renderFooter(row,{changes,selectedMeasure})}</div>}
   </div>;
  })}
 </div></NotePlaybackContext.Provider>;
}
export {pitchRange,staveGeometry,modulationLabelOffset} from './geometry.mjs';
export {RAWL_COLORS} from './palette.mjs';
