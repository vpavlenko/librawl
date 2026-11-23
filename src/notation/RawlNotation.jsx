import React,{useImperativeHandle,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {alignScoreRows,pitchRange,staveGeometry,tonalSegments,tonicAt,mod,TONIC_NAMES} from './geometry.mjs';
import {RAWL_COLORS} from './palette.mjs';
import {RawlMeasureHeader} from './RawlMeasureHeader.jsx';
import {TonalGrid} from './TonalGrid.jsx';
import {PlaybackMeasureBorders} from './PlaybackMeasureBorders.jsx';
import {NoteLayer,NotePlaybackContext,PlaybackSectionContext,createSectionPlaybackClock,ModulationOnsetEditingContext} from 'librawl/native';

import {useTonicRecoloring} from './recolor.jsx';

const EMPTY_CHANGES=[];
const EMPTY_MUTED_VOICES=[];
const NO_ONSET_EDITING={active:false,isAllowed:()=>false};
// Lucide volume-2 and palette geometry with a contrasting outline.
function iconCursor(shape){
 const outline=`<g fill="none" stroke="black" color="black" stroke-width="4">${shape}</g>`;
 const icon=`<g fill="none" stroke="white" color="white" stroke-width="2">${shape}</g>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-1 -1 26 26" stroke-linecap="round" stroke-linejoin="round">${outline}${icon}</svg>`;
 return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, pointer`;
}
const AUDITION_CURSOR=iconCursor('<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>');
const TONIC_CURSOR=iconCursor('<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><g fill="currentColor"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/></g>');
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
function BeatNoteLayer({visible,row,axis,tonic,changes,mutedVoices,onNote,onNoteAudition,auditionEnabled,onNoteHover,clock,onsetEditing,noteCursor}){
 const host=useRef(null),[pixelWidth,setPixelWidth]=useState(100),span=row.end-row.start,section=useMemo(()=>[row.start,row.end],[row.start,row.end]);
 const hoveredRef=useRef(null),[hoveredId,setHoveredId]=useState(null);
 const independentPlayback=useMemo(()=>visible.some(note=>note.playbackSpan!==undefined),[visible]),playbackSection=independentPlayback?null:section;
 useLayoutEffect(()=>{
  const element=host.current.parentElement,view=element.ownerDocument.defaultView,fit=()=>{const width=element.getBoundingClientRect().width||element.clientWidth||100;setPixelWidth(previous=>previous===width?previous:width);},Observer=view?.ResizeObserver??globalThis.ResizeObserver;
  fit();const observer=Observer?new Observer(fit):null;observer?.observe(element);view?.addEventListener('resize',fit);
  return()=>{observer?.disconnect();view?.removeEventListener('resize',fit);};
 },[]);
 const sourceById=useMemo(()=>new Map(visible.map(note=>[String(note.id),note])),[visible]);
 const onsetContext=useMemo(()=>({
  active:onsetEditing.active,
  isAllowed:note=>onsetEditing.isAllowed(sourceById.get(note.id)),
 }),[onsetEditing,sourceById]);
 const nativeNotes=useMemo(()=>visible.map(note=>{
  const degree=mod(note.pitch-tonicAt(tonic,changes,note.start+note.duration/2)),muted=mutedVoices.includes(note.voice);
  return {id:String(note.id),note:{midiNumber:note.pitch},span:notePlaybackSpan(note,row,independentPlayback),displaySpan:[Math.max(row.start,note.start),Math.min(row.end,note.start+note.duration)],voiceIndex:note.voice??0,displayVoiceIndex:note.voice??0,isDrum:false,isActive:!muted,color:`noteColor_${degree}_colors`,colorPitchClass:degree,noteUnderCursor:false,velocity:note.velocity,...(note.pitchBend?{pitchBend:note.pitchBend}:{}),...(note.sourceLocation?{sourceLocation:note.sourceLocation}:{})};
 }),[visible,row.start,row.end,independentPlayback,tonic,changes,mutedVoices]);
 const renderedNotes=useMemo(()=>hoveredId===null?nativeNotes:nativeNotes.map(note=>
  note.id===hoveredId?{...note,noteUnderCursor:true}:note),[nativeNotes,hoveredId]);
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
  if(hoveredRef.current===note.id)return;
  hoveredRef.current=note.id;setHoveredId(note.id);onNoteHover?.(sourceById.get(note.id));
 };
 const leave=()=>{if(hoveredRef.current===null)return;hoveredRef.current=null;setHoveredId(null);onNoteHover?.(null);};
 return <div ref={host} style={{display:'contents'}}><ModulationOnsetEditingContext.Provider value={onsetContext}><PlaybackSectionContext.Provider value={playbackSection}><NoteLayer notes={renderedNotes} midiNumberToY={pitch=>axis.pitchToY(pitch)+axis.glyphHeight/2} noteHeight={axis.glyphHeight/2} secondsToX={beat=>(beat-row.start)/span*pixelWidth} handleNoteClick={(note,event)=>onNote?.(sourceById.get(note.id),event)} handleMouseEnter={hover} handleMouseLeave={leave} onNoteAudition={onNoteAudition?note=>onNoteAudition(sourceById.get(note.id)):undefined} auditionEnabled={auditionEnabled} getNoteAttributes={note=>{
  const original=sourceById.get(note.id),start=note.displaySpan[0],end=note.displaySpan[1],degree=note.colorPitchClass,muted=mutedVoices.includes(original.voice);
  const cursor=onsetEditing.active
   ? (onsetEditing.isAllowed(original)?'e-resize':'not-allowed')
   : noteCursor;
  return {role:'button',tabIndex:-1,'aria-label':noteName(original.pitch),'data-note':original.id,'data-pitch':original.pitch,'data-degree':degree,'data-voice':original.voice,className:`rawln-note rawln-voice-${original.voice}${muted?' rawln-muted':''}`,style:{cursor,left:(start-row.start)/span*100+'%',width:(end-start)/span*100+'%',...(!note.pitchBend?.length&&RAWL_COLORS[degree]?{background:RAWL_COLORS[degree].background}:{}),zIndex:100+(84-original.pitch)+(original.voice===1?128:0)}};
 }}/></PlaybackSectionContext.Provider></ModulationOnsetEditingContext.Provider></div>;
}

function useSectionRows({notes,rows,beats,sectionStarts,phraseStarts,barBeats,sectionEditing,onSectionRowsChange,onEdit}){
 const baseRows=useMemo(()=>rows?.length?rows:[{start:0,end:beats,label:1}],[rows,beats]);
 const baseSections=useMemo(()=>{
  if(!sectionStarts?.length)return baseRows;
  const start=baseRows[0].start,end=baseRows.at(-1).end;
  const starts=[start,...sectionStarts.slice(1).filter(beat=>beat>start&&beat<end)];
  return starts.map((start,index)=>({start,end:starts[index+1]??end}));
 },[baseRows,sectionStarts]);
 const layoutKey=baseSections.map(({start,end})=>start+':'+end).join('|');
 const [edit,setEdit]=useState(null);
 const intervals=sectionEditing===undefined&&edit?.notes===notes&&edit.layoutKey===layoutKey?edit.intervals:null;
 const editedRows=useMemo(()=>{
  if(!intervals)return null;
  const authored=new Map(baseRows.map(row=>[row.start,row]));
  return alignScoreRows(intervals.map(({start,end})=>({...authored.get(start),start,end}))).rows;
 },[baseRows,intervals]);
 const spans=editedRows??baseRows;
 useLayoutEffect(()=>{onSectionRowsChange?.(editedRows);},[editedRows,onSectionRowsChange]);

 const sections=intervals??baseSections;
 const starts=sections.map(section=>section.start);
 const indexAt=beat=>sections.findLastIndex(section=>section.start<beat||atRowStart(section.start,beat));
 function editingForRow(){
  if(sectionEditing!==undefined)return sectionEditing||undefined;
  function update(beat,split){
   const index=indexAt(beat),section=sections[index],previous=sections[index-1];
   const next=sections.map(({start,end})=>({start,end}));
   if(split){
    next.splice(index,1,{start:section.start,end:beat},{start:beat,end:section.end});
   }else{
    next.splice(index-1,2,{start:previous.start,end:section.end});
   }
   const restored=next.length===baseSections.length&&next.every(({start,end},i)=>start===baseSections[i].start&&end===baseSections[i].end);
   setEdit(restored?null:{notes,layoutKey,intervals:next});
   onEdit?.();
  }
  return {
   sectionStarts:starts,
   canMerge:({beat})=>atRowStart(sections[indexAt(beat)-1]?.end,beat),
   canSplit:({beat,isPhraseStart})=>{
    const index=indexAt(beat),section=sections[index];
    const opening=index===0?Math.max(section.start,sectionStarts?.[0]??baseRows[0].anchor??section.start):section?.start;
    const phrase=sectionStarts?.length
     ? (phraseStarts?.some(start=>atRowStart(start,beat))??atRowStart(Math.round(beat/(4*barBeats))*4*barBeats,beat))
     : isPhraseStart;
    return section&&beat>opening&&beat<section.end&&
     (phrase||baseSections.some(base=>atRowStart(beat,base.start)));
   },
   onSplit:({beat})=>update(beat,true),
   onGlue:({beat})=>update(beat,false),
  };
 }
 return {spans,editing:editingForRow(),hasEditedRows:!!editedRows};
}

/** A host-independent Rawl score. Times are quarter-note beats, pitches MIDI. */
export function RawlNotation({notes,beats,rows,tonic=0,changes=EMPTY_CHANGES,barBeats=4,beatBeats=1,phraseStarts,measureMap,hideInitialTonic=false,showModulationTonics=false,showContinuedTonic=false,modulationMarkerPlacement,showTonalGuides=true,noteScale=1,position,playbackClock,mutedVoices=EMPTY_MUTED_VOICES,onSeek,onNote,onNoteAudition,onNoteHover,onMeasureSelect,selectedMeasure=null,onChangesChange,recolorable=true,recoloring,sectionEditing,sectionStarts,onSectionRowsChange,onSectionEdit,renderMeasureExtras,renderHeader,renderUnderlay,renderFooter,className='',style,ref}){
 const root=useRef(null),ownClock=useMemo(createSectionPlaybackClock,[]),clock=playbackClock??ownClock;
 const audition=onNoteAudition??onNote;
 const seek=onSeek??(beat=>playbackClock?.seek?playbackClock.seek(beat):clock.advance(beat));
 const localEditor=useTonicRecoloring({changes,barBeats,measureMap,onChange:onChangesChange});
 const editor=recoloring??(recolorable&&!onMeasureSelect?localEditor:null);
 const ownsSelection=editor||(!onMeasureSelect&&sectionEditing!==false?localEditor:null);
 if(ownsSelection){
  selectedMeasure=ownsSelection.selectedMeasure;
  onMeasureSelect=ownsSelection.selectMeasure;
 }
 if(editor){changes=editor.changes;const originalHover=onNoteHover;onNoteHover=note=>{editor.hoverNote(note);originalHover?.(note);};}
 const onsetEditing=editor?.onsetEditing??NO_ONSET_EDITING;
 const {spans,editing,hasEditedRows}=useSectionRows({notes,rows,beats,sectionStarts,phraseStarts,barBeats,sectionEditing,onSectionRowsChange,onEdit:()=>{
  ownsSelection?.cancel();
  onSectionEdit?.();
 }});
 const prepared=useMemo(()=>spans.map(row=>{
  const visible=notes.filter(n=>n.start<row.end-1e-6&&n.start+n.duration>row.start+1e-6),range=pitchRange(visible),axis=staveGeometry(range,{noteScale});
  return {row,visible,range,axis,regions:showTonalGuides?tonalSegments(tonic,changes,row.start,row.end):[]};
 }),[notes,spans,tonic,changes,noteScale,showTonalGuides]);
 const setPosition=beat=>Number.isFinite(beat)?clock.advance(beat):clock.reset();
 useImperativeHandle(ref,()=>({setPosition,element:root.current}),[clock]);
 useLayoutEffect(()=>{if(position!==undefined||!playbackClock)setPosition(position);},[position,clock,playbackClock]);
 useLayoutEffect(()=>()=>ownClock.reset(),[ownClock]);
 return <NotePlaybackContext.Provider value={clock.register}>
 <div className={['rawln',onsetEditing.active&&'modulation-onset-editing',className].filter(Boolean).join(' ')} style={style} ref={root} data-section-edited={hasEditedRows||undefined} onClickCapture={onsetEditing.onClickCapture}>
  {prepared.map(({row,visible,range,axis,regions})=>{
   const span=row.end-row.start,x=beat=>(beat-row.start)/span*100;
   return <div className="rawln-row" data-section={row.section} key={`${row.start}-${row.end}`} data-start={row.start} data-end={row.end} style={row.style}>
    {renderHeader&&<div className="rawln-header">{renderHeader(row)}</div>}
    <div className="rawln-score" data-seekable={selectedMeasure===null||undefined} role="group" aria-label="Rawl notation" style={{height:axis.notesBottom}} onClick={e=>{if(selectedMeasure!==null)return;const box=e.currentTarget.getBoundingClientRect();if(box.width>0)seek(row.start+Math.max(0,Math.min(1,(e.clientX-box.left)/box.width))*span);}}>
     <PlaybackMeasureLayer row={row} clock={clock} measureMap={measureMap} barBeats={barBeats}/>
     <TonalGrid range={range} pitchToY={pitch=>axis.pitchToY(pitch)+axis.pitchStep}
      regions={regions.map(region=>({...region,left:x(region.start)+'%',width:(region.end-region.start)/span*100+'%'}))}
     />
     {renderUnderlay?.(row,axis)}
     <RawlMeasureHeader row={row} height={axis.notesBottom} tonic={tonic} changes={changes} barBeats={barBeats} beatBeats={beatBeats} phraseStarts={phraseStarts} measureMap={measureMap} selectedMeasure={selectedMeasure} onMeasureSelect={onMeasureSelect} hideInitialTonic={hideInitialTonic} showModulationTonics={showModulationTonics} showContinuedTonic={showContinuedTonic} modulationMarkerPlacement={modulationMarkerPlacement} sectionEditing={editing} renderMeasureExtras={renderMeasureExtras}/>
     <BeatNoteLayer visible={visible} row={row} axis={axis} tonic={tonic} changes={changes} mutedVoices={mutedVoices} onNote={(note,event)=>{if(editor?.chooseNote(note,event))return;if(onNote)onNote(note,event);else if(selectedMeasure===null)seek(Math.max(row.start,note.start));}} onNoteAudition={audition} auditionEnabled={selectedMeasure==null} onNoteHover={onNoteHover} clock={clock} onsetEditing={onsetEditing} noteCursor={selectedMeasure==null?AUDITION_CURSOR:TONIC_CURSOR}/>
    </div>
    {renderFooter&&<div className="rawln-footer">{renderFooter(row,{changes,selectedMeasure})}</div>}
   </div>;
  })}
 </div></NotePlaybackContext.Provider>;
}
export {pitchRange,staveGeometry,modulationLabelOffset} from './geometry.mjs';
export {RAWL_COLORS} from './palette.mjs';
