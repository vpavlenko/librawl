/*! librawl version: 0.2.0; audio source sha256: 1950f8ca50b0b94fa1b6151f1a309a2413e8c0643f095f3ce0582bb45234c149; GPL-3.0-only */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
  mod2
));
var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

// src/components.jsx
var components_exports = {};
__export(components_exports, {
  RawlMeasureHeader: () => RawlMeasureHeader,
  TonicSymbol: () => TonicSymbol
});
module.exports = __toCommonJS(components_exports);

// src/components/TonicSymbol.jsx
var React = __toESM(require("react"), 1);
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
var import_react = __toESM(require("react"), 1);

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
function measureHeaderLayout({ row, tonic = 0, changes = [], barBeats = 4, beatBeats = 1, phraseStarts, width = 0, selectedMeasure = null, hideInitialTonic = false }) {
  const EPS = 1e-7, span = row.end - row.start, ppb = width / span, x = (beat) => (beat - row.start) / span * 100;
  const boundary = (beat) => phraseStarts === void 0 ? Math.abs(beat / (4 * barBeats) - Math.round(beat / (4 * barBeats))) < EPS : phraseStarts.some((start) => Math.abs(start - beat) < EPS);
  const selectedPhrase = selectedMeasure !== null && boundary(selectedMeasure), measures = [], barlines = [], beats = [];
  for (let beat = Math.max(0, Math.ceil((row.start - EPS) / barBeats) * barBeats); beat <= row.end + EPS; beat += barBeats) {
    barlines.push(beat);
    const terminal = Math.abs(beat - row.end) < EPS, isPhraseStart = boundary(beat);
    if (!terminal || isPhraseStart) measures.push({ beat, number: Math.round(beat / barBeats) + 1, left: x(beat), terminal, isPhraseStart, color: selectedMeasure === beat ? "red" : selectedPhrase && Math.abs(beat - selectedMeasure) <= 4 * barBeats + EPS ? "orange" : "#666" });
  }
  if (beatBeats > 0) {
    for (let beat = Math.ceil((row.start - EPS) / beatBeats) * beatBeats; beat <= row.end + EPS; beat += beatBeats) if (Math.abs(beat / barBeats - Math.round(beat / barBeats)) > EPS) beats.push(beat);
  }
  const relevant = [...barlines, ...beats].filter((beat) => beat !== 0).sort((a, b) => a - b), showBeats = relevant.length > 1 && (relevant.at(-1) - relevant[0]) * ppb / (relevant.length + 1) >= 10;
  const markers = keyMarkers(tonic, changes).flatMap((marker) => {
    var _a;
    if (marker.delta === 0 || hideInitialTonic && marker.previousTonic === null || marker.beat >= row.end) return [];
    const initial = marker.previousTonic === null, measure = marker.beat / barBeats, onsetOverride = !initial && ((_a = marker.onsetOverride) != null ? _a : Math.abs(measure - Math.round(measure)) > EPS), badgeLeft = (marker.beat - row.start) * ppb - (onsetOverride ? 0 : 1), continued = marker.beat < row.start && width > 0 && badgeLeft + 80 > 0;
    if (marker.beat < row.start && !continued) return [];
    return [{ ...marker, initial, onsetOverride, continued, left: continued ? 0 : x(marker.beat), pixelOffset: continued || !onsetOverride ? -1 : 0, labelOffset: modulationLabelOffset(marker.beat, barBeats, { initial, onsetOverride, continued }) }];
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

// src/notation/RawlNotation.jsx
var import_native = require("librawl/native");
var names = ["C", "D\u266D", "D", "E\u266D", "E", "F", "F\u266F", "G", "A\u266D", "A", "B\u266D", "B"];
var noteName = (p) => names[mod(p)] + (Math.floor(p / 12) - 1);
function RawlMeasureHeader({ row, height = "100%", tonic = 0, changes = [], barBeats = 4, beatBeats = 1, phraseStarts, selectedMeasure = null, onMeasureSelect, hideInitialTonic = false }) {
  const element = (0, import_react.useRef)(null), [width, setWidth] = (0, import_react.useState)(0);
  (0, import_react.useLayoutEffect)(() => {
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
  const { measures, beats, markers } = (0, import_react.useMemo)(() => measureHeaderLayout({ row, tonic, changes, barBeats, beatBeats, phraseStarts, width, selectedMeasure, hideInitialTonic }), [row, tonic, changes, barBeats, beatBeats, phraseStarts, width, selectedMeasure, hideInitialTonic]);
  const x = (beat) => (beat - row.start) / (row.end - row.start) * 100;
  return /* @__PURE__ */ import_react.default.createElement("div", { ref: element, className: "rawln-measure-grid", style: { height } }, measures.map((measure) => /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln-bar" + (measure.isPhraseStart ? " rawln-phrase-bar" : ""), key: "bar-" + measure.beat, "data-beat": measure.beat, "data-phrase-boundary": measure.isPhraseStart ? "true" : void 0, "data-terminal": measure.terminal ? "true" : void 0, style: { left: `calc(${measure.left}% - 1px)`, backgroundColor: measure.isPhraseStart ? "#bbb" : "#444" } })), beats.map((beat) => /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln-beat-bar", key: "beat-" + beat, "data-beat": beat, style: { left: x(beat) + "%" } })), /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln-modulations" }, markers.map((marker) => /* @__PURE__ */ import_react.default.createElement("div", { key: marker.beat, className: "rawln-modulation", "data-beat": marker.beat, "data-tonic": marker.tonic, "data-join": marker.join ? marker.name : void 0, "data-onset-override": marker.onsetOverride ? "true" : void 0, "data-continued": marker.continued ? "true" : void 0, style: { left: marker.pixelOffset ? `calc(${marker.left}% - 1px)` : marker.left + "%" }, title: marker.name }, /* @__PURE__ */ import_react.default.createElement(TonicSymbol, { left: 0, number: Math.floor(marker.beat / barBeats) + 1, previousTonic: marker.previousTonic, modulationDiff: marker.delta === null ? null : mod(marker.delta), tonicStart: marker.tonic, alignToOnset: marker.onsetOverride && !marker.continued, labelClassName: "rawln-modulation-label", flagClassName: "rawln-modulation-flag", labelAttributes: { style: { left: marker.labelOffset } }, flagAttributes: { "data-degree": marker.delta === null ? void 0 : mod(marker.delta), style: { background: marker.delta === null ? void 0 : RAWL_COLORS[mod(marker.delta)].background } }, renderArrow: ({ direction }) => /* @__PURE__ */ import_react.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, direction === "down" ? /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("path", { d: "M12 5v14" }), /* @__PURE__ */ import_react.default.createElement("path", { d: "m19 12-7 7-7-7" })) : /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ import_react.default.createElement("path", { d: "M12 19V5" }))) })))), /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln-measure-labels", "aria-hidden": onMeasureSelect ? void 0 : true }, measures.filter((measure) => !measure.terminal).map((measure) => /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln-measure-number", role: onMeasureSelect ? "button" : void 0, tabIndex: onMeasureSelect ? 0 : void 0, "aria-pressed": onMeasureSelect ? selectedMeasure === measure.beat : void 0, onClick: onMeasureSelect ? (event) => {
    event.stopPropagation();
    onMeasureSelect(measure.beat);
  } : void 0, onKeyDown: onMeasureSelect ? (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onMeasureSelect(measure.beat);
    }
  } : void 0, key: measure.beat, "data-beat": measure.beat, "data-modulation": measure.hasModulation ? "true" : void 0, style: { left: `calc(${measure.left}% + 6px)`, color: measure.color, pointerEvents: onMeasureSelect ? "auto" : void 0, cursor: onMeasureSelect ? "pointer" : void 0 } }, /* @__PURE__ */ import_react.default.createElement("span", null, measure.number)))));
}
function BeatNoteLayer({ visible, row, axis, tonic, changes, mutedVoices, hoveredKey, setHoveredKey, hoveredRef, onNote, onNoteHover, clock }) {
  const host = (0, import_react.useRef)(null), [pixelWidth, setPixelWidth] = (0, import_react.useState)(100), span = row.end - row.start, section = (0, import_react.useMemo)(() => [row.start, row.end], [row.start, row.end]);
  (0, import_react.useLayoutEffect)(() => {
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
  const sourceById = (0, import_react.useMemo)(() => new Map(visible.map((note) => [String(note.id), note])), [visible]);
  const nativeNotes = (0, import_react.useMemo)(() => visible.map((note) => {
    var _a, _b;
    const degree = mod(note.pitch - tonicAt(tonic, changes, note.start + note.duration / 2)), muted = mutedVoices.includes(note.voice);
    return { id: String(note.id), note: { midiNumber: note.pitch }, span: [note.start, note.start + note.duration], displaySpan: [Math.max(row.start, note.start), Math.min(row.end, note.start + note.duration)], voiceIndex: (_a = note.voice) != null ? _a : 0, displayVoiceIndex: (_b = note.voice) != null ? _b : 0, isDrum: false, isActive: !muted, color: `noteColor_${degree}_colors`, colorPitchClass: degree, noteUnderCursor: hoveredKey === `${note.id}:${row.start}`, velocity: note.velocity, ...note.pitchBend ? { pitchBend: note.pitchBend } : {}, ...note.sourceLocation ? { sourceLocation: note.sourceLocation } : {} };
  }), [visible, row.start, row.end, tonic, changes, mutedVoices, hoveredKey]);
  (0, import_react.useLayoutEffect)(() => {
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
  return /* @__PURE__ */ import_react.default.createElement("div", { ref: host, style: { display: "contents" } }, /* @__PURE__ */ import_react.default.createElement(import_native.PlaybackSectionContext.Provider, { value: section }, /* @__PURE__ */ import_react.default.createElement(import_native.NoteLayer, { notes: nativeNotes, midiNumberToY: (pitch) => axis.pitchToY(pitch) + NOTE_HEIGHT / 2, noteHeight: NOTE_HEIGHT / 2, secondsToX: (beat) => (beat - row.start) / span * pixelWidth, handleNoteClick: (note) => onNote == null ? void 0 : onNote(sourceById.get(note.id)), handleMouseEnter: hover, handleMouseLeave: leave, getNoteAttributes: (note) => {
    var _a;
    const original = sourceById.get(note.id), start = note.displaySpan[0], end = note.displaySpan[1], degree = note.colorPitchClass, muted = mutedVoices.includes(original.voice);
    return { role: "button", tabIndex: -1, "aria-label": noteName(original.pitch), title: noteName(original.pitch), "data-note": original.id, "data-pitch": original.pitch, "data-degree": degree, "data-voice": original.voice, className: `rawln-note rawln-voice-${original.voice}${muted ? " rawln-muted" : ""}`, style: { left: (start - row.start) / span * 100 + "%", width: (end - start) / span * 100 + "%", ...!((_a = note.pitchBend) == null ? void 0 : _a.length) && RAWL_COLORS[degree] ? { background: RAWL_COLORS[degree].background } : {}, zIndex: 100 + (84 - original.pitch) + (original.voice === 1 ? 128 : 0) } };
  } })));
}
var RawlNotation = (0, import_react.forwardRef)(function RawlNotation2({ notes, beats, rows, tonic = 0, changes = [], barBeats = 4, beatBeats = 1, phraseStarts, hideInitialTonic = false, position = null, mutedVoices = [], onSeek, onNote, onNoteHover, onMeasureSelect, selectedMeasure = null, renderHeader, renderFooter, className = "", style }, ref) {
  const root = (0, import_react.useRef)(null), hoveredRef = (0, import_react.useRef)(null), [hoveredKey, setHoveredKey] = (0, import_react.useState)(null), clock = (0, import_react.useMemo)(import_native.createSectionPlaybackClock, []);
  const spans = (rows == null ? void 0 : rows.length) ? rows : [{ start: 0, end: beats, label: 1 }];
  const prepared = (0, import_react.useMemo)(() => spans.map((row) => {
    const visible = notes.filter((n) => n.start < row.end - 1e-6 && n.start + n.duration > row.start + 1e-6), range = pitchRange(visible), axis = staveGeometry(range);
    return { row, visible, range, axis, regions: tonalSegments(tonic, changes, row.start, row.end) };
  }), [notes, rows, beats, tonic, changes]);
  const setPosition = (beat) => Number.isFinite(beat) ? clock.advance(beat) : clock.reset();
  (0, import_react.useImperativeHandle)(ref, () => ({ setPosition, element: root.current }), [clock]);
  (0, import_react.useLayoutEffect)(() => {
    setPosition(position);
  }, [position]);
  (0, import_react.useLayoutEffect)(() => () => clock.reset(), [clock]);
  return /* @__PURE__ */ import_react.default.createElement(import_native.NotePlaybackContext.Provider, { value: clock.register }, /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln" + (className ? " " + className : ""), style, ref: root }, prepared.map(({ row, visible, range, axis, regions }) => {
    const span = row.end - row.start, x = (beat) => (beat - row.start) / span * 100;
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln-row", "data-section": row.section, key: `${row.start}-${row.end}`, "data-start": row.start, "data-end": row.end, style: row.style }, renderHeader && /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln-header" }, renderHeader(row)), /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln-score", role: "group", "aria-label": "Rawl notation", style: { height: axis.notesBottom }, onClick: (e) => {
      const box = e.currentTarget.getBoundingClientRect();
      if (box.width > 0) onSeek == null ? void 0 : onSeek(row.start + Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * span);
    } }, /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln-grid", "aria-hidden": "true" }, regions.flatMap((region, i) => tonalLines(range, axis, region.tonic).map((line, j) => /* @__PURE__ */ import_react.default.createElement("div", { key: `${i}-${j}`, "data-tonic": region.tonic, className: `rawln-${line.kind}-line`, style: { left: x(region.start) + "%", width: (region.end - region.start) / span * 100 + "%", top: line.y } })))), /* @__PURE__ */ import_react.default.createElement(RawlMeasureHeader, { row, height: axis.notesBottom, tonic, changes, barBeats, beatBeats, phraseStarts, selectedMeasure, onMeasureSelect, hideInitialTonic }), /* @__PURE__ */ import_react.default.createElement(BeatNoteLayer, { visible, row, axis, tonic, changes, mutedVoices, hoveredKey, setHoveredKey, hoveredRef, onNote, onNoteHover, clock })), renderFooter && /* @__PURE__ */ import_react.default.createElement("div", { className: "rawln-footer" }, renderFooter(row)));
  })));
});
