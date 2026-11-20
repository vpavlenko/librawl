/*! librawl version: 0.4.1-local; audio source sha256: 76f73238ecd37f8747ca6b9c5ea8b19675b7cc1977a886b66f6012c991fda089; GPL-3.0-only */

// src/notation/score-grid.mjs
var octave = (value) => (value % 12 + 12) % 12;
var TONIC_NAMES = ["C", "D\u266D", "D", "E\u266D", "E", "F", "F\u266F", "G", "A\u266D", "A", "B\u266D", "B"];
var MODULATION_BADGE_WIDTH = 80;
var pitchClass = (value) => value == null || !Number.isInteger(Number(value)) ? null : octave(Number(value));
function tonicEvents(tonic, changes = [], end = Infinity) {
  var _a;
  const entries = [{ beat: 0, tonic }, ...changes].map((entry) => ({ ...entry, beat: Number(entry.beat), tonic: pitchClass(entry.tonic) })).filter((entry) => Number.isFinite(entry.beat) && entry.beat <= end).map((entry) => ({ ...entry, beat: Math.max(0, entry.beat) })).sort((a, b) => a.beat - b.beat);
  const timeline = [];
  for (const entry of entries) {
    if (((_a = timeline.at(-1)) == null ? void 0 : _a.beat) === entry.beat) timeline[timeline.length - 1] = entry;
    else timeline.push(entry);
  }
  return timeline.filter((entry, index) => index === 0 || entry.tonic !== timeline[index - 1].tonic);
}
function tonicMarkers(events) {
  return events.map((event, index) => {
    const previousTonic = index ? events[index - 1].tonic : null;
    const interval = previousTonic === null || event.tonic === null ? null : octave(event.tonic - previousTonic);
    return { ...event, previousTonic, delta: interval !== null && interval > 6 ? interval - 12 : interval };
  });
}
function tonicRegions(events, start, end) {
  return events.flatMap((event, index) => {
    var _a, _b;
    const from = Math.max(start, event.beat);
    const to = Math.min(end, (_b = (_a = events[index + 1]) == null ? void 0 : _a.beat) != null ? _b : end);
    return to > from ? [{ ...event, start: from, end: to }] : [];
  });
}
function measureSubdivisionBeats(start, end, step, epsilon = 1e-6) {
  if (![start, end, step].every(Number.isFinite) || step <= 0) return [];
  const beats = [];
  for (let beat = start + step; beat < end - epsilon; beat += step) beats.push(beat);
  return beats;
}
function visibleBeatLines(barTimes, beatTimes, toPixels) {
  const relevant = [...barTimes, ...beatTimes].filter((time) => time !== 0).sort((a, b) => a - b);
  if (relevant.length < 2) return [];
  return (toPixels(relevant.at(-1)) - toPixels(relevant[0])) / (relevant.length + 1) >= 10 ? beatTimes : [];
}
function markersForRow(events, { start, end, toPixels, numberAt, hideInitialTonic = false }) {
  const activeAtStart = events.findLast((marker) => marker.beat <= start);
  return events.flatMap((marker) => {
    var _a, _b;
    const initial = marker.previousTonic === null;
    if (marker.tonic == null || marker.delta === 0 || marker.beat >= end || hideInitialTonic && initial) return [];
    const onsetOverride = !initial && marker.onsetOverride === true;
    const pixelOffset = onsetOverride ? 0 : -1;
    if (marker.beat >= start) {
      const number2 = (_a = marker.number) != null ? _a : numberAt(marker.beat);
      return [{
        ...marker,
        number: number2,
        initial,
        onsetOverride,
        continued: false,
        pixelOffset,
        labelOffset: onsetOverride ? 0 : initial ? String(number2).length * 8 + 10 : 30
      }];
    }
    const intersects = marker === activeAtStart && toPixels && toPixels(marker.beat) - toPixels(start) + pixelOffset + MODULATION_BADGE_WIDTH > 0;
    if (!intersects) return [];
    const number = numberAt(start);
    return [{
      ...marker,
      originBeat: (_b = marker.originBeat) != null ? _b : marker.beat,
      beat: start,
      number,
      previousTonic: null,
      delta: null,
      join: false,
      name: void 0,
      initial: true,
      onsetOverride: false,
      continued: true,
      pixelOffset: -1,
      labelOffset: String(number).length * 8 + 10
    }];
  });
}
function guidePitches(low, high, tonic, fifthInterval = 5) {
  if (tonic == null) return [];
  const firstOctave = Math.ceil((low + 12 - fifthInterval - tonic) / 12);
  const lastOctave = Math.floor((high + 12 - tonic) / 12);
  const guides = [];
  for (let n = firstOctave; n <= lastOctave; n++) {
    const root = tonic + n * 12 - 12;
    const fifth = root + fifthInterval;
    if (root >= low && root <= high) guides.push({ kind: "tonic", pitch: root });
    if (fifth >= low && fifth <= high) guides.push({ kind: "fifth", pitch: fifth });
  }
  return guides;
}
function tonalGuideLines(range, pitchToY, tonic) {
  return guidePitches(range.low, range.high, tonic).map((guide) => ({
    ...guide,
    y: guide.kind === "tonic" ? pitchToY(guide.pitch - 0.5) : pitchToY(guide.pitch + 1) - 0.5
  }));
}

