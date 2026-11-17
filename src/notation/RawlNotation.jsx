import React,{forwardRef,useImperativeHandle,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {pitchRange,staveGeometry,tonalSegments,tonalLines,tonicAt,mod,NOTE_HEIGHT,TONIC_NAMES,measureHeaderLayout} from './geometry.mjs';
import {RAWL_COLORS} from './palette.mjs';
import {TonicSymbol} from '../components/TonicSymbol.jsx';

const names=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const noteName=p=>names[mod(p)]+(Math.floor(p/12)-1);

/** Rawl AnalysisGrid's header and vertical grid, shared by all host views. */
export function RawlMeasureHeader({row,height='100%',tonic=0,changes=[],barBeats=4,beatBeats=1,phraseStarts,selectedMeasure=null,onMeasureSelect,hideInitialTonic=false}){
 const element=useRef(null),[width,setWidth]=useState(0);
 useLayoutEffect(()=>{
  const el=element.current,view=el.ownerDocument.defaultView,fit=()=>{const next=el.getBoundingClientRect().width||el.clientWidth;setWidth(previous=>previous===next?previous:next);},Observer=view?.ResizeObserver??globalThis.ResizeObserver;
  fit();const observer=Observer?new Observer(fit):null;observer?.observe(el);view?.addEventListener('resize',fit);
  return()=>{observer?.disconnect();view?.removeEventListener('resize',fit);};
 },[]);
 const {measures,beats,markers}=useMemo(()=>measureHeaderLayout({row,tonic,changes,barBeats,beatBeats,phraseStarts,width,selectedMeasure,hideInitialTonic}),[row,tonic,changes,barBeats,beatBeats,phraseStarts,width,selectedMeasure,hideInitialTonic]);
 const x=beat=>(beat-row.start)/(row.end-row.start)*100;
 return <div ref={element} className="rawln-measure-grid" style={{height}}>
  {measures.map(measure=><div className={'rawln-bar'+(measure.isPhraseStart?' rawln-phrase-bar':'')} key={'bar-'+measure.beat} data-beat={measure.beat} data-phrase-boundary={measure.isPhraseStart?'true':undefined} data-terminal={measure.terminal?'true':undefined} style={{left:`calc(${measure.left}% - 1px)`,backgroundColor:measure.isPhraseStart?'#bbb':'#444'}}/>)}
  {beats.map(beat=><div className="rawln-beat-bar" key={'beat-'+beat} data-beat={beat} style={{left:x(beat)+'%'}}/>)}
  <div className="rawln-modulations">
   {markers.map(marker=><div key={marker.beat} className="rawln-modulation" data-beat={marker.beat} data-tonic={marker.tonic} data-join={marker.join?marker.name:undefined} data-onset-override={marker.onsetOverride?'true':undefined} data-continued={marker.continued?'true':undefined} style={{left:marker.pixelOffset?`calc(${marker.left}% - 1px)`:marker.left+'%'}} title={marker.name}>
    <TonicSymbol left={0} number={Math.floor(marker.beat/barBeats)+1} previousTonic={marker.previousTonic} modulationDiff={marker.delta===null?null:mod(marker.delta)} tonicStart={marker.tonic} alignToOnset={marker.onsetOverride&&!marker.continued} labelClassName="rawln-modulation-label" flagClassName="rawln-modulation-flag" labelAttributes={{style:{left:marker.labelOffset}}} flagAttributes={{'data-degree':marker.delta===null?undefined:mod(marker.delta),style:{background:marker.delta===null?undefined:RAWL_COLORS[mod(marker.delta)].background}}} renderArrow={({direction})=><svg viewBox="0 0 24 24" aria-hidden="true">{direction==='down'?<><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>:<><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></>}</svg>}/>
   </div>)}
  </div>
  <div className="rawln-measure-labels" aria-hidden={onMeasureSelect?undefined:true}>
   {measures.filter(measure=>!measure.terminal).map(measure=><div className="rawln-measure-number" role={onMeasureSelect?'button':undefined} tabIndex={onMeasureSelect?0:undefined} aria-pressed={onMeasureSelect?selectedMeasure===measure.beat:undefined} onClick={onMeasureSelect?event=>{event.stopPropagation();onMeasureSelect(measure.beat);}:undefined} onKeyDown={onMeasureSelect?event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onMeasureSelect(measure.beat);}}:undefined} key={measure.beat} data-beat={measure.beat} data-modulation={measure.hasModulation?'true':undefined} style={{left:`calc(${measure.left}% + 6px)`,color:measure.color,pointerEvents:onMeasureSelect?'auto':undefined,cursor:onMeasureSelect?'pointer':undefined}}><span>{measure.number}</span></div>)}
  </div>
 </div>;
}

