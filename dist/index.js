/*! librawl version: 0.3.2; audio source sha256: 1950f8ca50b0b94fa1b6151f1a309a2413e8c0643f095f3ce0582bb45234c149; GPL-3.0-only */

// src/notation/RawlNotation.jsx
import React2, { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState as useState2 } from "react";

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
function modulationLabelOffset(beat, barBeats, { initial: initial2 = beat === 0, onsetOverride, continued = false } = {}) {
  const measure = beat / barBeats, override = onsetOverride != null ? onsetOverride : Number.isFinite(measure) && Math.abs(measure - Math.round(measure)) > 1e-7;
  if (override && !continued) return 0;
  return initial2 ? String(Math.floor(measure) + 1).length * 8 + 10 : 30;
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
    const initial2 = marker.previousTonic === null, measure = marker.beat / barBeats, onsetOverride = !initial2 && ((_a2 = marker.onsetOverride) != null ? _a2 : explicit ? !explicit.some((m) => Math.abs(m.start - marker.beat) < EPS) : Math.abs(measure - Math.round(measure)) > EPS), badgeLeft = (marker.beat - row.start) * ppb - (onsetOverride ? 0 : 1), continued = marker.beat < row.start && width > 0 && badgeLeft + 80 > 0;
    if (marker.beat < row.start && !continued) return [];
    return [{ ...marker, number: numberAt(marker.beat), initial: initial2, onsetOverride, continued, left: continued ? 0 : x(marker.beat), pixelOffset: continued || !onsetOverride ? -1 : 0, labelOffset: initial2 && explicit ? String(numberAt(marker.beat)).length * 8 + 10 : modulationLabelOffset(marker.beat, barBeats, { initial: initial2, onsetOverride, continued }) }];
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

// src/notation/palette.mjs
var RAWL_COLORS = [
  { background: "white", foreground: "black" },
  { background: "#820000", foreground: "white", dot: { color: "white", size: 1 } },
  { background: "red", foreground: "black" },
  { background: "#007000", foreground: "white" },
  { background: "#00fb47", foreground: "black" },
  { background: "#9500b3", foreground: "white" },
  { background: "#ea7eff", foreground: "black", dot: { color: "black", size: 2 } },
  { background: "#787878", foreground: "black" },
  { background: "#0000ff", foreground: "white" },
  { background: "#03b9d5", foreground: "black" },
  { background: "#ff7328", foreground: "white" },
  { background: "#ffff00", foreground: "black" }
];

// src/components/TonicSymbol.jsx
import * as React from "react";
var MODULATION_BADGE_WIDTH = 80;
var PITCH_CLASS_TO_LETTER = { 0: "C", 1: "D\u266D", 2: "D", 3: "E\u266D", 4: "E", 5: "F", 6: "F\u266F", 7: "G", 8: "A\u266D", 9: "A", 10: "B\u266D", 11: "B" };
function TonicSymbol({ left, number, previousTonic, modulationDiff, tonicStart, alignToOnset = false, transpose = 0, renderArrow, flagClassName, labelClassName, flagAttributes, labelAttributes }) {
  const displayedTonic = tonicStart == null ? tonicStart : ((tonicStart + transpose) % 12 + 12) % 12;
  const { style: labelStyle, className: attributeLabelClass, ...labelRest } = labelAttributes != null ? labelAttributes : {};
  const { style: flagStyle, className: attributeFlagClass, ...flagRest } = flagAttributes != null ? flagAttributes : {};
  const labelClass = [attributeLabelClass, labelClassName].filter(Boolean).join(" ") || void 0;
  const flagClass = [`noteColor_${modulationDiff}_colors`, attributeFlagClass, flagClassName].filter(Boolean).join(" ");
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "span",
    {
      ...labelRest,
      className: labelClass,
      style: {
        color: "white",
        position: "absolute",
        top: -2,
        left: alignToOnset ? left : left + (previousTonic === null ? String(number).length * 8 + 10 : 30),
        fontSize: 12,
        zIndex: 100,
        fontWeight: 700,
        userSelect: "none",
        pointerEvents: "none",
        textAlign: "left",
        whiteSpace: "nowrap",
        ...labelStyle
      }
    },
    previousTonic !== null && (renderArrow ? /* @__PURE__ */ React.createElement(React.Fragment, null, renderArrow({ direction: modulationDiff > 6 ? "down" : "up", semitones: modulationDiff > 6 ? Math.abs(modulationDiff - 12) : modulationDiff, modulationDiff }), modulationDiff > 6 ? Math.abs(modulationDiff - 12) : modulationDiff, " ") : /* @__PURE__ */ React.createElement(React.Fragment, null, `${modulationDiff > 6 ? `\u2193${Math.abs(modulationDiff - 12)}` : `\u2191${modulationDiff}`} `)),
    PITCH_CLASS_TO_LETTER[displayedTonic]
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      ...flagRest,
      className: flagClass,
      style: {
        width: MODULATION_BADGE_WIDTH,
        height: 12,
        position: "absolute",
        top: 0,
        left,
        zIndex: 3,
        userSelect: "none",
        pointerEvents: "none",
        maskImage: "linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)",
        WebkitMaskImage: "linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)",
        ...flagStyle
      }
    }
  ));
}

// src/notation/RawlNotation.jsx
import { NoteLayer, NotePlaybackContext, PlaybackSectionContext, createSectionPlaybackClock } from "librawl/native";

