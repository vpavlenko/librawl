/*! librawl version: 0.4.1-local; audio source sha256: 71b00333d99d3a7d882060d12d513caeb32390b6548f595fa062dabfc235d734; GPL-3.0-only */

// src/notation/RawlNotation.jsx
import React7, { useImperativeHandle, useLayoutEffect as useLayoutEffect3, useMemo as useMemo3, useRef as useRef4, useState as useState3 } from "react";

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
    const initial2 = marker.previousTonic === null;
    if (marker.tonic == null || marker.delta === 0 || marker.beat >= end || hideInitialTonic && initial2) return [];
    const onsetOverride = !initial2 && marker.onsetOverride === true;
    const pixelOffset = onsetOverride ? 0 : -1;
    if (marker.beat >= start) {
      const number2 = (_a = marker.number) != null ? _a : numberAt(marker.beat);
      return [{
        ...marker,
        number: number2,
        initial: initial2,
        onsetOverride,
        continued: false,
        pixelOffset,
        labelOffset: onsetOverride ? 0 : initial2 ? String(number2).length * 8 + 10 : 30
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
function positionedTonalGuides(regions, range, pitchToY) {
  return regions.flatMap(({ tonic, left, width }) => tonalGuideLines(range, pitchToY, tonic).map((guide) => ({ ...guide, tonic, left, width })));
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
function modulationLabelOffset(beat, barBeats, { initial: initial2 = beat === 0, onsetOverride, continued = false } = {}) {
  const measure = beat / barBeats, override = onsetOverride != null ? onsetOverride : Number.isFinite(measure) && Math.abs(measure - Math.round(measure)) > 1e-7;
  if (override && !continued) return 0;
  return initial2 ? String(Math.floor(measure) + 1).length * 8 + 10 : 30;
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
var colorIndex = (semitones) => (semitones % 12 + 12) % 12;

// src/notation/RawlMeasureHeader.jsx
import React2, { useLayoutEffect, useMemo, useRef, useState } from "react";

// src/components/TonicSymbol.jsx
import * as React from "react";
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
    TONIC_NAMES[displayedTonic]
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

// src/notation/RawlMeasureHeader.jsx
var EMPTY_CHANGES = [];
var cssLength = (value) => typeof value === "number" ? value + "px" : value;
var offsetLeft = (left, offset) => typeof left === "number" ? left + offset : offset < 0 ? `calc(${left} - ${-offset}px)` : offset > 0 ? `calc(${left} + ${offset}px)` : left;
function arrow({ direction }) {
  return /* @__PURE__ */ React2.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, direction === "down" ? /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement("path", { d: "M12 5v14" }), /* @__PURE__ */ React2.createElement("path", { d: "m19 12-7 7-7-7" })) : /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ React2.createElement("path", { d: "M12 19V5" })));
}
function rowLayout(options) {
  const { row } = options;
  const layout = measureHeaderLayout(options);
  const x = (beat) => (beat - row.start) / (row.end - row.start) * 100 + "%";
  return {
    measures: layout.measures.map((measure) => ({
      ...measure,
      left: measure.left + "%",
      barLeft: Math.abs(measure.beat - row.start) < 1e-7 ? 0 : offsetLeft(x(measure.beat), -1)
    })),
    beats: layout.beats.map((beat) => ({ beat, left: x(beat) })),
    markers: layout.markers.map((marker) => ({ ...marker, left: offsetLeft(x(marker.beat), marker.pixelOffset) }))
  };
}
function RawlMeasureHeader({
  row,
  layout: positioned,
  height = "100%",
  tonic = 0,
  changes = EMPTY_CHANGES,
  barBeats = 4,
  beatBeats = 1,
  phraseStarts,
  measureMap,
  selectedMeasure = null,
  onMeasureSelect,
  hideInitialTonic = false,
  showHeader = true,
  transpose = 0,
  renderMeasureExtras,
  modulationMarkerPlacement,
  sectionEditing,
  doubleBarlines
}) {
  const element = useRef(null);
  const [width, setWidth] = useState(0);
  const hasPositionedLayout = !!positioned;
  useLayoutEffect(() => {
    var _a;
    if (hasPositionedLayout) return;
    const el = element.current, view = el.ownerDocument.defaultView;
    const fit = () => setWidth(el.getBoundingClientRect().width || el.clientWidth);
    const Observer = (_a = view == null ? void 0 : view.ResizeObserver) != null ? _a : globalThis.ResizeObserver;
    const observer = Observer ? new Observer(fit) : null;
    fit();
    observer == null ? void 0 : observer.observe(el);
    view == null ? void 0 : view.addEventListener("resize", fit);
    return () => {
      observer == null ? void 0 : observer.disconnect();
      view == null ? void 0 : view.removeEventListener("resize", fit);
    };
  }, [hasPositionedLayout]);
  const { measures, beats, markers } = useMemo(() => positioned != null ? positioned : rowLayout({
    row,
    tonic,
    changes,
    barBeats,
    beatBeats,
    phraseStarts,
    measureMap,
    width,
    selectedMeasure,
    hideInitialTonic,
    modulationMarkerPlacement
  }), [positioned, row, tonic, changes, barBeats, beatBeats, phraseStarts, measureMap, width, selectedMeasure, hideInitialTonic, modulationMarkerPlacement]);
  const isDouble = (beat) => doubleBarlines == null ? void 0 : doubleBarlines.some((boundary) => Math.abs(boundary - beat) < 1e-7);
  const terminal = row && isDouble(row.end) && !measures.some((measure) => Math.abs(measure.beat - row.end) < 1e-7) ? [{ beat: row.end, terminal: true, left: "100%" }] : [];
  const select = (event, measure) => {
    event.stopPropagation();
    onMeasureSelect(measure.beat, measure, event.currentTarget);
  };
  const editSection = (event, measure) => {
    if (event.defaultPrevented || event.key !== "Enter" || event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing || event.currentTarget.value.trim()) return;
    event.preventDefault();
    event.stopPropagation();
    const { sectionStarts, onSplit, onGlue } = sectionEditing;
    if (!sectionStarts.some((start) => start < measure.beat)) return;
    const startsSection = sectionStarts.includes(measure.beat);
    if (event.shiftKey) {
      if (startsSection) onGlue(measure);
    } else if (measure.isPhraseStart && !startsSection) {
      onSplit(measure);
    }
  };
  return /* @__PURE__ */ React2.createElement("div", { ref: element, className: "rawln-measure-grid", style: { height } }, [...measures, ...terminal].map((measure) => {
    var _a;
    return /* @__PURE__ */ React2.createElement(
      "div",
      {
        className: "rawln-bar" + (measure.isPhraseStart ? " rawln-phrase-bar" : "") + (isDouble(measure.beat) ? " rawln-double-bar" : ""),
        key: measure.beat,
        "data-beat": measure.beat,
        "data-phrase-boundary": measure.isPhraseStart || void 0,
        "data-terminal": measure.terminal || void 0,
        "data-double-barline": isDouble(measure.beat) || void 0,
        style: { left: (_a = measure.barLeft) != null ? _a : measure.left }
      }
    );
  }), beats.map(({ beat, left }) => /* @__PURE__ */ React2.createElement("div", { className: "rawln-beat-bar", key: beat, "data-beat": beat, style: { left } })), showHeader && /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement("div", { className: "rawln-modulations" }, markers.map((marker) => {
    var _a;
    const interval = marker.delta == null ? null : mod(marker.delta);
    return /* @__PURE__ */ React2.createElement(
      "div",
      {
        key: marker.beat,
        className: "rawln-modulation",
        "data-beat": marker.beat,
        "data-tonic": marker.tonic,
        "data-join": marker.join ? marker.name : void 0,
        "data-onset-override": marker.onsetOverride || void 0,
        "data-origin-beat": marker.originBeat,
        "data-continued": marker.continued || void 0,
        style: { left: marker.left },
        title: marker.name
      },
      /* @__PURE__ */ React2.createElement(
        TonicSymbol,
        {
          left: 0,
          number: marker.number,
          previousTonic: marker.previousTonic,
          modulationDiff: interval,
          tonicStart: marker.tonic,
          transpose,
          alignToOnset: marker.onsetOverride && !marker.continued,
          labelClassName: "rawln-modulation-label",
          flagClassName: "rawln-modulation-flag",
          labelAttributes: { style: { left: marker.labelOffset } },
          flagAttributes: { "data-degree": interval != null ? interval : void 0, style: { background: (_a = RAWL_COLORS[interval]) == null ? void 0 : _a.background } },
          renderArrow: arrow
        }
      )
    );
  })), /* @__PURE__ */ React2.createElement("div", { className: "rawln-measure-labels", "aria-hidden": !onMeasureSelect || void 0 }, measures.filter((measure) => !measure.terminal && measure.showLabel !== false).map((measure) => {
    var _a;
    const labelLeft = offsetLeft(measure.left, (_a = measure.labelOffset) != null ? _a : 6);
    return /* @__PURE__ */ React2.createElement(
      "div",
      {
        className: "rawln-measure-position",
        key: measure.beat,
        style: { gridTemplateColumns: `minmax(0, ${cssLength(labelLeft)}) max-content` }
      },
      /* @__PURE__ */ React2.createElement(
        "div",
        {
          className: "rawln-measure-number",
          role: onMeasureSelect ? "button" : void 0,
          tabIndex: onMeasureSelect ? 0 : void 0,
          "aria-pressed": onMeasureSelect ? selectedMeasure === measure.beat : void 0,
          onClick: onMeasureSelect ? (event) => select(event, measure) : void 0,
          onKeyDown: onMeasureSelect ? (event) => {
            if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              select(event, measure);
            }
          } : void 0,
          "data-beat": measure.beat,
          "data-modulation": measure.hasModulation || void 0,
          "data-score-measure": measure.number,
          style: {
            color: measure.color,
            pointerEvents: onMeasureSelect ? "auto" : void 0,
            cursor: onMeasureSelect ? "pointer" : void 0
          }
        },
        renderMeasureExtras == null ? void 0 : renderMeasureExtras(measure, sectionEditing && selectedMeasure === measure.beat ? (event) => editSection(event, measure) : void 0),
        /* @__PURE__ */ React2.createElement("span", null, measure.number)
      )
    );
  }))));
}

// src/notation/TonalGrid.jsx
import React3 from "react";
function TonalGrid({ regions, range, pitchToY, tonicHeight = 1.5 }) {
  const guides = positionedTonalGuides(regions, range, pitchToY);
  return /* @__PURE__ */ React3.createElement("div", { className: "rawln-grid", "aria-hidden": "true" }, guides.map(({ kind, pitch, y, tonic, left, width }, i) => /* @__PURE__ */ React3.createElement(
    "div",
    {
      key: i,
      className: `rawln-${kind}-line`,
      "data-pitch": pitch,
      "data-tonic": tonic,
      style: { left, width, top: y, height: kind === "tonic" ? tonicHeight : void 0 }
    }
  )));
}

// src/notation/PlaybackMeasureBorders.jsx
import React4 from "react";
function PlaybackMeasureBorders({ left, width, top = true, bottom = true, hidden = false, ref }) {
  return /* @__PURE__ */ React4.createElement("div", { "aria-hidden": "true", className: "rawln-playback-measure", hidden, ref, style: {
    position: "absolute",
    left,
    width,
    top: -1,
    bottom: -1,
    pointerEvents: "none",
    zIndex: 4,
    borderTop: top ? "1px solid #444" : void 0,
    borderBottom: bottom ? "1px solid #444" : void 0
  } });
}

// src/notation/SourceScoreAnnotations.jsx
import React6, { useLayoutEffect as useLayoutEffect2, useRef as useRef3 } from "react";

// src/components/RomanNumeral.jsx
import React5, { useEffect, useMemo as useMemo2, useRef as useRef2 } from "react";