// src/notation/geometry.mjs
var PITCH_STEP = 3;
var NOTE_HEIGHT = 5;
var TOP_CLEARANCE = 20;
var BOTTOM_CLEARANCE = 2;
function pitchRange(notes, span = null, fallback = { low: 48, high: 84 }) {
  const pitches = notes.filter((n) => !span || Math.min(span.end, n.start + n.duration) - Math.max(span.start, n.start) > 1e-6).map((n) => n.pitch);
  return pitches.length ? { low: Math.min(...pitches), high: Math.max(...pitches) } : { ...fallback };
}
function staveGeometry(range, { above = 0, transpose = 0, noteScale = 1 } = {}) {
  const scale = Number.isFinite(noteScale) && noteScale > 0 ? noteScale : 1, pitchStep = PITCH_STEP * scale, glyphHeight = NOTE_HEIGHT * scale;
  const low = range.low + transpose, high = range.high + transpose, noteTop = TOP_CLEARANCE + above + Math.max(0, glyphHeight - NOTE_HEIGHT);
  const notesBottom = noteTop + (high - low) * pitchStep + glyphHeight + BOTTOM_CLEARANCE, noteHeight = notesBottom - above;
  return { low, high, noteTop, noteHeight, notesBottom, pitchStep, glyphHeight, guideTop: Math.max(0, noteTop - 16), markerTop: noteTop - 14, pitchToY: (pitch) => noteTop + (high - pitch) * pitchStep };
}
var mod = (n) => (n % 12 + 12) % 12;
function tonicAt(tonic, changes, beat) {
  let result = tonic;
  for (const c of changes) {
    if (c.beat < beat) result = c.tonic;
    else break;
  }
  return result;
}
function modulationLabelOffset(beat, barBeats, { initial = beat === 0, onsetOverride, continued = false } = {}) {
  const measure = beat / barBeats, override = onsetOverride != null ? onsetOverride : Number.isFinite(measure) && Math.abs(measure - Math.round(measure)) > 1e-7;
  if (override && !continued) return 0;
  return initial ? String(Math.floor(measure) + 1).length * 8 + 10 : 30;
}
function keyMarkers(tonic, changes) {
  return tonicMarkers(tonicEvents(tonic, changes));
}
function recolorBoundary(changes, measureBeat, barBeats, measureMap) {
  var _a, _b;
  const measure = measureMap == null ? void 0 : measureMap.find((measure2) => Math.abs(measure2.start - measureBeat) < 1e-7), end = measure ? measure.start + measure.duration : measureBeat + barBeats;
  return (_b = (_a = changes.find((change) => change.beat >= measureBeat - 1e-7 && change.beat < end - 1e-7)) == null ? void 0 : _a.beat) != null ? _b : measureBeat;
}
function measureHeaderLayout({ row, tonic = 0, changes = [], barBeats = 4, beatBeats = 1, phraseStarts, measureMap, width = 0, selectedMeasure = null, hideInitialTonic = false, modulationMarkerPlacement }) {
  var _a, _b;
  const EPS = 1e-7, span = row.end - row.start, ppb = width / span, x = (beat) => (beat - row.start) / span * 100;
  const explicit = measureMap === void 0 ? null : validateMeasureMap(measureMap);
  const numberAt = (beat) => {
    var _a2, _b2;
    return (_b2 = (_a2 = explicit == null ? void 0 : explicit.findLast((measure) => measure.start <= beat + EPS)) == null ? void 0 : _a2.sourceNumber) != null ? _b2 : Math.floor(beat / barBeats) + 1;
  };
  const boundary = (beat) => phraseStarts === void 0 ? Math.abs(beat / (4 * barBeats) - Math.round(beat / (4 * barBeats))) < EPS : phraseStarts.some((start) => Math.abs(start - beat) < EPS);
  const selectedPhrase = selectedMeasure !== null && boundary(selectedMeasure), measures = [], barlines = [], beats = [];
  const grid = explicit ? explicit.map((measure) => ({ beat: measure.start, number: measure.sourceNumber })).concat([{ beat: explicit.at(-1).start + explicit.at(-1).duration, number: null }]) : Array.from({ length: Math.max(0, Math.floor((row.end - Math.max(0, Math.ceil((row.start - EPS) / barBeats) * barBeats) + EPS) / barBeats) + 1) }, (_, i) => {
    const beat = Math.max(0, Math.ceil((row.start - EPS) / barBeats) * barBeats) + i * barBeats;
    return { beat, number: Math.round(beat / barBeats) + 1 };
  });
  for (const { beat, number } of grid) {
    if (beat < row.start - EPS || beat > row.end + EPS) continue;
    barlines.push(beat);
    const terminal = Math.abs(beat - row.end) < EPS;
    const isPhraseStart = boundary(beat) || !terminal && Math.abs(beat - row.start) < EPS;
    if (!terminal || isPhraseStart) measures.push({ beat, number, left: x(beat), terminal, isPhraseStart, color: selectedMeasure === beat ? "red" : selectedPhrase && Math.abs(beat - selectedMeasure) <= 4 * barBeats + EPS ? "orange" : "#666" });
  }
  if (beatBeats > 0) {
    if (explicit) {
      for (const measure of explicit) {
        if (measure.beatPositions) {
          beats.push(...measure.beatPositions.filter((beat) => beat >= row.start - EPS && beat <= row.end + EPS));
          continue;
        }
        const unit = (_a = measure.beatBeats) != null ? _a : beatBeats;
        for (const beat of measureSubdivisionBeats(measure.start, measure.start + measure.duration, unit, EPS)) if (beat >= row.start - EPS && beat <= row.end + EPS) beats.push(beat);
      }
    } else for (let beat = Math.ceil((row.start - EPS) / beatBeats) * beatBeats; beat <= row.end + EPS; beat += beatBeats) if (Math.abs(beat / barBeats - Math.round(beat / barBeats)) > EPS) beats.push(beat);
  }
  const actualEvents = keyMarkers(tonic, changes);
  const events = actualEvents.map((marker, index) => {
    var _a2, _b2, _c;
    const onsetOverride = (_a2 = marker.onsetOverride) != null ? _a2 : explicit ? !explicit.some((measure) => Math.abs(measure.start - marker.beat) < EPS) : Math.abs(marker.beat / barBeats - Math.round(marker.beat / barBeats)) > EPS;
    if (modulationMarkerPlacement === "following-measure" && explicit && onsetOverride && marker.onsetOverride !== true && marker.delta !== null) {
      const next = explicit.find((measure) => measure.start > marker.beat + EPS);
      if (next && ((_c = (_b2 = actualEvents[index + 1]) == null ? void 0 : _b2.beat) != null ? _c : Infinity) > next.start + EPS) {
        return { ...marker, beat: next.start, originBeat: marker.beat, number: next.sourceNumber, onsetOverride: false };
      }
    }
    return { ...marker, onsetOverride };
  });
  const displacedOnsets = new Set(events.map((marker) => marker.originBeat).filter(Number.isFinite));
  const localChanges = displacedOnsets.size ? changes.filter((change) => !displacedOnsets.has(change.beat)) : changes;
  const markers = markersForRow(events, { ...row, numberAt, hideInitialTonic, toPixels: width > 0 ? (beat) => beat * ppb : null }).map((marker) => ({ ...marker, left: x(marker.beat) }));
  for (const measure of measures) {
    const modulation = markers.find((marker) => marker.beat === measure.beat && marker.delta !== null);
    measure.hasModulation = !!modulation;
    if ((modulation == null ? void 0 : modulation.originBeat) !== void 0) measure.modulationBeat = modulation.originBeat;
    if (displacedOnsets.size) measure.recolorBeat = (_b = measure.modulationBeat) != null ? _b : recolorBoundary(localChanges, measure.beat, barBeats, explicit);
    if (measure.color === "#666" && modulation) measure.color = "black";
  }
  return { measures, beats: visibleBeatLines(barlines, beats, (beat) => beat * ppb), markers };
}
function tonalSegments(tonic, changes, start, end) {
  return tonicRegions(tonicEvents(tonic, changes), start, end).map(({ start: start2, end: end2, tonic: tonic2 }) => ({ start: start2, end: end2, tonic: tonic2 }));
}
function tonalLines(range, axis, tonic) {
  return tonalGuideLines(range, (pitch) => axis.pitchToY(pitch) + axis.pitchStep, tonic).map(({ kind, y }) => ({ kind, y }));
}
function validateMeasureMap(measures) {
  if (!Array.isArray(measures) || !measures.length) throw Error("Invalid measure map");
  let cursor = 0;
  for (const measure of measures) {
    if (!Number.isFinite(measure.start) || Math.abs(measure.start - cursor) > 1e-7 || !Number.isFinite(measure.duration) || measure.duration <= 0 || !["number", "string"].includes(typeof measure.sourceNumber) || measure.beatBeats !== void 0 && (!Number.isFinite(measure.beatBeats) || measure.beatBeats <= 0)) throw Error("Invalid measure map");
    cursor = measure.start + measure.duration;
    if (measure.beatPositions !== void 0) {
      let previous = measure.start;
      if (!Array.isArray(measure.beatPositions)) throw Error("Invalid measure map");
      for (const beat of measure.beatPositions) {
        if (!Number.isFinite(beat) || beat <= previous || beat >= cursor) throw Error("Invalid measure map");
        previous = beat;
      }
    }
  }
  return measures;
}
function alignScoreRows(rows) {
  const offsets = rows.map(({ start, end, anchor = start }) => Math.max(0, Math.min(end, anchor) - start));
  const pickup = Math.max(0, ...offsets);
  const width = pickup + Math.max(0, ...rows.map(({ start, end }, index) => end - start - offsets[index]));
  return { width, rows: rows.map((row, index) => ({
    ...row,
    style: {
      ...row.style,
      width: width ? (row.end - row.start) / width * 100 + "%" : "0%",
      marginLeft: width ? (pickup - offsets[index]) / width * 100 + "%" : "0%"
    }
  })) };
}
export {
  BOTTOM_CLEARANCE,
  NOTE_HEIGHT,
  PITCH_STEP,
  TONIC_NAMES,
  TOP_CLEARANCE,
  alignScoreRows,
  guidePitches,
  keyMarkers,
  markersForRow,
  measureHeaderLayout,
  measureSubdivisionBeats,
  mod,
  modulationLabelOffset,
  pitchRange,
  recolorBoundary,
  staveGeometry,
  tonalLines,
  tonalSegments,
  tonicAt,
  tonicMarkers,
  tonicRegions,
  validateMeasureMap,
  visibleBeatLines
};