// src/notation/recolor.jsx
import { useEffect, useState } from "react";
var ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
function recolorModulation(changes, beat, pitch) {
  if (!Number.isFinite(beat) || beat < 0 || !Number.isFinite(pitch)) return changes;
  const tonic = (Math.round(pitch) % 12 + 12) % 12, existing = changes.find((change) => Math.abs(change.beat - beat) < 1e-7), choice = { ...existing != null ? existing : { beat }, tonic, root: ROOTS[tonic] };
  const events = [...changes.filter((change) => Math.abs(change.beat - beat) >= 1e-7).map((change) => ({ ...change })), choice].sort((a, b) => a.beat - b.beat), result = [];
  for (const event of events) if (!result.length || result.at(-1).tonic !== event.tonic) result.push(event);
  return result;
}
function recolorBoundary(changes, measureBeat, barBeats, measureMap) {
  var _a, _b;
  const measure = measureMap == null ? void 0 : measureMap.find((measure2) => Math.abs(measure2.start - measureBeat) < 1e-7), end = measure ? measure.start + measure.duration : measureBeat + barBeats;
  return (_b = (_a = changes.find((change) => change.beat >= measureBeat - 1e-7 && change.beat < end - 1e-7)) == null ? void 0 : _a.beat) != null ? _b : measureBeat;
}
var initial = (source) => ({ source, committed: source, selectedMeasure: null, boundary: null, preview: null });
function useTonicRecoloring({ changes, barBeats = 4, measureMap, onChange }) {
  var _a;
  const [stored, setStored] = useState(() => initial(changes)), state = stored.source === changes ? stored : initial(changes);
  const cancel = () => setStored((previous) => ({ ...previous, selectedMeasure: null, boundary: null, preview: null }));
  useEffect(() => {
    if (state.selectedMeasure === null) return;
    const escape = (event) => {
      if (event.key === "Escape") cancel();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [state.selectedMeasure]);
  return {
    changes: (_a = state.preview) != null ? _a : state.committed,
    selectedMeasure: state.selectedMeasure,
    selectMeasure(beat) {
      setStored((previous) => {
        const current = previous.source === changes ? previous : initial(changes), selectedMeasure = current.selectedMeasure === beat ? null : beat;
        return { ...current, selectedMeasure, boundary: selectedMeasure === null ? null : recolorBoundary(current.committed, beat, barBeats, measureMap), preview: null };
      });
    },
    hoverNote(note) {
      if (state.boundary === null) return;
      setStored((previous) => ({ ...previous, preview: note ? recolorModulation(state.committed, state.boundary, note.pitch) : null }));
    },
    chooseNote(note) {
      if (state.boundary === null) return false;
      const committed = recolorModulation(state.committed, state.boundary, note.pitch);
      setStored({ ...state, committed, preview: null, selectedMeasure: null, boundary: null });
      onChange == null ? void 0 : onChange(committed);
      return true;
    },
    cancel
  };
}

// src/notation/RawlNotation.jsx
var EMPTY_CHANGES = [];
var names = ["C", "D\u266D", "D", "E\u266D", "E", "F", "F\u266F", "G", "A\u266D", "A", "B\u266D", "B"];
var noteName = (p) => names[mod(p)] + (Math.floor(p / 12) - 1);
function RawlMeasureHeader({ row, height = "100%", tonic = 0, changes = EMPTY_CHANGES, barBeats = 4, beatBeats = 1, phraseStarts, measureMap, selectedMeasure = null, onMeasureSelect, hideInitialTonic = false }) {
  const element = useRef(null), [width, setWidth] = useState2(0);
  useLayoutEffect(() => {
    var _a;
    const el = element.current, view = el.ownerDocument.defaultView, fit = () => {
      const next = el.getBoundingClientRect().width || el.clientWidth;
      setWidth((previous) => previous === next ? previous : next);
    }, Observer = (_a = view == null ? void 0 : view.ResizeObserver) != null ? _a : globalThis.ResizeObserver;
    fit();
    const observer = Observer ? new Observer(fit) : null;
    observer == null ? void 0 : observer.observe(el);
    view == null ? void 0 : view.addEventListener("resize", fit);
    return () => {
      observer == null ? void 0 : observer.disconnect();
      view == null ? void 0 : view.removeEventListener("resize", fit);
    };
  }, []);
  const { measures, beats, markers } = useMemo(() => measureHeaderLayout({ row, tonic, changes, barBeats, beatBeats, phraseStarts, measureMap, width, selectedMeasure, hideInitialTonic }), [row, tonic, changes, barBeats, beatBeats, phraseStarts, measureMap, width, selectedMeasure, hideInitialTonic]);
  const x = (beat) => (beat - row.start) / (row.end - row.start) * 100;
  return /* @__PURE__ */ React2.createElement("div", { ref: element, className: "rawln-measure-grid", style: { height } }, measures.map((measure) => /* @__PURE__ */ React2.createElement("div", { className: "rawln-bar" + (measure.isPhraseStart ? " rawln-phrase-bar" : ""), key: "bar-" + measure.beat, "data-beat": measure.beat, "data-phrase-boundary": measure.isPhraseStart ? "true" : void 0, "data-terminal": measure.terminal ? "true" : void 0, style: { left: `calc(${measure.left}% - 1px)`, backgroundColor: measure.isPhraseStart ? "#bbb" : "#444" } })), beats.map((beat) => /* @__PURE__ */ React2.createElement("div", { className: "rawln-beat-bar", key: "beat-" + beat, "data-beat": beat, style: { left: x(beat) + "%" } })), /* @__PURE__ */ React2.createElement("div", { className: "rawln-modulations" }, markers.map((marker) => /* @__PURE__ */ React2.createElement("div", { key: marker.beat, className: "rawln-modulation", "data-beat": marker.beat, "data-tonic": marker.tonic, "data-join": marker.join ? marker.name : void 0, "data-onset-override": marker.onsetOverride ? "true" : void 0, "data-continued": marker.continued ? "true" : void 0, style: { left: marker.pixelOffset ? `calc(${marker.left}% - 1px)` : marker.left + "%" }, title: marker.name }, /* @__PURE__ */ React2.createElement(TonicSymbol, { left: 0, number: marker.number, previousTonic: marker.previousTonic, modulationDiff: marker.delta === null ? null : mod(marker.delta), tonicStart: marker.tonic, alignToOnset: marker.onsetOverride && !marker.continued, labelClassName: "rawln-modulation-label", flagClassName: "rawln-modulation-flag", labelAttributes: { style: { left: marker.labelOffset } }, flagAttributes: { "data-degree": marker.delta === null ? void 0 : mod(marker.delta), style: { background: marker.delta === null ? void 0 : RAWL_COLORS[mod(marker.delta)].background } }, renderArrow: ({ direction }) => /* @__PURE__ */ React2.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, direction === "down" ? /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement("path", { d: "M12 5v14" }), /* @__PURE__ */ React2.createElement("path", { d: "m19 12-7 7-7-7" })) : /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ React2.createElement("path", { d: "M12 19V5" }))) })))), /* @__PURE__ */ React2.createElement("div", { className: "rawln-measure-labels", "aria-hidden": onMeasureSelect ? void 0 : true }, measures.filter((measure) => !measure.terminal).map((measure) => /* @__PURE__ */ React2.createElement("div", { className: "rawln-measure-number", role: onMeasureSelect ? "button" : void 0, tabIndex: onMeasureSelect ? 0 : void 0, "aria-pressed": onMeasureSelect ? selectedMeasure === measure.beat : void 0, onClick: onMeasureSelect ? (event) => {
    event.stopPropagation();
    onMeasureSelect(measure.beat);
  } : void 0, onKeyDown: onMeasureSelect ? (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onMeasureSelect(measure.beat);
    }
  } : void 0, key: measure.beat, "data-beat": measure.beat, "data-modulation": measure.hasModulation ? "true" : void 0, style: { left: `calc(${measure.left}% + 6px)`, color: measure.color, pointerEvents: onMeasureSelect ? "auto" : void 0, cursor: onMeasureSelect ? "pointer" : void 0 } }, /* @__PURE__ */ React2.createElement("span", null, measure.number)))));
}
function BeatNoteLayer({ visible, row, axis, tonic, changes, mutedVoices, hoveredKey, setHoveredKey, hoveredRef, onNote, onNoteHover, clock }) {
  const host = useRef(null), [pixelWidth, setPixelWidth] = useState2(100), span = row.end - row.start, section = useMemo(() => [row.start, row.end], [row.start, row.end]);
  useLayoutEffect(() => {
    var _a;
    const element = host.current.parentElement, view = element.ownerDocument.defaultView, fit = () => {
      const width = element.getBoundingClientRect().width || element.clientWidth || 100;
      setPixelWidth((previous) => previous === width ? previous : width);
    }, Observer = (_a = view == null ? void 0 : view.ResizeObserver) != null ? _a : globalThis.ResizeObserver;
    fit();
    const observer = Observer ? new Observer(fit) : null;
    observer == null ? void 0 : observer.observe(element);
    view == null ? void 0 : view.addEventListener("resize", fit);
    return () => {
      observer == null ? void 0 : observer.disconnect();
      view == null ? void 0 : view.removeEventListener("resize", fit);
    };
  }, []);
  const sourceById = useMemo(() => new Map(visible.map((note) => [String(note.id), note])), [visible]);
  const nativeNotes = useMemo(() => visible.map((note) => {
    var _a, _b;
    const degree = mod(note.pitch - tonicAt(tonic, changes, note.start + note.duration / 2)), muted = mutedVoices.includes(note.voice);
    return { id: String(note.id), note: { midiNumber: note.pitch }, span: [note.start, note.start + note.duration], displaySpan: [Math.max(row.start, note.start), Math.min(row.end, note.start + note.duration)], voiceIndex: (_a = note.voice) != null ? _a : 0, displayVoiceIndex: (_b = note.voice) != null ? _b : 0, isDrum: false, isActive: !muted, color: `noteColor_${degree}_colors`, colorPitchClass: degree, noteUnderCursor: hoveredKey === `${note.id}:${row.start}`, velocity: note.velocity, ...note.pitchBend ? { pitchBend: note.pitchBend } : {}, ...note.sourceLocation ? { sourceLocation: note.sourceLocation } : {} };
  }), [visible, row.start, row.end, tonic, changes, mutedVoices, hoveredKey]);
  useLayoutEffect(() => {
    const unregister = [...host.current.querySelectorAll("[data-note]")].map((element) => {
      const note = sourceById.get(element.dataset.note), muted = mutedVoices.includes(note.voice);
      return clock.register(note.start, note.start + note.duration, (active) => element.classList.toggle("rawln-sounding", active && !muted), section);
    });
    return () => unregister.forEach((remove) => remove());
  }, [clock, nativeNotes, sourceById, section, mutedVoices]);
  const hover = (note) => {
    const original = sourceById.get(note.id), key = `${original.id}:${row.start}`;
    if (hoveredRef.current === key) return;
    hoveredRef.current = key;
    setHoveredKey(key);
    onNoteHover == null ? void 0 : onNoteHover(original);
  };
  const leave = () => {
    if (hoveredRef.current === null) return;
    hoveredRef.current = null;
    setHoveredKey(null);
    onNoteHover == null ? void 0 : onNoteHover(null);
  };
  return /* @__PURE__ */ React2.createElement("div", { ref: host, style: { display: "contents" } }, /* @__PURE__ */ React2.createElement(PlaybackSectionContext.Provider, { value: section }, /* @__PURE__ */ React2.createElement(NoteLayer, { notes: nativeNotes, midiNumberToY: (pitch) => axis.pitchToY(pitch) + NOTE_HEIGHT / 2, noteHeight: NOTE_HEIGHT / 2, secondsToX: (beat) => (beat - row.start) / span * pixelWidth, handleNoteClick: (note) => onNote == null ? void 0 : onNote(sourceById.get(note.id)), handleMouseEnter: hover, handleMouseLeave: leave, getNoteAttributes: (note) => {
    var _a;
    const original = sourceById.get(note.id), start = note.displaySpan[0], end = note.displaySpan[1], degree = note.colorPitchClass, muted = mutedVoices.includes(original.voice);
    return { role: "button", tabIndex: -1, "aria-label": noteName(original.pitch), "data-note": original.id, "data-pitch": original.pitch, "data-degree": degree, "data-voice": original.voice, className: `rawln-note rawln-voice-${original.voice}${muted ? " rawln-muted" : ""}`, style: { left: (start - row.start) / span * 100 + "%", width: (end - start) / span * 100 + "%", ...!((_a = note.pitchBend) == null ? void 0 : _a.length) && RAWL_COLORS[degree] ? { background: RAWL_COLORS[degree].background } : {}, zIndex: 100 + (84 - original.pitch) + (original.voice === 1 ? 128 : 0) } };
  } })));
}
var RawlNotation = forwardRef(function RawlNotation2({ notes, beats, rows, tonic = 0, changes = EMPTY_CHANGES, barBeats = 4, beatBeats = 1, phraseStarts, measureMap, hideInitialTonic = false, position = null, mutedVoices = [], onSeek, onNote, onNoteHover, onMeasureSelect, selectedMeasure = null, onChangesChange, recolorable = true, renderHeader, renderFooter, className = "", style }, ref) {
  const editor = useTonicRecoloring({ changes, barBeats, measureMap, onChange: onChangesChange }), automatic = recolorable && !onMeasureSelect;
  if (automatic) {
    changes = editor.changes;
    selectedMeasure = editor.selectedMeasure;
    onMeasureSelect = editor.selectMeasure;
    const originalClick = onNote, originalHover = onNoteHover;
    onNote = (note) => {
      if (!editor.chooseNote(note)) originalClick == null ? void 0 : originalClick(note);
    };
    onNoteHover = (note) => {
      editor.hoverNote(note);
      originalHover == null ? void 0 : originalHover(note);
    };
  }
  const root = useRef(null), hoveredRef = useRef(null), [hoveredKey, setHoveredKey] = useState2(null), clock = useMemo(createSectionPlaybackClock, []);
  const spans = (rows == null ? void 0 : rows.length) ? rows : [{ start: 0, end: beats, label: 1 }];
  const prepared = useMemo(() => spans.map((row) => {
    const visible = notes.filter((n) => n.start < row.end - 1e-6 && n.start + n.duration > row.start + 1e-6), range = pitchRange(visible), axis = staveGeometry(range);
    return { row, visible, range, axis, regions: tonalSegments(tonic, changes, row.start, row.end) };
  }), [notes, rows, beats, tonic, changes]);
  const setPosition = (beat) => Number.isFinite(beat) ? clock.advance(beat) : clock.reset();
  useImperativeHandle(ref, () => ({ setPosition, element: root.current }), [clock]);
  useLayoutEffect(() => {
    setPosition(position);
  }, [position]);
  useLayoutEffect(() => () => clock.reset(), [clock]);
  return /* @__PURE__ */ React2.createElement(NotePlaybackContext.Provider, { value: clock.register }, /* @__PURE__ */ React2.createElement("div", { className: "rawln" + (className ? " " + className : ""), style, ref: root }, prepared.map(({ row, visible, range, axis, regions }) => {
    const span = row.end - row.start, x = (beat) => (beat - row.start) / span * 100;
    return /* @__PURE__ */ React2.createElement("div", { className: "rawln-row", "data-section": row.section, key: `${row.start}-${row.end}`, "data-start": row.start, "data-end": row.end, style: row.style }, renderHeader && /* @__PURE__ */ React2.createElement("div", { className: "rawln-header" }, renderHeader(row)), /* @__PURE__ */ React2.createElement("div", { className: "rawln-score", role: "group", "aria-label": "Rawl notation", style: { height: axis.notesBottom }, onClick: (e) => {
      const box = e.currentTarget.getBoundingClientRect();
      if (box.width > 0) onSeek == null ? void 0 : onSeek(row.start + Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * span);
    } }, /* @__PURE__ */ React2.createElement("div", { className: "rawln-grid", "aria-hidden": "true" }, regions.flatMap((region, i) => tonalLines(range, axis, region.tonic).map((line, j) => /* @__PURE__ */ React2.createElement("div", { key: `${i}-${j}`, "data-tonic": region.tonic, className: `rawln-${line.kind}-line`, style: { left: x(region.start) + "%", width: (region.end - region.start) / span * 100 + "%", top: line.y } })))), /* @__PURE__ */ React2.createElement(RawlMeasureHeader, { row, height: axis.notesBottom, tonic, changes, barBeats, beatBeats, phraseStarts, measureMap, selectedMeasure, onMeasureSelect, hideInitialTonic }), /* @__PURE__ */ React2.createElement(BeatNoteLayer, { visible, row, axis, tonic, changes, mutedVoices, hoveredKey, setHoveredKey, hoveredRef, onNote, onNoteHover, clock })), renderFooter && /* @__PURE__ */ React2.createElement("div", { className: "rawln-footer" }, renderFooter(row, { changes, selectedMeasure })));
  })));
});