// src/notation/roman-numerals.mjs
var escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var supers = "\u2070\xB9\xB2\xB3\u2074\u2075\u2076\u2077\u2078\u2079";
var subs = "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089";
var roots = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
var romanNumeralColors = RAWL_COLORS.map(({ background }) => {
  var _a;
  return (_a = { white: "#fff", red: "#ff0000" }[background]) != null ? _a : background;
});
var palette = romanNumeralColors;
var atom = "(?:[\u266D\u266F]?[IViv]+[\xB0\xF8]?|It|Fr|Ger|Gr|N)[\u207A\u2070\xB9\xB2\xB3\u2074\u2075\u2076\u2077\u2078\u2079\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089]*(?:\\([\u2070\xB9\xB2\xB3\u2074\u2075\u2076\u2077\u2078\u2079\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089\u2013\u2014\\s-]+\\))?";
var chordPattern = new RegExp("(?<![\\p{L}\\p{N}])(" + atom + "(?:/" + atom + ")*)(?![\\p{L}\\p{N}])", "gu");
var mod2 = (value, n = 12) => (value % n + n) % n;
var numeralIndex = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };
var special = { It: { root: 8, degree: 5, tones: [[5, 8], [0, 0], [3, 6]] }, Fr: { root: 8, degree: 5, tones: [[5, 8], [0, 0], [1, 2], [3, 6]] }, Ger: { root: 8, degree: 5, tones: [[5, 8], [0, 0], [2, 3], [3, 6]] }, Gr: { root: 8, degree: 5, tones: [[5, 8], [0, 0], [2, 3], [3, 6]] }, N: { root: 1, degree: 1, tones: [[1, 1], [3, 5], [5, 8]] } };
function partInfo(part) {
  var _a, _b;
  const m = part.match(/^([♭♯]?)(It|Fr|Ger|Gr|N|[IViv]+)([°ø]?)(.*)$/);
  if (!m || !/^[⁺⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉()–—\s-]*$/u.test(m[4])) return null;
  const named = special[m[2]], degree = (_a = named == null ? void 0 : named.degree) != null ? _a : numeralIndex[m[2].toUpperCase()];
  if (degree === void 0) return null;
  return { accidental: m[1], name: m[2], quality: m[3], tail: m[4], degree, root: (_b = named == null ? void 0 : named.root) != null ? _b : mod2(roots[m[2].toUpperCase()] + (m[1] === "\u266D" ? -1 : m[1] === "\u266F" ? 1 : 0)), named };
}
function chordContext(chord, options = {}) {
  var _a;
  const parts = chord.split("/").map(partInfo);
  if (!parts.every(Boolean)) return null;
  const first = parts[0], target = parts.slice(1).reduce((a, p) => ({ root: mod2(a.root + p.root), degree: mod2(a.degree + p.degree, 7) }), { root: 0, degree: 0 });
  const targetPart = parts[1], localMode = targetPart ? targetPart.quality ? null : targetPart.name === targetPart.name.toLowerCase() ? "minor" : targetPart.named && targetPart.name !== "N" ? null : "major" : options.mode;
  const root = mod2(first.root + target.root), degree = mod2(first.degree + target.degree, 7), figures = first.tail.replace(/[⁺()–—-]/g, "").split("").map((c) => supers.includes(c) ? supers.indexOf(c) : subs.indexOf(c)).filter((n) => n >= 0).join("");
  let tones, bass;
  if (first.named) {
    tones = first.named.tones.map(([d, p]) => ({ degree: mod2(d + target.degree, 7), pitch: mod2(p + target.root) }));
    bass = tones[0];
  } else {
    const minor = first.name === first.name.toLowerCase(), third = first.quality ? 3 : minor ? 3 : 4, fifth = first.quality ? 6 : 7;
    tones = [{ degree, pitch: root }, { degree: mod2(degree + 2, 7), pitch: mod2(root + third) }, { degree: mod2(degree + 4, 7), pitch: mod2(root + fifth) }];
    const seventh2 = [9, 10, 11].includes(options.seventhInterval) ? options.seventhInterval : first.quality === "\xB0" ? 9 : first.quality === "\xF8" || minor || first.name === "V" ? 10 : localMode === "major" && ["I", "IV"].includes(first.name) || localMode === "minor" && ["\u266DIII", "\u266DVI"].includes(first.accidental + first.name) ? 11 : null;
    if (/^(?:7|65|43|42|2)/.test(figures) && seventh2 !== null) tones.push({ degree: mod2(degree + 6, 7), pitch: mod2(root + seventh2) });
    const inversion = /^65/.test(figures) ? 1 : /^43/.test(figures) ? 2 : /^(42|2)/.test(figures) ? 3 : /^64/.test(figures) ? 2 : /^6/.test(figures) ? 1 : 0;
    bass = tones[inversion];
    if (first.tail.startsWith("(") || options.cadentialSixFour === true && /^64/.test(figures) && first.name === "V") {
      bass = tones[0];
      if (first.name === "V") {
        tones.push({ degree: mod2(degree + 3, 7), pitch: mod2(root + 5) });
        if (localMode === "major" || localMode === "minor") tones.push({ degree: mod2(degree + 5, 7), pitch: mod2(root + (localMode === "minor" ? 8 : 9)) });
      }
    }
  }
  if (first.name === "N" && /^6/.test(figures)) bass = tones[1];
  const seventh = (_a = tones.find((t) => t.degree === mod2(degree + 6, 7))) != null ? _a : null;
  const stackedSeventh = /^(65|43|42)$/.test(figures) && !first.named && !first.tail.startsWith("(");
  return { root, degree, tones, bass, first, figures, seventh, stackedSeventh };
}
function figurePitch(number, context) {
  var _a, _b, _c, _d;
  if (!(context == null ? void 0 : context.bass) || number < 1 || number > 9) return null;
  if (context.stackedSeventh) {
    if (number === Number(context.figures[1])) return context.bass.pitch;
    if (number === Number(context.figures[0])) return context.figures === "42" ? (_b = (_a = context.tones.find((t) => t.degree === mod2(context.degree + 2, 7))) == null ? void 0 : _a.pitch) != null ? _b : null : (_d = (_c = context.seventh) == null ? void 0 : _c.pitch) != null ? _d : null;
  }
  if (number === 4 && context.figures.startsWith("64")) return context.first.name === "V" && context.bass.pitch === context.root ? mod2(context.root + 5) : context.bass.pitch;
  if (number === 6 && context.first.tail === "\u2076" && (!context.first.named || context.first.name === "N")) return context.bass.pitch;
  const degree = mod2(context.bass.degree + number - 1, 7), tones = context.tones.filter((t) => t.degree === degree);
  return tones.length === 1 ? tones[0].pitch : null;
}
function qualityPitch(context) {
  var _a, _b, _c, _d, _e;
  if (!context || !context.first.quality) return null;
  const represented = /* @__PURE__ */ new Set([context.root, (_a = context.bass) == null ? void 0 : _a.pitch, (_b = context.seventh) == null ? void 0 : _b.pitch]);
  const remaining = context.tones.filter((t) => !represented.has(t.pitch));
  return (_e = (_d = (_c = remaining.find((t) => t.degree === mod2(context.degree + 4, 7))) != null ? _c : remaining[0]) == null ? void 0 : _d.pitch) != null ? _e : null;
}
var colorStyle = (pitch) => `data-root="${pitch}" style="--chord-color:${palette[pitch]}"`;
var displayPitch = (pitch, options) => pitch === null || pitch === void 0 ? null : mod2(pitch + (options.colorOffset || 0));
function figureDigits(text, context, options) {
  return [...text].map((c) => {
    const n = supers.includes(c) ? supers.indexOf(c) : subs.indexOf(c), pitch = displayPitch(figurePitch(n, context), options);
    return options.colorFigures && pitch !== null ? `<span class="chord-figure colored" data-figure="${n}" ${colorStyle(pitch)}>${n}</span>` : String(n);
  }).join("");
}
function figuresMarkup(top, bottom, context, options, augmented = false) {
  const pitch = augmented ? displayPitch(figurePitch(supers.indexOf(top[0]), context), options) : null;
  const prefix = augmented ? options.colorFigures && pitch !== null ? `<span class="chord-figure colored" data-figure-sign="+" ${colorStyle(pitch)}>+</span>` : '<span class="chord-figure" data-figure-sign="+">+</span>' : "";
  return `<span class="figures${augmented ? " augmented" : ""}"><span>${prefix}${figureDigits(top, context, options)}</span><span${bottom ? "" : ' aria-hidden="true"'}>${figureDigits(bottom, context, options)}</span></span>`;
}
function typography(text, context = null, options = {}) {
  let result = "";
  for (let i = 0; i < text.length; ) {
    const char = text[i];
    if (supers.includes(char)) {
      let top = "", bottom = "";
      while (i < text.length && supers.includes(text[i])) top += text[i++];
      while (i < text.length && subs.includes(text[i])) bottom += text[i++];
      result += context || bottom || options.figuredBass ? figuresMarkup(top, bottom, context, options) : `<sup>${figureDigits(top, context, options)}</sup>`;
    } else if ("\xB0\xF8".includes(char)) {
      const pitch = displayPitch(qualityPitch(context), options), quality = options.colorQuality && pitch !== null ? `<sup class="chord-quality colored" ${colorStyle(pitch)}>${char === "\xB0" ? "o" : char}</sup>` : `<sup class="chord-quality">${char === "\xB0" ? "o" : char}</sup>`;
      result += `<span class="figures quality-figure" data-quality="${char === "\xB0" ? "diminished" : "half-diminished"}"><span>${quality}</span><span aria-hidden="true"></span></span>`;
      i++;
    } else if (char === "\u207A") {
      i++;
      if (supers.includes(text[i]) && (context || options.figuredBass)) {
        let top = "", bottom = "";
        while (i < text.length && supers.includes(text[i])) top += text[i++];
        while (i < text.length && subs.includes(text[i])) bottom += text[i++];
        result += figuresMarkup(top, bottom, context, options, true);
      } else result += "<sup>+</sup>";
    } else {
      result += escape(char);
      i++;
    }
  }
  return result;
}
function beforeChord(text, chord) {
  const opening = text.match(/\($/);
  return opening && /^[♭♯]/.test(chord) ? typography(text.slice(0, opening.index)) + '<span class="chord-opening-parenthesis">(</span>' : typography(text);
}
function markup(text, options = {}) {
  var _a, _b, _c, _d;
  const { colorRoots = false } = options;
  options = { ...options, figuredBass: (_a = options.figuredBass) != null ? _a : true, colorFigures: (_b = options.colorFigures) != null ? _b : colorRoots, colorQuality: (_c = options.colorQuality) != null ? _c : colorRoots };
  const qualityOnly = String(text).match(/^(\()?([m°ø])(⁷)(\))?$/u);
  if (qualityOnly && colorRoots && Number.isInteger(options.rootPitch)) {
    const pitch = mod2(options.rootPitch), quality = qualityOnly[2], seventh = mod2(pitch + (quality === "\xB0" ? 9 : 10));
    const context = { bass: { degree: 0, pitch }, tones: [{ degree: 6, pitch: seventh }], first: { tail: "\u2077" } };
    const label = quality === "m" ? `<span class="chord-root colored" ${colorStyle(pitch)}>m</span>` : `<span class="figures quality-figure" data-quality="${quality === "\xB0" ? "diminished" : "half-diminished"}"><span><sup class="chord-quality colored" ${colorStyle(mod2(pitch + 6))}>${quality === "\xB0" ? "o" : quality}</sup></span><span aria-hidden="true"></span></span>`;
    return (qualityOnly[1] ? "(" : "") + label + typography(qualityOnly[3], context, { ...options, colorOffset: 0 }) + (qualityOnly[4] ? ")" : "");
  }
  const inheritedParts = (_d = options.contextChord) == null ? void 0 : _d.split("/");
  if (inheritedParts) inheritedParts[0] += String(text).replace(/[()\s–—-]/g, "");
  const inherited = inheritedParts ? chordContext(inheritedParts.join("/"), options) : null;
  let result = "", last = 0;
  for (const match of text.matchAll(chordPattern)) {
    result += beforeChord(text.slice(last, match.index), match[0]);
    const parts = match[0].split("/");
    result += (options.hideAppliedTarget ? parts.slice(0, 1) : parts).map((part, index) => {
      const info = partInfo(part), context = chordContext(parts.slice(index).join("/"), options), root = displayPitch(context == null ? void 0 : context.root, options);
      if (!info || root === null || root === void 0) return typography(part);
      const accidental = info.accidental ? `<span class="chord-accidental${info.accidental === "\u266F" ? " sharp" : ""}">${info.accidental}</span>` : "";
      const tonicGlyph = !info.accidental && /^[Ii]$/.test(info.name) ? " data-roman-tonic" : "";
      return `<span class="chord-root${colorRoots ? " colored" : ""}" data-root="${root}"${colorRoots ? ` style="--chord-color:${palette[root]}"` : ""}${tonicGlyph}>${accidental}${info.name}</span>${typography(info.quality + info.tail, context, options)}`;
    }).join("/");
    last = match.index + match[0].length;
  }
  return result + typography(text.slice(last), inherited, options);
}
var jazzNumeral = /^(?<accidentals>[b#♭♯]*)(?<written>VII|III|VI|IV|II|V|I|vii|iii|vi|iv|ii|v|i)(?<tail>.*)$/u;
var guitarChord = /^(?<written>[A-G])(?<accidentals>[b#♭♯]*)(?<tail>.*)$/u;
var noteRoots = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
var majorSeventh = /^(?:maj|M(?=\d)|[△Δ])/;
var jazzFigures = /([b#♭♯]*)(13|11|[1-9])|(?:maj|dim|sus|add|alt|no|omit|aug)|[^]/gu;
var jazzIntervals = { 1: 0, 2: 2, 4: 5, 6: 9, 8: 12, 9: 14, 11: 17, 13: 21 };
var prettyAccidental = (text) => text.replaceAll("b", "\u266D").replaceAll("#", "\u266F");
function jazzMarkup(notation, options, guitar = false) {
  var _a, _b, _c;
  const hasBass = options.bassPitch !== void 0 && options.bassPitch !== null;
  const slash = hasBass ? notation.lastIndexOf("/") : -1;
  const symbol = slash < 0 ? notation : notation.slice(0, slash);
  const match = (guitar ? guitarChord : jazzNumeral).exec(symbol);
  if (!match) return escape(notation);
  const { accidentals, written, tail } = match.groups;
  const alteration = (signs) => [...signs].reduce((pitch, sign) => pitch + ("b\u266D".includes(sign) ? -1 : 1), 0);
  const spelledRoot = guitar ? noteRoots[written] - ((_a = options.tonic) != null ? _a : 0) : roots[written.toUpperCase()];
  const computedRoot = mod2(spelledRoot + alteration(accidentals));
  const root = (_b = options.rootPitch) != null ? _b : computedRoot;
  const halfDim = tail.startsWith("\xF8") || /^m7b5/.test(tail);
  const dim = /^(?:°|o|dim)/.test(tail);
  const explicitMinor = /^(?:m(?!aj)|-)/.test(tail);
  const minor = explicitMinor || written === written.toLowerCase();
  const name = !guitar && (minor || dim || halfDim) ? written.toLowerCase() : written;
  const accidental = [...prettyAccidental(accidentals)].map((sign) => `<span class="chord-accidental${sign === "\u266F" ? " sharp" : ""}">${sign}</span>`).join("");
  const quality = halfDim ? "\xF8" : dim ? "\xB0" : "";
  const suffix = guitar ? tail : tail.replace(/^m7b5/, "7").replace(/^(?:ø|°|o|dim|m(?!aj)|-)/, "").replace(majorSeventh, "\u0394");
  const qualityContext = quality && !guitar ? chordContext(name + quality + "\u2077", { seventhInterval: dim ? 9 : 10 }) : null;
  const qualityMarkup = qualityContext ? typography(quality, qualityContext, {
    colorQuality: (_c = options.colorQuality) != null ? _c : options.colorRoots,
    colorOffset: mod2(root - roots[name.toUpperCase()])
  }) : "";
  const tonicGlyph = !guitar && !accidentals && /^[Ii]$/.test(name);
  const color2 = options.colorRoots ? ` colored" ${colorStyle(mod2(root))}` : tonicGlyph ? `" data-root="${mod2(root)}"` : '"';
  const rootLabel = guitar ? name + prettyAccidental(accidentals) : accidental + name;
  const rootMarkup = `<span class="chord-root${color2}${tonicGlyph ? " data-roman-tonic" : ""}>${rootLabel}</span>`;
  const qualityIntervals = guitar ? { m: 3, "+": 8 } : { "\u0394": 4, "+": 8 };
  const figures = [...suffix.matchAll(jazzFigures)].map(([token, signs, digits], index) => {
    var _a2, _b2, _c2, _d;
    if (!digits) {
      const label2 = escape(prettyAccidental(token));
      if (index !== 0 || !((_a2 = options.colorQuality) != null ? _a2 : options.colorRoots)) return label2;
      const interval2 = qualityIntervals[token];
      return interval2 === void 0 ? label2 : `<span class="chord-quality colored" ${colorStyle(mod2(root + interval2))}>${label2}</span>`;
    }
    const n = Number(digits);
    const interval = n === 7 ? dim ? 9 : majorSeventh.test(suffix) ? 11 : 10 : n === 3 ? minor ? 3 : 4 : n === 5 ? quality ? 6 : /^(?:\+|aug)/.test(suffix) ? 8 : 7 : jazzIntervals[n];
    const label = prettyAccidental(signs) + digits;
    const pitch = (_c2 = (_b2 = options.figurePitches) == null ? void 0 : _b2[label]) != null ? _c2 : interval === void 0 ? null : mod2(root + interval + alteration(signs));
    return ((_d = options.colorFigures) != null ? _d : options.colorRoots) && pitch !== null ? `<span class="chord-figure colored" data-figure="${digits}" ${colorStyle(mod2(pitch))}>${escape(label)}</span>` : escape(label);
  }).join("");
  const bass = slash < 0 ? "" : `<span class="chord-slash">/</span><span class="chord-bass${options.colorRoots ? " colored" : ""}" ${colorStyle(mod2(options.bassPitch))}>${escape(prettyAccidental(notation.slice(slash + 1)))}</span>`;
  const suffixMarkup = guitar || !figures ? figures : `<sup class="roman-jazz-figures">${figures}</sup>`;
  return `${rootMarkup}${qualityMarkup}${suffixMarkup}${bass}`;
}
function romanNumeralContent(notation, options = {}) {
  const settings = { colorRoots: true, ...options };
  return settings.jazz ? jazzMarkup(String(notation), settings) : markup(String(notation), settings);
}
function romanNumeralHTML(notation, options = {}) {
  return `<span class="rawln-roman" data-roman-theme="${options.theme === "light" ? "light" : "dark"}"${options.font === "sans-serif" ? ' data-roman-font="sans-serif"' : ""}>${romanNumeralContent(notation, options)}</span>`;
}
var romanNumeralMatches = (notation) => String(notation).matchAll(chordPattern);
var firstRomanChord = (notation) => {
  var _a;
  return (_a = romanNumeralMatches(notation).next().value) == null ? void 0 : _a[0];
};

// src/notation/roman-numeral-tooltip.mjs
var degreeNames = ["1", "\u266D2", "2", "\u266D3", "3", "4", "\u266F4", "5", "\u266D6", "6", "\u266D7", "7"];
var triadNames = ["\u0442\u0440\u0435\u0437\u0432\u0443\u0447\u0438\u0435", "\u0441\u0435\u043A\u0441\u0442\u0430\u043A\u043A\u043E\u0440\u0434", "\u043A\u0432\u0430\u0440\u0442\u0441\u0435\u043A\u0441\u0442\u0430\u043A\u043A\u043E\u0440\u0434"];
var seventhNames = ["\u0441\u0435\u043F\u0442\u0430\u043A\u043A\u043E\u0440\u0434", "\u043A\u0432\u0438\u043D\u0442\u0441\u0435\u043A\u0441\u0442\u0430\u043A\u043A\u043E\u0440\u0434", "\u0442\u0435\u0440\u0446\u043A\u0432\u0430\u0440\u0442\u0430\u043A\u043A\u043E\u0440\u0434", "\u0441\u0435\u043A\u0443\u043D\u0434\u0430\u043A\u043A\u043E\u0440\u0434"];
var inversionNames = ["\u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0432\u0438\u0434", "\u043F\u0435\u0440\u0432\u043E\u0435 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435", "\u0432\u0442\u043E\u0440\u043E\u0435 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435", "\u0442\u0440\u0435\u0442\u044C\u0435 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435"];
var englishInversions = ["root position", "first inversion", "second inversion", "third inversion"];
var escape2 = (text) => String(text).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[c]);
function stack(pitches) {
  const ordered = [];
  for (let pitch of pitches) {
    while (ordered.length && pitch <= ordered.at(-1)) pitch += 12;
    ordered.push(pitch);
  }
  return ordered;
}
function explicitModel(tooltip) {
  const { pitches, rootPitches, rootNotation, inversion } = tooltip;
  const validPitch = (pitch) => Number.isInteger(pitch) && Math.abs(pitch) <= 127;
  if (!(pitches == null ? void 0 : pitches.length) || !pitches.every(validPitch)) return null;
  const root = (rootPitches == null ? void 0 : rootPitches.length) && rootPitches.every(validPitch) ? [...new Set(rootPitches)].sort((a, b) => a - b) : void 0;
  return {
    pitches: [...new Set(pitches)].sort((a, b) => a - b),
    rootPitches: root,
    rootNotation,
    inversion,
    seventh: (root != null ? root : pitches).length === 4
  };
}
function romanNumeralTooltipModel(notation, options = {}, tooltip = true) {
  var _a, _b, _c;
  if (tooltip !== true) {
    return tooltip ? explicitModel(tooltip) : null;
  }
  if (options.jazz) return null;
  const bare = String(notation).replace(/(?:…|\.{3})$/u, "").replace(/[[\]]/g, "");
  const token = (_a = firstRomanChord(bare)) != null ? _a : options.contextChord ? options.contextChord.replace(/^[^/]+/, (root2) => root2 + bare.replace(/[()\s–—-]/g, "")) : null;
  const context = token && chordContext(token, options);
  if (!(context == null ? void 0 : context.bass)) return null;
  let tones = context.tones.map((note) => note.pitch), bass = context.bass.pitch;
  const { first, root, figures } = context;
  const cadentialSixFour = first.name === "V" && bass === root && figures.startsWith("64") && (first.tail.startsWith("(") || options.cadentialSixFour);
  if (cadentialSixFour) {
    const third = (_b = context.tones.find((note) => note.degree === (context.degree + 5) % 7)) == null ? void 0 : _b.pitch;
    tones = [colorIndex(root + 5), third != null ? third : colorIndex(root + (options.mode === "minor" ? 8 : 9)), root];
  } else if (first.quality === "\xF8" && tones.length === 3) {
    tones.push(colorIndex(root + 10));
  }
  const offset = (_c = options.colorOffset) != null ? _c : 0;
  tones = [...new Set(tones.map((pitch) => colorIndex(pitch + offset)))];
  bass = colorIndex(bass + offset);
  const inversion = tones.indexOf(bass);
  if (inversion < 0) return null;
  const special2 = !!first.named && first.name !== "N";
  const seventh = tones.length === 4;
  const applied = token.includes("/") ? token.slice(token.indexOf("/") + 1) : "";
  const rootNotation = cadentialSixFour ? applied || (options.mode === "minor" ? "i" : "I") : first.accidental + first.name + first.quality + (seventh ? "\u2077" : "") + (applied ? "/" + applied : "");
  return {
    pitches: stack([...tones.slice(inversion), ...tones.slice(0, inversion)]),
    rootPitches: stack(tones),
    rootNotation,
    inversion,
    seventh,
    special: special2,
    cadentialSixFour,
    token
  };
}
var explanations = {
  roman: "\u0420\u0438\u043C\u0441\u043A\u0430\u044F \u0446\u0438\u0444\u0440\u0430 \u2014 \u0441\u0442\u0443\u043F\u0435\u043D\u044C \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0433\u043E \u0442\u043E\u043D\u0430 \u0430\u043A\u043A\u043E\u0440\u0434\u0430.",
  case: "\u041F\u0440\u043E\u043F\u0438\u0441\u043D\u0430\u044F \u0446\u0438\u0444\u0440\u0430 \u2014 \u043C\u0430\u0436\u043E\u0440\u043D\u043E\u0435 \u0442\u0440\u0435\u0437\u0432\u0443\u0447\u0438\u0435; \u0441\u0442\u0440\u043E\u0447\u043D\u0430\u044F \u2014 \u043C\u0438\u043D\u043E\u0440\u043D\u043E\u0435.",
  flat: "\u266D \u043F\u0435\u0440\u0435\u0434 \u0446\u0438\u0444\u0440\u043E\u0439 \u043F\u043E\u043D\u0438\u0436\u0430\u0435\u0442 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0442\u043E\u043D \u043D\u0430 \u043F\u043E\u043B\u0443\u0442\u043E\u043D \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043C\u0430\u0436\u043E\u0440\u043D\u043E\u0439 \u0433\u0430\u043C\u043C\u044B \u0442\u043E\u043D\u0438\u043A\u0438.",
  sharp: "\u266F \u043F\u0435\u0440\u0435\u0434 \u0446\u0438\u0444\u0440\u043E\u0439 \u043F\u043E\u0432\u044B\u0448\u0430\u0435\u0442 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0442\u043E\u043D \u043D\u0430 \u043F\u043E\u043B\u0443\u0442\u043E\u043D \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043C\u0430\u0436\u043E\u0440\u043D\u043E\u0439 \u0433\u0430\u043C\u043C\u044B \u0442\u043E\u043D\u0438\u043A\u0438.",
  diminishedTriad: "o \u2014 \u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u043D\u043E\u0435 \u0442\u0440\u0435\u0437\u0432\u0443\u0447\u0438\u0435.",
  diminishedSeventh: "o7 \u2014 \u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u043D\u044B\u0439 \u0441\u0435\u043F\u0442\u0430\u043A\u043A\u043E\u0440\u0434.",
  halfDiminished: "\xF87 \u2014 \u043F\u043E\u043B\u0443\u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u043D\u044B\u0439 \u0441\u0435\u043F\u0442\u0430\u043A\u043A\u043E\u0440\u0434.",
  minor: "\u043C\u0438\u043D\u043E\u0440\u043D\u044B\u0439 \u0441\u0435\u043F\u0442\u0430\u043A\u043A\u043E\u0440\u0434",
  neapolitan: "\u043D\u0435\u0430\u043F\u043E\u043B\u0438\u0442\u0430\u043D\u0441\u043A\u0438\u0439 \u0430\u043A\u043A\u043E\u0440\u0434",
  applied: "/ \u2014 \u0430\u043A\u043A\u043E\u0440\u0434 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0441\u0442\u0443\u043F\u0435\u043D\u0438 \u0441\u043F\u0440\u0430\u0432\u0430 \u043A\u0430\u043A \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u0442\u043E\u043D\u0438\u043A\u0438.",
  figureParentheses: "\u0421\u043A\u043E\u0431\u043A\u0438 \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u044F\u044E\u0442 \u0444\u0438\u0433\u0443\u0440\u044B, \u043E\u0442\u043D\u043E\u0441\u044F\u0449\u0438\u0435\u0441\u044F \u043A \u043E\u0434\u043D\u043E\u0439 \u0433\u0430\u0440\u043C\u043E\u043D\u0438\u0438.",
  augmentedSixth: "+6 \u2014 \u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u043D\u0430\u044F \u0441\u0435\u043A\u0441\u0442\u0430; It, Fr, Ger \u2014 \u0438\u0442\u0430\u043B\u044C\u044F\u043D\u0441\u043A\u0438\u0439, \u0444\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u0438\u0439 \u0438 \u043D\u0435\u043C\u0435\u0446\u043A\u0438\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u0430\u043A\u043A\u043E\u0440\u0434\u0430.",
  cadentialSixFour: "\u041A\u0430\u0434\u0430\u043D\u0441\u043E\u0432\u044B\u0439 6/4 \u2014 \u0437\u0430\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u044F \u043D\u0430\u0434 \u0434\u043E\u043C\u0438\u043D\u0430\u043D\u0442\u043E\u0432\u044B\u043C \u0431\u0430\u0441\u043E\u043C \u0441 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435\u043C \u0432 5/3."
};
var figureIntervals = {
  6: "6 \u2014 \u0441\u0435\u043A\u0441\u0442\u0430",
  64: "6/4 \u2014 \u0441\u0435\u043A\u0441\u0442\u0430 \u0438 \u043A\u0432\u0430\u0440\u0442\u0430",
  7: "7 \u2014 \u0441\u0435\u043F\u0442\u0438\u043C\u0430",
  65: "6/5 \u2014 \u0441\u0435\u043A\u0441\u0442\u0430 \u0438 \u043A\u0432\u0438\u043D\u0442\u0430",
  43: "4/3 \u2014 \u043A\u0432\u0430\u0440\u0442\u0430 \u0438 \u0442\u0435\u0440\u0446\u0438\u044F",
  42: "4/2 \u2014 \u043A\u0432\u0430\u0440\u0442\u0430 \u0438 \u0441\u0435\u043A\u0443\u043D\u0434\u0430",
  2: "2 \u2014 \u0441\u0435\u043A\u0443\u043D\u0434\u0430",
  53: "5/3 \u2014 \u043A\u0432\u0438\u043D\u0442\u0430 \u0438 \u0442\u0435\u0440\u0446\u0438\u044F"
};
var harmonicParentheses = "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u0440\u0443\u0433\u043B\u044B\u0435 \u0441\u043A\u043E\u0431\u043A\u0438 \u0434\u043B\u044F \u043E\u0431\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0433\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u043F\u043E\u0434\u0447\u0438\u043D\u0435\u043D\u0438\u044F, \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E \u0432\u043D\u0443\u0442\u0440\u0438 \u043E\u0440\u0433\u0430\u043D\u043D\u044B\u0445 \u043F\u0443\u043D\u043A\u0442\u043E\u0432 \u0438 \u0441\u0435\u043A\u0432\u0435\u043D\u0446\u0438\u0439.";
function romanNumeralSymbolNotes(model) {
  var _a, _b, _c, _d, _e, _f, _g;
  const token = (_d = (_c = (_b = firstRomanChord((_a = model.label) != null ? _a : "")) != null ? _b : model.token) != null ? _c : model.label) != null ? _d : "", context = chordContext(token, { mode: model.mode }), notes = [];
  const add = (symbol, key, contextChord = token) => {
    if (!notes.some((n) => n.key === key && n.symbol === symbol)) notes.push({ symbol, key, contextChord });
  };
  const parts = token.split("/");
  for (const [partIndex, part] of parts.entries()) {
    const contextChord = parts.slice(partIndex).join("/"), addPart = (symbol, key) => add(symbol, key, contextChord);
    const info = (_e = chordContext(part, { mode: model.mode })) == null ? void 0 : _e.first;
    if (info) {
      if (info.named) {
        addPart(
          info.name + (info.name === "N" ? "" : " +6"),
          info.name === "N" ? "neapolitan" : "augmentedSixth"
        );
      } else {
        const symbol = info.name + " = " + (info.degree + 1);
        addPart(symbol, "roman");
        if (!info.quality) addPart(symbol, "case");
      }
      if (info.accidental) addPart(info.accidental, info.accidental === "\u266D" ? "flat" : "sharp");
      if (info.quality)
        addPart(
          info.quality === "\xB0" ? "o" : "\xF8",
          info.quality === "\xF8" ? "halfDiminished" : (partIndex === 0 ? model.seventh : /[⁷₅₃₂]/u.test(info.tail)) ? "diminishedSeventh" : "diminishedTriad"
        );
    }
  }
  if (!context && /[m°ø]/u.test(token))
    add(
      token.includes("m") ? "m" : token.includes("\xF8") ? "\xF8" : "o",
      token.includes("m") ? "minor" : token.includes("\xF8") ? "halfDiminished" : "diminishedSeventh"
    );
  if ((context == null ? void 0 : context.figures) && (!context.first.named || context.first.name === "N"))
    add(context.figures, model.cadentialSixFour ? "cadentialSixFour" : "figures" + context.figures);
  else if (/[⁷]/u.test(token)) add("7", "figures7");
  if (parts.length > 1) add("/", "applied");
  if (context == null ? void 0 : context.first.tail.includes("(")) add("( )", "figureParentheses");
  if (/^\(/u.test((_f = model.label) != null ? _f : token) || /\)$/u.test((_g = model.label) != null ? _g : token) && !(context == null ? void 0 : context.first.tail.includes("(")))
    add("( )", "harmonicParentheses");
  return notes;
}
function explanationSymbol(note, model) {
  var _a, _b, _c;
  const context = chordContext(note.contextChord, {
    mode: model.mode,
    seventhInterval: model.seventhInterval,
    cadentialSixFour: !!model.cadentialSixFour
  });
  const colored = (text, pitch, kind = "root") => {
    var _a2;
    if (!Number.isFinite(pitch)) return escape2(text);
    pitch = colorIndex(pitch + ((_a2 = model.colorOffset) != null ? _a2 : 0));
    return `<span class="chord-${kind} colored" data-root="${pitch}" style="--chord-color:${romanNumeralColors[pitch]}">${escape2(text)}</span>`;
  };
  const symbol = note.symbol === "6453" ? "6/4\u20135/3" : note.symbol === "Gr +6" ? "Gr / Ger +6" : note.symbol.replace(/^(65|64|43|42|53)$/u, (m) => m[0] + "/" + m[1]);
  const pitchForFigure = (n) => {
    var _a2, _b2;
    return (_b2 = figurePitch(n, context)) != null ? _b2 : !context && n === 7 && Number.isInteger(model.rootPitch) ? model.rootPitch - ((_a2 = model.colorOffset) != null ? _a2 : 0) + (note.contextChord.includes("\xB0") ? 9 : 10) : null;
  };
  if (note.key === "roman" || note.key === "case") {
    const [roman, degree] = symbol.split(" = ");
    return colored(roman, context == null ? void 0 : context.root) + " = " + colored(degree, context == null ? void 0 : context.root);
  }
  if (note.key === "flat" || note.key === "sharp" || note.key === "neapolitan")
    return colored(symbol, context == null ? void 0 : context.root);
  if (note.key.startsWith("figures") || note.key === "cadentialSixFour")
    return [...symbol].map((c) => /\d/.test(c) ? colored(c, pitchForFigure(Number(c)), "figure") : escape2(c)).join("");
  if (note.key === "augmentedSixth")
    return colored(symbol.replace(/ \+6$/u, ""), context == null ? void 0 : context.root) + " " + colored("+6", figurePitch(6, context), "figure");
  if (["diminishedTriad", "diminishedSeventh", "halfDiminished"].includes(note.key))
    return colored(
      symbol,
      (_b = qualityPitch(context)) != null ? _b : !context && Number.isInteger(model.rootPitch) ? model.rootPitch - ((_a = model.colorOffset) != null ? _a : 0) + 6 : null,
      "quality"
    );
  if (note.key === "minor")
    return colored(
      symbol,
      Number.isInteger(model.rootPitch) ? model.rootPitch - ((_c = model.colorOffset) != null ? _c : 0) : context == null ? void 0 : context.root
    );
  return escape2(symbol);
}
function romanNumeralExplanations(model) {
  const rootModel = model.inversion && !model.special && model.rootPitches ? {
    ...model,
    pitches: model.rootPitches,
    inversion: 0,
    label: model.rootLabel,
    token: model.rootLabel,
    originalLabel: model.rootLabel,
    cadentialSixFour: false
  } : null;
  const notes = [
    ...rootModel ? romanNumeralSymbolNotes(rootModel).map((note) => ({ note, owner: rootModel })) : [],
    ...romanNumeralSymbolNotes(model).map((note) => ({ note, owner: model }))
  ], byText = /* @__PURE__ */ new Map(), rows = /* @__PURE__ */ new Map();
  for (const { note, owner } of notes) {
    let text = note.key === "harmonicParentheses" ? harmonicParentheses : explanations[note.key];
    if (note.key.startsWith("figures")) {
      const intervals = figureIntervals[note.key.slice(7)];
      if (intervals) text = "\u0426\u0438\u0444\u0440\u044B \u0441\u043F\u0440\u0430\u0432\u0430 \u043E\u0431\u043E\u0437\u043D\u0430\u0447\u0430\u044E\u0442 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u044B \u043D\u0430\u0434 \u0431\u0430\u0441\u043E\u043C: " + intervals + ".";
    }
    if (!text) continue;
    if (!byText.has(text)) byText.set(text, { key: note.key, symbols: /* @__PURE__ */ new Set() });
    byText.get(text).symbols.add(explanationSymbol(note, owner));
  }
  for (const [text, item] of byText) {
    const symbol = [...item.symbols].join(", ");
    if (!rows.has(symbol)) rows.set(symbol, []);
    rows.get(symbol).push(`<span data-symbol="${escape2(item.key)}">${escape2(text)}</span>`);
  }
  return rows.size ? `<dl class="rawln-rn-explanations">${[...rows].map(([symbol, texts]) => `<div><dt>${symbol}</dt><dd>${texts.join(" ")}</dd></div>`).join("")}</dl>` : "";
}
function pitchGeometry(columns) {
  const height = 12, step = 6, pitches = columns.flatMap((column) => column.pitches);
  const low = Math.min(...pitches), high = Math.max(...pitches);
  const absoluteTop = (pitch) => -pitch * step;
  const start = absoluteTop(high), end = absoluteTop(low) + height, guides = [];
  const firstOctave = Math.floor(low / 12) - 1, lastOctave = Math.ceil(high / 12) + 1;
  for (let octave2 = lastOctave; octave2 >= firstOctave; octave2--) {
    for (const degree of [7, 0]) {
      const pitch = octave2 * 12 + degree, y = absoluteTop(pitch) + height;
      guides.push({ pitch, degree, y });
    }
  }
  const before = guides.filter((guide) => guide.y + 1 < start).at(-1);
  const after = guides.find((guide) => guide.y > end);
  const visible = [before, ...guides.filter((guide) => guide.y + 1 >= start && guide.y <= end), after].filter(Boolean);
  const top = Math.min(start, ...visible.map((guide) => guide.y)) - 4;
  const bottom = Math.max(end, ...visible.map((guide) => guide.y + 1)) + 4;
  return {
    height,
    gridHeight: bottom - top,
    y: (pitch) => absoluteTop(pitch) - top,
    guides: visible.map((guide) => ({ ...guide, y: guide.y - top }))
  };
}
function caption(column, options) {
  if (column.cadentialSixFour) return ["6/4"];
  if (column.special) return [options.jazz || options.english ? "augmented sixth" : "\u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u043D\u0430\u044F \u0441\u0435\u043A\u0441\u0442\u0430"];
  const inversion = column.inversion;
  if (options.jazz) {
    const third = column.pitches.length === 3 && !/(?:sus|add|omit|no)/i.test(column.notation);
    const seventh = column.pitches.length === 4 && /7/.test(column.notation);
    return [
      third ? "triad" : seventh ? "seventh chord" : "",
      typeof inversion === "number" ? englishInversions[inversion] : ""
    ];
  }
  if (options.english) {
    const kinds = column.seventh ? ["seventh chord", "six-five chord", "four-three chord", "four-two chord"] : ["triad", "sixth chord", "six-four chord"];
    return [kinds[inversion != null ? inversion : 0], englishInversions[inversion != null ? inversion : 0]];
  }
  return [column.seventh ? seventhNames[inversion != null ? inversion : 0] : triadNames[inversion != null ? inversion : 0], inversionNames[inversion != null ? inversion : 0]];
}
function romanNumeralDiagramColumns(columns, options = {}) {
  const geometry = pitchGeometry(columns);
  const guides = geometry.guides.map(({ pitch, degree, y }) => `<span class="rawln-rn-tooltip-guide" data-degree="${degree}" data-pitch="${pitch}" style="top:${y}px;height:1px"></span>`).join("");
  const diagram = columns.map((column) => {
    var _a, _b;
    const notation = (_b = (_a = column.label) != null ? _a : column.notation) != null ? _b : "";
    const { mode, seventhInterval, cadentialSixFour, colorOffset, rootPitch } = column;
    const context = { mode, seventhInterval, cadentialSixFour, colorOffset, rootPitch };
    const supplied = Object.fromEntries(Object.entries(context).filter(([, value]) => value !== void 0));
    const label = romanNumeralHTML(notation, {
      ...options,
      ...supplied,
      theme: "dark",
      colorRoots: true,
      ...column.labelOptions
    });
    const notes = column.pitches.map((pitch) => {
      const degree = colorIndex(pitch);
      return `<span class="rawln-rn-tooltip-note" data-degree="${degree}" data-pitch="${pitch}" style="top:${geometry.y(pitch)}px;background:${RAWL_COLORS[degree].background}">${degreeNames[degree]}</span>`;
    }).join("");
    const intervals = column.pitches.slice(1).map((pitch, index) => {
      const previous = column.pitches[index], y = (geometry.y(pitch) + geometry.y(previous) + geometry.height) / 2;
      return `<span class="rawln-rn-tooltip-interval" data-semitones="${pitch - previous}" style="top:${y}px">+${pitch - previous}</span>`;
    }).join("");
    const [kind, inversion] = options.sequence ? [] : caption({ ...column, notation }, options);
    const kindHTML = kind ? `<div class="rawln-rn-tooltip-kind">${kind}</div>` : "";
    const inversionHTML = inversion ? `<div class="rawln-rn-tooltip-inversion">${inversion}</div>` : "";
    return `<section class="rawln-rn-tooltip-column" data-chord="${escape2(notation)}"><div class="rawln-rn-tooltip-label">${label}</div><div class="rawln-rn-tooltip-grid" style="height:${geometry.gridHeight}px">${guides}${notes}${intervals}</div>${kindHTML}${inversionHTML}</section>`;
  }).join(options.sequence ? '<span class="cadence-sequence-arrow" aria-hidden="true">\u2192</span>' : "");
  return `<div class="rawln-rn-tooltip-columns${options.sequence ? " cadence-sequence" : ""}">${diagram}</div>`;
}
function romanNumeralTooltipHTML(notation, options, model) {
  const columns = [
    ...model.inversion && !model.special && model.rootPitches && model.rootNotation ? [{ ...model, pitches: model.rootPitches, notation: model.rootNotation, inversion: 0, cadentialSixFour: false, labelOptions: { bassPitch: null } }] : [],
    { ...model, notation }
  ];
  const copy = !options.jazz && model.token ? romanNumeralExplanations({
    ...options,
    ...model,
    label: notation,
    rootLabel: model.rootNotation
  }) : "";
  return romanNumeralDiagramColumns(columns, options) + copy;
}

// src/notation/bind-roman-numeral-tooltip.mjs
var active = /* @__PURE__ */ new WeakMap();
var nextId = 0;
function bindRomanNumeralTooltip(anchor, render) {
  const document2 = anchor.ownerDocument;
  const window2 = document2.defaultView;
  let tooltip = null, timer = 0;
  const clear = () => window2.clearTimeout(timer);
  const relatedInside = (element, related) => related instanceof window2.Node && (element == null ? void 0 : element.contains(related));
  const outside = (event) => {
    if (!relatedInside(anchor, event.target) && !relatedInside(tooltip, event.target)) hide();
  };
  const scroll = (event) => {
    if (!relatedInside(tooltip, event.target)) hide();
  };
  const escape3 = (event) => {
    if (event.key === "Escape") hide();
  };
  const events = [
    ["scroll", scroll, true],
    ["resize", hide],
    ["blur", hide],
    ["pointerdown", outside, true],
    ["keydown", escape3]
  ];
  function hide() {
    var _a;
    clear();
    if (!tooltip) return;
    const revision = ((_a = anchor.getAttribute("aria-describedby")) != null ? _a : "").split(/\s+/).filter((id) => id && id !== tooltip.id);
    if (revision.length) anchor.setAttribute("aria-describedby", revision.join(" "));
    else anchor.removeAttribute("aria-describedby");
    tooltip.remove();
    tooltip = null;
    for (const [type, listener, capture] of events) window2.removeEventListener(type, listener, capture);
    if (active.get(document2) === hide) active.delete(document2);
  }
  function show() {
    var _a;
    clear();
    if (tooltip) return;
    (_a = active.get(document2)) == null ? void 0 : _a();
    active.set(document2, hide);
    tooltip = document2.createElement("div");
    tooltip.className = "rawln-rn-tooltip";
    tooltip.id = "rawln-rn-tooltip-" + ++nextId;
    tooltip.setAttribute("role", "tooltip");
    tooltip.innerHTML = render();
    tooltip.addEventListener("pointerenter", clear);
    tooltip.addEventListener("pointerleave", (event) => {
      if (!relatedInside(anchor, event.relatedTarget)) hide();
    });
    document2.body.append(tooltip);
    const uses = anchor.getAttribute("aria-describedby");
    anchor.setAttribute("aria-describedby", uses ? uses + " " + tooltip.id : tooltip.id);
    for (const [type, listener, capture] of events) window2.addEventListener(type, listener, capture);
    const box = anchor.getBoundingClientRect(), bounds = tooltip.getBoundingClientRect();
    const left = Math.min(window2.innerWidth - bounds.width - 8, box.left + (box.width - bounds.width) / 2);
    const top = box.top >= bounds.height + 9 ? box.top - bounds.height - 9 : Math.min(window2.innerHeight - bounds.height - 8, box.bottom + 9);
    tooltip.style.left = Math.max(8, left) + "px";
    tooltip.style.top = Math.max(8, top) + "px";
  }
  const leave = (event) => {
    if (event.pointerType === "touch" || relatedInside(anchor, event.relatedTarget) || relatedInside(tooltip, event.relatedTarget)) return;
    clear();
    timer = window2.setTimeout(hide, 140);
  };
  const stop = (event) => event.stopPropagation();
  const click = (event) => {
    stop(event);
    show();
  };
  const key = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      stop(event);
      show();
    }
  };
  const triggers = [
    ["pointerover", show],
    ["pointerout", leave],
    ["focusin", show],
    ["focusout", leave],
    ["pointerdown", stop],
    ["click", click],
    ["keydown", key]
  ];
  for (const [type, listener] of triggers) anchor.addEventListener(type, listener);
  return () => {
    hide();
    for (const [type, listener] of triggers) anchor.removeEventListener(type, listener);
  };
}

// src/components/RomanNumeral.jsx
function RomanNumeral({ notation, options, tooltip = false }) {
  const ref = useRef2(null);
  const model = useMemo2(() => romanNumeralTooltipModel(notation, options, tooltip), [notation, options, tooltip]);
  useEffect(() => {
    if (!model) return;
    return bindRomanNumeralTooltip(ref.current, () => romanNumeralTooltipHTML(notation, options != null ? options : {}, model));
  }, [notation, options, model]);
  return /* @__PURE__ */ React5.createElement(
    "span",
    {
      ref,
      className: "rawln-roman",
      "data-roman-theme": (options == null ? void 0 : options.theme) === "light" ? "light" : "dark",
      "data-roman-font": (options == null ? void 0 : options.font) === "sans-serif" ? "sans-serif" : void 0,
      "data-rn-tooltip": model ? "" : void 0,
      tabIndex: model ? 0 : void 0,
      dangerouslySetInnerHTML: { __html: romanNumeralContent(notation, options) }
    }
  );
}

// src/notation/harmony-arrows.mjs
var arrowStyle = Object.freeze({ headLength: 8.5, headHalfWidth: 2.3 });
function arrowCurve(from, to, direction = 1) {
  const span = Math.abs(to[0] - from[0]), sign = Math.sign(to[0] - from[0]) || 1;
  const run = Math.min(span * 0.32, 17), depth = direction * Math.min(12, Math.max(5, span * 0.17));
  return [...from, from[0] + sign * run, from[1] + depth, to[0] - sign * run, to[1] + depth, ...to];
}
function arrowGeometry(coords, routed = false) {
  const mix = (a2, b2, t) => a2.map((v, i) => v + (b2[i] - v) * t), segments = [];
  if (!routed) segments.push(Array.from({ length: 4 }, (_, i) => coords.slice(i * 2, i * 2 + 2)));
  else {
    const points = coords, addLine = (a2, b2) => segments.push([a2, mix(a2, b2, 1 / 3), mix(a2, b2, 2 / 3), b2]);
    let current = points[0];
    for (let i = 1; i < points.length - 1; i++) {
      const a2 = points[i - 1], b2 = points[i], c2 = points[i + 1], incoming = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]), outgoing = Math.hypot(c2[0] - b2[0], c2[1] - b2[1]), radius = Math.min(1.5, incoming / 3, outgoing / 3);
      if (!radius) continue;
      const enter = mix(b2, a2, radius / incoming), leave = mix(b2, c2, radius / outgoing);
      addLine(current, enter);
      segments.push([enter, mix(enter, b2, 2 / 3), mix(leave, b2, 2 / 3), leave]);
      current = leave;
    }
    addLine(current, points.at(-1));
  }
  const point = (c2, t) => {
    const u = 1 - t;
    return [0, 1].map((i) => u * u * u * c2[0][i] + 3 * u * u * t * c2[1][i] + 3 * u * t * t * c2[2][i] + t * t * t * c2[3][i]);
  };
  const tangent = (c2, t) => {
    const u = 1 - t;
    return [0, 1].map((i) => 3 * u * u * (c2[1][i] - c2[0][i]) + 6 * u * t * (c2[2][i] - c2[1][i]) + 3 * t * t * (c2[3][i] - c2[2][i]));
  };
  const table = [];
  let length = 0, previous = segments[0][0];
  segments.forEach((c2, index) => {
    for (let step = 0; step <= 64; step++) {
      const t = step / 64, p = point(c2, t);
      length += Math.hypot(p[0] - previous[0], p[1] - previous[1]);
      table.push({ length, index, t });
      previous = p;
    }
  });
  const at = (distance) => {
    const end2 = table.findIndex((p) => p.length >= distance), b2 = table[end2 < 0 ? table.length - 1 : end2], a2 = table[Math.max(0, end2 - 1)];
    const t = a2.index === b2.index && b2.length > a2.length ? a2.t + (b2.t - a2.t) * (distance - a2.length) / (b2.length - a2.length) : b2.t;
    return { index: b2.index, t, point: point(segments[b2.index], t), tangent: tangent(segments[b2.index], t) };
  };
  const headLength = Math.min(arrowStyle.headLength, length * 0.55), halfWidth = Math.min(arrowStyle.headHalfWidth, headLength * 0.32), left = [], right = [];
  for (let step = 0; step <= 24; step++) {
    const fraction = step / 24, p = at(length - headLength + fraction * headLength), size = Math.hypot(...p.tangent) || 1, w = halfWidth * (1 - fraction), nx = -p.tangent[1] / size, ny = p.tangent[0] / size;
    left.push([p.point[0] + nx * w, p.point[1] + ny * w]);
    right.push([p.point[0] - nx * w, p.point[1] - ny * w]);
  }
  const end = at(length - headLength * 0.45), c = segments[end.index], a = mix(c[0], c[1], end.t), b = mix(c[1], c[2], end.t), d = mix(c[2], c[3], end.t), e = mix(a, b, end.t), f = mix(b, d, end.t);
  const shaft = [...segments.slice(0, end.index), [c[0], a, e, mix(e, f, end.t)]], command = (c2) => ` C${c2.slice(1).flat().join(" ")}`, headPoints = [...left, ...right.reverse().slice(1)];
  return { shaftPath: `M${shaft[0][0].join(" ")}${shaft.map(command).join("")}`, headPath: `M${headPoints.map((p) => p.join(" ")).join(" L")} Z`, headPoints, tip: segments.at(-1)[3], tangent: tangent(segments.at(-1), 1), shaftEnd: end.point, headLength };
}

// src/notation/harmony-annotations.mjs
var ROW_HEIGHT = 22;
var ROW_PAD = 2;
var SVG = "http://www.w3.org/2000/svg";
function placeLabels(labels, start, end, width) {
  const rowEnds = [];
  for (const point of labels) {
    const ink = point.label.offsetWidth;
    const anchor = (point.beat - start) / (end - start) * width;
    const left = Math.max(0, Math.min(width - ink, anchor - ink * 0.12));
    let row = rowEnds.findIndex((right2) => right2 + 4 <= left);
    if (row < 0) row = rowEnds.length;
    const right = left + ink;
    const top = ROW_PAD + row * ROW_HEIGHT;
    Object.assign(point, { left, right, top, bottom: top + point.label.offsetHeight, row });
    rowEnds[row] = right;
    point.label.style.left = left + "px";
    point.label.dataset.annotationRow = row;
  }
  return ROW_PAD + rowEnds.length * ROW_HEIGHT;
}
function curveIsClear(curve, geometry, obstacles, width) {
  const clear = ([x, y]) => x >= 1 && x <= width - 1 && !obstacles.some((box) => x > box.left - 1 && x < box.right + 1 && y > box.top - 1 && y < box.bottom + 1);
  if (!geometry.headPoints.every(clear)) return false;
  for (let step = 0; step <= 40; step++) {
    const t = step / 40, u = 1 - t;
    const point = [0, 1].map((i) => u ** 3 * curve[i] + 3 * u ** 2 * t * curve[i + 2] + 3 * u * t ** 2 * curve[i + 4] + t ** 3 * curve[i + 6]);
    if (!clear(point)) return false;
  }
  return true;
}
function tonicizationArrow(from, to, obstacles, width, bandHeight, above) {
  const direction = above ? -1 : 1;
  const forward = from.left <= to.left;
  const gap = forward ? to.left - from.right : from.left - to.right;
  const edge = (box) => above ? box.top : box.bottom;
  if (from.row === to.row && gap >= 17) {
    const x1 = forward ? from.right + 3 : from.left - 3;
    const x2 = forward ? to.left - 3 : to.right + 3;
    const curve = arrowCurve([x1, edge(from) - 2 * direction], [x2, edge(to) - 2 * direction], direction);
    const geometry = arrowGeometry(curve);
    if (curveIsClear(curve, geometry, obstacles, width)) return { curve, geometry };
  }
  const ends = (box) => [(box.left + box.right) / 2, box.left - 3, box.right + 3].filter((x) => x > 1 && x < width - 1);
  for (const depth of [12, 24, 40]) {
    const bow = above ? -depth : bandHeight + depth;
    for (const x1 of ends(from)) for (const x2 of ends(to)) {
      const y1 = edge(from) + 3 * direction, y2 = edge(to) + 3 * direction;
      if (Math.abs(x1 - x2) < 3) continue;
      const run = Math.sign(x2 - x1) * Math.min(10, Math.abs(x2 - x1) / 3);
      const curve = [x1, y1, x1 + run, bow, x2 - run, bow, x2, y2];
      const geometry = arrowGeometry(curve);
      if (curveIsClear(curve, geometry, obstacles, width)) return { curve, geometry };
    }
  }
  return null;
}
function createLane(score, position, points, arrows, start, end) {
  const document2 = score.ownerDocument;
  const lane = document2.createElement("div");
  lane.className = "rawln-harmony-lane";
  lane.dataset.position = position;
  const overlay = document2.createElementNS(SVG, "svg");
  overlay.classList.add("rawln-harmony-arrows");
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("focusable", "false");
  lane.append(overlay);
  const labels = points.map((point) => {
    const label = document2.createElement("span");
    label.className = "rawln-harmony-label";
    label.setAttribute("role", "math");
    label.dataset.beat = point.beat;
    if (point.original !== void 0) label.title = point.original;
    if (point.id !== void 0) label.dataset.annotationId = point.id;
    label.setAttribute("aria-label", point.notation);
    label.innerHTML = romanNumeralHTML(point.notation, point.options);
    lane.append(label);
    return { ...point, label };
  });
  const ids = new Map(labels.filter((point) => point.id !== void 0).map((point) => [point.id, point]));
  const links = arrows.map((arrow2) => ({ from: ids.get(arrow2.from), to: ids.get(arrow2.to) })).filter(({ from, to }) => from && to && from !== to);
  if (position === "above") score.before(lane);
  else score.after(lane);
  function fit(width) {
    if (!width) return;
    lane.style.width = width + "px";
    const bandHeight = placeLabels(labels, start, end, width);
    const above = position === "above";
    let minY = 0, maxY = bandHeight;
    overlay.replaceChildren();
    for (const { from, to } of links) {
      const arrow2 = tonicizationArrow(from, to, labels, width, bandHeight, above);
      if (!arrow2) continue;
      const { curve, geometry } = arrow2;
      const ys = [...curve.filter((_, i) => i % 2), ...geometry.headPoints.map((point) => point[1])];
      minY = Math.min(minY, Math.floor(Math.min(...ys) - 2));
      maxY = Math.max(maxY, Math.ceil(Math.max(...ys) + 2));
      const link = document2.createElementNS(SVG, "g");
      link.dataset.from = from.id;
      link.dataset.to = to.id;
      const shaft = document2.createElementNS(SVG, "path");
      shaft.classList.add("rawln-harmony-arrow-shaft");
      shaft.setAttribute("d", geometry.shaftPath);
      const head = document2.createElementNS(SVG, "path");
      head.setAttribute("d", geometry.headPath);
      link.append(shaft, head);
      overlay.append(link);
    }
    for (const point of labels) point.label.style.top = point.top - minY + "px";
    lane.style.height = maxY - minY + "px";
    overlay.setAttribute("viewBox", `0 ${minY} ${width} ${maxY - minY}`);
  }
  return { lane, fit };
}
function mountHarmonyAnnotations(score, {
  start,
  end,
  annotations = [],
  arrows = [],
  endInclusive = false
}) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new RangeError("Harmony annotations require a finite, increasing beat range");
  }
  const visible = annotations.filter(({ beat }) => beat >= start && (endInclusive ? beat <= end : beat < end)).sort((a, b) => a.beat - b.beat);
  const lanes = [];
  for (const side of ["above", "below"]) {
    const points = visible.filter((point) => {
      var _a;
      return ((_a = point.position) != null ? _a : "below") === side;
    });
    if (points.length) lanes.push(createLane(score, side, points, arrows, start, end));
  }
  if (!lanes.length) return () => {
  };
  const fit = () => lanes.forEach((lane) => lane.fit(score.clientWidth));
  const view = score.ownerDocument.defaultView;
  const observer = (view == null ? void 0 : view.ResizeObserver) ? new view.ResizeObserver(fit) : null;
  if (observer) observer.observe(score);
  else view == null ? void 0 : view.addEventListener("resize", fit);
  fit();
  return () => {
    observer == null ? void 0 : observer.disconnect();
    view == null ? void 0 : view.removeEventListener("resize", fit);
    lanes.forEach(({ lane }) => lane.remove());
  };
}

