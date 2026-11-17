import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {getNoteRectangles} from '../../src/rawlnative/index.ts';
import {caplinNoteModel} from './react-model.mjs';

const noop=()=>{};

/** Rawl supplies every note rectangle; Caplin supplies authored row geometry and state. */
export function CaplinNoteLayer({model,axis,width}){
 return <>{getNoteRectangles(model.notes,pitch=>axis.pitchToY(pitch)+2.5,2.5,noop,noop,noop,time=>model.toX(time,width),false,null,false,undefined,null,undefined,undefined,model.getAttributes)}</>;
}

/** A single React root per final row. Never move or clone its owned note nodes. */
export function mount(score,options){
 if(!score?.ownerDocument)throw new TypeError('Caplin row required');
 const element=score.ownerDocument.createElement('div');element.className='librawl-caplin-note-layer';element.style.display='contents';score.append(element);
 const root=createRoot(element),view=score.ownerDocument.defaultView;
 let props=options,model,destroyed=false,lastWidth=null;
 function render(){
  if(destroyed)return;
  const owned=['rawl-playing','rawl-auditioning','recording-playing','collapsed'];
  const retained=new Map([...element.querySelectorAll('.rawl-note[data-note-id]')].map(node=>[node.dataset.noteId,{classes:owned.filter(name=>node.classList.contains(name)),hidden:node.hidden}]));
  model=caplinNoteModel(props);
  const width=score.clientWidth||score.getBoundingClientRect().width||600;lastWidth=width;
  flushSync(()=>root.render(<CaplinNoteLayer model={model} axis={props.axis} width={width}/>));
  for(const node of element.querySelectorAll('.rawl-note[data-note-id]')){
   const prior=retained.get(node.dataset.noteId);if(prior){for(const name of owned)node.classList.toggle(name,prior.classes.includes(name));node.hidden=prior.hidden;}
   const source=model.sourceById.get(node.dataset.noteId);if(source)props.bindNote?.(node,source);
  }
 }
 try{render();}catch(error){root.unmount();element.remove();throw error;}
 const Observer=view?.ResizeObserver??globalThis.ResizeObserver;
 const observer=Observer?new Observer(entries=>{const width=entries.find(entry=>entry.target===score)?.contentRect?.width;if(!destroyed&&Number.isFinite(width)&&Math.round(width)!==Math.round(lastWidth))render();}):null;
 observer?.observe(score);
 return {element,update(next){props={...props,...next};render();},destroy(){if(destroyed)return;destroyed=true;observer?.disconnect();root.unmount();element.remove();},get notes(){return [...element.querySelectorAll('.rawl-note')];}};
}

export {createShiftHoverAudition} from '../../src/shift-hover-audition.js';
