import React, {forwardRef, useState} from 'react';
import {handlePhraseShiftKey} from './phrase-keys.mjs';

export function parseRhythmGrouping(value) {
  if (!/^\s*\d+\s*(\+\s*\d+\s*)*$/.test(value)) return null;
  const groups = value.split('+').map(Number);
  return groups.every(group => Number.isSafeInteger(group) && group > 0) &&
    Number.isSafeInteger(groups.reduce((sum, group) => sum + group, 0))
    ? groups
    : null;
}

export const MeasureRhythmInput = forwardRef(function MeasureRhythmInput({
  onBeatsPerMeasure, onRhythmGrouping, rhythmGrouping, onSectionKeyDown, onPhraseShift,
  onKeyDown, onUnhandledCharacter, value: draft, onValueChange, showReset = true,
}, ref) {
  const [localValue, setLocalValue] = useState('');
  const value = draft ?? localValue;
  const parsed = parseRhythmGrouping(value);
  const handleChange = event => {
    const next = event.target.value;
    if (draft === undefined) setLocalValue(next);
    onValueChange?.(next);
  };

  const handleKeyDown = event => {
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (onPhraseShift && handlePhraseShiftKey(event, onPhraseShift)) return;
    if (event.key === 'Enter') {
      onSectionKeyDown?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      if (parsed?.length === 1) onBeatsPerMeasure(parsed[0]);
      else if (parsed) onRhythmGrouping?.(parsed);
      return;
    }
    const rhythmCharacter = /^[0-9]$/.test(event.key) ||
      onRhythmGrouping && (event.key === '+' || event.key === ' ' && value.length > 0);
    if (event.key.length === 1 && !rhythmCharacter) {
      if (onUnhandledCharacter) onUnhandledCharacter(event);
      else event.preventDefault();
    }
  };

  return <>
    <input type="text" className="rawln-rhythm-input" ref={ref} autoFocus
      value={value} onChange={handleChange} onKeyDown={handleKeyDown}
      onClick={event => event.stopPropagation()}
      aria-label="Rhythm" aria-invalid={value !== '' && parsed === null}
      placeholder="3 or 3+2" />
    {showReset && !!rhythmGrouping?.length && onRhythmGrouping && (
      <button type="button" className="rawln-rhythm-reset" onClick={event => {
        event.stopPropagation();
        onRhythmGrouping([]);
      }}>Reset</button>
    )}
  </>;
});