// src/audio/soundfont-playback.js
var import_meta = {};
function createSoundFontPlayback(options = {}) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
  const global = (_a = options.environment) != null ? _a : globalThis;
  const setTimeout = (...args) => {
    var _a2;
    return ((_a2 = global.setTimeout) != null ? _a2 : globalThis.setTimeout).apply(global, args);
  }, clearTimeout = (...args) => {
    var _a2;
    return ((_a2 = global.clearTimeout) != null ? _a2 : globalThis.clearTimeout).apply(global, args);
  }, setInterval = (...args) => {
    var _a2;
    return ((_a2 = global.setInterval) != null ? _a2 : globalThis.setInterval).apply(global, args);
  }, clearInterval = (...args) => {
    var _a2;
    return ((_a2 = global.clearInterval) != null ? _a2 : globalThis.clearInterval).apply(global, args);
  };
  const fetch = (_d = (_c = (_b = options.fetch) != null ? _b : global.fetch) != null ? _c : globalThis.fetch) == null ? void 0 : _d.bind(global), AbortController = (_e = global.AbortController) != null ? _e : globalThis.AbortController;
  const reference = (_i = (_h = (_f = global.document) == null ? void 0 : _f.baseURI) != null ? _h : (_g = global.location) == null ? void 0 : _g.href) != null ? _i : import_meta.url;
  const resolveAsset = (value) => options.assetBase ? new URL(String(value), new URL(String(options.assetBase), reference)).href : String(value);
  const libraryUrl = resolveAsset((_j = options.libraryUrl) != null ? _j : "./vendor/spessasynth/index.js"), workletUrl = resolveAsset((_k = options.workletUrl) != null ? _k : "vendor/spessasynth/spessasynth_processor.min.js");
  const importLibrary = (_l = options.importLibrary) != null ? _l : ((url) => import(url));
  const additionalBanks = ((_m = options.additionalBanks) != null ? _m : []).map((bank) => {
    if (!bank || typeof bank.url !== "string" || !bank.name || !Number.isInteger(bank.bytes) || bank.bytes <= 0 || !/^[a-f0-9]{64}$/.test(bank.sha256)) throw new Error("Invalid SoundFont bank descriptor");
    return { ...bank, url: resolveAsset(bank.url) };
  });
  const auditionProgram = (program) => options.allowAuditionPrograms ? program : 0;
  const HORIZON = 0.14, INTERVAL = 25, MASTER_GAIN = 3, AUDITION_CHANNEL = 9;
  const ROOM = Object.freeze({ wet: 0.14, seconds: 1.1, decaySeconds: 0.85, preDelay: 0.014, seed: 241024 });
  const BANK = { bytes: 5758964, sha256: "f2a57c0c85d3b118b39d6cf6f5eb9447e8a22ec3884e6f616951412d7f5c3460" };
  let engine, pending, audioContext, phase = "idle", lastError = null;
  const aborted = () => Object.assign(new Error("SoundFont initialization cancelled"), { name: "AbortError" });
  function bounded(promise, milliseconds, stage, signal) {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal == null ? void 0 : signal.removeEventListener("abort", cancel);
        fn(value);
      };
      const cancel = () => finish(reject, aborted()), timer = setTimeout(() => finish(reject, new Error("SoundFont " + stage + " timeout")), milliseconds);
      signal == null ? void 0 : signal.addEventListener("abort", cancel, { once: true });
      Promise.resolve(promise).then((value) => finish(resolve, value), (error) => finish(reject, error));
      if (signal == null ? void 0 : signal.aborted) cancel();
    });
  }
  function presentationTime(context) {
    var _a2, _b2, _c2;
    const render = context.currentTime;
    try {
      const stamp = (_a2 = context.getOutputTimestamp) == null ? void 0 : _a2.call(context), now = (_c2 = (_b2 = global.performance) == null ? void 0 : _b2.now) == null ? void 0 : _c2.call(_b2);
      if (stamp && Number.isFinite(now) && Number.isFinite(stamp.contextTime) && stamp.contextTime >= 0 && Number.isFinite(stamp.performanceTime) && stamp.performanceTime > 0 && stamp.performanceTime <= now && now - stamp.performanceTime < 1e3) {
        const projected = stamp.contextTime + (now - stamp.performanceTime) / 1e3;
        if (projected <= render + 5e-3) return Math.min(render, projected);
      }
    } catch (e) {
    }
    const latency = [context.baseLatency, context.outputLatency].reduce((sum, value) => sum + (Number.isFinite(value) && value > 0 ? value : 0), 0);
    return Math.max(0, render - latency);
  }
  function soundingIntervals(plan, note) {
    const EPS = 1e-6;
    return plan.notes.filter((n) => n.group === note.group && n.pitch === note.pitch && n.start <= note.start + EPS && n.start < note.end - EPS && n.start + n.duration > note.start + EPS).map((n) => [Math.max(n.start, note.start), n.start + n.duration > note.end + EPS ? Math.min(n.end, note.end) : n.end]).filter(([start, end]) => end > start);
  }
  function roomImpulse(context) {
    const rate = context.sampleRate, length = Math.ceil(rate * ROOM.seconds), buffer = context.createBuffer(2, length, rate), delay = Math.ceil(rate * ROOM.preDelay);
    let random = ROOM.seed;
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      let previous = 0, energy = 0;
      for (let i = delay; i < length; i++) {
        random = Math.imul(random, 1664525) + 1013904223 >>> 0;
        previous = 0.58 * previous + 0.42 * (random / 2147483648 - 1);
        const t = (i - delay) / rate;
        samples[i] = previous * Math.exp(-Math.log(1e3) * t / ROOM.decaySeconds);
        energy += samples[i] * samples[i];
      }
      const scale = 1 / Math.sqrt(energy || 1);
      for (let i = delay; i < length; i++) samples[i] *= scale;
    }
    return buffer;
  }
  class PlaybackEngine {
    constructor(context, synth) {
      this.context = context;
      this.synth = synth;
      this.connections = [];
      this.fence = 0;
      this.interval = null;
      this.roomConnections = [];
      this.roomNodes = [];
      this.roomBuffer = null;
      this.auditionState = null;
      this.auditionFence = 0;
      this.overlapAudition = null;
    }
    stopAudition() {
      this.stopOverlapAudition();
      const entry = this.auditionState;
      if (!entry) return;
      this.auditionState = null;
      clearTimeout(entry.offTimer);
      clearTimeout(entry.cleanupTimer);
      if (entry.connected) {
        const time = Math.max(this.context.currentTime, this.auditionFence) + 1e-3;
        this.auditionFence = time;
        try {
          this.synth.controllerChange(AUDITION_CHANNEL, 120, 0, { time });
        } catch (e) {
        }
        try {
          this.synth.disconnectChannel(entry.output, AUDITION_CHANNEL);
        } catch (e) {
        }
      }
      for (const node of entry.nodes) try {
        node.disconnect();
      } catch (e) {
      }
      if (!entry.ended) {
        entry.ended = true;
        try {
          entry.onEnd("cancelled");
        } catch (error) {
          console.error(error);
        }
      }
      try {
        entry.onDispose();
      } catch (error) {
        console.error(error);
      }
    }
    audition({ pitch, duration, velocity = 72, program = 0 }, onEnd = () => {
    }, onDispose = () => {
    }) {
      var _a2, _b2, _c2;
      program = auditionProgram(program);
      if (!Number.isInteger(pitch) || pitch < 0 || pitch > 127 || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(velocity) || !Number.isInteger(program) || program < 0 || program > 127) throw new Error("Invalid audition note");
      if (typeof ((_b2 = (_a2 = this.synth.midiChannels) == null ? void 0 : _a2[AUDITION_CHANNEL]) == null ? void 0 : _b2.setDrums) !== "function") throw new Error("Audition channel unavailable");
      this.stopAudition();
      const context = this.context, start = Math.max(context.currentTime + 0.01, this.auditionFence + 5e-3), end = start + duration;
      const entry = { nodes: [], output: null, connected: false, onEnd, onDispose, ended: false, offTimer: null, cleanupTimer: null };
      this.auditionState = entry;
      try {
        const output = context.createGain();
        entry.output = output;
        entry.nodes.push(output);
        output.gain.value = 0;
        output.gain.setValueAtTime(MASTER_GAIN, start);
        output.connect(context.destination);
        if (context.createConvolver && context.createBuffer) {
          (_c2 = this.roomBuffer) != null ? _c2 : this.roomBuffer = roomImpulse(context);
          const convolver = context.createConvolver(), wet = context.createGain();
          entry.nodes.push(convolver, wet);
          convolver.normalize = false;
          convolver.buffer = this.roomBuffer;
          wet.gain.value = ROOM.wet;
          output.connect(convolver);
          convolver.connect(wet);
          wet.connect(context.destination);
        }
        entry.connected = true;
        this.synth.connectChannel(output, AUDITION_CHANNEL);
        this.synth.midiChannels[AUDITION_CHANNEL].setDrums(false);
        for (const [controller, value] of [[0, 0], [32, 0], [7, 100], [10, 64], [11, 127], [64, 0]]) this.synth.controllerChange(AUDITION_CHANNEL, controller, value, { time: start });
        this.synth.programChange(AUDITION_CHANNEL, program, { time: start });
        this.synth.noteOn(AUDITION_CHANNEL, pitch, Math.max(1, Math.min(127, Math.round(velocity))), { time: start });
        this.auditionFence = start;
        const release = () => {
          if (this.auditionState !== entry) return;
          entry.offTimer = null;
          if (context.currentTime < end) {
            entry.offTimer = setTimeout(release, Math.max(1, (end - context.currentTime) * 1e3));
            return;
          }
          const time = context.currentTime;
          try {
            this.synth.noteOff(AUDITION_CHANNEL, pitch, { time });
          } catch (error) {
            this.stopAudition();
            console.error(error);
            return;
          }
          this.auditionFence = Math.max(this.auditionFence, time);
          entry.ended = true;
          entry.cleanupTimer = setTimeout(() => {
            if (this.auditionState === entry) this.stopAudition();
          }, (ROOM.seconds + 0.1) * 1e3);
          try {
            entry.onEnd("ended");
          } catch (error) {
            console.error(error);
          }
        };
        entry.offTimer = setTimeout(release, Math.max(0, (end - context.currentTime) * 1e3));
      } catch (error) {
        this.stopAudition();
        throw error;
      }
      return { start, end, cancel: () => {
        if (this.auditionState === entry) this.stopAudition();
      } };
    }
    stopOverlapAudition() {
      const bus = this.overlapAudition;
      if (!bus) return;
      for (const entry of [...bus.entries]) entry.cancel();
    }
    auditionOverlap({ pitch, duration, velocity = 72, program = 0 }, onEnd = () => {
    }, onDispose = () => {
    }) {
      var _a2, _b2, _c2;
      program = auditionProgram(program);
      if (!Number.isInteger(pitch) || pitch < 0 || pitch > 127 || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(velocity) || !Number.isInteger(program) || program < 0 || program > 127) throw new Error("Invalid audition note");
      if (typeof ((_b2 = (_a2 = this.synth.midiChannels) == null ? void 0 : _a2[AUDITION_CHANNEL]) == null ? void 0 : _b2.setDrums) !== "function") throw new Error("Audition channel unavailable");
      if (!this.overlapAudition) {
        this.stopAudition();
        const bus2 = { nodes: [], entries: /* @__PURE__ */ new Set(), connected: false, output: null };
        this.overlapAudition = bus2;
        try {
          const output = this.context.createGain();
          bus2.output = output;
          bus2.nodes.push(output);
          output.gain.value = 0;
          output.connect(this.context.destination);
          if (this.context.createConvolver && this.context.createBuffer) {
            (_c2 = this.roomBuffer) != null ? _c2 : this.roomBuffer = roomImpulse(this.context);
            const convolver = this.context.createConvolver(), wet = this.context.createGain();
            bus2.nodes.push(convolver, wet);
            convolver.normalize = false;
            convolver.buffer = this.roomBuffer;
            wet.gain.value = ROOM.wet;
            output.connect(convolver);
            convolver.connect(wet);
            wet.connect(this.context.destination);
          }
          bus2.connected = true;
          this.synth.connectChannel(output, AUDITION_CHANNEL);
        } catch (error) {
          this.overlapAudition = null;
          if (bus2.connected) try {
            this.synth.disconnectChannel(bus2.output, AUDITION_CHANNEL);
          } catch (e) {
          }
          for (const node of bus2.nodes) try {
            node.disconnect();
          } catch (e) {
          }
          throw error;
        }
      }
      const bus = this.overlapAudition, context = this.context;
      let channel = AUDITION_CHANNEL;
      while ([...bus.entries].some((entry2) => entry2.channel === channel)) channel += 16;
      if (channel >= this.synth.midiChannels.length) {
        if (typeof this.synth.addNewChannel !== "function") throw new Error("Audition polyphony unavailable");
        while (channel >= this.synth.midiChannels.length) this.synth.addNewChannel();
      }
      const start = Math.max(context.currentTime + 0.01, this.auditionFence + 5e-3), end = start + duration;
      const entry = { channel, offTimer: null, cleanupTimer: null, ended: false, cancel: null };
      bus.entries.add(entry);
      const finish = (reason) => {
        if (entry.ended) return;
        entry.ended = true;
        try {
          onEnd(reason);
        } catch (error) {
          console.error(error);
        }
      };
      const dispose = () => {
        if (!bus.entries.delete(entry)) return;
        clearTimeout(entry.offTimer);
        clearTimeout(entry.cleanupTimer);
        if (!bus.entries.size && this.overlapAudition === bus) {
          this.overlapAudition = null;
          if (bus.connected) try {
            this.synth.disconnectChannel(bus.output, AUDITION_CHANNEL);
          } catch (e) {
          }
          for (const node of bus.nodes) try {
            node.disconnect();
          } catch (e) {
          }
        }
        try {
          onDispose();
        } catch (error) {
          console.error(error);
        }
      };
      entry.cancel = () => {
        if (!bus.entries.has(entry)) return;
        const time = Math.max(context.currentTime, start, this.auditionFence) + 1e-3;
        this.auditionFence = time;
        try {
          this.synth.controllerChange(channel, 120, 0, { time });
        } catch (e) {
        }
        finish("cancelled");
        dispose();
      };
      try {
        if (bus.entries.size === 1) {
          bus.output.gain.setValueAtTime(0, start);
          if (bus.output.gain.linearRampToValueAtTime) bus.output.gain.linearRampToValueAtTime(MASTER_GAIN, start + 5e-3);
          else bus.output.gain.setValueAtTime(MASTER_GAIN, start);
        }
        this.synth.midiChannels[channel].setDrums(false);
        this.synth.controllerChange(channel, 121, 0, { time: start });
        for (const controller of [8, 71, 72, 73, 74, 75, 76, 77, 78, 81, 83]) this.synth.controllerChange(channel, controller, 64, { time: start });
        for (const controller of [100, 101]) this.synth.controllerChange(channel, controller, 127, { time: start });
        for (const [controller, value] of [[0, 0], [32, 0], [7, 100], [10, 64], [11, 127], [64, 0]]) this.synth.controllerChange(channel, controller, value, { time: start });
        this.synth.programChange(channel, program, { time: start });
        this.synth.noteOn(channel, pitch, Math.max(1, Math.min(127, Math.round(velocity))), { time: start });
        this.auditionFence = start;
        const release = () => {
          if (!bus.entries.has(entry)) return;
          entry.offTimer = null;
          if (context.currentTime < end) {
            entry.offTimer = setTimeout(release, Math.max(1, (end - context.currentTime) * 1e3));
            return;
          }
          try {
            this.synth.noteOff(channel, pitch, { time: context.currentTime });
          } catch (error) {
            entry.cancel();
            console.error(error);
            return;
          }
          finish("ended");
          entry.cleanupTimer = setTimeout(dispose, (ROOM.seconds + 0.1) * 1e3);
        };
        entry.offTimer = setTimeout(release, Math.max(0, (end - context.currentTime) * 1e3));
      } catch (error) {
        entry.cancel();
        throw error;
      }
      return { start, end, cancel: entry.cancel };
    }
    createClock(plan, start, offset = 0) {
      var _a2;
      const offsetTime = plan.timeAt(offset), end = (_a2 = plan.beats) != null ? _a2 : plan.beatAt(plan.duration);
      let previous = offset;
      const beat = () => {
        const now = presentationTime(this.context);
        if (now < start) return null;
        previous = Math.max(previous, Math.min(end, plan.beatAt(offsetTime + now - start)));
        return previous;
      };
      return { beat, position: () => {
        var _a3;
        return (_a3 = beat()) != null ? _a3 : offset;
      } };
    }
    stop() {
      this.stopAudition();
      clearInterval(this.interval);
      this.interval = null;
      for (const [mixer, convolver] of this.roomConnections) try {
        mixer.disconnect(convolver);
      } catch (e) {
      }
      for (const node of this.roomNodes) try {
        node.disconnect();
      } catch (e) {
      }
      this.roomConnections = [];
      this.roomNodes = [];
      const channels = new Set(this.connections.map(([channel]) => channel));
      for (const [channel, mixer] of this.connections) {
        try {
          this.synth.disconnectChannel(mixer, channel);
        } catch (e) {
        }
      }
      this.connections = [];
      this.synth.stopAll(true);
      if (channels.size) {
        const time = Math.max(this.context.currentTime, this.fence) + 1e-3;
        for (const channel of channels) this.synth.controllerChange(channel, 120, 0, { time });
        this.fence = time;
      }
    }
    play(plan, mixers, offset = 0, output = this.context.destination) {
      var _a2;
      if (plan.channels.some((channel) => channel.channel === AUDITION_CHANNEL)) throw new Error("Reserved audition channel");
      this.stop();
      const context = this.context, start = Math.max(context.currentTime + 0.045, this.fence + 0.025), offsetTime = plan.timeAt(offset);
      if (context.createConvolver && context.createBuffer) {
        (_a2 = this.roomBuffer) != null ? _a2 : this.roomBuffer = roomImpulse(context);
        const convolver = context.createConvolver(), wet = context.createGain();
        convolver.normalize = false;
        convolver.buffer = this.roomBuffer;
        wet.gain.value = ROOM.wet;
        this.roomNodes = [convolver, wet];
        convolver.connect(wet);
        wet.connect(output);
        for (const mixer of new Set(mixers)) {
          mixer.connect(convolver);
          this.roomConnections.push([mixer, convolver]);
        }
      }
      for (const channel of plan.channels) {
        this.synth.controllerChange(channel.channel, 120, 0, { time: start - 3e-3 });
        this.synth.connectChannel(mixers[channel.group], channel.channel);
        this.connections.push([channel.channel, mixers[channel.group]]);
      }
      const snapshotAt = (beat) => {
        var _a3;
        const snapshot = /* @__PURE__ */ new Map();
        for (const event of plan.events) if (event.beat <= beat && ["program", "cc"].includes(event.type)) snapshot.set([event.channel, event.type, (_a3 = event.controller) != null ? _a3 : ""].join(":"), { ...event, beat });
        return [...snapshot.values()];
      };
      const heldAt = (beat) => plan.notes.filter((n) => n.start < beat && n.end > beat).map((n) => ({ beat, type: "on", channel: n.channel, pitch: n.pitch, velocity: n.velocity }));
      const events = [...snapshotAt(offset), ...heldAt(offset), ...plan.events.filter((e) => e.beat >= offset && (e.type === "on" || e.type === "off") || e.beat > offset && e.type === "cc")];
      const priority = (e) => e.type === "cc" && [0, 32].includes(e.controller) ? -1 : { program: 0, cc: 1, off: 2, on: 3 }[e.type];
      events.sort((a, b) => a.beat - b.beat || priority(a) - priority(b));
      let cursor = 0;
      const send = (event, time) => {
        this.fence = Math.max(this.fence, time);
        const options2 = { time };
        if (event.type === "program") this.synth.programChange(event.channel, event.program, options2);
        else if (event.type === "cc") this.synth.controllerChange(event.channel, event.controller, event.value, options2);
        else if (event.type === "on") this.synth.noteOn(event.channel, event.pitch, event.velocity, options2);
        else this.synth.noteOff(event.channel, event.pitch, options2);
      };
      const pump = () => {
        const until = context.currentTime + HORIZON;
        if (cursor < events.length && start + plan.timeAt(events[cursor].beat) - offsetTime < context.currentTime - HORIZON) {
          const time = context.currentTime + 0.01, beat = plan.beatAt(offsetTime + time - start);
          for (const channel of plan.channels) this.synth.controllerChange(channel.channel, 120, 0, { time });
          [...snapshotAt(beat), ...heldAt(beat)].sort((a, b) => priority(a) - priority(b)).forEach((event) => send(event, time));
          while (cursor < events.length && events[cursor].beat < beat) cursor++;
        }
        while (cursor < events.length) {
          const event = events[cursor], time = start + (plan.timeAt(event.beat) - offsetTime);
          if (time > until) break;
          cursor++;
          send(event, time);
        }
        if (cursor === events.length) {
          clearInterval(this.interval);
          this.interval = null;
        }
      };
      this.interval = setInterval(pump, INTERVAL);
      pump();
      return start;
    }
  }
  async function prepare(context) {
    if (context.state === "closed") throw new Error("AudioContext closed");
    audioContext != null ? audioContext : audioContext = context;
    if (audioContext !== context) throw new Error("Shared AudioContext required");
    if (engine) return engine;
    if (pending) return pending.promise;
    const attempt = { controller: new AbortController(), synth: null, warmup: null, cleanup: [] }, signal = attempt.controller.signal;
    pending = attempt;
    lastError = null;
    function dispose() {
      var _a2;
      for (const cleanup of attempt.cleanup.splice(0)) try {
        cleanup();
      } catch (e) {
      }
      try {
        (_a2 = attempt.warmup) == null ? void 0 : _a2.disconnect();
      } catch (e) {
      }
      if (attempt.synth) {
        try {
          attempt.synth.destroy();
        } catch (e) {
        }
        attempt.synth = null;
      }
    }
    attempt.promise = (async () => {
      try {
        if (!context.audioWorklet) throw new Error("AudioWorklet unavailable");
        if (context.state && context.state !== "running") {
          phase = "resume";
          await bounded(context.resume(), 1e4, "resume", signal);
        }
        phase = "assets";
        const loadBank = async (url, lock) => {
          var _a2;
          const response = await fetch(url + (url.includes("?") ? "&" : "?") + "sha256=" + lock.sha256, { signal });
          if (!response.ok) throw new Error("SoundFont HTTP " + response.status);
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.length !== lock.bytes) throw new Error("SoundFont bank length " + bytes.length);
          if ((_a2 = global.crypto) == null ? void 0 : _a2.subtle) {
            const digest = await global.crypto.subtle.digest("SHA-256", bytes), hash = Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, "0")).join("");
            if (hash !== lock.sha256) throw new Error("SoundFont bank checksum");
          }
          return bytes;
        };
        const banks = [{ url: resolveAsset("assets/soundfonts/GeneralUser-GS-v4.sf2.1"), name: "caplin", ...BANK }, ...additionalBanks];
        const [library, ...bankBytes] = await bounded(Promise.all([importLibrary(libraryUrl), ...banks.map((bank) => loadBank(bank.url, bank))]), 3e4, "assets", signal);
        phase = "module";
        await bounded(context.audioWorklet.addModule(workletUrl), 1e4, "module", signal);
        let fail;
        const failure = new Promise((_, reject) => {
          fail = (error) => reject(error instanceof Error ? error : new Error(String(error)));
        });
        failure.catch(() => {
        });
        const synth = new library.WorkletSynthesizer(context, { oneOutput: false, eventsEnabled: false, audioNodeCreators: { worklet(ctx, name, options2) {
          const node = new global.AudioWorkletNode(ctx, name, options2), processorError = () => fail(new Error("SoundFont worklet processor error")), messageError = () => fail(new Error("SoundFont worklet message error"));
          node.addEventListener("processorerror", processorError);
          node.port.addEventListener("messageerror", messageError);
          attempt.cleanup.push(() => {
            node.removeEventListener("processorerror", processorError);
            node.port.removeEventListener("messageerror", messageError);
          });
          return node;
        } } });
        attempt.synth = synth;
        synth.eventHandler.addEvent("soundBankError", "caplin-initialization", fail);
        attempt.cleanup.push(() => synth.eventHandler.removeEvent("soundBankError", "caplin-initialization"));
        const warmup = context.createGain();
        attempt.warmup = warmup;
        warmup.gain.value = 0;
        warmup.connect(context.destination);
        synth.connect(warmup);
        phase = "ready";
        await bounded(Promise.race([synth.isReady, failure]), 1e4, "ready", signal);
        synth.setLogLevel(false, false, false);
        for (let i = 0; i < banks.length; i++) {
          phase = "bank";
          await bounded(Promise.race([synth.soundBankManager.addSoundBank(bankBytes[i].buffer, banks[i].name), failure]), 1e4, i ? "additional bank" : "bank", signal);
        }
        if (signal.aborted) throw aborted();
        synth.setSystemParameter("effectsEnabled", false);
        synth.setSystemParameter("gain", 0.8);
        synth.disconnect(warmup);
        warmup.disconnect();
        attempt.warmup = null;
        for (const cleanup of attempt.cleanup.splice(0)) cleanup();
        engine = new PlaybackEngine(context, synth);
        attempt.synth = null;
        phase = "ready";
        return engine;
      } catch (error) {
        attempt.controller.abort();
        dispose();
        if (pending === attempt) {
          phase = error.name === "AbortError" ? "idle" : "failed";
          lastError = String(error);
        }
        throw error;
      }
    })();
    try {
      return await attempt.promise;
    } finally {
      if (pending === attempt) pending = null;
    }
  }
  function stop() {
    if (pending) {
      const attempt = pending;
      pending = null;
      attempt.controller.abort();
      phase = "idle";
    }
    engine == null ? void 0 : engine.stop();
  }
  return { prepare, stop, stopAudition: () => engine == null ? void 0 : engine.stopAudition(), getContext: () => audioContext, getPreparationState: () => ({ phase, pending: !!pending, error: lastError }), PlaybackEngine, presentationTime, soundingIntervals, room: ROOM, roomImpulse, masterGain: MASTER_GAIN };
}

