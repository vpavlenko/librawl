import React,{useImperativeHandle,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {pitchRange,staveGeometry,tonalSegments,tonicAt,mod,TONIC_NAMES} from './geometry.mjs';
import {RAWL_COLORS} from './palette.mjs';
import {RawlMeasureHeader} from './RawlMeasureHeader.jsx';
import {TonalGrid} from './TonalGrid.jsx';
import {PlaybackMeasureBorders} from './PlaybackMeasureBorders.jsx';
import {SourceBrackets,SourceComments,SourceHarmony,SourceNoteAnnotations} from './SourceScoreAnnotations.jsx';
import {NoteLayer,NotePlaybackContext,PlaybackSectionContext,createSectionPlaybackClock} from 'librawl/native';

import {useTonicRecoloring} from './recolor.jsx';

const EMPTY_CHANGES=[];
const atRowStart=(beat,start)=>Math.abs(beat-start)<1e-7;
const noteName=p=>TONIC_NAMES[mod(p)]+(Math.floor(p/12)-1);

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

export {RawlMeasureHeader} from './RawlMeasureHeader.jsx';
export {TonalGrid} from './TonalGrid.jsx';

function notePlaybackSpan(note,row,independentPlayback){
 if(!independentPlayback)return [note.start,note.start+note.duration];
 const [start,end]=note.playbackSpan??[note.start,note.start+note.duration];
 const scale=(end-start)/note.duration;
 return [start+Math.max(0,row.start-note.start)*scale,end-Math.max(0,note.start+note.duration-row.end)*scale];
}

/** Adapt authored quarter beats to the native renderer without changing source data. */
function BeatNoteLayer({visible,row,axis,tonic,changes,mutedVoices,hoveredKey,setHoveredKey,hoveredRef,onNote,onNoteAudition,auditionEnabled,onNoteHover,clock,sourceNoteMarks}){
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
  const original=sourceById.get(note.id),start=note.displaySpan[0],end=note.displaySpan[1],degree=note.colorPitchClass,muted=mutedVoices.includes(original.voice),mark=sourceNoteMarks.get(note.id);
  return {role:'button',tabIndex:-1,'aria-label':noteName(original.pitch),'data-note':original.id,'data-pitch':original.pitch,'data-degree':degree,'data-voice':original.voice,'data-note-star':mark?.star||undefined,'data-note-arrow':mark?.arrow||undefined,className:`rawln-note rawln-voice-${original.voice}${muted?' rawln-muted':''}`,style:{left:(start-row.start)/span*100+'%',width:(end-start)/span*100+'%',...(!note.pitchBend?.length&&RAWL_COLORS[degree]?{background:RAWL_COLORS[degree].background}:{}),zIndex:100+(84-original.pitch)+(original.voice===1?128:0)}};
 }}/></PlaybackSectionContext.Provider></div>;
}

