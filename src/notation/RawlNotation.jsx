import React,{forwardRef,useImperativeHandle,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {pitchRange,staveGeometry,tonalSegments,tonalLines,tonicAt,mod,NOTE_HEIGHT,TONIC_NAMES,measureHeaderLayout} from './geometry.mjs';
import {RAWL_COLORS} from './palette.mjs';
import {TonicSymbol} from '../components/TonicSymbol.jsx';
import {NoteLayer,NotePlaybackContext,PlaybackSectionContext,createSectionPlaybackClock} from 'librawl/native';

import {useTonicRecoloring} from './recolor.jsx';

const EMPTY_CHANGES=[];
const names=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const noteName=p=>names[mod(p)]+(Math.floor(p/12)-1);

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
  {measures.map(measure=><div className={'rawln-bar'+(measure.isPhraseStart?' rawln-phrase-bar':'')} key={'bar-'+measure.beat} data-beat={measure.beat} data-phrase-boundary={measure.isPhraseStart?'true':undefined} data-terminal={measure.terminal?'true':undefined} style={{left:`calc(${measure.left}% - 1px)`,backgroundColor:measure.isPhraseStart?'#bbb':'#444'}}/>)}
  {beats.map(beat=><div className="rawln-beat-bar" key={'beat-'+beat} data-beat={beat} style={{left:x(beat)+'%'}}/>)}
  <div className="rawln-modulations">
   {markers.map(marker=><div key={marker.beat} className="rawln-modulation" data-beat={marker.beat} data-tonic={marker.tonic} data-join={marker.join?marker.name:undefined} data-onset-override={marker.onsetOverride?'true':undefined} data-continued={marker.continued?'true':undefined} style={{left:marker.pixelOffset?`calc(${marker.left}% - 1px)`:marker.left+'%'}} title={marker.name}>
    <TonicSymbol left={0} number={marker.number} previousTonic={marker.previousTonic} modulationDiff={marker.delta===null?null:mod(marker.delta)} tonicStart={marker.tonic} alignToOnset={marker.onsetOverride&&!marker.continued} labelClassName="rawln-modulation-label" flagClassName="rawln-modulation-flag" labelAttributes={{style:{left:marker.labelOffset}}} flagAttributes={{'data-degree':marker.delta===null?undefined:mod(marker.delta),style:{background:marker.delta===null?undefined:RAWL_COLORS[mod(marker.delta)].background}}} renderArrow={({direction})=><svg viewBox="0 0 24 24" aria-hidden="true">{direction==='down'?<><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>:<><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></>}</svg>}/>
   </div>)}
  </div>
  <div className="rawln-measure-labels" aria-hidden={onMeasureSelect?undefined:true}>
   {measures.filter(measure=>!measure.terminal).map(measure=><div className="rawln-measure-number" role={onMeasureSelect?'button':undefined} tabIndex={onMeasureSelect?0:undefined} aria-pressed={onMeasureSelect?selectedMeasure===measure.beat:undefined} onClick={onMeasureSelect?event=>{event.stopPropagation();onMeasureSelect(measure.beat);}:undefined} onKeyDown={onMeasureSelect?event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onMeasureSelect(measure.beat);}}:undefined} key={measure.beat} data-beat={measure.beat} data-modulation={measure.hasModulation?'true':undefined} style={{left:`calc(${measure.left}% + 6px)`,color:measure.color,pointerEvents:onMeasureSelect?'auto':undefined,cursor:onMeasureSelect?'pointer':undefined}}><span>{measure.number}</span></div>)}
  </div>
 </div>;
}

