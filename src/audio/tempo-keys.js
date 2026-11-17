/** Rawl shortcuts: -/= change speed by .1; _/+ use .01.
 * Hosts translate speed units to their own BPM/rate control and bounds. */
export function bindTempoKeys({target=globalThis.document,adjustTempo,enabled=()=>true}){
 const deltas={'-':-.1,'=':.1,'_':-.01,'+':.01};
 const keydown=event=>{
  const delta=deltas[event.key],element=event.target;
  if(delta===undefined||event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||!enabled())return;
  if(element?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],dialog[open]'))return;
  if(target.querySelector?.('dialog[open]'))return;
  if(adjustTempo(delta,event)!==false)event.preventDefault();
 };
 target.addEventListener('keydown',keydown);
 return()=>target.removeEventListener('keydown',keydown);
}
