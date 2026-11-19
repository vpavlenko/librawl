import React, {useLayoutEffect, useRef} from 'react';
import {RomanNumeral} from '../components/RomanNumeral.jsx';
import {mountHarmonyAnnotations} from './harmony-annotations.mjs';

const within = (beat, row) => beat >= row.start && beat < row.end;
const percentage = (beat, row) => (beat - row.start) / (row.end - row.start) * 100 + '%';

export function SourceHarmony({row, harmony}) {
  const anchor = useRef(null);
  useLayoutEffect(() => mountHarmonyAnnotations(anchor.current.parentElement, {
    start: row.start, end: row.end, annotations: harmony.map(point => ({position: 'above', ...point})),
  }), [row.start, row.end, harmony]);
  return <span ref={anchor} hidden />;
}

export function SourceNoteAnnotations({row, axis, visible, annotations}) {
  const crosses = annotations.unpitched?.filter(mark => within(mark.beat, row)) ?? [];
  const circles = annotations.spans?.flatMap(({start, end, kind}) => {
    if (kind !== 'circle' || start >= row.end || end <= row.start) return [];
    const notes = visible.filter(note => note.start >= start && note.start < end);
    if (!notes.length) return [];
    const positions = notes.map(note => axis.pitchToY(note.pitch));
    return [{
      start: Math.max(row.start, start), end: Math.min(row.end, end),
      top: Math.min(...positions) - 5, bottom: Math.max(...positions) + axis.glyphHeight + 5,
    }];
  }) ?? [];
  return <>
    {crosses.map(({beat, pitch, label}, index) =>
      <span key={index} className="rawln-source-cross" aria-label={label} title={label} data-beat={beat}
        style={{left: percentage(beat, row), top: axis.pitchToY(pitch ?? axis.high)}}>
        ×
      </span>
    )}
    {circles.map(({start, end, top, bottom}, index) =>
      <span key={index} className="rawln-source-circle" aria-hidden="true" data-start={start} data-end={end}
        style={{left: percentage(start, row), width: percentage(row.start + end - start, row),
          top, height: bottom - top}} />
    )}
  </>;
}

export function SourceBrackets({row, spans}) {
  const brackets = spans.filter(({kind, start, end}) => kind === 'bracket' && start < row.end && end > row.start)
    .sort((first, second) => first.start - second.start);
  if (!brackets.length) return null;
  const lanes = [];
  return <div className="rawln-source-brackets" aria-hidden="true">
    {brackets.map(({start, end}, index) => {
      let lane = lanes.findIndex(boundary => boundary <= start);
      if (lane === -1) lane = lanes.length;
      lanes[lane] = end;
      const left = Math.max(row.start, start);
      const right = Math.min(row.end, end);
      return <span key={index} className="rawln-source-bracket" data-start={start} data-end={end}
        style={{gridRowStart: lane + 1, marginLeft: percentage(left, row),
          width: percentage(row.start + right - left, row)}} />;
    })}
  </div>;
}

export function SourceComments({comments, onSeek}) {
  return <ul className="rawln-source-comments">
    {comments.map(({beat, measure, text, fragments}, index) =>
      <li key={index}>
        <button type="button" className="rawln-source-comment" data-beat={beat}
          onClick={() => onSeek(beat)}>
          <b>{measure}</b>
          <span>{fragments ? fragments.map((fragment, index) => fragment.notation ?
            <RomanNumeral key={index} notation={fragment.notation} options={fragment.options} /> :
            <React.Fragment key={index}>{fragment.text}</React.Fragment>
          ) : text}</span>
        </button>
      </li>
    )}
  </ul>;
}