// src/notation/SourceScoreAnnotations.jsx
var within = (beat, row) => beat >= row.start && beat < row.end;
var percentage = (beat, row) => (beat - row.start) / (row.end - row.start) * 100 + "%";
function SourceHarmony({ row, harmony }) {
  const anchor = useRef3(null);
  useLayoutEffect2(() => mountHarmonyAnnotations(anchor.current.parentElement, {
    start: row.start,
    end: row.end,
    annotations: harmony.map((point) => ({ position: "above", ...point }))
  }), [row.start, row.end, harmony]);
  return /* @__PURE__ */ React6.createElement("span", { ref: anchor, hidden: true });
}
function SourceNoteAnnotations({ row, axis, visible, annotations }) {
  var _a, _b, _c, _d;
  const crosses = (_b = (_a = annotations.unpitched) == null ? void 0 : _a.filter((mark) => within(mark.beat, row))) != null ? _b : [];
  const circles = (_d = (_c = annotations.spans) == null ? void 0 : _c.flatMap(({ start, end, kind }) => {
    if (kind !== "circle" || start >= row.end || end <= row.start) return [];
    const notes = visible.filter((note) => note.start >= start && note.start < end);
    if (!notes.length) return [];
    const positions = notes.map((note) => axis.pitchToY(note.pitch));
    return [{
      start: Math.max(row.start, start),
      end: Math.min(row.end, end),
      top: Math.min(...positions) - 5,
      bottom: Math.max(...positions) + axis.glyphHeight + 5
    }];
  })) != null ? _d : [];
  return /* @__PURE__ */ React6.createElement(React6.Fragment, null, crosses.map(
    ({ beat, pitch, label }, index) => /* @__PURE__ */ React6.createElement(
      "span",
      {
        key: index,
        className: "rawln-source-cross",
        "aria-label": label,
        title: label,
        "data-beat": beat,
        style: { left: percentage(beat, row), top: axis.pitchToY(pitch != null ? pitch : axis.high) }
      },
      "\xD7"
    )
  ), circles.map(
    ({ start, end, top, bottom }, index) => /* @__PURE__ */ React6.createElement(
      "span",
      {
        key: index,
        className: "rawln-source-circle",
        "aria-hidden": "true",
        "data-start": start,
        "data-end": end,
        style: {
          left: percentage(start, row),
          width: percentage(row.start + end - start, row),
          top,
          height: bottom - top
        }
      }
    )
  ));
}
function SourceBrackets({ row, spans }) {
  const brackets = spans.filter(({ kind, start, end }) => kind === "bracket" && start < row.end && end > row.start).sort((first, second) => first.start - second.start);
  if (!brackets.length) return null;
  const lanes = [];
  return /* @__PURE__ */ React6.createElement("div", { className: "rawln-source-brackets", "aria-hidden": "true" }, brackets.map(({ start, end }, index) => {
    let lane = lanes.findIndex((boundary) => boundary <= start);
    if (lane === -1) lane = lanes.length;
    lanes[lane] = end;
    const left = Math.max(row.start, start);
    const right = Math.min(row.end, end);
    return /* @__PURE__ */ React6.createElement(
      "span",
      {
        key: index,
        className: "rawln-source-bracket",
        "data-start": start,
        "data-end": end,
        style: {
          gridRowStart: lane + 1,
          marginLeft: percentage(left, row),
          width: percentage(row.start + right - left, row)
        }
      }
    );
  }));
}
function SourceComments({ comments, onSeek }) {
  return /* @__PURE__ */ React6.createElement("ul", { className: "rawln-source-comments" }, comments.map(
    ({ beat, measure, text, fragments }, index) => /* @__PURE__ */ React6.createElement("li", { key: index }, /* @__PURE__ */ React6.createElement(
      "button",
      {
        type: "button",
        className: "rawln-source-comment",
        "data-beat": beat,
        onClick: () => onSeek(beat)
      },
      /* @__PURE__ */ React6.createElement("b", null, measure),
      /* @__PURE__ */ React6.createElement("span", null, fragments ? fragments.map(
        (fragment, index2) => fragment.notation ? /* @__PURE__ */ React6.createElement(RomanNumeral, { key: index2, notation: fragment.notation, options: fragment.options }) : /* @__PURE__ */ React6.createElement(React6.Fragment, { key: index2 }, fragment.text)
      ) : text)
    ))
  ));
}