/** A host-independent Rawl score. Times are quarter-note beats, pitches MIDI. */
export function RawlNotation({notes,beats,rows,tonic=0,changes=EMPTY_CHANGES,barBeats=4,beatBeats=1,phraseStarts,measureMap,hideInitialTonic=false,modulationMarkerPlacement,showTonalGuides=true,noteScale=1,position,playbackClock,mutedVoices=[],onSeek,onNote,onNoteAudition,onNoteHover,onMeasureSelect,selectedMeasure=null,onChangesChange,recolorable=true,sectionEditing,renderMeasureExtras,renderHeader,renderUnderlay,renderFooter,sourceAnnotations,className='',style,ref}){
 const root=useRef(null),hoveredRef=useRef(null),[hoveredKey,setHoveredKey]=useState(null),ownClock=useMemo(createSectionPlaybackClock,[]),clock=playbackClock??ownClock;
 const audition=onNoteAudition??onNote;
 const seek=onSeek??(beat=>playbackClock?.seek?playbackClock.seek(beat):clock.advance(beat));
 const editor=useTonicRecoloring({changes,barBeats,measureMap,onChange:onChangesChange}),automatic=recolorable&&!onMeasureSelect;
 if(automatic){changes=editor.changes;selectedMeasure=editor.selectedMeasure;onMeasureSelect=editor.selectMeasure;const originalHover=onNoteHover;onNoteHover=note=>{editor.hoverNote(note);originalHover?.(note);};}
 const spans=rows?.length?rows:[{start:0,end:beats,label:1}];
 const sourceNoteMarks=useMemo(()=>new Map(sourceAnnotations?.noteMarks?.map(mark=>[String(mark.noteId),mark])),[sourceAnnotations?.noteMarks]);
 const prepared=useMemo(()=>spans.map(row=>{
  const visible=notes.filter(n=>n.start<row.end-1e-6&&n.start+n.duration>row.start+1e-6);
  const unpitched=sourceAnnotations?.unpitched?.filter(mark=>mark.beat>=row.start&&mark.beat<row.end&&Number.isFinite(mark.pitch))??[];
  const range=pitchRange([...visible,...unpitched]);
  const hasNoteMarks=visible.some(note=>sourceNoteMarks.has(String(note.id)));
  const axis=staveGeometry(range,{noteScale,above:hasNoteMarks?18:0});
  return {row,visible,range,axis,regions:showTonalGuides?tonalSegments(tonic,changes,row.start,row.end):[]};
 }),[notes,rows,beats,tonic,changes,noteScale,showTonalGuides,sourceNoteMarks,sourceAnnotations?.unpitched]);
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
     {sourceAnnotations?.harmony?.length>0&&<SourceHarmony row={row} harmony={sourceAnnotations.harmony}/>}
     <PlaybackMeasureLayer row={row} clock={clock} measureMap={measureMap} barBeats={barBeats}/>
     <TonalGrid range={range} pitchToY={pitch=>axis.pitchToY(pitch)+axis.pitchStep}
      regions={regions.map(region=>({...region,left:x(region.start)+'%',width:(region.end-region.start)/span*100+'%'}))}
     />
     {renderUnderlay?.(row,axis)}
     {sourceAnnotations&&<SourceNoteAnnotations row={row} axis={axis} visible={visible} annotations={sourceAnnotations}/>}
     <RawlMeasureHeader row={row} height={axis.notesBottom} tonic={tonic} changes={changes} barBeats={barBeats} beatBeats={beatBeats} phraseStarts={phraseStarts} doubleBarlines={sourceAnnotations?.doubleBarlines} measureMap={measureMap} selectedMeasure={selectedMeasure} onMeasureSelect={onMeasureSelect} hideInitialTonic={hideInitialTonic} modulationMarkerPlacement={modulationMarkerPlacement} sectionEditing={sectionEditing} renderMeasureExtras={renderMeasureExtras}/>
     <BeatNoteLayer visible={visible} row={row} axis={axis} tonic={tonic} changes={changes} mutedVoices={mutedVoices} hoveredKey={hoveredKey} setHoveredKey={setHoveredKey} hoveredRef={hoveredRef} onNote={note=>{if(automatic&&editor.chooseNote(note))return;if(onNote)onNote(note);else if(selectedMeasure===null)seek(Math.max(row.start,note.start));}} onNoteAudition={audition} auditionEnabled={selectedMeasure==null} onNoteHover={onNoteHover} clock={clock} sourceNoteMarks={sourceNoteMarks}/>
    </div>
    {sourceAnnotations?.spans?.length>0&&<SourceBrackets row={row} spans={sourceAnnotations.spans}/>}
    {renderFooter&&<div className="rawln-footer">{renderFooter(row,{changes,selectedMeasure})}</div>}
   </div>;
  })}
  {sourceAnnotations?.comments?.length>0&&<SourceComments comments={sourceAnnotations.comments} onSeek={seek}/>}
 </div></NotePlaybackContext.Provider>;
}
export {pitchRange,staveGeometry,modulationLabelOffset} from './geometry.mjs';
export {RAWL_COLORS} from './palette.mjs';
