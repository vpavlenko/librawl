/*! librawl version: 0.4.1-local; audio source sha256: 71b00333d99d3a7d882060d12d513caeb32390b6548f595fa062dabfc235d734; GPL-3.0-only */

// src/components/TonicSymbol.jsx
import * as React from "react";

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
function positionedTonalGuides(regions, range, pitchToY) {
  return regions.flatMap(({ tonic, left, width }) => tonalGuideLines(range, pitchToY, tonic).map((guide) => ({ ...guide, tonic, left, width })));
}

// src/components/TonicSymbol.jsx
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

// src/notation/RawlNotation.jsx
import React5, { useImperativeHandle, useLayoutEffect as useLayoutEffect2, useMemo as useMemo2, useRef as useRef2, useState as useState2 } from "react";

// src/notation/geometry.mjs
var mod = (n) => (n % 12 + 12) % 12;
function keyMarkers(tonic, changes) {
  return tonicMarkers(tonicEvents(tonic, changes));
}
function measureHeaderLayout({ row, tonic = 0, changes = [], barBeats = 4, beatBeats = 1, phraseStarts, measureMap, width = 0, selectedMeasure = null, hideInitialTonic = false, modulationMarkerPlacement }) {
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
    var _a2, _b, _c;
    const onsetOverride = (_a2 = marker.onsetOverride) != null ? _a2 : explicit ? !explicit.some((measure) => Math.abs(measure.start - marker.beat) < EPS) : Math.abs(marker.beat / barBeats - Math.round(marker.beat / barBeats)) > EPS;
    if (modulationMarkerPlacement === "following-measure" && explicit && onsetOverride && marker.onsetOverride !== true && marker.delta !== null) {
      const next = explicit.find((measure) => measure.start > marker.beat + EPS);
      if (next && ((_c = (_b = actualEvents[index + 1]) == null ? void 0 : _b.beat) != null ? _c : Infinity) > next.start + EPS) {
        return { ...marker, beat: next.start, originBeat: marker.beat, number: next.sourceNumber, onsetOverride: false };
      }
    }
    return { ...marker, onsetOverride };
  });
  const markers = markersForRow(events, { ...row, numberAt, hideInitialTonic, toPixels: width > 0 ? (beat) => beat * ppb : null }).map((marker) => ({ ...marker, left: x(marker.beat) }));
  for (const measure of measures) {
    const modulation = markers.find((marker) => marker.beat === measure.beat && marker.delta !== null);
    measure.hasModulation = !!modulation;
    if ((modulation == null ? void 0 : modulation.originBeat) !== void 0) measure.modulationBeat = modulation.originBeat;
    if (measure.color === "#666" && modulation) measure.color = "black";
  }
  return { measures, beats: visibleBeatLines(barlines, beats, (beat) => beat * ppb), markers };
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
  modulationMarkerPlacement
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
  const select = (event, measure) => {
    event.stopPropagation();
    onMeasureSelect(measure.beat, measure, event.currentTarget);
  };
  return /* @__PURE__ */ React2.createElement("div", { ref: element, className: "rawln-measure-grid", style: { height } }, measures.map((measure) => {
    var _a;
    return /* @__PURE__ */ React2.createElement(
      "div",
      {
        className: "rawln-bar" + (measure.isPhraseStart ? " rawln-phrase-bar" : ""),
        key: measure.beat,
        "data-beat": measure.beat,
        "data-phrase-boundary": measure.isPhraseStart || void 0,
        "data-terminal": measure.terminal || void 0,
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
        renderMeasureExtras == null ? void 0 : renderMeasureExtras(measure),
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

// src/notation/RawlNotation.jsx
import { NoteLayer, NotePlaybackContext, PlaybackSectionContext, createSectionPlaybackClock } from "librawl/native";
var atRowStart = (beat, start) => Math.abs(beat - start) < 1e-7;
function PlaybackMeasureLayer({ row, clock, measureMap, barBeats = 4 }) {
  const border = useRef2(null), { start, end } = row;
  useLayoutEffect2(() => {
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
  return /* @__PURE__ */ React5.createElement(PlaybackMeasureBorders, { ref: border, hidden: true });
}

// src/components/PlaybackFooter.jsx
import React6, { memo, useCallback, useEffect, useLayoutEffect as useLayoutEffect3, useMemo as useMemo3, useRef as useRef3 } from "react";

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
  return /* @__PURE__ */ React6.createElement("div", { className: "rawlp-marks", "aria-hidden": "true" }, sections.map((left, index) => /* @__PURE__ */ React6.createElement("i", { className: "rawlp-section-mark", key: index, style: { left: `${left}%` } })), phrases.map((left, index) => /* @__PURE__ */ React6.createElement("i", { className: "rawlp-phrase-mark", key: index, style: { left: `${left}%` } })), bass.map(({ left, right, color: color2 }, index) => /* @__PURE__ */ React6.createElement("i", { className: "rawlp-bass-bar", key: index, style: { left: `${left}%`, width: `${right - left}%`, background: color2 } })), colored.map(({ left, color: color2 }, index) => /* @__PURE__ */ React6.createElement("i", { className: "rawlp-colored-mark", key: index, style: { left: `${left}%`, background: color2 } })));
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
  children
}) {
  const length = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const hasTempo = Number.isFinite(rate) && !!onRateChange;
  const hasVolume = Number.isFinite(volume) && !!onVolumeChange;
  const seekRef = useRef3(null);
  const elapsedRef = useRef3(null);
  const activePointer = useRef3(null);
  const elapsed = clamp(Number.isFinite(position) ? position : 0, 0, length);
  const geometry = useMemo3(() => length ? timelineGeometry(timeline, length) : null, [timeline, length]);
  const paintPosition = useCallback((next) => {
    const input = seekRef.current;
    const label = elapsedRef.current;
    const seconds = clamp(Number.isFinite(next) ? next : 0, 0, length);
    if (input.valueAsNumber !== seconds) input.value = String(seconds);
    const time = formatTime(seconds);
    if (label.textContent !== time) label.textContent = time;
    if (input.getAttribute("aria-valuetext") !== time) input.setAttribute("aria-valuetext", time);
  }, [length]);
  useLayoutEffect3(() => {
    if (activePointer.current !== null) paintPosition(seekRef.current.valueAsNumber);
    if (playing && getPosition && length && !disabled) {
      return observePlaybackPosition(getPosition, (next) => {
        if (activePointer.current === null) paintPosition(next);
      });
    }
    if (activePointer.current === null) paintPosition(elapsed);
  }, [playing, getPosition, length, disabled, elapsed, paintPosition]);
  function beginScrub(event) {
    var _a, _b;
    if (activePointer.current !== null || event.button !== 0) return;
    activePointer.current = event.pointerId;
    (_b = (_a = event.currentTarget).setPointerCapture) == null ? void 0 : _b.call(_a, event.pointerId);
  }
  function finishScrub(event, commit) {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    if (commit && !disabled && length) onSeek(Number(event.currentTarget.value));
    else paintPosition(playing && getPosition ? getPosition() : elapsed);
  }
  useEffect(() => {
    if (!keyboardShortcuts || disabled) return;
    const keys = bindPlaybackKeys({ toggle: onTogglePlay, allowInInputs: allowSpaceInInputs });
    return () => keys.destroy();
  }, [keyboardShortcuts, disabled, onTogglePlay, allowSpaceInInputs]);
  useEffect(() => {
    if (!keyboardShortcuts || disabled || !hasTempo) return;
    return bindTempoKeys({
      adjustTempo: (delta) => onRateChange(clamp(Number((rate + delta).toFixed(2)), 0.1, 4))
    });
  }, [keyboardShortcuts, disabled, hasTempo, onRateChange, rate]);
  return /* @__PURE__ */ React6.createElement("footer", { className: "rawlp-footer", "aria-label": "Playback" }, /* @__PURE__ */ React6.createElement("div", { className: "rawlp-playback" }, /* @__PURE__ */ React6.createElement(
    "button",
    {
      type: "button",
      className: "rawlp-play",
      disabled,
      "aria-label": playing ? "Pause" : "Play",
      onClick: onTogglePlay
    },
    /* @__PURE__ */ React6.createElement("svg", { "aria-hidden": "true", width: "14", height: "16", viewBox: "0 0 14 16", fill: "currentColor" }, playing ? /* @__PURE__ */ React6.createElement("path", { d: "M2 1h4v14H2zm6 0h4v14H8z" }) : /* @__PURE__ */ React6.createElement("path", { d: "M2 1l12 7L2 15z" }))
  ), beforeTimeline), /* @__PURE__ */ React6.createElement("div", { className: "rawlp-timeline" }, /* @__PURE__ */ React6.createElement("span", { className: "rawlp-time", ref: elapsedRef }, formatTime(elapsed)), /* @__PURE__ */ React6.createElement("div", { className: "rawlp-track" }, /* @__PURE__ */ React6.createElement(TimelineMarks, { geometry }), /* @__PURE__ */ React6.createElement(
    "input",
    {
      ref: seekRef,
      "aria-label": "Seek",
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
  )), /* @__PURE__ */ React6.createElement("span", { className: "rawlp-time" }, formatTime(length))), (hasTempo || hasVolume || children) && /* @__PURE__ */ React6.createElement("div", { className: "rawlp-options" }, hasTempo && /* @__PURE__ */ React6.createElement("div", { className: "rawlp-tempo" }, /* @__PURE__ */ React6.createElement(
    "button",
    {
      type: "button",
      "aria-label": "Slow down",
      disabled: disabled || rate <= 0.1,
      onClick: () => onRateChange(clamp(Number((rate - 0.1).toFixed(2)), 0.1, 4))
    },
    /* @__PURE__ */ React6.createElement("span", { "aria-hidden": "true" }, /* @__PURE__ */ React6.createElement("i", null, "_"), /* @__PURE__ */ React6.createElement("i", null, "\u2212"))
  ), /* @__PURE__ */ React6.createElement("span", null, Number(rate.toFixed(2)), "x"), /* @__PURE__ */ React6.createElement(
    "button",
    {
      type: "button",
      "aria-label": "Speed up",
      disabled: disabled || rate >= 4,
      onClick: () => onRateChange(clamp(Number((rate + 0.1).toFixed(2)), 0.1, 4))
    },
    /* @__PURE__ */ React6.createElement("span", { "aria-hidden": "true" }, /* @__PURE__ */ React6.createElement("i", null, "+"), /* @__PURE__ */ React6.createElement("i", null, "="))
  )), hasVolume && /* @__PURE__ */ React6.createElement("label", { className: "rawlp-volume" }, "Vol", /* @__PURE__ */ React6.createElement(
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
  )), children));
}

// src/components/RomanNumeral.jsx
import React7, { useEffect as useEffect2, useMemo as useMemo4, useRef as useRef4 } from "react";

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
  const ref = useRef4(null);
  const model = useMemo4(() => romanNumeralTooltipModel(notation, options, tooltip), [notation, options, tooltip]);
  useEffect2(() => {
    if (!model) return;
    return bindRomanNumeralTooltip(ref.current, () => romanNumeralTooltipHTML(notation, options != null ? options : {}, model));
  }, [notation, options, model]);
  return /* @__PURE__ */ React7.createElement(
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

// src/components/ScoreSizeSliders.jsx
import React8, { useEffect as useEffect3, useRef as useRef5, useState as useState3 } from "react";
var HEIGHT = { min: 1, max: 10 };
var SPACING = { min: 2, max: 150 };
var clamp2 = (value, { min, max }) => Math.min(max, Math.max(min, value));
function SizeRange({ label, title = label, value, bounds, onChange, before, after, vertical = false }) {
  const [draft, setDraft] = useState3(null);
  const timer = useRef5(null);
  useEffect3(() => () => clearTimeout(timer.current), []);
  const displayValue = draft != null ? draft : value;
  return /* @__PURE__ */ React8.createElement("label", { className: vertical ? "rawln-size-option rawln-size-option-height" : "rawln-size-option" }, /* @__PURE__ */ React8.createElement("span", { className: "rawln-size-key", "aria-hidden": "true" }, before), /* @__PURE__ */ React8.createElement(
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
  ), /* @__PURE__ */ React8.createElement("span", { className: "rawln-size-key", "aria-hidden": "true" }, after));
}
function ScoreSizeSliders({ noteHeight, timeSpacing, onNoteHeightChange, onTimeSpacingChange, keyboardShortcuts = false, titles }) {
  useEffect3(() => {
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
  return /* @__PURE__ */ React8.createElement("div", { className: "rawln-size-sliders" }, /* @__PURE__ */ React8.createElement(SizeRange, { label: "Time spacing", title: titles == null ? void 0 : titles.timeSpacing, value: timeSpacing, bounds: SPACING, onChange: onTimeSpacingChange, before: "a", after: "d" }), /* @__PURE__ */ React8.createElement(SizeRange, { label: "Note height", title: titles == null ? void 0 : titles.noteHeight, value: noteHeight, bounds: HEIGHT, onChange: onNoteHeightChange, before: "w", after: "s", vertical: true }));
}

// src/components/PianoLegend.jsx
import React9, { useEffect as useEffect4, useRef as useRef6, useState as useState4 } from "react";

// node_modules/lucide-react/dist/esm/createLucideIcon.js
import { forwardRef as forwardRef2, createElement as createElement3 } from "react";

// node_modules/lucide-react/dist/esm/shared/src/utils.js
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

// node_modules/lucide-react/dist/esm/Icon.js
import { forwardRef, createElement as createElement2 } from "react";

// node_modules/lucide-react/dist/esm/defaultAttributes.js
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

// node_modules/lucide-react/dist/esm/Icon.js
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

// node_modules/lucide-react/dist/esm/createLucideIcon.js
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

// node_modules/lucide-react/dist/esm/icons/chevron-down.js
var __iconNode = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]];
var ChevronDown = createLucideIcon("chevron-down", __iconNode);

// node_modules/lucide-react/dist/esm/icons/chevron-up.js
var __iconNode2 = [["path", { d: "m18 15-6-6-6 6", key: "153udz" }]];
var ChevronUp = createLucideIcon("chevron-up", __iconNode2);

// node_modules/lucide-react/dist/esm/icons/graduation-cap.js
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

// node_modules/lucide-react/dist/esm/icons/guitar.js
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
  return /* @__PURE__ */ React9.createElement(
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
  const [playing, setPlaying] = useState4(null);
  const timer = useRef6(null);
  const stop = useRef6(null);
  useEffect4(() => () => {
    var _a;
    clearTimeout(timer.current);
    (_a = stop.current) == null ? void 0 : _a.call(stop);
  }, []);
  function renderKey(pitch, label, left, raised) {
    const enabled = enabledPitches.includes(pitch);
    const active2 = activePitch === pitch;
    const interactive = !inline && enabled && !!onAudition;
    const Element = interactive ? "button" : "span";
    return /* @__PURE__ */ React9.createElement(
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
      /* @__PURE__ */ React9.createElement(PitchDot, { pitch }),
      !inline && /* @__PURE__ */ React9.createElement(React9.Fragment, null, pitch === 0 && /* @__PURE__ */ React9.createElement("span", { className: "rawln-piano-tonic" }, tonicName(currentTonic)), label)
    );
  }
  return /* @__PURE__ */ React9.createElement("div", { className: `rawln-piano-keys${inline ? " rawln-piano-inline" : ""}` }, WHITE_KEYS.map((pitch, i) => renderKey(pitch, i + 1, i, false)), BLACK_KEYS.map((pitch, i) => pitch === null ? null : renderKey(pitch, BLACK_LABELS[i], i + 0.5, true)));
}
function InlinePianoLegend(props) {
  return /* @__PURE__ */ React9.createElement(PianoLegend, { ...props, inline: true });
}
function ChordRow({ mode, tonic, guitar, onAudition, setHoveredColors }) {
  var _a, _b;
  const [playing, setPlaying] = useState4(null);
  const timer = useRef6(null);
  useEffect4(() => () => clearTimeout(timer.current), []);
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
  return /* @__PURE__ */ React9.createElement("div", { className: "rawln-piano-mode" }, /* @__PURE__ */ React9.createElement("div", { className: "rawln-piano-chords", style: { "--rawln-piano-chord-count": voiced.length, height: (top - bottom) * 3 + 52 } }, voiced.map(({ name, pitches, positions, romanLabel }, i) => {
    var _a2;
    const showAbove = i < tonicIndex;
    const alternateLabel = guitar ? guitarName(name, pitches, tonic, minor) : void 0;
    const label = alternateLabel != null ? alternateLabel : romanName(name);
    const labelTop = 22 + (top - positions[showAbove ? positions.length - 1 : 0]) * 3 + (showAbove ? -20 : 9);
    const Element = onAudition ? "button" : "span";
    const clearHover = () => setHoveredColors == null ? void 0 : setHoveredColors(null);
    const preview = () => setHoveredColors == null ? void 0 : setHoveredColors(pitches.map((pitch) => `noteColor_${colorIndex(pitch)}_colors`));
    return /* @__PURE__ */ React9.createElement(
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
      positions.map((position, j) => /* @__PURE__ */ React9.createElement(
        "i",
        {
          key: `${j}-${(playing == null ? void 0 : playing.index) === i ? playing.serial : ""}`,
          "aria-hidden": "true",
          "data-playing": (playing == null ? void 0 : playing.index) === i || void 0,
          style: { top: 22 + (top - position) * 3, background: color(pitches[j]), animationDelay: `${ARPEGGIO_DELAY_MS * j}ms` }
        },
        /* @__PURE__ */ React9.createElement(PitchDot, { pitch: pitches[j] })
      )),
      /* @__PURE__ */ React9.createElement("span", { style: { top: labelTop } }, (_a2 = alternateLabel != null ? alternateLabel : romanLabel) != null ? _a2 : label)
    );
  })), mode.title && /* @__PURE__ */ React9.createElement("div", { className: "rawln-piano-mode-title" }, mode.title));
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
  const [mobile, setMobile] = useState4(getMobile);
  const [expanded, setExpanded] = useState4(() => storedExpansion(storageKey, mobile));
  const [scale, setScale] = useState4(null);
  const [highlight, setHighlight] = useState4(null);
  const [guitar, setGuitar] = useState4(false);
  const audition = useRef6(null);
  const legend = useRef6(null);
  useEffect4(() => {
    if (!expanded && legend.current) return reserveCollapsedLegendSpace(legend.current);
  }, [expanded]);
  function stop() {
    var _a;
    const run = audition.current;
    audition.current = null;
    (_a = run == null ? void 0 : run.cancel) == null ? void 0 : _a.call(run);
  }
  useEffect4(() => {
    var _a, _b;
    const media = (_a = window.matchMedia) == null ? void 0 : _a.call(window, MOBILE);
    const changed = (event) => setMobile(event.matches);
    (_b = media == null ? void 0 : media.addEventListener) == null ? void 0 : _b.call(media, "change", changed);
    return () => {
      var _a2;
      return (_a2 = media == null ? void 0 : media.removeEventListener) == null ? void 0 : _a2.call(media, "change", changed);
    };
  }, []);
  useEffect4(() => setExpanded(storedExpansion(storageKey, mobile)), [storageKey, mobile]);
  useEffect4(() => {
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
  return /* @__PURE__ */ React9.createElement("aside", { ref: legend, className: "rawln-piano-legend", "data-expanded": expanded }, /* @__PURE__ */ React9.createElement("div", { className: "rawln-piano-header" }, /* @__PURE__ */ React9.createElement(
    "button",
    {
      type: "button",
      className: "rawln-piano-fold",
      onClick: toggle,
      "aria-label": "Piano legend",
      "aria-expanded": expanded
    },
    /* @__PURE__ */ React9.createElement(Chevron, { size: 14, "aria-hidden": "true" }),
    !expanded && /* @__PURE__ */ React9.createElement(InlinePianoLegend, null)
  ), expanded && /* @__PURE__ */ React9.createElement(
    "button",
    {
      type: "button",
      className: "rawln-piano-names",
      "aria-pressed": guitar,
      "aria-label": chordNamesLabel,
      title: chordNamesLabel,
      onClick: () => setGuitar(!guitar)
    },
    /* @__PURE__ */ React9.createElement(GraduationCap, { size: 14, className: "rawln-piano-name-roman", "aria-hidden": "true" }),
    /* @__PURE__ */ React9.createElement("span", { className: "rawln-piano-name-track", "aria-hidden": "true" }),
    /* @__PURE__ */ React9.createElement(Guitar, { size: 14, className: "rawln-piano-name-guitar", "aria-hidden": "true" })
  )), /* @__PURE__ */ React9.createElement("div", { className: "rawln-piano-panel", hidden: !expanded }, expanded && /* @__PURE__ */ React9.createElement(React9.Fragment, null, modes.map((mode, i) => /* @__PURE__ */ React9.createElement(
    ChordRow,
    {
      key: i,
      mode,
      tonic: currentTonic,
      guitar,
      onAudition: onAudition ? play : void 0,
      setHoveredColors
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "rawln-piano-octaves" }, [0, 12].map((octave2) => /* @__PURE__ */ React9.createElement(
    PianoLegend,
    {
      key: octave2,
      currentTonic: currentTonic + octave2,
      enabledPitches: scale != null ? scale : ALL_PITCHES,
      activePitch: highlight == null ? null : highlight - octave2,
      onAudition: onAudition ? play : void 0
    }
  ))), SCALES.map((group) => /* @__PURE__ */ React9.createElement("div", { key: group.label, className: "rawln-piano-scale-row" }, /* @__PURE__ */ React9.createElement("span", { style: { background: color(group.color), color: RAWL_COLORS[group.color].foreground } }, group.label), group.scales.map(([label, pitches]) => {
    const Element = onAudition ? "button" : "span";
    return /* @__PURE__ */ React9.createElement(
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

// src/components/score-pinch.ts
import React10, {
  useEffect as useEffect5,
  useLayoutEffect as useLayoutEffect4,
  useReducer,
  useRef as useRef7
} from "react";
import { unstable_batchedUpdates } from "react-dom";
var clamp3 = (value, min, max) => Math.min(max, Math.max(min, value));
var ScorePinchContent = React10.memo(
  ({
    children,
    fitWidth = false
  }) => React10.createElement(
    "div",
    {
      "data-score-pinch-content": "",
      // Include section end margins in the scrollable width, even when the
      // score is wider than the viewport.
      style: { width: fitWidth ? "100%" : "max-content", minWidth: "100%" }
    },
    children
  ),
  (previous, next) => next.activeRef.current || previous.children === next.children && previous.fitWidth === next.fitWidth
);
function useScorePinch(containerRef, noteHeight, secondWidth, setNoteHeight, setSecondWidth, enabled = true) {
  const dimensions = useRef7({ noteHeight, secondWidth });
  dimensions.current = { noteHeight, secondWidth };
  const activeRef = useRef7(false);
  const clearPreviewRef = useRef7(null);
  const [, refreshScore] = useReducer((revision) => revision + 1, 0);
  useLayoutEffect4(() => {
    var _a;
    if (!activeRef.current) (_a = clearPreviewRef.current) == null ? void 0 : _a.call(clearPreviewRef);
  });
  useEffect5(() => {
    const container = containerRef.current;
    const content = container == null ? void 0 : container.querySelector(
      "[data-score-pinch-content]"
    );
    if (!container || !content || !enabled) return;
    let base = null;
    let pending = null;
    let wheelTimer;
    let touchPinch = null;
    let axis = null;
    const clearPreview = () => {
      content.style.transform = "";
      content.style.transformOrigin = "";
      content.style.willChange = "";
      content.style.pointerEvents = "";
      container.removeAttribute("data-score-pinching");
    };
    clearPreviewRef.current = clearPreview;
    const begin = (clientX, clientY) => {
      if (base) return;
      base = { ...dimensions.current };
      pending = { ...base };
      activeRef.current = true;
      const rect = content.getBoundingClientRect();
      content.style.transformOrigin = `${clientX - rect.left}px ${clientY - rect.top}px`;
      content.style.willChange = "transform";
      content.style.pointerEvents = "none";
      container.setAttribute("data-score-pinching", "true");
    };
    const preview = (next) => {
      if (!base) return;
      pending = {
        secondWidth: axis === "horizontal" ? clamp3(next.secondWidth, 2, 150) : base.secondWidth,
        noteHeight: axis === "vertical" ? clamp3(next.noteHeight, 1, 10) : base.noteHeight
      };
      content.style.transform = `scale(${pending.secondWidth / base.secondWidth}, ${pending.noteHeight / base.noteHeight})`;
    };
    const finish = (commit = true) => {
      clearTimeout(wheelTimer);
      touchPinch = null;
      axis = null;
      if (!base || !pending) return;
      const next = commit ? pending : base;
      base = null;
      pending = null;
      activeRef.current = false;
      unstable_batchedUpdates(() => {
        setSecondWidth(next.secondWidth);
        setNoteHeight(next.noteHeight);
        refreshScore();
      });
    };
    const onWheel = (event) => {
      if (!event.ctrlKey || touchPinch) return;
      event.preventDefault();
      begin(event.clientX, event.clientY);
      if (!axis) axis = event.shiftKey ? "vertical" : "horizontal";
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? container.clientHeight : 1);
      const scale = Math.exp(-clamp3(delta, -100, 100) * 0.01);
      preview({
        secondWidth: pending.secondWidth * scale,
        noteHeight: pending.noteHeight * scale
      });
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => finish(), 150);
    };
    const onTouchStart = (event) => {
      if (event.touches.length !== 2) {
        finish();
        return;
      }
      event.preventDefault();
      finish();
      const [a, b] = Array.from(event.touches);
      begin((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      touchPinch = {
        ids: [a.identifier, b.identifier],
        x: Math.abs(a.clientX - b.clientX),
        y: Math.abs(a.clientY - b.clientY)
      };
    };
    const onTouchMove = (event) => {
      if (!touchPinch || !base || event.touches.length !== 2) return;
      event.preventDefault();
      const touches = Array.from(event.touches);
      const a = touches.find((touch) => touch.identifier === touchPinch.ids[0]);
      const b = touches.find((touch) => touch.identifier === touchPinch.ids[1]);
      if (!a || !b) return;
      const x = Math.abs(a.clientX - b.clientX);
      const y = Math.abs(a.clientY - b.clientY);
      if (!axis) {
        const dx = touchPinch.x >= 24 ? Math.abs(x - touchPinch.x) : 0;
        const dy = touchPinch.y >= 24 ? Math.abs(y - touchPinch.y) : 0;
        if (Math.max(dx, dy) < 3) return;
        if (dx > dy * 1.5) axis = "horizontal";
        else if (dy > dx * 1.5) axis = "vertical";
        else return;
      }
      preview({
        secondWidth: base.secondWidth * (touchPinch.x >= 24 ? x / touchPinch.x : 1),
        noteHeight: base.noteHeight * (touchPinch.y >= 24 ? y / touchPinch.y : 1)
      });
    };
    const onTouchEnd = () => finish();
    const onTouchCancel = () => finish(false);
    const onBlur = () => finish();
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("touchcancel", onTouchCancel);
    window.addEventListener("blur", onBlur);
    return () => {
      clearTimeout(wheelTimer);
      activeRef.current = false;
      clearPreview();
      clearPreviewRef.current = null;
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchCancel);
      window.removeEventListener("blur", onBlur);
    };
  }, [containerRef, enabled, setNoteHeight, setSecondWidth]);
  return activeRef;
}
export {
  FoldablePianoLegend,
  InlinePianoLegend,
  PianoLegend,
  PlaybackFooter,
  PlaybackMeasureBorders,
  PlaybackMeasureLayer,
  RawlMeasureHeader,
  RomanNumeral,
  ScorePinchContent,
  ScoreSizeSliders,
  TonalGrid,
  TonicSymbol,
  observePlaybackPosition,
  useScorePinch
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