/** Adapt authored quarter beats to the native renderer without changing source data. */
function BeatNoteLayer({visible,row,axis,tonic,changes,mutedVoices,hoveredKey,setHoveredKey,hoveredRef,onNote,onNoteHover,clock}){
 const host=useRef(null),[pixelWidth,setPixelWidth]=useState(100),span=row.end-row.start,section=useMemo(()=>[row.start,row.end],[row.start,row.end]);
 useLayoutEffect(()=>{
  const element=host.current.parentElement,view=element.ownerDocument.defaultView,fit=()=>{const width=element.getBoundingClientRect().width||element.clientWidth||100;setPixelWidth(previous=>previous===width?previous:width);},Observer=view?.ResizeObserver??globalThis.ResizeObserver;
  fit();const observer=Observer?new Observer(fit):null;observer?.observe(element);view?.addEventListener('resize',fit);
  return()=>{observer?.disconnect();view?.removeEventListener('resize',fit);};
 },[]);
 const sourceById=useMemo(()=>new Map(visible.map(note=>[String(note.id),note])),[visible]);
 const nativeNotes=useMemo(()=>visible.map(note=>{
  const degree=mod(note.pitch-tonicAt(tonic,changes,note.start+note.duration/2)),muted=mutedVoices.includes(note.voice);
  return {id:String(note.id),note:{midiNumber:note.pitch},span:[note.start,note.start+note.duration],displaySpan:[Math.max(row.start,note.start),Math.min(row.end,note.start+note.duration)],voiceIndex:note.voice??0,displayVoiceIndex:note.voice??0,isDrum:false,isActive:!muted,color:`noteColor_${degree}_colors`,colorPitchClass:degree,noteUnderCursor:hoveredKey===`${note.id}:${row.start}`,velocity:note.velocity,...(note.pitchBend?{pitchBend:note.pitchBend}:{}),...(note.sourceLocation?{sourceLocation:note.sourceLocation}:{})};
 }),[visible,row.start,row.end,tonic,changes,mutedVoices,hoveredKey]);
 // Preserve the host's compatibility class without duplicating note geometry.
 // Both the native renderer and this small notification use the same index.
 useLayoutEffect(()=>{
  const unregister=[...host.current.querySelectorAll('[data-note]')].map(element=>{
   const note=sourceById.get(element.dataset.note),muted=mutedVoices.includes(note.voice);
   return clock.register(note.start,note.start+note.duration,active=>element.classList.toggle('rawln-sounding',active&&!muted),section);
  });
  return()=>unregister.forEach(remove=>remove());
 },[clock,nativeNotes,sourceById,section,mutedVoices]);
 const hover=note=>{
  const original=sourceById.get(note.id),key=`${original.id}:${row.start}`;
  if(hoveredRef.current===key)return;
  hoveredRef.current=key;setHoveredKey(key);onNoteHover?.(original);
 };
 const leave=()=>{if(hoveredRef.current===null)return;hoveredRef.current=null;setHoveredKey(null);onNoteHover?.(null);};
 return <div ref={host} style={{display:'contents'}}><PlaybackSectionContext.Provider value={section}><NoteLayer notes={nativeNotes} midiNumberToY={pitch=>axis.pitchToY(pitch)+NOTE_HEIGHT/2} noteHeight={NOTE_HEIGHT/2} secondsToX={beat=>(beat-row.start)/span*pixelWidth} handleNoteClick={note=>onNote?.(sourceById.get(note.id))} handleMouseEnter={hover} handleMouseLeave={leave} getNoteAttributes={note=>{
  const original=sourceById.get(note.id),start=note.displaySpan[0],end=note.displaySpan[1],degree=note.colorPitchClass,muted=mutedVoices.includes(original.voice);
  return {role:'button',tabIndex:-1,'aria-label':noteName(original.pitch),'data-note':original.id,'data-pitch':original.pitch,'data-degree':degree,'data-voice':original.voice,className:`rawln-note rawln-voice-${original.voice}${muted?' rawln-muted':''}`,style:{left:(start-row.start)/span*100+'%',width:(end-start)/span*100+'%',...(!note.pitchBend?.length&&RAWL_COLORS[degree]?{background:RAWL_COLORS[degree].background}:{}),zIndex:100+(84-original.pitch)+(original.voice===1?128:0)}};
 }}/></PlaybackSectionContext.Provider></div>;
}

