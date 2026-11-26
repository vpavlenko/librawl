import React, {useLayoutEffect, useRef, useState} from 'react';
import {maqamTonicOffset, NoteLayer, NotePlaybackContext, noteColorClass} from 'librawl/native';
import {TonalGrid} from '../notation/TonalGrid.jsx';

const laneHeight = 19;

function groupLanes(groups) {
  const lanes = [];
  for (const group of groups) {
    let row = group.row ?? 0;
    // Adjacent jins can share an endpoint. Overlapping stretches need a lane.
    while (lanes[row]?.some(other => group.start < other.end && group.end > other.start)) row++;
    (lanes[row] ??= []).push(group);
  }
  return lanes;
}

/** A static guide to the marked jins and extensions of a supplied maqam scale. */
export function MaqamScaleDiagram({name, lower = [], scale, groups = [], shoulders = []}) {
  const root = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = root.current;
    const view = element.ownerDocument.defaultView;
    const update = () => setWidth(element.clientWidth);
    update();
    const observer = view?.ResizeObserver && new view.ResizeObserver(update);
    if (observer) observer.observe(element);
    else view?.addEventListener('resize', update);
    return () => {
      if (observer) observer.disconnect();
      else view?.removeEventListener('resize', update);
    };
  }, []);

  const tonic = maqamTonicOffset(name);
  const pitches = [...lower, ...scale];
  const noteCount = Math.max(1, pitches.length);
  const low = Math.min(tonic, ...pitches);
  const high = Math.max(tonic, ...pitches);
  const plotHeight = Math.round(Math.max(44, Math.min(84, width * 0.145)));
  const noteHeight = Math.max(2.5, Math.min(5, width / 116));
  const verticalInset = noteHeight + 4;
  const pitchStep = (plotHeight - 2 * verticalInset) / Math.max(1, high - low);
  const pitchToY = pitch => plotHeight / 2 + ((high + low) / 2 - pitch) * pitchStep;
  const columnWidth = width / noteCount;
  const horizontalInset = 0.07;
  const notes = pitches.map((pitch, index) => {
    const colorPitchClass = ((pitch - tonic) % 12 + 12) % 12;
    return {
      id: `maqam-scale-${index}`, note: {midiNumber: pitch},
      span: [index, index + 1], displaySpan: [index + horizontalInset, index + 1 - horizontalInset],
      voiceIndex: 0, isDrum: false, isActive: true,
      color: noteColorClass(colorPitchClass), colorPitchClass,
    };
  });
  const rootGroups = groups.filter(group => group.start === 0);
  const extensionLanes = groupLanes(groups.filter(group => group.start !== 0));
  const label = ({label: text, start, end}, row, bracket) => {
    const startColumn = lower.length + start + horizontalInset;
    const columns = end - start + 1 - 2 * horizontalInset;
    const size = Math.min(12, Math.max(8, columns * columnWidth / (text.length * 0.52)));
    return <span key={`${text}:${start}:${end}`}
      className={bracket ? 'rawln-maqam-label rawln-maqam-bracket' : 'rawln-maqam-label'}
      style={{left: `${100 * startColumn / noteCount}%`, width: `${100 * columns / noteCount}%`,
        top: row * laneHeight, fontSize: size}}>
      {text}
    </span>;
  };

  return <div ref={root} className="rawln-maqam-scale" role="img" aria-label={name} data-tonic-offset={tonic}>
    {(rootGroups.length > 0 || shoulders.length > 0) &&
      <div className="rawln-maqam-upper" style={{height: laneHeight}}>
        {rootGroups.map(group => label(group, 0, true))}
        {shoulders.map(({name: labelText, start, end}) => label({label: labelText, start, end}, 0, false))}
      </div>}
    <div className="rawln-maqam-plot" style={{height: plotHeight}}>
      <TonalGrid regions={[{tonic, left: 0, width: '100%'}]} range={{low, high}} pitchToY={pitchToY} />
      {width > 0 && <NotePlaybackContext.Provider value={null}>
        <NoteLayer notes={notes} midiNumberToY={pitchToY}
          secondsToX={column => column * columnWidth} noteHeight={noteHeight}
          getNoteAttributes={note => ({'data-maqam-pitch': note.note.midiNumber, 'data-maqam-pitch-class': note.colorPitchClass})} />
      </NotePlaybackContext.Provider>}
    </div>
    {extensionLanes.length > 0 &&
      <div className="rawln-maqam-lower" style={{height: extensionLanes.length * laneHeight}}>
        {extensionLanes.flatMap((lane, row) => lane.map(group => label(group, row, true)))}
      </div>}
  </div>;
}
