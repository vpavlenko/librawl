// Playback controls and timeline adapted from Rawl AppFooter, TimeSlider, and Slider.
// Rawl c87e915b073d9953f6d9eefa7f376e5d2bd0b8a2, GPL-3.0-only.
import React, {memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef} from 'react';
import {bindTempoKeys} from '../audio/tempo-keys.js';
import {bindPlaybackKeys} from '../audio/playback-keys.js';
import {observePlaybackPosition} from './playback-position.js';

const EMPTY_TIMELINE = {};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function formatTime(value) {
  const seconds = Math.floor(Math.max(0, value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function timelineGeometry(timeline, duration) {
  const percent = time => time / duration * 100;
  const marks = (times, inclusive = false) => (times ?? []).filter(
    time => Number.isFinite(time) && time >= 0 && (inclusive ? time <= duration : time < duration),
  ).map(percent);
  const bass = (timeline.bassBars ?? []).flatMap(({start, end, color}) => {
    const left = percent(Math.max(0, start));
    const right = percent(Math.min(duration, end));
    return Number.isFinite(left) && Number.isFinite(right) && right > left ? [{left, right, color}] : [];
  });
  const colored = (timeline.coloredMarks ?? []).filter(({time}) =>
    Number.isFinite(time) && time >= 0 && time <= duration,
  ).map(({time, color}) => ({left: percent(time), color}));
  return {sections: marks([...(timeline.sections ?? []), duration], true),
    phrases: marks(timeline.phrases), bass, colored};
}

// The playhead and time labels can update without redrawing the musical marks.
const TimelineMarks = memo(function TimelineMarks({geometry}) {
  if (!geometry) return null;
  const {sections, phrases, bass, colored} = geometry;
  return (
    <div className="rawlp-marks" aria-hidden="true">
      {sections.map((left, index) => (
        <i className="rawlp-section-mark" key={index} style={{left: `${left}%`}} />
      ))}
      {phrases.map((left, index) => (
        <i className="rawlp-phrase-mark" key={index} style={{left: `${left}%`}} />
      ))}
      {bass.map(({left, right, color}, index) => (
        <i className="rawlp-bass-bar" key={index} style={{left: `${left}%`, width: `${right - left}%`, background: color}} />
      ))}
      {colored.map(({left, color}, index) => (
        <i className="rawlp-colored-mark" key={index} style={{left: `${left}%`, background: color}} />
      ))}
    </div>
  );
});

export function PlaybackFooter({
  position, duration, playing, getPosition, onTogglePlay, onSeek, rate, onRateChange,
  volume, onVolumeChange, volumeMax = 1, timeline = EMPTY_TIMELINE, keyboardShortcuts = true,
  allowSpaceInInputs = false, disabled = false, beforeTimeline, children,
  onStop, stopDisabled = false, inline = false, labels,
}) {
  const length = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const hasTempo = Number.isFinite(rate) && !!onRateChange;
  const hasVolume = Number.isFinite(volume) && !!onVolumeChange;
  const seekRef = useRef(null);
  const elapsedRef = useRef(null);
  const activePointer = useRef(null);
  const elapsed = clamp(Number.isFinite(position) ? position : 0, 0, length);
  const geometry = useMemo(() => length ? timelineGeometry(timeline, length) : null, [timeline, length]);

  const paintPosition = useCallback(next => {
    const input = seekRef.current;
    const label = elapsedRef.current;
    const seconds = clamp(Number.isFinite(next) ? next : 0, 0, length);
    if (input.valueAsNumber !== seconds) input.value = String(seconds);
    const time = formatTime(seconds);
    if (label.textContent !== time) label.textContent = time;
    if (input.getAttribute('aria-valuetext') !== time) input.setAttribute('aria-valuetext', time);
  }, [length]);

  // The range and clock label can move without scheduling a React render.
  useLayoutEffect(() => {
    if (activePointer.current !== null) paintPosition(seekRef.current.valueAsNumber);
    if (playing && getPosition && length && !disabled) {
      return observePlaybackPosition(getPosition, next => {
        if (activePointer.current === null) paintPosition(next);
      });
    }
    if (activePointer.current === null) paintPosition(elapsed);
  }, [playing, getPosition, length, disabled, elapsed, paintPosition]);

  function beginScrub(event) {
    if (activePointer.current !== null || event.button !== 0) return;
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function finishScrub(event, commit) {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    if (commit && !disabled && length) onSeek(Number(event.currentTarget.value));
    else paintPosition(playing && getPosition ? getPosition() : elapsed);
  }

  useEffect(() => {
    if (!keyboardShortcuts || disabled) return;
    const keys = bindPlaybackKeys({toggle: onTogglePlay, allowInInputs: allowSpaceInInputs});
    return () => keys.destroy();
  }, [keyboardShortcuts, disabled, onTogglePlay, allowSpaceInInputs]);

  useEffect(() => {
    if (!keyboardShortcuts || disabled || !hasTempo) return;
    return bindTempoKeys({
      adjustTempo: delta => onRateChange(clamp(Number((rate + delta).toFixed(2)), 0.1, 4)),
    });
  }, [keyboardShortcuts, disabled, hasTempo, onRateChange, rate]);

  return (
    <footer className={inline ? 'rawlp-footer rawlp-footer-inline' : 'rawlp-footer'}
      aria-label={labels?.playback ?? 'Playback'}>
      <div className="rawlp-playback">
        <button type="button" className="rawlp-play" disabled={disabled}
          aria-label={playing ? (labels?.pause ?? 'Pause') : (labels?.play ?? 'Play')} onClick={onTogglePlay}>
          <svg aria-hidden="true" width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
            {playing ? <path d="M2 1h4v14H2zm6 0h4v14H8z" /> : <path d="M2 1l12 7L2 15z" />}
          </svg>
        </button>
        {onStop && (
          <button type="button" className="rawlp-play rawlp-stop" disabled={disabled || stopDisabled}
            aria-label={labels?.stop ?? 'Stop'} onClick={onStop}>
            <svg aria-hidden="true" width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
              <rect x="2" y="3" width="10" height="10" />
            </svg>
          </button>
        )}
        {beforeTimeline}
      </div>
      <div className="rawlp-timeline">
        <span className="rawlp-time" ref={elapsedRef}>{formatTime(elapsed)}</span>
        <div className="rawlp-track">
          <TimelineMarks geometry={geometry} />
          <input ref={seekRef} aria-label={labels?.seek ?? 'Seek'} aria-valuetext={formatTime(elapsed)}
            type="range" min={0} max={length || 1} step="any" defaultValue={elapsed}
            disabled={disabled || !length} onPointerDown={beginScrub}
            onPointerUp={event => finishScrub(event, true)}
            onPointerCancel={event => finishScrub(event, false)}
            onLostPointerCapture={event => finishScrub(event, false)}
            onChange={event => {
              const next = Number(event.currentTarget.value);
              if (activePointer.current === null) onSeek(next);
              else paintPosition(next);
            }}
          />
        </div>
        <span className="rawlp-time">{formatTime(length)}</span>
      </div>
      {(hasTempo || hasVolume || children) && (
        <div className="rawlp-options">
          {hasTempo && (
            <div className="rawlp-tempo">
              <button type="button" aria-label="Slow down" disabled={disabled || rate <= 0.1}
                onClick={() => onRateChange(clamp(Number((rate - 0.1).toFixed(2)), 0.1, 4))}>
                <span aria-hidden="true"><i>_</i><i>−</i></span>
              </button>
              <span>{Number(rate.toFixed(2))}x</span>
              <button type="button" aria-label="Speed up" disabled={disabled || rate >= 4}
                onClick={() => onRateChange(clamp(Number((rate + 0.1).toFixed(2)), 0.1, 4))}>
                <span aria-hidden="true"><i>+</i><i>=</i></span>
              </button>
            </div>
          )}
          {hasVolume && (
            <label className="rawlp-volume">
              Vol
              <input aria-label="Volume" type="range" min={0} max={Math.round(volumeMax * 100)} step={1}
                value={Math.round(volume * 100)} disabled={disabled}
                onChange={event => onVolumeChange(Number(event.currentTarget.value) / 100)}
                onDoubleClick={() => onVolumeChange(1)} />
            </label>
          )}
          {children}
        </div>
      )}
    </footer>
  );
}
