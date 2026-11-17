/*! librawl version: 0.3.3; audio source sha256: 1950f8ca50b0b94fa1b6151f1a309a2413e8c0643f095f3ce0582bb45234c149; GPL-3.0-only */

// src/notation/geometry.mjs
var PITCH_STEP = 3;
var NOTE_HEIGHT = 5;
var TOP_CLEARANCE = 20;
var BOTTOM_CLEARANCE = 2;
function pitchRange(notes, span = null, fallback = { low: 48, high: 84 }) {
  const pitches = notes.filter((n) => !span || Math.min(span.end, n.start + n.duration) - Math.max(span.start, n.start) > 1e-6).map((n) => n.pitch);
  return pitches.length ? { low: Math.min(...pitches), high: Math.max(...pitches) } : { ...fallback };
}
function staveGeometry(range, { above = 0, transpose = 0 } = {}) {
  const low = range.low + transpose, high = range.high + transpose, noteTop = TOP_CLEARANCE + above;
  const noteHeight = (high - low) * PITCH_STEP + TOP_CLEARANCE + NOTE_HEIGHT + BOTTOM_CLEARANCE;
  return { low, high, noteTop, noteHeight, notesBottom: noteHeight + above, guideTop: Math.max(0, noteTop - 16), markerTop: noteTop - 14, pitchToY: (pitch) => noteTop + (high - pitch) * PITCH_STEP };
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
var TONIC_NAMES = ["C", "D\u266D", "D", "E\u266D", "E", "F", "F\u266F", "G", "A\u266D", "A", "B\u266D", "B"];
function modulationLabelOffset(beat, barBeats, { initial = beat === 0, onsetOverride, continued = false } = {}) {
  const measure = beat / barBeats, override = onsetOverride != null ? onsetOverride : Number.isFinite(measure) && Math.abs(measure - Math.round(measure)) > 1e-7;
  if (override && !continued) return 0;
  return initial ? String(Math.floor(measure) + 1).length * 8 + 10 : 30;
}
function keyMarkers(tonic, changes) {
  var _a;
  const events = [{ beat: 0, tonic }, ...changes].sort((a, b) => a.beat - b.beat), onsets = [];
  for (const event of events) {
    if (((_a = onsets.at(-1)) == null ? void 0 : _a.beat) === event.beat) onsets[onsets.length - 1] = event;
    else onsets.push(event);
  }
  return onsets.map((event, i) => {
    const previousTonic = i ? onsets[i - 1].tonic : null, delta = previousTonic === null ? null : mod(event.tonic - previousTonic);
    return { ...event, previousTonic, delta: delta !== null && delta > 6 ? delta - 12 : delta };
  });
}
function measureHeaderLayout({ row, tonic = 0, changes = [], barBeats = 4, beatBeats = 1, phraseStarts, measureMap, width = 0, selectedMeasure = null, hideInitialTonic = false }) {
  var _a;
  const EPS = 1e-7, span = row.end - row.start, ppb = width / span, x = (beat) => (beat - row.start) / span * 100;
  const explicit = measureMap === void 0 ? null : validateMeasureMap(measureMap);
  const numberAt = (beat) => {
    var _a2, _b;
    return (_b = (_a2 = explicit == null ? void 0 : explicit.findLast((measure) => measure.start <= beat + EPS)) == null ? void 0 : _a2.sourceNumber) != null ? _b : Math.floor(beat / barBeats) + 1;
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
    const terminal = Math.abs(beat - row.end) < EPS, isPhraseStart = boundary(beat);
    if (!terminal || isPhraseStart) measures.push({ beat, number, left: x(beat), terminal, isPhraseStart, color: selectedMeasure === beat ? "red" : selectedPhrase && Math.abs(beat - selectedMeasure) <= 4 * barBeats + EPS ? "orange" : "#666" });
  }
  if (beatBeats > 0) {
    if (explicit) {
      for (const measure of explicit) {
        const unit = (_a = measure.beatBeats) != null ? _a : beatBeats;
        for (let beat = measure.start + unit; beat < measure.start + measure.duration - EPS; beat += unit) if (beat >= row.start - EPS && beat <= row.end + EPS) beats.push(beat);
      }
    } else for (let beat = Math.ceil((row.start - EPS) / beatBeats) * beatBeats; beat <= row.end + EPS; beat += beatBeats) if (Math.abs(beat / barBeats - Math.round(beat / barBeats)) > EPS) beats.push(beat);
  }
  const relevant = [...barlines, ...beats].filter((beat) => beat !== 0).sort((a, b) => a - b), showBeats = relevant.length > 1 && (relevant.at(-1) - relevant[0]) * ppb / (relevant.length + 1) >= 10;
  const markers = keyMarkers(tonic, changes).flatMap((marker) => {
    var _a2;
    if (marker.delta === 0 || hideInitialTonic && marker.previousTonic === null || marker.beat >= row.end) return [];
    const initial = marker.previousTonic === null, measure = marker.beat / barBeats, onsetOverride = !initial && ((_a2 = marker.onsetOverride) != null ? _a2 : explicit ? !explicit.some((m) => Math.abs(m.start - marker.beat) < EPS) : Math.abs(measure - Math.round(measure)) > EPS), badgeLeft = (marker.beat - row.start) * ppb - (onsetOverride ? 0 : 1), continued = marker.beat < row.start && width > 0 && badgeLeft + 80 > 0;
    if (marker.beat < row.start && !continued) return [];
    return [{ ...marker, number: numberAt(marker.beat), initial, onsetOverride, continued, left: continued ? 0 : x(marker.beat), pixelOffset: continued || !onsetOverride ? -1 : 0, labelOffset: initial && explicit ? String(numberAt(marker.beat)).length * 8 + 10 : modulationLabelOffset(marker.beat, barBeats, { initial, onsetOverride, continued }) }];
  });
  for (const measure of measures) {
    measure.hasModulation = markers.some((marker) => marker.beat === measure.beat && marker.delta !== null);
    if (measure.color === "#666" && measure.hasModulation) measure.color = "black";
  }
  return { measures, beats: showBeats ? beats : [], markers };
}
function tonalSegments(tonic, changes, start, end) {
  const events = [{ beat: 0, tonic }, ...changes].sort((a, b) => a.beat - b.beat), result = [];
  let current = tonic, cursor = start;
  for (const e of events) {
    if (e.beat <= start) {
      current = e.tonic;
      continue;
    }
    if (e.beat >= end) break;
    if (e.tonic !== current) {
      result.push({ start: cursor, end: e.beat, tonic: current });
      cursor = e.beat;
      current = e.tonic;
    }
  }
  result.push({ start: cursor, end, tonic: current });
  return result;
}
function tonalLines(range, axis, tonic) {
  const result = [];
  const rawlY = (p) => axis.pitchToY(p) + PITCH_STEP;
  for (let octave = Math.ceil((range.low + 7 - tonic) / 12); octave <= Math.floor((range.high + 12 - tonic) / 12); octave++) {
    const midi = tonic + octave * 12;
    if (midi - 12 >= range.low && midi - 12 <= range.high) result.push({ kind: "tonic", y: rawlY(midi - 13 + 0.5) });
    if (midi - 7 >= range.low && midi - 7 <= range.high) result.push({ kind: "fifth", y: rawlY(midi - 6) - 0.5 });
  }
  return result;
}
function validateMeasureMap(measures) {
  if (!Array.isArray(measures) || !measures.length) throw Error("Invalid measure map");
  let cursor = 0;
  for (const measure of measures) {
    if (!Number.isFinite(measure.start) || Math.abs(measure.start - cursor) > 1e-7 || !Number.isFinite(measure.duration) || measure.duration <= 0 || !["number", "string"].includes(typeof measure.sourceNumber) || measure.beatBeats !== void 0 && (!Number.isFinite(measure.beatBeats) || measure.beatBeats <= 0)) throw Error("Invalid measure map");
    cursor = measure.start + measure.duration;
  }
  return measures;
}
export {
  BOTTOM_CLEARANCE,
  NOTE_HEIGHT,
  PITCH_STEP,
  TONIC_NAMES,
  TOP_CLEARANCE,
  keyMarkers,
  measureHeaderLayout,
  mod,
  modulationLabelOffset,
  pitchRange,
  staveGeometry,
  tonalLines,
  tonalSegments,
  tonicAt,
  validateMeasureMap
};