/** A host-independent Rawl score. Times are quarter-note beats, pitches MIDI. */
export const RawlNotation=forwardRef(function RawlNotation({notes,beats,rows,tonic=0,changes=EMPTY_CHANGES,barBeats=4,beatBeats=1,phraseStarts,measureMap,hideInitialTonic=false,position=null,mutedVoices=[],onSeek,onNote,onNoteHover,onMeasureSelect,selectedMeasure=null,onChangesChange,recolorable=true,renderHeader,renderFooter,className='',style},ref){
 const editor=useTonicRecoloring({changes,barBeats,measureMap,onChange:onChangesChange}),automatic=recolorable&&!onMeasureSelect;
 if(automatic){changes=editor.changes;selectedMeasure=editor.selectedMeasure;onMeasureSelect=editor.selectMeasure;const originalClick=onNote,originalHover=onNoteHover;onNote=note=>{if(!editor.chooseNote(note))originalClick?.(note);};onNoteHover=note=>{editor.hoverNote(note);originalHover?.(note);};}
 const root=useRef(null),hoveredRef=useRef(null),[hoveredKey,setHoveredKey]=useState(null),clock=useMemo(createSectionPlaybackClock,[]);
 const spans=rows?.length?rows:[{start:0,end:beats,label:1}];
 const prepared=useMemo(()=>spans.map(row=>{
  const visible=notes.filter(n=>n.start<row.end-1e-6&&n.start+n.duration>row.start+1e-6),range=pitchRange(visible),axis=staveGeometry(range);
  return {row,visible,range,axis,regions:tonalSegments(tonic,changes,row.start,row.end)};
 }),[notes,rows,beats,tonic,changes]);
 const setPosition=beat=>Number.isFinite(beat)?clock.advance(beat):clock.reset();
 useImperativeHandle(ref,()=>({setPosition,element:root.current}),[clock]);
 useLayoutEffect(()=>{setPosition(position);},[position]);
 useLayoutEffect(()=>()=>clock.reset(),[clock]);
 return <NotePlaybackContext.Provider value={clock.register}><div className={'rawln'+(className?' '+className:'')} style={style} ref={root}>
  {prepared.map(({row,visible,range,axis,regions})=>{
   const span=row.end-row.start,x=beat=>(beat-row.start)/span*100;
   return <div className="rawln-row" data-section={row.section} key={`${row.start}-${row.end}`} data-start={row.start} data-end={row.end} style={row.style}>
    {renderHeader&&<div className="rawln-header">{renderHeader(row)}</div>}
    <div className="rawln-score" role="group" aria-label="Rawl notation" style={{height:axis.notesBottom}} onClick={e=>{const box=e.currentTarget.getBoundingClientRect();if(box.width>0)onSeek?.(row.start+Math.max(0,Math.min(1,(e.clientX-box.left)/box.width))*span);}}>
     <div className="rawln-grid" aria-hidden="true">
      {regions.flatMap((region,i)=>tonalLines(range,axis,region.tonic).map((line,j)=><div key={`${i}-${j}`} data-tonic={region.tonic} className={`rawln-${line.kind}-line`} style={{left:x(region.start)+'%',width:(region.end-region.start)/span*100+'%',top:line.y}}/>))}
     </div>
     <RawlMeasureHeader row={row} height={axis.notesBottom} tonic={tonic} changes={changes} barBeats={barBeats} beatBeats={beatBeats} phraseStarts={phraseStarts} measureMap={measureMap} selectedMeasure={selectedMeasure} onMeasureSelect={onMeasureSelect} hideInitialTonic={hideInitialTonic}/>
     <BeatNoteLayer visible={visible} row={row} axis={axis} tonic={tonic} changes={changes} mutedVoices={mutedVoices} hoveredKey={hoveredKey} setHoveredKey={setHoveredKey} hoveredRef={hoveredRef} onNote={onNote} onNoteHover={onNoteHover} clock={clock}/>
    </div>
    {renderFooter&&<div className="rawln-footer">{renderFooter(row,{changes,selectedMeasure})}</div>}
   </div>;
  })}
 </div></NotePlaybackContext.Provider>;
});
export {pitchRange,staveGeometry,modulationLabelOffset} from './geometry.mjs';
export {RAWL_COLORS} from './palette.mjs';