// src/notation/RawlNotation.jsx
import { NoteLayer, NotePlaybackContext, PlaybackSectionContext, createSectionPlaybackClock } from "librawl/native";

// src/notation/recolor.jsx
import { useEffect as useEffect2, useState as useState2 } from "react";
var ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
function recolorModulation(changes, beat, pitch) {
  if (!Number.isFinite(beat) || beat < 0 || !Number.isFinite(pitch)) return changes;
  const tonic = (Math.round(pitch) % 12 + 12) % 12, existing = changes.find((change) => Math.abs(change.beat - beat) < 1e-7), choice = { ...existing != null ? existing : { beat }, tonic, root: ROOTS[tonic] };
  const events = [...changes.filter((change) => Math.abs(change.beat - beat) >= 1e-7).map((change) => ({ ...change })), choice].sort((a, b) => a.beat - b.beat), result = [];
  for (const event of events) if (!result.length || result.at(-1).tonic !== event.tonic) result.push(event);
  return result;
}
var clearedSelection = { selectedMeasure: null, selectedElement: null, boundary: null, preview: null };
var initial = (source) => ({ source, committed: source, ...clearedSelection });
function useTonicRecoloring({ changes, barBeats = 4, measureMap, onChange }) {
  var _a;
  const [stored, setStored] = useState2(() => initial(changes)), state = stored.source === changes ? stored : initial(changes);
  const cancel = () => setStored((previous) => ({ ...previous, ...clearedSelection }));
  useEffect2(() => {
    var _a2;
    if (state.selectedMeasure === null) return;
    const { selectedElement } = state, ownerDocument = (_a2 = selectedElement == null ? void 0 : selectedElement.ownerDocument) != null ? _a2 : document;
    const escape3 = (event) => {
      if (event.key !== "Escape") return;
      cancel();
      if (selectedElement && ownerDocument.activeElement === selectedElement) selectedElement.blur();
    };
    ownerDocument.addEventListener("keydown", escape3);
    return () => ownerDocument.removeEventListener("keydown", escape3);
  }, [state.selectedMeasure, state.selectedElement]);
  return {
    changes: (_a = state.preview) != null ? _a : state.committed,
    selectedMeasure: state.selectedMeasure,
    selectMeasure(beat, measure, element) {
      setStored((previous) => {
        var _a2, _b;
        const current = previous.source === changes ? previous : initial(changes);
        if (current.selectedMeasure === beat) return { ...current, ...clearedSelection };
        const boundary = (_b = (_a2 = measure == null ? void 0 : measure.recolorBeat) != null ? _a2 : measure == null ? void 0 : measure.modulationBeat) != null ? _b : recolorBoundary(current.committed, beat, barBeats, measureMap);
        return { ...current, selectedMeasure: beat, selectedElement: element != null ? element : null, boundary, preview: null };
      });
    },
    hoverNote(note) {
      if (state.boundary === null) return;
      setStored((previous) => ({ ...previous, preview: note ? recolorModulation(state.committed, state.boundary, note.pitch) : null }));
    },
    chooseNote(note) {
      if (state.boundary === null) return false;
      const committed = recolorModulation(state.committed, state.boundary, note.pitch);
      setStored({ ...state, committed, ...clearedSelection });
      onChange == null ? void 0 : onChange(committed);
      return true;
    },
    cancel
  };
}

