const octave = value => ((value % 12) + 12) % 12;
export const TONIC_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const MODULATION_BADGE_WIDTH = 80;
const pitchClass = value => value == null || !Number.isInteger(Number(value)) ? null : octave(Number(value));

// Domains can be notated beats or recording seconds. A later same-onset
// change wins, and adjacent regions in the same key share one guide.
export function tonicEvents(tonic, changes = [], end = Infinity) {
  const entries = [{beat: 0, tonic}, ...changes]
    .map(entry => ({...entry, beat: Number(entry.beat), tonic: pitchClass(entry.tonic)}))
    .filter(entry => Number.isFinite(entry.beat) && entry.beat <= end)
    .map(entry => ({...entry, beat: Math.max(0, entry.beat)}))
    .sort((a, b) => a.beat - b.beat);
  const timeline = [];
  for (const entry of entries) {
    if (timeline.at(-1)?.beat === entry.beat) timeline[timeline.length - 1] = entry;
    else timeline.push(entry);
  }
  return timeline.filter((entry, index) => index === 0 || entry.tonic !== timeline[index - 1].tonic);
}

export function tonicMarkers(events) {
  return events.map((event, index) => {
    const previousTonic = index ? events[index - 1].tonic : null;
    const interval = previousTonic === null || event.tonic === null ? null : octave(event.tonic - previousTonic);
    return {...event, previousTonic, delta: interval !== null && interval > 6 ? interval - 12 : interval};
  });
}

export function tonicRegions(events, start, end) {
  return events.flatMap((event, index) => {
    const from = Math.max(start, event.beat);
    const to = Math.min(end, events[index + 1]?.beat ?? end);
    return to > from ? [{...event, start: from, end: to}] : [];
  });
}

export function measureSubdivisionBeats(start, end, step, epsilon = 1e-6) {
  if (![start,end,step].every(Number.isFinite) || step <= 0) return [];
  const beats = [];
  for (let beat = start + step; beat < end - epsilon; beat += step) beats.push(beat);
  return beats;
}

export function visibleBeatLines(barTimes, beatTimes, toPixels) {
  const relevant = [...barTimes, ...beatTimes].filter(time => time !== 0).sort((a, b) => a - b);
  if (relevant.length < 2) return [];
  return (toPixels(relevant.at(-1)) - toPixels(relevant[0])) / (relevant.length + 1) >= 10
    ? beatTimes : [];
}

// Project the entire flag through a row break at its original onset.
// The host viewport decides how much of the overflow is visible.
export function markersForRow(events, {start, end, toPixels, numberAt, hideInitialTonic = false}) {
  const firstTonic = events.find(marker => marker.tonic != null);
  const activeAtStart = events.findLast(marker => marker.beat <= start);
  return events.flatMap(marker => {
    const initial = marker === firstTonic;
    if (marker.tonic == null || marker.delta === 0 || (!initial && marker.delta == null) || marker.beat >= end || (hideInitialTonic && initial)) return [];
    const onsetOverride = !initial && marker.onsetOverride === true;
    const pixelOffset = onsetOverride ? 0 : -1;
    const number = marker.number ?? numberAt(marker.beat);
    const flag = {...marker, number, initial, onsetOverride, continued: false, pixelOffset,
      labelOffset: onsetOverride ? 0 : initial ? String(number).length * 8 + 10 : 30};
    if (marker.beat >= start) return [flag];

    if (!toPixels || toPixels(start) - toPixels(marker.beat) >= MODULATION_BADGE_WIDTH + pixelOffset) return [];
    const copies = initial ? [] : [{...flag, overflowCopy: true}];
    if (marker === activeAtStart) {
      const openingNumber = numberAt(start);
      copies.push({...marker, originBeat: marker.originBeat ?? marker.beat, beat: start, number: openingNumber,
        previousTonic: null, delta: null, join: false, name: undefined, initial: true, onsetOverride: false,
        continued: true, pixelOffset: -1, labelOffset: String(openingNumber).length * 8 + 10});
    }
    return copies;
  });
}

export function guidePitches(low, high, tonic, fifthInterval = 5) {
  if (tonic == null) return [];
  const firstOctave = Math.ceil((low + 12 - fifthInterval - tonic) / 12);
  const lastOctave = Math.floor((high + 12 - tonic) / 12);
  const guides = [];
  for (let n = firstOctave; n <= lastOctave; n++) {
    const root = tonic + n * 12 - 12;
    const fifth = root + fifthInterval;
    if (root >= low && root <= high) guides.push({kind: 'tonic', pitch: root});
    if (fifth >= low && fifth <= high) guides.push({kind: 'fifth', pitch: fifth});
  }
  return guides;
}

// The axis is Rawl's native pitch ordinate. Note-top axes add their
// semitone step before calling this function.
export function tonalGuideLines(range, pitchToY, tonic) {
  return guidePitches(range.low, range.high, tonic).map(guide => ({
    ...guide, y: guide.kind === 'tonic' ? pitchToY(guide.pitch - .5) : pitchToY(guide.pitch + 1) - .5,
  }));
}

export function positionedTonalGuides(regions, range, pitchToY) {
  return regions.flatMap(({tonic, left, width}) => tonalGuideLines(range, pitchToY, tonic)
    .map(guide => ({...guide, tonic, left, width})));
}
