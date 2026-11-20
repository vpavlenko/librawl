/*! librawl version: 0.4.1-local; audio source sha256: 76f73238ecd37f8747ca6b9c5ea8b19675b7cc1977a886b66f6012c991fda089; GPL-3.0-only */
var TonalGrid = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
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
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/notation/score-grid-browser.mjs
  var score_grid_browser_exports = {};
  __export(score_grid_browser_exports, {
    alignScoreRows: () => alignScoreRows,
    appendMeasureGuides: () => appendMeasureGuides,
    guidePitches: () => guidePitches,
    keyMarkers: () => keyMarkers,
    measureSubdivisionBeats: () => measureSubdivisionBeats,
    mount: () => mount,
    segments: () => segments,
    tonicAtBeat: () => tonicAtBeat
  });

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

  // src/notation/score-grid.mjs
  var octave = (value) => (value % 12 + 12) % 12;
  var TONIC_NAMES = ["C", "D\u266D", "D", "E\u266D", "E", "F", "F\u266F", "G", "A\u266D", "A", "B\u266D", "B"];
  var MODULATION_BADGE_WIDTH = 80;
  var pitchClass = (value) => value == null || !Number.isInteger(Number(value)) ? null : octave(Number(value));
  function tonicEvents(tonic, changes = [], end = Infinity) {
    var _a;
    const entries = [{ beat: 0, tonic }, ...changes].map((entry) => ({ ...entry, beat: Number(entry.beat), tonic: pitchClass(entry.tonic) })).filter((entry) => Number.isFinite(entry.beat) && entry.beat <= end).map((entry) => ({ ...entry, beat: Math.max(0, entry.beat) })).sort((a, b) => a.beat - b.beat);
    const timeline2 = [];
    for (const entry of entries) {
      if (((_a = timeline2.at(-1)) == null ? void 0 : _a.beat) === entry.beat) timeline2[timeline2.length - 1] = entry;
      else timeline2.push(entry);
    }
    return timeline2.filter((entry, index) => index === 0 || entry.tonic !== timeline2[index - 1].tonic);
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

  // src/notation/score-grid-browser.mjs
  var timeline = ({ tonic, changes, beats }) => Number.isFinite(beats) && beats > 0 ? tonicEvents(tonic, changes, beats) : [];
  function segments(options) {
    return tonicRegions(timeline(options), 0, options.beats).map(({ start, ...region }) => ({ ...region, beat: start }));
  }
  function keyMarkers(options) {
    return tonicMarkers(timeline(options)).map(({ delta, ...marker }) => marker);
  }
  function tonicAtBeat(options, beat, includeBoundary = false) {
    var _a, _b;
    const keys = timeline(options);
    let tonic = (_b = (_a = keys[0]) == null ? void 0 : _a.tonic) != null ? _b : null;
    for (const region of keys) {
      if (includeBoundary ? region.beat <= beat : region.beat < beat) tonic = region.tonic;
      else break;
    }
    return tonic;
  }
  var length = (value) => typeof value === "number" ? value + "px" : value;
  function appendMeasureGuides(score, {
    measures = [],
    beats = [],
    barClass = "rawl-guide",
    beatClass = "rawl-beat",
    phraseClass = "phrase-start",
    top,
    height
  }) {
    const rulerLine = (entry, className) => {
      var _a, _b;
      const element = score.ownerDocument.createElement("div");
      element.className = className;
      element.style.left = length(entry.left);
      const y = (_a = entry.top) != null ? _a : top, size = (_b = entry.height) != null ? _b : height;
      if (y != null) element.style.top = length(y);
      if (size != null) {
        element.style.height = length(size);
        element.style.bottom = "auto";
      }
      if (entry.beat != null) element.dataset.beat = entry.beat;
      if (entry.row != null) element.dataset.row = entry.row;
      score.append(element);
      return element;
    };
    const bars = measures.map((entry) => {
      const className = [barClass, entry.phrase && phraseClass, entry.terminal && "terminal", entry.edge && "edge-label"].filter(Boolean).join(" ");
      const measure = rulerLine(entry, className);
      if (entry.sectionEnd != null) measure.dataset.sectionEnd = entry.sectionEnd;
      if (entry.number != null) measure.dataset.measure = entry.number;
      if (entry.number != null && !entry.terminal && entry.showLabel !== false) {
        const label = score.ownerDocument.createElement("span");
        label.textContent = entry.number;
        measure.append(label);
      }
      return measure;
    });
    return { bars, beatLines: beats.map((entry) => rulerLine(entry, beatClass)) };
  }
  function layer(document, className, height, zIndex) {
    const element = document.createElement("div");
    element.className = className;
    element.setAttribute("aria-hidden", "true");
    element.style.cssText = `position:absolute;left:0;top:0;width:100%;height:${height}px;pointer-events:none;overflow:hidden;z-index:${zIndex}`;
    return element;
  }
  function arrow(direction) {
    const paths = direction === "down" ? ["M12 5v14", "m19 12-7 7-7-7"] : ["m5 12 7-7 7 7", "M12 19V5"];
    const content = paths.map((path) => `<path d="${path}" />`).join(" ");
    return `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-arrow-${direction}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${content}</svg>`;
  }
  function mount(score, options) {
    var _a, _b, _c, _d, _e;
    const document = score.ownerDocument;
    const existingGrid = options.reuse ? score.querySelector(":scope > .tonal-grid") : null;
    const existingMarkers = options.reuse ? score.querySelector(":scope > .tonal-grid-markers") : null;
    if (!options.reuse) {
      score.querySelectorAll(":scope > .tonal-grid,:scope > .tonal-grid-markers").forEach((element) => element.remove());
    }
    const { low, high, pitchToY, beats, top = 16, height = score.clientHeight, showTonicMarkers = true } = options;
    const start = (_a = options.startBeat) != null ? _a : 0, end = (_b = options.endBeat) != null ? _b : beats;
    const regions = tonicRegions(timeline(options), start, end).map(({ start: start2, ...region }) => ({ ...region, beat: start2 }));
    if (options.boundaryTonic != null) regions.push({ beat: end, end, tonic: options.boundaryTonic, boundary: true });
    const step = Math.abs(pitchToY(low + 1) - pitchToY(low));
    if (!regions.length || !Number.isFinite(step) || step <= 0) return { segments: regions, destroy() {
    } };
    const grid = existingGrid != null ? existingGrid : layer(document, "tonal-grid", height, 0);
    const markers = existingMarkers != null ? existingMarkers : layer(document, "tonal-grid-markers", top, 3);
    grid.replaceChildren();
    markers.replaceChildren();
    grid.style.height = height + "px";
    grid.style.clipPath = `inset(${top}px -30px 0 0)`;
    grid.style.overflow = "visible";
    const percent = (beat) => beat / beats * 100 + "%";
    const positions = regions.map((region) => ({
      tonic: region.tonic,
      left: percent(region.beat),
      width: region.boundary ? "30px" : percent(region.end - region.beat)
    }));
    for (const { kind, pitch, y, tonic, left, width } of positionedTonalGuides(positions, { low, high }, (pitch2) => pitchToY(pitch2) + step)) {
      const line = document.createElement("div");
      line.className = "tonal-grid-" + kind;
      line.dataset.pitch = pitch;
      line.dataset.tonic = tonic;
      line.style.cssText = `position:absolute;left:${left};width:${width};pointer-events:none;z-index:0;top:${y}px;` + (kind === "tonic" ? `height:${step * 0.5}px;background:linear-gradient(to top,#333,transparent)` : "height:0;border-bottom:.5px dashed #333");
      grid.append(line);
    }
    for (const region of (_c = options.markerEvents) != null ? _c : keyMarkers(options)) {
      const { tonic, delta } = tonicMarkers([{ tonic: (_d = region.previousTonic) != null ? _d : null }, region]).at(-1);
      if (!showTonicMarkers || tonic == null || region.beat < start || region.beat >= end) continue;
      const left = percent(region.beat), offset = delta == null ? 18 : 30;
      if (delta != null) {
        const badge = document.createElement("div");
        badge.className = "tonal-grid-key-badge";
        badge.dataset.tonic = tonic;
        const color = RAWL_COLORS[(delta + 12) % 12].background;
        badge.style.cssText = `position:absolute;left:${left};top:0;width:${MODULATION_BADGE_WIDTH}px;height:12px;pointer-events:none;background:${color};mask-image:linear-gradient(to right,#000,transparent);-webkit-mask-image:linear-gradient(to right,#000,transparent)`;
        markers.append(badge);
      }
      const label = document.createElement("span");
      label.className = "tonal-grid-key";
      label.dataset.tonic = tonic;
      label.dataset.anchor = region.beat / beats;
      label.dataset.offset = offset;
      if (delta != null) {
        label.innerHTML = arrow(delta < 0 ? "down" : "up");
        label.append(document.createTextNode(`${Math.abs(delta)} `));
      }
      label.append(document.createTextNode((_e = region.label) != null ? _e : TONIC_NAMES[tonic]));
      label.style.cssText = `position:absolute;top:-2px;left:calc(${left} + ${offset}px);font:700 12px/16px sans-serif;color:#fff;white-space:nowrap;user-select:none;pointer-events:none;z-index:1`;
      markers.append(label);
    }
    score.prepend(grid);
    if (showTonicMarkers) score.append(markers);
    return { segments: regions, destroy() {
      grid.remove();
      markers.remove();
    } };
  }
  return __toCommonJS(score_grid_browser_exports);
})();
if(typeof window!=='undefined')window.TonalGrid=TonalGrid;if(typeof module==='object'&&module.exports)module.exports=TonalGrid;