// src/audio/transport.js
function createTransport({ makePlan, audio: providedAudio, onState = () => {
}, onPosition = () => {
}, onError = () => {
} } = {}) {
  if (typeof makePlan !== "function") throw new TypeError("makePlan is required");
  const audioEngine = () => providedAudio != null ? providedAudio : globalThis.SoundFontPlayback;
  let data = null, engine = null, context = null, clock = null, position = 0, tempo = 120, state = "idle", token = 0, frame = null, nodes = [], mixers = [], output = null, muted = /* @__PURE__ */ new Set(), auditionVoice = null, auditionGeneration = 0;
  const emit = (s) => {
    state = s;
    onState(s);
  };
  function disconnect() {
    for (const n of nodes) try {
      n.disconnect();
    } catch (e) {
    }
    nodes = [];
    mixers = [];
    output = null;
  }
  function cancel() {
    var _a;
    token++;
    cancelAnimationFrame(frame);
    frame = null;
    clock = null;
    auditionGeneration++;
    auditionVoice = null;
    (_a = audioEngine()) == null ? void 0 : _a.stop();
    disconnect();
  }
  function tick() {
    if (state !== "playing" || !clock) return;
    const beat = clock.beat();
    if (beat !== null) position = beat;
    onPosition(beat);
    if (beat !== null && beat >= data.beats - 1e-3) {
      cancel();
      position = 0;
      emit("idle");
      onPosition(null);
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  async function play() {
    var _a;
    if (!data) return;
    if (position >= data.beats) position = 0;
    const run = ++token;
    emit("loading");
    onPosition(null);
    try {
      const audio = audioEngine();
      if (!audio) throw Error("Playback engine missing");
      context != null ? context : context = (_a = audio.getContext()) != null ? _a : new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      await context.resume();
      if (run !== token) return;
      engine = await audio.prepare(context);
      if (run !== token) return;
      output = context.createGain();
      output.gain.value = 0.28;
      output.connect(context.destination);
      nodes = [output];
      mixers = [0, 1].map((i) => {
        const n = context.createGain();
        n.gain.value = muted.has(i) ? 0 : 1;
        n.connect(output);
        nodes.push(n);
        return n;
      });
      const plan = makePlan(data, tempo), start = engine.play(plan, mixers, position, output);
      clock = engine.createClock(plan, start, position);
      emit("playing");
      tick();
    } catch (error) {
      if (run !== token || error.name === "AbortError") return;
      cancel();
      emit("error");
      onError(error);
    }
  }
  function pause() {
    if (clock) position = clock.position();
    cancel();
    emit("paused");
    onPosition(null);
  }
  function stop() {
    cancel();
    position = 0;
    emit("idle");
    onPosition(null);
  }
  function seek(beat) {
    var _a;
    const resume = state === "playing";
    if (clock) position = clock.position();
    cancel();
    position = Math.max(0, Math.min((_a = data == null ? void 0 : data.beats) != null ? _a : 0, beat));
    onPosition(null);
    if (resume) void play();
    else emit("paused");
  }
  return {
    load(next) {
      stop();
      data = next;
      tempo = next.tempo;
      muted.clear();
    },
    play,
    pause,
    stop,
    seek,
    toggle() {
      if (state === "playing" || state === "loading") pause();
      else return play();
    },
    setTempo(value) {
      const next = Math.max(40, Math.min(260, Number(value) || 120)), resume = state === "playing";
      if (clock) position = clock.position();
      if (state === "playing" || state === "loading") cancel();
      tempo = next;
      if (resume) void play();
      else if (state === "loading") emit("paused");
    },
    setMuted(voice, value) {
      var _a;
      if (value) muted.add(voice);
      else muted.delete(voice);
      if (mixers[voice]) mixers[voice].gain.setTargetAtTime(value ? 0 : 1, context.currentTime, 8e-3);
      if (value && auditionVoice === voice) {
        auditionGeneration++;
        (_a = engine == null ? void 0 : engine.stopAudition) == null ? void 0 : _a.call(engine);
        auditionVoice = null;
      }
    },
    async audition(note) {
      var _a, _b, _c, _d, _e;
      const run = token, voice = (_a = note.voice) != null ? _a : 0;
      if (muted.has(voice)) return;
      try {
        const audio = audioEngine();
        context != null ? context : context = (_b = audio.getContext()) != null ? _b : new (globalThis.AudioContext || globalThis.webkitAudioContext)();
        await context.resume();
        engine = await audio.prepare(context);
        if (run !== token || muted.has(voice)) return;
        const supplied = (_d = (_c = data == null ? void 0 : data.voices) == null ? void 0 : _c.find((v) => v.voice === voice)) == null ? void 0 : _d.program, program = Number.isInteger(supplied) && supplied >= 0 && supplied <= 127 ? supplied : voice === 1 ? 65 : 0;
        const audition = ++auditionGeneration;
        auditionVoice = voice;
        engine.audition({ pitch: note.pitch, duration: Math.min(2, note.duration * 60 / tempo), velocity: (_e = note.velocity) != null ? _e : voice === 1 ? 80 : 74, program }, () => {
          if (audition === auditionGeneration) auditionVoice = null;
        });
      } catch (error) {
        if (run === token && error.name !== "AbortError") onError(error);
      }
    },
    destroy() {
      stop();
      data = null;
    },
    get state() {
      return state;
    },
    get position() {
      return position;
    },
    get tempo() {
      return tempo;
    },
    get data() {
      return data;
    },
    get mutedVoices() {
      return [...muted];
    }
  };
}

// src/audio/tempo-keys.js
function bindTempoKeys({ target = globalThis.document, adjustTempo, enabled = () => true }) {
  const deltas = { "-": -0.1, "=": 0.1, "_": -0.01, "+": 0.01 };
  const keydown = (event) => {
    var _a, _b;
    const delta = deltas[event.key], element = event.target;
    if (delta === void 0 || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || !enabled()) return;
    if ((_a = element == null ? void 0 : element.closest) == null ? void 0 : _a.call(element, 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],dialog[open]')) return;
    if ((_b = target.querySelector) == null ? void 0 : _b.call(target, "dialog[open]")) return;
    if (adjustTempo(delta, event) !== false) event.preventDefault();
  };
  target.addEventListener("keydown", keydown);
  return () => target.removeEventListener("keydown", keydown);
}
export {
  RAWL_COLORS,
  RawlMeasureHeader,
  RawlNotation,
  TonicSymbol,
  bindTempoKeys,
  createSoundFontPlayback,
  createTransport,
  modulationLabelOffset,
  pitchRange,
  recolorBoundary,
  recolorModulation,
  staveGeometry,
  useTonicRecoloring
};
