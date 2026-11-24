// Adapted from Rawl 1c62a261b201bc4ee17b1fb68c4a6f43ee6d9e49, GPL-3.0-only.
import React, {useEffect, useRef, useState} from 'react';

const NOTE_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
export const MAX_TRANSPOSE_SEMITONES = 12;
const OFFSETS = Array.from({length: 2 * MAX_TRANSPOSE_SEMITONES + 1}, (_, index) =>
  index - MAX_TRANSPOSE_SEMITONES);
const normalizeTonic = value => ((value % 12) + 12) % 12;
const signed = value => value < 0 ? `−${Math.abs(value)}` : value > 0 ? `+${value}` : '0';

function PitchLabel({tonic, quarter}) {
  return (
    <span className="rawlt-pitch" aria-hidden="true">
      {tonic?.[0] ?? '–'}
      {(tonic?.[1] || quarter) && (
        <span className="rawlt-accidental">{tonic?.[1]}{quarter && '↑'}</span>
      )}
    </span>
  );
}

export function TransposeControl({
  value, onChange, firstTonic, persist, onPersistChange, placement = 'bottom', captureKeys = true,
}) {
  const [open, setOpen] = useState(false);
  const [anchorBottom, setAnchorBottom] = useState(0);
  const containerRef = useRef(null);
  const valueRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    selectedRef.current?.focus();
    const dismiss = event => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function closeAndRestoreFocus() {
    setOpen(false);
    valueRef.current?.focus();
  }

  return (
    <div
      className="rawlt-control"
      ref={containerRef}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (open || captureKeys) event.stopPropagation();
        if (open && event.key === 'Escape') {
          event.preventDefault();
          closeAndRestoreFocus();
        }
      }}
    >
      <button type="button" className="rawlt-button" onClick={() => onChange(value - 1)}
        disabled={value <= -MAX_TRANSPOSE_SEMITONES} title="Transpose down one semitone" aria-label="Transpose down one semitone">▼</button>
      <button
        type="button"
        className="rawlt-button rawlt-value"
        ref={valueRef}
        onClick={event => {
          if (!open && placement === 'top') setAnchorBottom(event.currentTarget.getBoundingClientRect().bottom);
          setOpen(!open);
        }}
        title="Choose transposition (semitones)"
        aria-label={`Transpose: ${signed(value)} semitones`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >{signed(value)} st</button>
      <button type="button" className="rawlt-button" onClick={() => onChange(value + 1)}
        disabled={value >= MAX_TRANSPOSE_SEMITONES} title="Transpose up one semitone" aria-label="Transpose up one semitone">▲</button>
      {open && (
        <div className="rawlt-picker" data-placement={placement}
          style={placement === 'top' ? {'--rawlt-anchor-bottom': `${anchorBottom}px`} : undefined}
          role="dialog" aria-label="Transpose in semitones">
          <div className="rawlt-heading">Transpose · semitones</div>
          <button
            type="button"
            className="rawlt-button rawlt-close"
            title="Close transposition picker"
            aria-label="Close transposition picker"
            onClick={closeAndRestoreFocus}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="rawlt-choices" role="group" aria-label="Transposition in semitones">
            {OFFSETS.map(offset => {
              const pitch = firstTonic == null ? null : normalizeTonic(firstTonic + offset);
              const tonic = pitch === null ? null : NOTE_NAMES[Math.floor(pitch)];
              const quarter = pitch !== null && pitch % 1 === 0.5;
              const pitchName = tonic ? `${tonic}${quarter ? ' +50¢' : ''}` : '';
              return (
                <button
                  type="button"
                  className="rawlt-choice"
                  key={offset}
                  ref={offset === value ? selectedRef : undefined}
                  title={`${signed(offset)} semitones${pitchName ? ` · ${pitchName}` : ''}`}
                  aria-label={`${signed(offset)} semitones${pitchName ? `, tonic ${pitchName}` : ''}`}
                  aria-pressed={offset === value}
                  onClick={() => onChange(offset)}
                >
                  <span>{signed(offset)}</span>
                  <PitchLabel tonic={tonic} quarter={quarter} />
                </button>
              );
            })}
          </div>
          {onPersistChange && (
            <label className="rawlt-persist" title="Keep transposition when loading another song">
              <input type="checkbox" checked={persist ?? false}
                onChange={event => onPersistChange(event.target.checked)} />
              persist
            </label>
          )}
        </div>
      )}
    </div>
  );
}