// src/notation/RawlNotation.jsx
var EMPTY_CHANGES2 = [];
var atRowStart = (beat, start) => Math.abs(beat - start) < 1e-7;
var noteName = (p) => TONIC_NAMES[mod(p)] + (Math.floor(p / 12) - 1);
function PlaybackMeasureLayer({ row, clock, measureMap, barBeats = 4 }) {
  const border = useRef4(null), { start, end } = row;
  useLayoutEffect3(() => {
    var _a;
    const element = border.current, span = end - start;
    if (!(span > 0)) return;
    const active2 = /* @__PURE__ */ new Set(), unregister = [];
    const first = Math.max(0, Math.floor(start / barBeats)) * barBeats;
    const measures = measureMap != null ? measureMap : Number.isFinite(barBeats) && barBeats > 0 ? Array.from({ length: Math.ceil((end - first) / barBeats) }, (_, index) => ({
      start: first + index * barBeats,
      duration: barBeats,
      sourceNumber: first / barBeats + index + 1
    })) : [];
    const rowSection = [start, end];
    element.hidden = true;
    delete element.dataset.measure;
    for (const measure of measures) {
      const from = Math.max(start, measure.start), to = Math.min(end, measure.start + measure.duration);
      if (to <= from) continue;
      const beginsRow = atRowStart(from, start);
      const left = beginsRow ? "0px" : `calc(${(from - start) / span * 100}% - 1px)`;
      const widthPercent = `${(to - from) / span * 100}%`;
      const width = beginsRow ? widthPercent : `calc(${widthPercent} + 1px)`;
      const times = (_a = measure.playbackSpans) != null ? _a : [[measure.start, measure.start + measure.duration]];
      for (const [timeStart, timeEnd] of times) {
        const scale = (timeEnd - timeStart) / measure.duration;
        const entry = { left, width, number: measure.sourceNumber };
        unregister.push(clock.register(
          timeStart + (from - measure.start) * scale,
          timeStart + (to - measure.start) * scale,
          (playing) => {
            if (playing) active2.add(entry);
            else if (!active2.delete(entry)) return;
            const current = Array.from(active2).at(-1);
            element.hidden = !current;
            if (!current) {
              delete element.dataset.measure;
              return;
            }
            element.dataset.measure = current.number;
            element.style.left = current.left;
            element.style.width = current.width;
          },
          measure.playbackSpans === void 0 ? rowSection : null
        ));
      }
    }
    return () => unregister.forEach((remove) => remove());
  }, [start, end, clock, measureMap, barBeats]);
  return /* @__PURE__ */ React7.createElement(PlaybackMeasureBorders, { ref: border, hidden: true });
}
function notePlaybackSpan(note, row, independentPlayback) {
  var _a;
  if (!independentPlayback) return [note.start, note.start + note.duration];
  const [start, end] = (_a = note.playbackSpan) != null ? _a : [note.start, note.start + note.duration];
  const scale = (end - start) / note.duration;
  return [start + Math.max(0, row.start - note.start) * scale, end - Math.max(0, note.start + note.duration - row.end) * scale];
}
function BeatNoteLayer({ visible, row, axis, tonic, changes, mutedVoices, hoveredKey, setHoveredKey, hoveredRef, onNote, onNoteAudition, auditionEnabled, onNoteHover, clock, sourceNoteMarks }) {
  const host = useRef4(null), [pixelWidth, setPixelWidth] = useState3(100), span = row.end - row.start, section = useMemo3(() => [row.start, row.end], [row.start, row.end]);
  const independentPlayback = visible.some((note) => note.playbackSpan !== void 0), playbackSection = independentPlayback ? null : section;
  useLayoutEffect3(() => {
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
  const sourceById = useMemo3(() => new Map(visible.map((note) => [String(note.id), note])), [visible]);
  const nativeNotes = useMemo3(() => visible.map((note) => {
    var _a, _b;
    const degree = mod(note.pitch - tonicAt(tonic, changes, note.start + note.duration / 2)), muted = mutedVoices.includes(note.voice);
    return { id: String(note.id), note: { midiNumber: note.pitch }, span: notePlaybackSpan(note, row, independentPlayback), displaySpan: [Math.max(row.start, note.start), Math.min(row.end, note.start + note.duration)], voiceIndex: (_a = note.voice) != null ? _a : 0, displayVoiceIndex: (_b = note.voice) != null ? _b : 0, isDrum: false, isActive: !muted, color: `noteColor_${degree}_colors`, colorPitchClass: degree, noteUnderCursor: hoveredKey === `${note.id}:${row.start}`, velocity: note.velocity, ...note.pitchBend ? { pitchBend: note.pitchBend } : {}, ...note.sourceLocation ? { sourceLocation: note.sourceLocation } : {} };
  }), [visible, row.start, row.end, independentPlayback, tonic, changes, mutedVoices, hoveredKey]);
  useLayoutEffect3(() => {
    const nativeById = new Map(nativeNotes.map((note) => [note.id, note]));
    const unregister = [...host.current.querySelectorAll("[data-note]")].map((element) => {
      const note = nativeById.get(element.dataset.note);
      return clock.register(...note.span, (active2) => element.classList.toggle("rawln-sounding", active2 && note.isActive), playbackSection);
    });
    return () => unregister.forEach((remove) => remove());
  }, [clock, nativeNotes, playbackSection]);
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
  return /* @__PURE__ */ React7.createElement("div", { ref: host, style: { display: "contents" } }, /* @__PURE__ */ React7.createElement(PlaybackSectionContext.Provider, { value: playbackSection }, /* @__PURE__ */ React7.createElement(NoteLayer, { notes: nativeNotes, midiNumberToY: (pitch) => axis.pitchToY(pitch) + axis.glyphHeight / 2, noteHeight: axis.glyphHeight / 2, secondsToX: (beat) => (beat - row.start) / span * pixelWidth, handleNoteClick: (note) => onNote == null ? void 0 : onNote(sourceById.get(note.id)), handleMouseEnter: hover, handleMouseLeave: leave, onNoteAudition: onNoteAudition ? (note) => onNoteAudition(sourceById.get(note.id)) : void 0, auditionEnabled, getNoteAttributes: (note) => {
    var _a;
    const original = sourceById.get(note.id), start = note.displaySpan[0], end = note.displaySpan[1], degree = note.colorPitchClass, muted = mutedVoices.includes(original.voice), mark = sourceNoteMarks.get(note.id);
    return { role: "button", tabIndex: -1, "aria-label": noteName(original.pitch), "data-note": original.id, "data-pitch": original.pitch, "data-degree": degree, "data-voice": original.voice, "data-note-star": (mark == null ? void 0 : mark.star) || void 0, "data-note-arrow": (mark == null ? void 0 : mark.arrow) || void 0, className: `rawln-note rawln-voice-${original.voice}${muted ? " rawln-muted" : ""}`, style: { left: (start - row.start) / span * 100 + "%", width: (end - start) / span * 100 + "%", ...!((_a = note.pitchBend) == null ? void 0 : _a.length) && RAWL_COLORS[degree] ? { background: RAWL_COLORS[degree].background } : {}, zIndex: 100 + (84 - original.pitch) + (original.voice === 1 ? 128 : 0) } };
  } })));
}
function RawlNotation({ notes, beats, rows, tonic = 0, changes = EMPTY_CHANGES2, barBeats = 4, beatBeats = 1, phraseStarts, measureMap, hideInitialTonic = false, modulationMarkerPlacement, showTonalGuides = true, noteScale = 1, position, playbackClock, mutedVoices = [], onSeek, onNote, onNoteAudition, onNoteHover, onMeasureSelect, selectedMeasure = null, onChangesChange, recolorable = true, sectionEditing, renderMeasureExtras, renderHeader, renderUnderlay, renderFooter, sourceAnnotations, className = "", style, ref }) {
  var _a;
  const root = useRef4(null), hoveredRef = useRef4(null), [hoveredKey, setHoveredKey] = useState3(null), ownClock = useMemo3(createSectionPlaybackClock, []), clock = playbackClock != null ? playbackClock : ownClock;
  const audition = onNoteAudition != null ? onNoteAudition : onNote;
  const seek = onSeek != null ? onSeek : ((beat) => (playbackClock == null ? void 0 : playbackClock.seek) ? playbackClock.seek(beat) : clock.advance(beat));
  const editor = useTonicRecoloring({ changes, barBeats, measureMap, onChange: onChangesChange }), automatic = recolorable && !onMeasureSelect;
  if (automatic) {
    changes = editor.changes;
    selectedMeasure = editor.selectedMeasure;
    onMeasureSelect = editor.selectMeasure;
    const originalHover = onNoteHover;
    onNoteHover = (note) => {
      editor.hoverNote(note);
      originalHover == null ? void 0 : originalHover(note);
    };
  }
  const spans = (rows == null ? void 0 : rows.length) ? rows : [{ start: 0, end: beats, label: 1 }];
  const sourceNoteMarks = useMemo3(() => {
    var _a2;
    return new Map((_a2 = sourceAnnotations == null ? void 0 : sourceAnnotations.noteMarks) == null ? void 0 : _a2.map((mark) => [String(mark.noteId), mark]));
  }, [sourceAnnotations == null ? void 0 : sourceAnnotations.noteMarks]);
  const prepared = useMemo3(() => spans.map((row) => {
    var _a2, _b;
    const visible = notes.filter((n) => n.start < row.end - 1e-6 && n.start + n.duration > row.start + 1e-6);
    const unpitched = (_b = (_a2 = sourceAnnotations == null ? void 0 : sourceAnnotations.unpitched) == null ? void 0 : _a2.filter((mark) => mark.beat >= row.start && mark.beat < row.end && Number.isFinite(mark.pitch))) != null ? _b : [];
    const range = pitchRange([...visible, ...unpitched]);
    const hasNoteMarks = visible.some((note) => sourceNoteMarks.has(String(note.id)));
    const axis = staveGeometry(range, { noteScale, above: hasNoteMarks ? 18 : 0 });
    return { row, visible, range, axis, regions: showTonalGuides ? tonalSegments(tonic, changes, row.start, row.end) : [] };
  }), [notes, rows, beats, tonic, changes, noteScale, showTonalGuides, sourceNoteMarks, sourceAnnotations == null ? void 0 : sourceAnnotations.unpitched]);
  const setPosition = (beat) => Number.isFinite(beat) ? clock.advance(beat) : clock.reset();
  useImperativeHandle(ref, () => ({ setPosition, element: root.current }), [clock]);
  useLayoutEffect3(() => {
    if (position !== void 0 || !playbackClock) setPosition(position);
  }, [position, clock, playbackClock]);
  useLayoutEffect3(() => () => ownClock.reset(), [ownClock]);
  return /* @__PURE__ */ React7.createElement(NotePlaybackContext.Provider, { value: clock.register }, /* @__PURE__ */ React7.createElement("div", { className: "rawln" + (className ? " " + className : ""), style, ref: root }, prepared.map(({ row, visible, range, axis, regions }) => {
    var _a2, _b;
    const span = row.end - row.start, x = (beat) => (beat - row.start) / span * 100;
    return /* @__PURE__ */ React7.createElement("div", { className: "rawln-row", "data-section": row.section, key: `${row.start}-${row.end}`, "data-start": row.start, "data-end": row.end, style: row.style }, renderHeader && /* @__PURE__ */ React7.createElement("div", { className: "rawln-header" }, renderHeader(row)), /* @__PURE__ */ React7.createElement("div", { className: "rawln-score", "data-seekable": selectedMeasure === null || void 0, role: "group", "aria-label": "Rawl notation", style: { height: axis.notesBottom }, onClick: (e) => {
      if (selectedMeasure !== null) return;
      const box = e.currentTarget.getBoundingClientRect();
      if (box.width > 0) seek(row.start + Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * span);
    } }, ((_a2 = sourceAnnotations == null ? void 0 : sourceAnnotations.harmony) == null ? void 0 : _a2.length) > 0 && /* @__PURE__ */ React7.createElement(SourceHarmony, { row, harmony: sourceAnnotations.harmony }), /* @__PURE__ */ React7.createElement(PlaybackMeasureLayer, { row, clock, measureMap, barBeats }), /* @__PURE__ */ React7.createElement(
      TonalGrid,
      {
        range,
        pitchToY: (pitch) => axis.pitchToY(pitch) + axis.pitchStep,
        regions: regions.map((region) => ({ ...region, left: x(region.start) + "%", width: (region.end - region.start) / span * 100 + "%" }))
      }
    ), renderUnderlay == null ? void 0 : renderUnderlay(row, axis), sourceAnnotations && /* @__PURE__ */ React7.createElement(SourceNoteAnnotations, { row, axis, visible, annotations: sourceAnnotations }), /* @__PURE__ */ React7.createElement(RawlMeasureHeader, { row, height: axis.notesBottom, tonic, changes, barBeats, beatBeats, phraseStarts, doubleBarlines: sourceAnnotations == null ? void 0 : sourceAnnotations.doubleBarlines, measureMap, selectedMeasure, onMeasureSelect, hideInitialTonic, modulationMarkerPlacement, sectionEditing, renderMeasureExtras }), /* @__PURE__ */ React7.createElement(BeatNoteLayer, { visible, row, axis, tonic, changes, mutedVoices, hoveredKey, setHoveredKey, hoveredRef, onNote: (note) => {
      if (automatic && editor.chooseNote(note)) return;
      if (onNote) onNote(note);
      else if (selectedMeasure === null) seek(Math.max(row.start, note.start));
    }, onNoteAudition: audition, auditionEnabled: selectedMeasure == null, onNoteHover, clock, sourceNoteMarks })), ((_b = sourceAnnotations == null ? void 0 : sourceAnnotations.spans) == null ? void 0 : _b.length) > 0 && /* @__PURE__ */ React7.createElement(SourceBrackets, { row, spans: sourceAnnotations.spans }), renderFooter && /* @__PURE__ */ React7.createElement("div", { className: "rawln-footer" }, renderFooter(row, { changes, selectedMeasure })));
  }), ((_a = sourceAnnotations == null ? void 0 : sourceAnnotations.comments) == null ? void 0 : _a.length) > 0 && /* @__PURE__ */ React7.createElement(SourceComments, { comments: sourceAnnotations.comments, onSeek: seek })));
}

// src/components/MediaScore.jsx
import React9, { useCallback as useCallback2, useLayoutEffect as useLayoutEffect5, useMemo as useMemo5, useRef as useRef6, useState as useState4 } from "react";
import { useNotePlaybackClock } from "librawl/native";

// src/audio/playback-keys.js
var targets = /* @__PURE__ */ new WeakMap();
var textControls = 'input, textarea, [contenteditable]:not([contenteditable="false"]), [role~="textbox"]';
var readerControls = [
  textControls,
  "select",
  "button",
  "summary",
  "dialog[open]",
  ...[
    "button",
    "checkbox",
    "combobox",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "slider",
    "switch",
    "tab"
  ].map((role) => `[role~="${role}"]`),
  "audio[controls]",
  "video[controls]"
].join(",");
function bindPlaybackKeys({
  target = globalThis.document,
  pause,
  toggle,
  enabled = () => true,
  allowInInputs = false,
  preventScrollWhenIdle = false
}) {
  let registry = targets.get(target);
  if (!registry) {
    const bindings = /* @__PURE__ */ new Set();
    const active2 = /* @__PURE__ */ new Set();
    let consumed = false;
    const keydown = (event) => {
      var _a, _b, _c, _d, _e, _f, _g;
      if (event.code !== "Space" && event.key !== " " && event.key !== "Spacebar") return;
      if (!event.repeat) consumed = false;
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      let app;
      let idleBlocker = false;
      for (const binding of bindings) {
        if ((binding.toggle || binding.preventScrollWhenIdle) && binding.enabled()) {
          if (binding.toggle) app = binding;
          if (binding.preventScrollWhenIdle) idleBlocker = true;
        }
      }
      let player2 = app;
      if (!player2) {
        for (const binding of active2) if (binding.enabled()) player2 = binding;
      }
      if (!player2 && !idleBlocker && !consumed) return;
      const element = (_b = (_a = event.composedPath) == null ? void 0 : _a.call(event)[0]) != null ? _b : event.target;
      if (app ? !app.allowInInputs && ((_c = element == null ? void 0 : element.closest) == null ? void 0 : _c.call(element, textControls)) : ((_d = element == null ? void 0 : element.closest) == null ? void 0 : _d.call(element, readerControls)) || ((_e = target.querySelector) == null ? void 0 : _e.call(target, "dialog[open]"))) return;
      event.preventDefault();
      if (app) event.stopPropagation();
      consumed = true;
      if (!event.repeat) (_g = (_f = player2 == null ? void 0 : player2.toggle) != null ? _f : player2 == null ? void 0 : player2.pause) == null ? void 0 : _g();
    };
    registry = { bindings, active: active2, keydown };
    target.addEventListener("keydown", keydown, true);
    targets.set(target, registry);
  }
  const player = { pause, toggle, enabled, allowInInputs, preventScrollWhenIdle };
  registry.bindings.add(player);
  return {
    setActive(active2) {
      if (!registry.bindings.has(player)) return;
      registry.active.delete(player);
      if (active2) registry.active.add(player);
    },
    destroy() {
      if (!registry.bindings.delete(player)) return;
      registry.active.delete(player);
      if (!registry.bindings.size) {
        target.removeEventListener("keydown", registry.keydown, true);
        targets.delete(target);
      }
    }
  };
}

// src/components/PlaybackFooter.jsx
import React8, { memo, useCallback, useEffect as useEffect3, useLayoutEffect as useLayoutEffect4, useMemo as useMemo4, useRef as useRef5 } from "react";

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

// src/components/playback-position.js
function observePlaybackPosition(readPosition, paintPosition) {
  let frame;
  function tick() {
    paintPosition(readPosition());
    frame = requestAnimationFrame(tick);
  }
  tick();
  return () => cancelAnimationFrame(frame);
}

// src/components/PlaybackFooter.jsx
var EMPTY_TIMELINE = {};
var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function formatTime(value) {
  const seconds = Math.floor(Math.max(0, value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function timelineGeometry(timeline, duration) {
  var _a, _b, _c;
  const percent = (time) => time / duration * 100;
  const marks = (times, inclusive = false) => (times != null ? times : []).filter(
    (time) => Number.isFinite(time) && time >= 0 && (inclusive ? time <= duration : time < duration)
  ).map(percent);
  const bass = ((_a = timeline.bassBars) != null ? _a : []).flatMap(({ start, end, color: color2 }) => {
    const left = percent(Math.max(0, start));
    const right = percent(Math.min(duration, end));
    return Number.isFinite(left) && Number.isFinite(right) && right > left ? [{ left, right, color: color2 }] : [];
  });
  const colored = ((_b = timeline.coloredMarks) != null ? _b : []).filter(
    ({ time }) => Number.isFinite(time) && time >= 0 && time <= duration
  ).map(({ time, color: color2 }) => ({ left: percent(time), color: color2 }));
  return {
    sections: marks([...(_c = timeline.sections) != null ? _c : [], duration], true),
    phrases: marks(timeline.phrases),
    bass,
    colored
  };
}
var TimelineMarks = memo(function TimelineMarks2({ geometry }) {
  if (!geometry) return null;
  const { sections, phrases, bass, colored } = geometry;
  return /* @__PURE__ */ React8.createElement("div", { className: "rawlp-marks", "aria-hidden": "true" }, sections.map((left, index) => /* @__PURE__ */ React8.createElement("i", { className: "rawlp-section-mark", key: index, style: { left: `${left}%` } })), phrases.map((left, index) => /* @__PURE__ */ React8.createElement("i", { className: "rawlp-phrase-mark", key: index, style: { left: `${left}%` } })), bass.map(({ left, right, color: color2 }, index) => /* @__PURE__ */ React8.createElement("i", { className: "rawlp-bass-bar", key: index, style: { left: `${left}%`, width: `${right - left}%`, background: color2 } })), colored.map(({ left, color: color2 }, index) => /* @__PURE__ */ React8.createElement("i", { className: "rawlp-colored-mark", key: index, style: { left: `${left}%`, background: color2 } })));
});
function PlaybackFooter({
  position,
  duration,
  playing,
  getPosition,
  onTogglePlay,
  onSeek,
  rate,
  onRateChange,
  volume,
  onVolumeChange,
  volumeMax = 1,
  timeline = EMPTY_TIMELINE,
  keyboardShortcuts = true,
  allowSpaceInInputs = false,
  disabled = false,
  beforeTimeline,
  children,
  onStop,
  stopDisabled = false,
  inline = false,
  labels
}) {
  var _a, _b, _c, _d, _e;
  const length = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const hasTempo = Number.isFinite(rate) && !!onRateChange;
  const hasVolume = Number.isFinite(volume) && !!onVolumeChange;
  const seekRef = useRef5(null);
  const elapsedRef = useRef5(null);
  const activePointer = useRef5(null);
  const elapsed = clamp(Number.isFinite(position) ? position : 0, 0, length);
  const geometry = useMemo4(() => length ? timelineGeometry(timeline, length) : null, [timeline, length]);
  const paintPosition = useCallback((next) => {
    const input = seekRef.current;
    const label = elapsedRef.current;
    const seconds = clamp(Number.isFinite(next) ? next : 0, 0, length);
    if (input.valueAsNumber !== seconds) input.value = String(seconds);
    const time = formatTime(seconds);
    if (label.textContent !== time) label.textContent = time;
    if (input.getAttribute("aria-valuetext") !== time) input.setAttribute("aria-valuetext", time);
  }, [length]);
  useLayoutEffect4(() => {
    if (activePointer.current !== null) paintPosition(seekRef.current.valueAsNumber);
    if (playing && getPosition && length && !disabled) {
      return observePlaybackPosition(getPosition, (next) => {
        if (activePointer.current === null) paintPosition(next);
      });
    }
    if (activePointer.current === null) paintPosition(elapsed);
  }, [playing, getPosition, length, disabled, elapsed, paintPosition]);
  function beginScrub(event) {
    var _a2, _b2;
    if (activePointer.current !== null || event.button !== 0) return;
    activePointer.current = event.pointerId;
    (_b2 = (_a2 = event.currentTarget).setPointerCapture) == null ? void 0 : _b2.call(_a2, event.pointerId);
  }
  function finishScrub(event, commit) {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    if (commit && !disabled && length) onSeek(Number(event.currentTarget.value));
    else paintPosition(playing && getPosition ? getPosition() : elapsed);
  }
  useEffect3(() => {
    if (!keyboardShortcuts || disabled) return;
    const keys = bindPlaybackKeys({ toggle: onTogglePlay, allowInInputs: allowSpaceInInputs });
    return () => keys.destroy();
  }, [keyboardShortcuts, disabled, onTogglePlay, allowSpaceInInputs]);
  useEffect3(() => {
    if (!keyboardShortcuts || disabled || !hasTempo) return;
    return bindTempoKeys({
      adjustTempo: (delta) => onRateChange(clamp(Number((rate + delta).toFixed(2)), 0.1, 4))
    });
  }, [keyboardShortcuts, disabled, hasTempo, onRateChange, rate]);
  return /* @__PURE__ */ React8.createElement(
    "footer",
    {
      className: inline ? "rawlp-footer rawlp-footer-inline" : "rawlp-footer",
      "aria-label": (_a = labels == null ? void 0 : labels.playback) != null ? _a : "Playback"
    },
    /* @__PURE__ */ React8.createElement("div", { className: "rawlp-playback" }, /* @__PURE__ */ React8.createElement(
      "button",
      {
        type: "button",
        className: "rawlp-play",
        disabled,
        "aria-label": playing ? (_b = labels == null ? void 0 : labels.pause) != null ? _b : "Pause" : (_c = labels == null ? void 0 : labels.play) != null ? _c : "Play",
        onClick: onTogglePlay
      },
      /* @__PURE__ */ React8.createElement("svg", { "aria-hidden": "true", width: "14", height: "16", viewBox: "0 0 14 16", fill: "currentColor" }, playing ? /* @__PURE__ */ React8.createElement("path", { d: "M2 1h4v14H2zm6 0h4v14H8z" }) : /* @__PURE__ */ React8.createElement("path", { d: "M2 1l12 7L2 15z" }))
    ), onStop && /* @__PURE__ */ React8.createElement(
      "button",
      {
        type: "button",
        className: "rawlp-play rawlp-stop",
        disabled: disabled || stopDisabled,
        "aria-label": (_d = labels == null ? void 0 : labels.stop) != null ? _d : "Stop",
        onClick: onStop
      },
      /* @__PURE__ */ React8.createElement("svg", { "aria-hidden": "true", width: "14", height: "16", viewBox: "0 0 14 16", fill: "currentColor" }, /* @__PURE__ */ React8.createElement("rect", { x: "2", y: "3", width: "10", height: "10" }))
    ), beforeTimeline),
    /* @__PURE__ */ React8.createElement("div", { className: "rawlp-timeline" }, /* @__PURE__ */ React8.createElement("span", { className: "rawlp-time", ref: elapsedRef }, formatTime(elapsed)), /* @__PURE__ */ React8.createElement("div", { className: "rawlp-track" }, /* @__PURE__ */ React8.createElement(TimelineMarks, { geometry }), /* @__PURE__ */ React8.createElement(
      "input",
      {
        ref: seekRef,
        "aria-label": (_e = labels == null ? void 0 : labels.seek) != null ? _e : "Seek",
        "aria-valuetext": formatTime(elapsed),
        type: "range",
        min: 0,
        max: length || 1,
        step: "any",
        defaultValue: elapsed,
        disabled: disabled || !length,
        onPointerDown: beginScrub,
        onPointerUp: (event) => finishScrub(event, true),
        onPointerCancel: (event) => finishScrub(event, false),
        onLostPointerCapture: (event) => finishScrub(event, false),
        onChange: (event) => {
          const next = Number(event.currentTarget.value);
          if (activePointer.current === null) onSeek(next);
          else paintPosition(next);
        }
      }
    )), /* @__PURE__ */ React8.createElement("span", { className: "rawlp-time" }, formatTime(length))),
    (hasTempo || hasVolume || children) && /* @__PURE__ */ React8.createElement("div", { className: "rawlp-options" }, hasTempo && /* @__PURE__ */ React8.createElement("div", { className: "rawlp-tempo" }, /* @__PURE__ */ React8.createElement(
      "button",
      {
        type: "button",
        "aria-label": "Slow down",
        disabled: disabled || rate <= 0.1,
        onClick: () => onRateChange(clamp(Number((rate - 0.1).toFixed(2)), 0.1, 4))
      },
      /* @__PURE__ */ React8.createElement("span", { "aria-hidden": "true" }, /* @__PURE__ */ React8.createElement("i", null, "_"), /* @__PURE__ */ React8.createElement("i", null, "\u2212"))
    ), /* @__PURE__ */ React8.createElement("span", null, Number(rate.toFixed(2)), "x"), /* @__PURE__ */ React8.createElement(
      "button",
      {
        type: "button",
        "aria-label": "Speed up",
        disabled: disabled || rate >= 4,
        onClick: () => onRateChange(clamp(Number((rate + 0.1).toFixed(2)), 0.1, 4))
      },
      /* @__PURE__ */ React8.createElement("span", { "aria-hidden": "true" }, /* @__PURE__ */ React8.createElement("i", null, "+"), /* @__PURE__ */ React8.createElement("i", null, "="))
    )), hasVolume && /* @__PURE__ */ React8.createElement("label", { className: "rawlp-volume" }, "Vol", /* @__PURE__ */ React8.createElement(
      "input",
      {
        "aria-label": "Volume",
        type: "range",
        min: 0,
        max: Math.round(volumeMax * 100),
        step: 1,
        value: Math.round(volume * 100),
        disabled,
        onChange: (event) => onVolumeChange(Number(event.currentTarget.value) / 100),
        onDoubleClick: () => onVolumeChange(1)
      }
    )), children)
  );
}

// src/components/MediaScore.jsx
var activeByDocument = /* @__PURE__ */ new WeakMap();
function MediaScore(props) {
  if (!Number.isFinite(props.secondsPerBeat) || props.secondsPerBeat <= 0) {
    throw new RangeError("MediaScore needs a positive secondsPerBeat");
  }
  return /* @__PURE__ */ React9.createElement(MediaScorePlayer, { key: props.src, ...props });
}
function MediaScorePlayer({ score, src, secondsPerBeat, label, labels }) {
  var _a;
  const mediaRef = useRef6(null);
  const controlsRef = useRef6(null);
  const clock = useNotePlaybackClock();
  const scoreDuration = score.beats * secondsPerBeat;
  const [status, setStatus] = useState4({
    duration: scoreDuration,
    position: 0,
    playing: false,
    failed: false,
    rejected: false
  });
  const timeline = useMemo5(() => {
    var _a2, _b;
    return {
      sections: (_a2 = score.rows) == null ? void 0 : _a2.map((row) => row.start * secondsPerBeat),
      phrases: (_b = score.phraseStarts) == null ? void 0 : _b.map((beat) => beat * secondsPerBeat)
    };
  }, [score.rows, score.phraseStarts, secondsPerBeat]);
  useLayoutEffect5(() => {
    var _a2;
    const media = mediaRef.current;
    const document2 = media.ownerDocument;
    let stopFrames;
    let positioned = false;
    let rejected = false;
    let attempt = 0;
    const owner = { stop };
    const keys = bindPlaybackKeys({ target: document2, pause: () => media.pause() });
    const duration = () => Number.isFinite(media.duration) ? media.duration : scoreDuration;
    function publish() {
      setStatus({
        duration: duration(),
        position: media.currentTime,
        playing: !media.paused && !media.ended && !media.error,
        failed: !!media.error,
        rejected
      });
    }
    function paintNotes(seconds) {
      if (positioned) clock.advance(seconds / secondsPerBeat);
    }
    function settle() {
      stopFrames == null ? void 0 : stopFrames();
      stopFrames = void 0;
      keys.setActive(false);
    }
    function release() {
      if (activeByDocument.get(document2) === owner) activeByDocument.delete(document2);
    }
    function stop() {
      ++attempt;
      settle();
      release();
      positioned = false;
      rejected = false;
      media.pause();
      media.currentTime = 0;
      clock.reset();
      publish();
    }
    function seek(seconds) {
      if (!Number.isFinite(seconds) || media.error) return;
      positioned = true;
      media.currentTime = Math.max(0, Math.min(duration(), seconds));
      paintNotes(media.currentTime);
      publish();
    }
    function start(seconds) {
      if (media.error) return;
      const active2 = activeByDocument.get(document2);
      if (active2 && active2 !== owner) active2.stop();
      activeByDocument.set(document2, owner);
      rejected = false;
      if (seconds !== void 0 || media.ended) seek(seconds != null ? seconds : 0);
      const generation = ++attempt;
      media.play().catch((error) => {
        if (generation !== attempt || error.name === "AbortError") return;
        stop();
        rejected = true;
        publish();
      });
    }
    controlsRef.current = {
      seek,
      start,
      stop,
      toggle() {
        if (media.paused || media.ended) start();
        else media.pause();
      }
    };
    const events = {
      play: publish,
      playing() {
        positioned = true;
        stopFrames == null ? void 0 : stopFrames();
        stopFrames = observePlaybackPosition(() => media.currentTime, paintNotes);
        keys.setActive(true);
        publish();
      },
      pause() {
        settle();
        paintNotes(media.currentTime);
        publish();
      },
      ended: stop,
      error() {
        ++attempt;
        settle();
        release();
        positioned = false;
        clock.reset();
        publish();
      },
      seeked() {
        paintNotes(media.currentTime);
        publish();
      },
      loadedmetadata: publish,
      durationchange: publish
    };
    for (const [name, listener] of Object.entries(events)) media.addEventListener(name, listener);
    (_a2 = document2.defaultView) == null ? void 0 : _a2.addEventListener("pagehide", stop);
    publish();
    return () => {
      var _a3;
      ++attempt;
      settle();
      keys.destroy();
      release();
      for (const [name, listener] of Object.entries(events)) media.removeEventListener(name, listener);
      (_a3 = document2.defaultView) == null ? void 0 : _a3.removeEventListener("pagehide", stop);
      controlsRef.current = null;
      if (!media.paused) media.pause();
      clock.reset();
    };
  }, [clock, scoreDuration, secondsPerBeat]);
  const seekBeat = useCallback2((beat) => {
    var _a2;
    return (_a2 = controlsRef.current) == null ? void 0 : _a2.start(beat * secondsPerBeat);
  }, [secondsPerBeat]);
  const getPosition = useCallback2(() => {
    var _a2, _b;
    return (_b = (_a2 = mediaRef.current) == null ? void 0 : _a2.currentTime) != null ? _b : 0;
  }, []);
  return /* @__PURE__ */ React9.createElement("div", { className: "rawlp-media-score", role: label ? "group" : void 0, "aria-label": label }, /* @__PURE__ */ React9.createElement("audio", { hidden: true, src, ref: mediaRef, preload: "metadata" }), label && /* @__PURE__ */ React9.createElement("div", { className: "rawlp-media-score-label" }, label), /* @__PURE__ */ React9.createElement(RawlNotation, { ...score, position: void 0, playbackClock: clock, onSeek: seekBeat }), /* @__PURE__ */ React9.createElement(
    PlaybackFooter,
    {
      position: status.position,
      duration: status.duration,
      playing: status.playing,
      inline: true,
      labels,
      timeline,
      keyboardShortcuts: false,
      disabled: status.failed,
      stopDisabled: !status.playing && status.position === 0,
      getPosition,
      onTogglePlay: () => {
        var _a2;
        return (_a2 = controlsRef.current) == null ? void 0 : _a2.toggle();
      },
      onSeek: (seconds) => {
        var _a2;
        return (_a2 = controlsRef.current) == null ? void 0 : _a2.seek(seconds);
      },
      onStop: () => {
        var _a2;
        return (_a2 = controlsRef.current) == null ? void 0 : _a2.stop();
      }
    }
  ), (status.failed || status.rejected) && /* @__PURE__ */ React9.createElement("div", { className: "rawlp-media-score-error", role: "status" }, (_a = labels == null ? void 0 : labels.error) != null ? _a : "Audio unavailable"));
}

// src/audio/continuous-playback.js
function attachContinuousPlayback(engine, { setInterval, clearInterval, presentationTime, horizon = 0.14, interval = 25 }) {
  const play = engine.play.bind(engine), stop = engine.stop.bind(engine), createClock = engine.createClock.bind(engine);
  let session = null;
  const priority = (e) => e.type === "cc" && [0, 32].includes(e.controller) ? -1 : { program: 0, cc: 1, off: 2, on: 3 }[e.type];
  function scoreAt(s, time) {
    var _a;
    const segment = (_a = [...s.segments].reverse().find((a) => a.time <= time)) != null ? _a : s.segments[0];
    return segment.score + (time - segment.time) * segment.rate;
  }
  function timeAt(s, score) {
    var _a;
    const segment = (_a = [...s.segments].reverse().find((a) => a.score <= score + 1e-10)) != null ? _a : s.segments[0];
    return segment.time + (score - segment.score) / segment.rate;
  }
  engine.stop = () => {
    session = null;
    stop();
  };
  engine.play = (plan, mixers, offset = 0, output = engine.context.destination) => {
    var _a;
    const start = play({ ...plan, events: [], notes: [] }, mixers, offset, output), offsetTime = plan.timeAt(offset);
    const snapshotAt = (beat2) => {
      var _a2;
      const snapshot = /* @__PURE__ */ new Map();
      for (const event of plan.events) if (event.beat <= beat2 && ["program", "cc"].includes(event.type)) snapshot.set([event.channel, event.type, (_a2 = event.controller) != null ? _a2 : ""].join(":"), { ...event, beat: beat2 });
      return [...snapshot.values()];
    };
    const heldAt = (beat2) => plan.notes.filter((n) => n.start < beat2 && n.end > beat2).map((n) => ({ beat: beat2, type: "on", channel: n.channel, pitch: n.pitch, velocity: n.velocity }));
    const events = [...snapshotAt(offset), ...heldAt(offset), ...plan.events.filter((e) => e.beat >= offset && (e.type === "on" || e.type === "off") || e.beat > offset && e.type === "cc")].sort((a, b) => a.beat - b.beat || priority(a) - priority(b));
    const s = { plan, start, offset, segments: [{ time: start, score: offsetTime, rate: 1 }], requestedRate: 1, committedUntil: start, cursor: 0, clock: null, pump: null, dynamic: false, sent: [] };
    session = s;
    let previous = offset;
    const end = (_a = plan.beats) != null ? _a : plan.beatAt(plan.duration), endTime = () => timeAt(s, plan.timeAt(end));
    const beat = () => {
      const now = presentationTime(engine.context);
      if (now < start) return null;
      previous = Math.max(previous, Math.min(end, plan.beatAt(scoreAt(s, now))));
      return previous;
    };
    s.clock = { beat, position: () => {
      var _a2;
      return (_a2 = beat()) != null ? _a2 : offset;
    }, endTime, remaining: () => Math.max(0, endTime() - presentationTime(engine.context)) };
    const send = (event, time) => {
      s.committedUntil = Math.max(s.committedUntil, time);
      engine.fence = Math.max(engine.fence, time);
      s.sent.push({ event, time });
      const options = { time }, synth = engine.synth;
      if (event.type === "program") synth.programChange(event.channel, event.program, options);
      else if (event.type === "cc") synth.controllerChange(event.channel, event.controller, event.value, options);
      else if (event.type === "on") synth.noteOn(event.channel, event.pitch, event.velocity, options);
      else synth.noteOff(event.channel, event.pitch, options);
    };
    s.pump = () => {
      if (session !== s) return;
      const now = engine.context.currentTime, until = now + horizon;
      if (s.cursor < events.length && timeAt(s, plan.timeAt(events[s.cursor].beat)) < now - horizon) {
        const time = now + 0.01, currentBeat = plan.beatAt(scoreAt(s, time));
        if (s.dynamic) {
          const active2 = /* @__PURE__ */ new Map(), settings = /* @__PURE__ */ new Map(), key = (e) => e.channel + ":" + e.pitch, setting = (e) => {
            var _a2;
            return [e.channel, e.type, (_a2 = e.controller) != null ? _a2 : ""].join(":");
          };
          for (const { event: e, time: at } of s.sent) if (at <= time) {
            if (e.type === "on") active2.set(key(e), e);
            else if (e.type === "off") active2.delete(key(e));
            else settings.set(setting(e), e);
          }
          const expected = heldAt(currentBeat), wanted = new Set(expected.map(key));
          for (const e of active2.values()) if (!wanted.has(key(e))) send({ ...e, beat: currentBeat, type: "off" }, time);
          for (const e of snapshotAt(currentBeat)) {
            const old = settings.get(setting(e));
            if (!old || (e.type === "program" ? old.program !== e.program : old.value !== e.value)) send(e, time);
          }
          for (const e of expected) if (!active2.has(key(e))) send(e, time);
        } else {
          for (const channel of plan.channels) engine.synth.controllerChange(channel.channel, 120, 0, { time });
          [...snapshotAt(currentBeat), ...heldAt(currentBeat)].sort((a, b) => priority(a) - priority(b)).forEach((event) => send(event, time));
        }
        while (s.cursor < events.length && events[s.cursor].beat < currentBeat) s.cursor++;
      }
      while (s.cursor < events.length) {
        const event = events[s.cursor], time = timeAt(s, plan.timeAt(event.beat));
        if (time > until) break;
        s.cursor++;
        send(event, time);
      }
      if (s.cursor === events.length) {
        clearInterval(engine.interval);
        engine.interval = null;
      }
    };
    engine.interval = setInterval(s.pump, interval);
    s.pump();
    return start;
  };
  engine.createClock = (plan, start, offset = 0) => (session == null ? void 0 : session.plan) === plan && session.start === start && session.offset === offset ? session.clock : createClock(plan, start, offset);
  engine.setRate = (rate) => {
    if (!Number.isFinite(rate) || rate <= 0) throw new RangeError("Playback rate must be positive");
    const s = session;
    if (!s) return;
    if (rate === s.requestedRate) return;
    const time = Math.max(engine.context.currentTime, s.start, s.committedUntil), score = scoreAt(s, time);
    s.segments = s.segments.filter((a) => a.time < time);
    s.segments.push({ time, score, rate });
    s.requestedRate = rate;
    s.dynamic = true;
    s.pump();
  };
  engine.getRate = () => {
    var _a;
    return (_a = session == null ? void 0 : session.requestedRate) != null ? _a : 1;
  };
  engine.remaining = () => {
    var _a;
    return (_a = session == null ? void 0 : session.clock.remaining()) != null ? _a : 0;
  };
  return engine;
}

// src/audio/soundfont-playback.js
var import_meta = {};
function createSoundFontPlayback(options = {}) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
  const global = (_a = options.environment) != null ? _a : globalThis;
  const setTimeout2 = (...args) => {
    var _a2;
    return ((_a2 = global.setTimeout) != null ? _a2 : globalThis.setTimeout).apply(global, args);
  }, clearTimeout2 = (...args) => {
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
        clearTimeout2(timer);
        signal == null ? void 0 : signal.removeEventListener("abort", cancel);
        fn(value);
      };
      const cancel = () => finish(reject, aborted()), timer = setTimeout2(() => finish(reject, new Error("SoundFont " + stage + " timeout")), milliseconds);
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
      clearTimeout2(entry.offTimer);
      clearTimeout2(entry.cleanupTimer);
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
            entry.offTimer = setTimeout2(release, Math.max(1, (end - context.currentTime) * 1e3));
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
          entry.cleanupTimer = setTimeout2(() => {
            if (this.auditionState === entry) this.stopAudition();
          }, (ROOM.seconds + 0.1) * 1e3);
          try {
            entry.onEnd("ended");
          } catch (error) {
            console.error(error);
          }
        };
        entry.offTimer = setTimeout2(release, Math.max(0, (end - context.currentTime) * 1e3));
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
        clearTimeout2(entry.offTimer);
        clearTimeout2(entry.cleanupTimer);
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
            entry.offTimer = setTimeout2(release, Math.max(1, (end - context.currentTime) * 1e3));
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
          entry.cleanupTimer = setTimeout2(dispose, (ROOM.seconds + 0.1) * 1e3);
        };
        entry.offTimer = setTimeout2(release, Math.max(0, (end - context.currentTime) * 1e3));
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
        engine = new ContinuousPlaybackEngine(context, synth);
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
  class ContinuousPlaybackEngine extends PlaybackEngine {
    constructor(context, synth) {
      super(context, synth);
      attachContinuousPlayback(this, { setInterval, clearInterval, presentationTime, horizon: HORIZON, interval: INTERVAL });
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
  return { prepare, stop, stopAudition: () => engine == null ? void 0 : engine.stopAudition(), getContext: () => audioContext, getPreparationState: () => ({ phase, pending: !!pending, error: lastError }), PlaybackEngine: ContinuousPlaybackEngine, presentationTime, soundingIntervals, room: ROOM, roomImpulse, masterGain: MASTER_GAIN };
}

// src/audio/transport.js
function createTransport({ makePlan, audio: providedAudio, onState = () => {
}, onPosition = () => {
}, onError = () => {
}, keyboardTarget = globalThis.document } = {}) {
  if (typeof makePlan !== "function") throw new TypeError("makePlan is required");
  const audioEngine = () => providedAudio != null ? providedAudio : globalThis.SoundFontPlayback;
  let data = null, engine = null, context = null, clock = null, position = 0, tempo = 120, planTempo = 120, state = "idle", token = 0, frame = null, nodes = [], mixers = [], output = null, muted = /* @__PURE__ */ new Set(), auditionVoice = null, auditionGeneration = 0;
  const keys = keyboardTarget && bindPlaybackKeys({ target: keyboardTarget, pause });
  const emit = (s) => {
    state = s;
    keys == null ? void 0 : keys.setActive(s === "playing" || s === "loading");
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
      planTempo = tempo;
      const plan = makePlan(data, planTempo), start = engine.play(plan, mixers, position, output);
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
      const next = Math.max(40, Math.min(260, Number(value) || 120));
      if (clock) position = clock.position();
      tempo = next;
      if (state === "playing") engine.setRate(next / planTempo);
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
      keys == null ? void 0 : keys.destroy();
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

// src/shift-hover-audition.js
function createShiftHoverAudition({ audition, isEnabled = () => true, keyForNote = (note) => {
  var _a;
  return (_a = note == null ? void 0 : note.id) != null ? _a : note;
} } = {}) {
  let visiting = null, played = false;
  const leave = () => {
    visiting = null;
    played = false;
  };
  return {
    enter(note, event, time) {
      if (!note || !event || event.type === "mousemove" || event.type === "pointermove") return false;
      const key = keyForNote(note);
      if (visiting !== key) {
        visiting = key;
        played = false;
      }
      if (played || !event.shiftKey || typeof audition !== "function" || !isEnabled(note, event, time)) return false;
      played = true;
      audition(note, event, time);
      return true;
    },
    leave,
    reset: leave
  };
}

// src/components/ScoreSizeSliders.jsx
import React10, { useEffect as useEffect4, useRef as useRef7, useState as useState5 } from "react";
var HEIGHT = { min: 1, max: 10 };
var SPACING = { min: 2, max: 150 };
var clamp2 = (value, { min, max }) => Math.min(max, Math.max(min, value));
function SizeRange({ label, title = label, value, bounds, onChange, before, after, vertical = false }) {
  const [draft, setDraft] = useState5(null);
  const timer = useRef7(null);
  useEffect4(() => () => clearTimeout(timer.current), []);
  const displayValue = draft != null ? draft : value;
  return /* @__PURE__ */ React10.createElement("label", { className: vertical ? "rawln-size-option rawln-size-option-height" : "rawln-size-option" }, /* @__PURE__ */ React10.createElement("span", { className: "rawln-size-key", "aria-hidden": "true" }, before), /* @__PURE__ */ React10.createElement(
    "input",
    {
      type: "range",
      "aria-label": label,
      title,
      "aria-orientation": vertical ? "vertical" : "horizontal",
      min: bounds.min,
      max: bounds.max,
      step: "any",
      style: { "--rawln-size-fill": `${(displayValue - bounds.min) / (bounds.max - bounds.min) * 100}%` },
      value: displayValue,
      onChange: (event) => {
        const next = Number(event.currentTarget.value);
        setDraft(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          onChange(next);
          setDraft(null);
        }, 50);
      }
    }
  ), /* @__PURE__ */ React10.createElement("span", { className: "rawln-size-key", "aria-hidden": "true" }, after));
}
function ScoreSizeSliders({ noteHeight, timeSpacing, onNoteHeightChange, onTimeSpacingChange, keyboardShortcuts = false, titles }) {
  useEffect4(() => {
    if (!keyboardShortcuts) return;
    const onKey = (event) => {
      var _a, _b;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing || ((_b = (_a = event.target) == null ? void 0 : _a.closest) == null ? void 0 : _b.call(_a, 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], dialog[open]')) || document.querySelector("dialog[open]")) return;
      switch (event.key.toLowerCase()) {
        case "a":
          onTimeSpacingChange(clamp2(timeSpacing - 2, SPACING));
          break;
        case "d":
          onTimeSpacingChange(clamp2(timeSpacing + 2, SPACING));
          break;
        case "w":
          onNoteHeightChange(clamp2(noteHeight - 0.25, HEIGHT));
          break;
        case "s":
          onNoteHeightChange(clamp2(noteHeight + 0.25, HEIGHT));
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [keyboardShortcuts, noteHeight, timeSpacing, onNoteHeightChange, onTimeSpacingChange]);
  return /* @__PURE__ */ React10.createElement("div", { className: "rawln-size-sliders" }, /* @__PURE__ */ React10.createElement(SizeRange, { label: "Time spacing", title: titles == null ? void 0 : titles.timeSpacing, value: timeSpacing, bounds: SPACING, onChange: onTimeSpacingChange, before: "a", after: "d" }), /* @__PURE__ */ React10.createElement(SizeRange, { label: "Note height", title: titles == null ? void 0 : titles.noteHeight, value: noteHeight, bounds: HEIGHT, onChange: onNoteHeightChange, before: "w", after: "s", vertical: true }));
}

// src/components/PianoLegend.jsx
import React11, { useEffect as useEffect5, useRef as useRef8, useState as useState6 } from "react";

// ../../../Users/chipfocus/repos/lego/librawl/node_modules/lucide-react/dist/esm/createLucideIcon.js
import { forwardRef as forwardRef2, createElement as createElement3 } from "react";

// ../../../Users/chipfocus/repos/lego/librawl/node_modules/lucide-react/dist/esm/shared/src/utils.js
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);
var toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
var hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
};

// ../../../Users/chipfocus/repos/lego/librawl/node_modules/lucide-react/dist/esm/Icon.js
import { forwardRef, createElement as createElement2 } from "react";

// ../../../Users/chipfocus/repos/lego/librawl/node_modules/lucide-react/dist/esm/defaultAttributes.js
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

// ../../../Users/chipfocus/repos/lego/librawl/node_modules/lucide-react/dist/esm/Icon.js
var Icon = forwardRef(
  ({
    color: color2 = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => createElement2(
    "svg",
    {
      ref,
      ...defaultAttributes,
      width: size,
      height: size,
      stroke: color2,
      strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
      className: mergeClasses("lucide", className),
      ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
      ...rest
    },
    [
      ...iconNode.map(([tag, attrs]) => createElement2(tag, attrs)),
      ...Array.isArray(children) ? children : [children]
    ]
  )
);

// ../../../Users/chipfocus/repos/lego/librawl/node_modules/lucide-react/dist/esm/createLucideIcon.js
var createLucideIcon = (iconName, iconNode) => {
  const Component = forwardRef2(
    ({ className, ...props }, ref) => createElement3(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className
      ),
      ...props
    })
  );
  Component.displayName = toPascalCase(iconName);
  return Component;
};

// ../../../Users/chipfocus/repos/lego/librawl/node_modules/lucide-react/dist/esm/icons/chevron-down.js
var __iconNode = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]];
var ChevronDown = createLucideIcon("chevron-down", __iconNode);

// ../../../Users/chipfocus/repos/lego/librawl/node_modules/lucide-react/dist/esm/icons/chevron-up.js
var __iconNode2 = [["path", { d: "m18 15-6-6-6 6", key: "153udz" }]];
var ChevronUp = createLucideIcon("chevron-up", __iconNode2);

// ../../../Users/chipfocus/repos/lego/librawl/node_modules/lucide-react/dist/esm/icons/graduation-cap.js
var __iconNode3 = [
  [
    "path",
    {
      d: "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",
      key: "j76jl0"
    }
  ],
  ["path", { d: "M22 10v6", key: "1lu8f3" }],
  ["path", { d: "M6 12.5V16a6 3 0 0 0 12 0v-3.5", key: "1r8lef" }]
];
var GraduationCap = createLucideIcon("graduation-cap", __iconNode3);

// ../../../Users/chipfocus/repos/lego/librawl/node_modules/lucide-react/dist/esm/icons/guitar.js
var __iconNode4 = [
  ["path", { d: "m11.9 12.1 4.514-4.514", key: "109xqo" }],
  [
    "path",
    {
      d: "M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z",
      key: "txyc8t"
    }
  ],
  ["path", { d: "m6 16 2 2", key: "16qmzd" }],
  [
    "path",
    {
      d: "M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z",
      key: "1de1vg"
    }
  ]
];
var Guitar = createLucideIcon("guitar", __iconNode4);

// src/components/PianoLegend.jsx
var WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
var BLACK_KEYS = [1, 3, null, 6, 8, 10, null];
var BLACK_LABELS = ["\u266D2", "\u266D3", null, "\u266F4", "\u266D6", "\u266D7"];
var ALL_PITCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
var MOBILE = "(max-width: 767px)";
var ARPEGGIO_DELAY_MS = 60;
var CHORDS = {
  ii: [2, 5, 9],
  IV: [5, 9, 0],
  vi: [9, 0, 4],
  I: [0, 4, 7],
  iii: [4, 7, 11],
  V: [7, 11, 2],
  V7: [7, 11, 2, 5],
  iio: [2, 5, 8],
  iv: [5, 8, 0],
  bVI: [8, 0, 3],
  i: [0, 3, 7],
  bIII: [3, 7, 10],
  v: [7, 10, 2],
  bVII: [10, 2, 5]
};
var MODES = [
  { title: "major", names: ["ii", "IV", "vi", "I", "iii", "V", "V7"] },
  { title: "minor", names: ["iio", "iv", "bVI", "i", "bIII", "V", "V7", "v", "bVII"] }
].map(({ title, names }) => ({ title, chords: names.map((name) => ({ name, pitches: CHORDS[name] })) }));
var SCALES = [
  { label: "minor", color: 3, scales: [
    ["phrygian", [0, 1, 3, 5, 7, 8, 10]],
    ["natural", [0, 2, 3, 5, 7, 8, 10]],
    ["harmonic", [0, 2, 3, 5, 7, 8, 11]],
    ["dorian", [0, 2, 3, 5, 7, 9, 10]]
  ] },
  { label: "major", color: 4, scales: [
    ["mixolydian", [0, 2, 4, 5, 7, 9, 10]],
    ["natural", WHITE_KEYS],
    ["lydian", [0, 2, 4, 6, 7, 9, 11]],
    ["hijaz", [0, 1, 4, 5, 7, 8, 10]]
  ] }
];
var color = (degree) => RAWL_COLORS[colorIndex(degree)].background;
function PitchDot({ pitch }) {
  const { dot } = RAWL_COLORS[colorIndex(pitch)];
  if (!dot) return null;
  return /* @__PURE__ */ React11.createElement(
    "span",
    {
      className: "rawln-piano-pitch-dot",
      "aria-hidden": "true",
      style: { width: dot.size, height: dot.size, background: dot.color }
    }
  );
}
var tonicName = (degree) => TONIC_NAMES[colorIndex(degree)];
var romanName = (name) => name.replace("b", "\u266D");
var chordQualities = { "4 3": "", "3 4": "m", "3 3": "dim", "3 4 3": "m7", "4 3 3": "7", "4 3 4": "maj7", "3 3 4": "\xF87" };
var minorTonics = ["C", "C\u266F", "D", "E\u266D", "E", "F", "F\u266F", "G", "G\u266F", "A", "B\u266D", "B"];
function guitarName(name, pitches, tonic, minor) {
  const intervals = pitches.slice(1).map((pitch, i) => colorIndex(pitch - pitches[i])).join(" ");
  const quality = chordQualities[intervals];
  if (quality === void 0) return;
  const root = tonic + pitches[0];
  let expected = tonic;
  let letter = "CDEFGAB".indexOf((minor ? minorTonics : TONIC_NAMES)[colorIndex(tonic)][0]);
  for (const part of name.split("/").reverse()) {
    const match = /^([b#]*)([ivIV]+)/.exec(part);
    const degree = match ? ["I", "II", "III", "IV", "V", "VI", "VII"].indexOf(match[2].toUpperCase()) : -1;
    if (degree < 0) return tonicName(root) + quality;
    letter = (letter + degree) % 7;
    expected += WHITE_KEYS[degree];
    for (const accidental2 of match[1]) expected += accidental2 === "b" ? -1 : 1;
  }
  if (colorIndex(expected) !== colorIndex(root)) return tonicName(root) + quality;
  const accidental = colorIndex(root - WHITE_KEYS[letter] + 6) - 6;
  return "CDEFGAB"[letter] + (accidental < 0 ? "\u266D".repeat(-accidental) : "\u266F".repeat(accidental)) + quality;
}
function PianoLegend({
  currentTonic = 0,
  inline = false,
  enabledPitches = ALL_PITCHES,
  activePitch = null,
  onAudition
}) {
  const [playing, setPlaying] = useState6(null);
  const timer = useRef8(null);
  const stop = useRef8(null);
  useEffect5(() => () => {
    var _a;
    clearTimeout(timer.current);
    (_a = stop.current) == null ? void 0 : _a.call(stop);
  }, []);
  function renderKey(pitch, label, left, raised) {
    const enabled = enabledPitches.includes(pitch);
    const active2 = activePitch === pitch;
    const interactive = !inline && enabled && !!onAudition;
    const Element = interactive ? "button" : "span";
    return /* @__PURE__ */ React11.createElement(
      Element,
      {
        key: pitch,
        ...interactive ? { type: "button", "aria-label": tonicName(pitch + currentTonic), onClick: () => {
          var _a;
          clearTimeout(timer.current);
          (_a = stop.current) == null ? void 0 : _a.call(stop);
          setPlaying(pitch);
          stop.current = onAudition([pitch + currentTonic], { kind: "note" });
          timer.current = setTimeout(() => setPlaying(null), 200);
        } } : { "aria-hidden": true },
        className: "rawln-piano-key",
        "data-raised": raised || void 0,
        "data-active": active2 || void 0,
        "data-hidden": !enabled && !active2 || void 0,
        "data-playing": playing === pitch || void 0,
        style: { left: `${left * 100 / 7}%`, background: color(pitch) }
      },
      /* @__PURE__ */ React11.createElement(PitchDot, { pitch }),
      !inline && /* @__PURE__ */ React11.createElement(React11.Fragment, null, pitch === 0 && /* @__PURE__ */ React11.createElement("span", { className: "rawln-piano-tonic" }, tonicName(currentTonic)), label)
    );
  }
  return /* @__PURE__ */ React11.createElement("div", { className: `rawln-piano-keys${inline ? " rawln-piano-inline" : ""}` }, WHITE_KEYS.map((pitch, i) => renderKey(pitch, i + 1, i, false)), BLACK_KEYS.map((pitch, i) => pitch === null ? null : renderKey(pitch, BLACK_LABELS[i], i + 0.5, true)));
}
function InlinePianoLegend(props) {
  return /* @__PURE__ */ React11.createElement(PianoLegend, { ...props, inline: true });
}
function ChordRow({ mode, tonic, guitar, onAudition, setHoveredColors }) {
  var _a, _b;
  const [playing, setPlaying] = useState6(null);
  const timer = useRef8(null);
  useEffect5(() => () => clearTimeout(timer.current), []);
  const voiced = [];
  for (const chord of mode.chords) {
    if (!chord.pitches.length) continue;
    if (((_a = chord.positions) == null ? void 0 : _a.length) === chord.pitches.length) {
      voiced.push(chord);
      continue;
    }
    const previous = (_b = voiced[voiced.length - 1]) == null ? void 0 : _b.positions[0];
    const root = chord.pitches[0];
    const distance = previous == null ? 0 : colorIndex(root - previous);
    const bass = previous == null ? root : previous + (distance > 6 ? distance - 12 : distance);
    const positions = [bass];
    for (let i = 1; i < chord.pitches.length; i++) {
      positions.push(positions[i - 1] + colorIndex(chord.pitches[i] - chord.pitches[i - 1]));
    }
    voiced.push({ ...chord, positions });
  }
  if (!voiced.length) return null;
  const top = Math.max(...voiced.flatMap((chord) => chord.positions));
  const bottom = Math.min(...voiced.flatMap((chord) => chord.positions));
  const tonicIndex = voiced.findIndex(({ name }) => name === "I" || name === "i");
  const minor = mode.title.toLowerCase().includes("minor") || voiced.some(({ name }) => name === "i");
  return /* @__PURE__ */ React11.createElement("div", { className: "rawln-piano-mode" }, /* @__PURE__ */ React11.createElement("div", { className: "rawln-piano-chords", style: { "--rawln-piano-chord-count": voiced.length, height: (top - bottom) * 3 + 52 } }, voiced.map(({ name, pitches, positions, romanLabel }, i) => {
    var _a2;
    const showAbove = i < tonicIndex;
    const alternateLabel = guitar ? guitarName(name, pitches, tonic, minor) : void 0;
    const label = alternateLabel != null ? alternateLabel : romanName(name);
    const labelTop = 22 + (top - positions[showAbove ? positions.length - 1 : 0]) * 3 + (showAbove ? -20 : 9);
    const Element = onAudition ? "button" : "span";
    const clearHover = () => setHoveredColors == null ? void 0 : setHoveredColors(null);
    const preview = () => setHoveredColors == null ? void 0 : setHoveredColors(pitches.map((pitch) => `noteColor_${colorIndex(pitch)}_colors`));
    return /* @__PURE__ */ React11.createElement(
      Element,
      {
        key: `${name}-${i}`,
        className: "rawln-piano-chord",
        ...onAudition ? { type: "button", "aria-label": label, onClick: () => {
          clearTimeout(timer.current);
          setPlaying({ index: i, serial: Date.now() });
          onAudition(positions.map((pitch) => pitch + tonic), { kind: "chord" });
          timer.current = setTimeout(() => setPlaying(null), 600);
        } } : {},
        onMouseEnter: preview,
        onMouseLeave: clearHover,
        onFocus: preview,
        onBlur: clearHover
      },
      positions.map((position, j) => /* @__PURE__ */ React11.createElement(
        "i",
        {
          key: `${j}-${(playing == null ? void 0 : playing.index) === i ? playing.serial : ""}`,
          "aria-hidden": "true",
          "data-playing": (playing == null ? void 0 : playing.index) === i || void 0,
          style: { top: 22 + (top - position) * 3, background: color(pitches[j]), animationDelay: `${ARPEGGIO_DELAY_MS * j}ms` }
        },
        /* @__PURE__ */ React11.createElement(PitchDot, { pitch: pitches[j] })
      )),
      /* @__PURE__ */ React11.createElement("span", { style: { top: labelTop } }, (_a2 = alternateLabel != null ? alternateLabel : romanLabel) != null ? _a2 : label)
    );
  })), mode.title && /* @__PURE__ */ React11.createElement("div", { className: "rawln-piano-mode-title" }, mode.title));
}
function getMobile() {
  var _a;
  return typeof window !== "undefined" && ((_a = window.matchMedia) == null ? void 0 : _a.call(window, MOBILE).matches) === true;
}
function storedExpansion(key, mobile) {
  var _a;
  try {
    const value = (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(mobile ? `${key}Mobile` : key);
    if (value === "true" || value === "false") return value === "true";
  } catch (e) {
  }
  return false;
}
function reserveCollapsedLegendSpace(legend) {
  const { ownerDocument: document2 } = legend;
  const window2 = document2.defaultView;
  let scroller = legend.parentElement;
  while (scroller && scroller !== document2.body && !/^(auto|scroll|overlay)$/.test(window2.getComputedStyle(scroller).overflowY)) {
    scroller = scroller.parentElement;
  }
  const target = scroller != null ? scroller : document2.body;
  const spacer = document2.createElement("div");
  spacer.className = "rawln-piano-clearance";
  spacer.setAttribute("aria-hidden", "true");
  const main = legend.closest("main");
  const placement = main && target.contains(main) ? main : target;
  placement.append(spacer);
  const update = () => {
    const scrollBottom = target === document2.body ? window2.innerHeight : Math.min(window2.innerHeight, target.getBoundingClientRect().top + target.clientTop + target.clientHeight);
    const needed = legend.getClientRects().length ? Math.max(0, scrollBottom - legend.getBoundingClientRect().top + 4) : 0;
    spacer.style.setProperty("--rawln-piano-needed-clearance", `${needed}px`);
    spacer.style.setProperty(
      "--rawln-piano-existing-clearance",
      window2.getComputedStyle(legend).getPropertyValue("--rawln-piano-existing-clearance") || "0px"
    );
  };
  const observer = window2.ResizeObserver ? new window2.ResizeObserver(update) : null;
  observer == null ? void 0 : observer.observe(legend);
  if (target !== document2.body) observer == null ? void 0 : observer.observe(target);
  window2.addEventListener("resize", update);
  update();
  return () => {
    observer == null ? void 0 : observer.disconnect();
    window2.removeEventListener("resize", update);
    spacer.remove();
  };
}
function FoldablePianoLegend({
  currentTonic = 0,
  modes = MODES,
  onAudition,
  setHoveredColors,
  storageKey = "showLegend"
}) {
  const [mobile, setMobile] = useState6(getMobile);
  const [expanded, setExpanded] = useState6(() => storedExpansion(storageKey, mobile));
  const [scale, setScale] = useState6(null);
  const [highlight, setHighlight] = useState6(null);
  const [guitar, setGuitar] = useState6(false);
  const audition = useRef8(null);
  const legend = useRef8(null);
  useEffect5(() => {
    if (!expanded && legend.current) return reserveCollapsedLegendSpace(legend.current);
  }, [expanded]);
  function stop() {
    var _a;
    const run = audition.current;
    audition.current = null;
    (_a = run == null ? void 0 : run.cancel) == null ? void 0 : _a.call(run);
  }
  useEffect5(() => {
    var _a, _b;
    const media = (_a = window.matchMedia) == null ? void 0 : _a.call(window, MOBILE);
    const changed = (event) => setMobile(event.matches);
    (_b = media == null ? void 0 : media.addEventListener) == null ? void 0 : _b.call(media, "change", changed);
    return () => {
      var _a2;
      return (_a2 = media == null ? void 0 : media.removeEventListener) == null ? void 0 : _a2.call(media, "change", changed);
    };
  }, []);
  useEffect5(() => setExpanded(storedExpansion(storageKey, mobile)), [storageKey, mobile]);
  useEffect5(() => {
    setHighlight(null);
    setScale(null);
    return stop;
  }, [currentTonic, expanded]);
  function toggle() {
    var _a;
    const next = !expanded;
    setExpanded(next);
    if (!next) setHoveredColors == null ? void 0 : setHoveredColors(null);
    try {
      (_a = globalThis.localStorage) == null ? void 0 : _a.setItem(mobile ? `${storageKey}Mobile` : storageKey, JSON.stringify(next));
    } catch (e) {
    }
  }
  function play(pitches, { kind, onActiveNote }) {
    stop();
    setHighlight(null);
    const run = {};
    audition.current = run;
    run.cancel = onAudition(pitches, { kind, onActiveNote: (index) => {
      if (audition.current === run) onActiveNote == null ? void 0 : onActiveNote(index);
    } });
  }
  function playScale(pitches) {
    const sequence = [...pitches, 12];
    play(sequence.map((pitch) => pitch + currentTonic), {
      kind: "scale",
      onActiveNote: (index) => setHighlight(index == null ? null : sequence[index])
    });
  }
  const Chevron = expanded ? ChevronDown : ChevronUp;
  const chordNamesLabel = guitar ? "Show Roman numerals" : "Show guitar chords";
  return /* @__PURE__ */ React11.createElement("aside", { ref: legend, className: "rawln-piano-legend", "data-expanded": expanded }, /* @__PURE__ */ React11.createElement("div", { className: "rawln-piano-header" }, /* @__PURE__ */ React11.createElement(
    "button",
    {
      type: "button",
      className: "rawln-piano-fold",
      onClick: toggle,
      "aria-label": "Piano legend",
      "aria-expanded": expanded
    },
    /* @__PURE__ */ React11.createElement(Chevron, { size: 14, "aria-hidden": "true" }),
    !expanded && /* @__PURE__ */ React11.createElement(InlinePianoLegend, null)
  ), expanded && /* @__PURE__ */ React11.createElement(
    "button",
    {
      type: "button",
      className: "rawln-piano-names",
      "aria-pressed": guitar,
      "aria-label": chordNamesLabel,
      title: chordNamesLabel,
      onClick: () => setGuitar(!guitar)
    },
    /* @__PURE__ */ React11.createElement(GraduationCap, { size: 14, className: "rawln-piano-name-roman", "aria-hidden": "true" }),
    /* @__PURE__ */ React11.createElement("span", { className: "rawln-piano-name-track", "aria-hidden": "true" }),
    /* @__PURE__ */ React11.createElement(Guitar, { size: 14, className: "rawln-piano-name-guitar", "aria-hidden": "true" })
  )), /* @__PURE__ */ React11.createElement("div", { className: "rawln-piano-panel", hidden: !expanded }, expanded && /* @__PURE__ */ React11.createElement(React11.Fragment, null, modes.map((mode, i) => /* @__PURE__ */ React11.createElement(
    ChordRow,
    {
      key: i,
      mode,
      tonic: currentTonic,
      guitar,
      onAudition: onAudition ? play : void 0,
      setHoveredColors
    }
  )), /* @__PURE__ */ React11.createElement("div", { className: "rawln-piano-octaves" }, [0, 12].map((octave2) => /* @__PURE__ */ React11.createElement(
    PianoLegend,
    {
      key: octave2,
      currentTonic: currentTonic + octave2,
      enabledPitches: scale != null ? scale : ALL_PITCHES,
      activePitch: highlight == null ? null : highlight - octave2,
      onAudition: onAudition ? play : void 0
    }
  ))), SCALES.map((group) => /* @__PURE__ */ React11.createElement("div", { key: group.label, className: "rawln-piano-scale-row" }, /* @__PURE__ */ React11.createElement("span", { style: { background: color(group.color), color: RAWL_COLORS[group.color].foreground } }, group.label), group.scales.map(([label, pitches]) => {
    const Element = onAudition ? "button" : "span";
    return /* @__PURE__ */ React11.createElement(
      Element,
      {
        key: label,
        className: "rawln-piano-scale",
        style: {
          background: `linear-gradient(to right, ${[1, 2, 3, 5, 6].map((degree, i) => `${color(pitches[degree])} ${i * 20}% ${(i + 1) * 20}%`).join(", ")})`
        },
        ...onAudition ? {
          type: "button",
          "aria-label": `Play ${label} ${group.label} scale`,
          onClick: () => playScale(pitches)
        } : {},
        onMouseEnter: () => setScale(pitches),
        onMouseLeave: () => setScale(null),
        onFocus: () => setScale(pitches),
        onBlur: () => setScale(null)
      },
      label
    );
  }))))));
}
export {
  FoldablePianoLegend,
  InlinePianoLegend,
  MediaScore,
  PianoLegend,
  PlaybackFooter,
  PlaybackMeasureBorders,
  PlaybackMeasureLayer,
  RAWL_COLORS,
  RawlMeasureHeader,
  RawlNotation,
  RomanNumeral,
  ScoreSizeSliders,
  TonalGrid,
  TonicSymbol,
  bindPlaybackKeys,
  bindTempoKeys,
  createShiftHoverAudition,
  createSoundFontPlayback,
  createTransport,
  modulationLabelOffset,
  pitchRange,
  recolorBoundary,
  recolorModulation,
  staveGeometry,
  useTonicRecoloring
};
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/chevron-down.js:
lucide-react/dist/esm/icons/chevron-up.js:
lucide-react/dist/esm/icons/graduation-cap.js:
lucide-react/dist/esm/icons/guitar.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.562.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
