// Bounds and A/D, W/S controls from Rawl layouts/ControlPanel.tsx (GPL-3.0-only).
import React, {useEffect, useRef, useState} from 'react';

const HEIGHT = {min:1,max:10};
const SPACING = {min:2,max:150};
const clamp = (value,{min,max}) => Math.min(max,Math.max(min,value));

function SizeRange({label, title = label, value, bounds, onChange, before, after, vertical = false}) {
  const [draft,setDraft] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const displayValue = draft ?? value;

  return (
    <label className={vertical ? 'rawln-size-option rawln-size-option-height' : 'rawln-size-option'}>
        <span className="rawln-size-key" aria-hidden="true">{before}</span>
        <input type="range" aria-label={label} title={title} aria-orientation={vertical ? 'vertical' : 'horizontal'}
          min={bounds.min} max={bounds.max} step="any"
          style={{'--rawln-size-fill':`${(displayValue-bounds.min)/(bounds.max-bounds.min)*100}%`}}
          value={displayValue} onChange={event=>{
            const next=Number(event.currentTarget.value);
            setDraft(next);
            clearTimeout(timer.current);
            timer.current=setTimeout(()=>{onChange(next);setDraft(null);},50);
          }} />
        <span className="rawln-size-key" aria-hidden="true">{after}</span>
    </label>
  );
}

export function ScoreSizeSliders({noteHeight, timeSpacing, onNoteHeightChange, onTimeSpacingChange, keyboardShortcuts=false, titles}) {
  useEffect(() => {
    if (!keyboardShortcuts) return;
    const onKey = event => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing ||
          event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], dialog[open]') ||
          document.querySelector('dialog[open]')) return;
      switch (event.key.toLowerCase()) {
        case 'a': onTimeSpacingChange(clamp(timeSpacing-2, SPACING)); break;
        case 'd': onTimeSpacingChange(clamp(timeSpacing+2, SPACING)); break;
        case 'w': onNoteHeightChange(clamp(noteHeight-0.25, HEIGHT)); break;
        case 's': onNoteHeightChange(clamp(noteHeight+0.25, HEIGHT)); break;
        default: return;
      }
      event.preventDefault();
    };
    document.addEventListener('keydown',onKey);
    return () => document.removeEventListener('keydown',onKey);
  },[keyboardShortcuts,noteHeight,timeSpacing,onNoteHeightChange,onTimeSpacingChange]);

  return (
    <div className="rawln-size-sliders">
      <SizeRange label="Time spacing" title={titles?.timeSpacing} value={timeSpacing} bounds={SPACING} onChange={onTimeSpacingChange} before="a" after="d" />
      <SizeRange label="Note height" title={titles?.noteHeight} value={noteHeight} bounds={HEIGHT} onChange={onNoteHeightChange} before="w" after="s" vertical />
    </div>
  );
}