/** A host-independent Rawl score. Times are quarter-note beats, pitches MIDI. */
export const RawlNotation=forwardRef(function RawlNotation({notes,beats,rows,tonic=0,changes=[],barBeats=4,beatBeats=1,phraseStarts,hideInitialTonic=false,position=null,mutedVoices=[],onSeek,onNote,onNoteHover,onMeasureSelect,selectedMeasure=null,renderHeader,renderFooter,className='',style},ref){
 const root=useRef(null),noteElements=useRef(new Map()),hoveredId=useRef(null);
 const spans=rows?.length?rows:[{start:0,end:beats,label:1}];
 const prepared=useMemo(()=>spans.map(row=>{
  const visible=notes.filter(n=>n.start<row.end-1e-6&&n.start+n.duration>row.start+1e-6),range=pitchRange(visible),axis=staveGeometry(range);
  return {row,visible,range,axis,regions:tonalSegments(tonic,changes,row.start,row.end)};
 }),[notes,rows,beats,tonic,changes]);
 function updateNote(item){
  const {el,baseTop}=item,muted=mutedVoices.includes(item.note.voice),height=muted?.5:NOTE_HEIGHT*(item.active||item.hover?2:1);
  el.style.height=height+'px';el.style.top=(muted?baseTop+NOTE_HEIGHT-height:baseTop-(height-NOTE_HEIGHT))+'px';
  el.style.boxShadow=muted?'':'0 0 0px 0.5px black';
 }
 function setPosition(beat){
  for(const item of noteElements.current.values()){const {el,note,row}=item;item.active=Number.isFinite(beat)&&beat>=row.start&&beat<row.end&&beat>=note.start&&beat<note.start+note.duration&&!mutedVoices.includes(note.voice);el.classList.toggle('rawln-sounding',item.active);updateNote(item);}
 }
 useImperativeHandle(ref,()=>({setPosition,element:root.current}),[prepared,mutedVoices]);
 useLayoutEffect(()=>{setPosition(position);},[position,prepared,mutedVoices]);
 return <div className={'rawln'+(className?' '+className:'')} style={style} ref={root}>
  {prepared.map(({row,visible,range,axis,regions},ri)=>{
   const span=row.end-row.start,x=beat=>(beat-row.start)/span*100;
   return <div className="rawln-row" data-section={row.section} key={`${row.start}-${row.end}`} data-start={row.start} data-end={row.end} style={row.style}>
    {renderHeader&&<div className="rawln-header">{renderHeader(row)}</div>}
    <div className="rawln-score" role="group" aria-label="Rawl notation" style={{height:axis.notesBottom}} onClick={e=>{const box=e.currentTarget.getBoundingClientRect();if(box.width>0)onSeek?.(row.start+Math.max(0,Math.min(1,(e.clientX-box.left)/box.width))*span);}}>
     <div className="rawln-grid" aria-hidden="true">
      {regions.flatMap((region,i)=>tonalLines(range,axis,region.tonic).map((line,j)=><div key={`${i}-${j}`} data-tonic={region.tonic} className={`rawln-${line.kind}-line`} style={{left:x(region.start)+'%',width:(region.end-region.start)/span*100+'%',top:line.y}}/>))}
     </div>
     <RawlMeasureHeader row={row} height={axis.notesBottom} tonic={tonic} changes={changes} barBeats={barBeats} beatBeats={beatBeats} phraseStarts={phraseStarts} selectedMeasure={selectedMeasure} onMeasureSelect={onMeasureSelect} hideInitialTonic={hideInitialTonic}/>
     {visible.map(note=>{
      const start=Math.max(row.start,note.start),end=Math.min(row.end,note.start+note.duration),degree=mod(note.pitch-tonicAt(tonic,changes,note.start+note.duration/2)),color=RAWL_COLORS[degree];
      return <button key={`${note.id}-${ri}`} ref={el=>{const key=`${note.id}-${ri}`;if(el)noteElements.current.set(key,{el,note,row,baseTop:axis.pitchToY(note.pitch),active:false,hover:hoveredId.current===key});else noteElements.current.delete(key);}} type="button" tabIndex={-1} aria-label={noteName(note.pitch)} title={noteName(note.pitch)} data-note={note.id} data-pitch={note.pitch} data-degree={degree} data-voice={note.voice} className={`rawln-note rawln-voice-${note.voice}${mutedVoices.includes(note.voice)?' rawln-muted':''}`} style={{left:x(start)+'%',top:axis.pitchToY(note.pitch),width:(end-start)/span*100+'%',height:NOTE_HEIGHT,background:color.background,zIndex:100+(84-note.pitch)+(note.voice===1?128:0)}} onMouseEnter={()=>{const item=noteElements.current.get(`${note.id}-${ri}`);hoveredId.current=`${note.id}-${ri}`;if(item){item.hover=true;updateNote(item);}onNoteHover?.(note);}} onMouseLeave={()=>{const item=noteElements.current.get(`${note.id}-${ri}`);hoveredId.current=null;if(item){item.hover=false;updateNote(item);}onNoteHover?.(null);}} onClick={e=>{e.stopPropagation();onNote?.(note);}}>
       {color.dot&&<i aria-hidden="true" style={{width:color.dot.size,height:color.dot.size,background:color.dot.color}}/>}
      </button>;
     })}
    </div>
    {renderFooter&&<div className="rawln-footer">{renderFooter(row)}</div>}
   </div>;
  })}
 </div>;
});
export {pitchRange,staveGeometry,modulationLabelOffset} from './geometry.mjs';
export {RAWL_COLORS} from './palette.mjs';
