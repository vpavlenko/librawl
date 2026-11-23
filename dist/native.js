/*! librawl version: 0.4.1-local; audio source sha256: 76f73238ecd37f8747ca6b9c5ea8b19675b7cc1977a886b66f6012c991fda089; GPL-3.0-only */

// src/rawlnative/voiceHover.ts
function voiceHoverContains(hover, index) {
  return Array.isArray(hover) ? hover.includes(index) : hover === index;
}

// src/rawlnative/tonalPitchStops.ts
function applyTonalPitchStops(curve, tonalStops, basePitch, width) {
  var _a;
  let shift = tonalStops[0].pitchClass - basePitch;
  let next = 1;
  const result = [];
  for (const [index, point] of curve.entries()) {
    while (next < tonalStops.length && tonalStops[next].offset * width <= point.x) {
      const { offset, pitchClass } = tonalStops[next++];
      const x = offset * width;
      const previous = (_a = curve[index - 1]) != null ? _a : point;
      const pitch2 = point.x === previous.x ? point.pitch : previous.pitch + (point.pitch - previous.pitch) * (x - previous.x) / (point.x - previous.x);
      result.push({ x, pitch: pitch2 + shift });
      shift = pitchClass - basePitch;
      result.push({ x, pitch: pitch2 + shift });
    }
    const pitch = point.pitch + shift;
    const last = result.at(-1);
    if ((last == null ? void 0 : last.x) !== point.x || last.pitch !== pitch) result.push({ x: point.x, pitch });
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

// src/rawlnative/colors.mjs
var pitchColor = (pitch) => `var(--pitch-color-${(pitch % 12 + 12) % 12})`;
var interpolatedPitchColor = (pitch) => {
  const lower = Math.floor(pitch);
  const fraction = pitch - lower;
  return fraction === 0 ? pitchColor(lower) : `color-mix(in srgb, ${pitchColor(lower)} ${(1 - fraction) * 100}%, ${pitchColor(lower + 1)})`;
};
var noteColorClass = (pitch) => `noteColor_${pitch}_colors`;
var notePitchDotClass = (pitch) => {
  if (!Number.isFinite(pitch)) return "";
  const nearest = Math.round(pitch);
  const pitchClass = (nearest % 12 + 12) % 12;
  return Math.abs(pitch - nearest) <= 0.25 && RAWL_COLORS[pitchClass].dot ? `pitchDot_${pitchClass}` : "";
};
var noteLetterColors = (prefix = "") => RAWL_COLORS.map(({ foreground }, pitch) => `
    ${prefix}.${noteColorClass(pitch)} {
      color: ${foreground} !important;
      background-color: ${pitchColor(pitch)} !important;
      --background-color: ${pitchColor(pitch)};
    }
  `).join("\n");

// src/rawlnative/pitchBend.ts
var QUARTER_TONE_MARKER_SIZE = 1;
var QUARTER_TONE_MARKER_OFFSET = 2;
var pitchBendToSemitones = (value) => (Math.max(0, Math.min(16383, value)) - 8192) / 4096;
var isQuarterTonePitch = (pitch) => {
  const fraction = pitch - Math.floor(pitch);
  return fraction >= 0.25 && fraction <= 0.75;
};
var getQuarterToneMarkerPosition = (pitch) => {
  if (!isQuarterTonePitch(pitch)) return null;
  const lowerPitchClass = (Math.floor(pitch) % 12 + 12) % 12;
  return [1, 3, 5, 8, 10].includes(lowerPitchClass) ? "below" : "above";
};
function getPitchBendSamples(points, span) {
  const byTime = /* @__PURE__ */ new Map();
  points.filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value)).sort((a, b) => a.time - b.time).forEach((point) => {
    if (point.time < span[1])
      byTime.set(Math.max(span[0], point.time), pitchBendToSemitones(point.value));
  });
  const samples = Array.from(byTime, ([time, bend]) => ({ time, bend }));
  if (!samples.length || samples[0].time > span[0])
    samples.unshift({ time: span[0], bend: 0 });
  samples.push({ time: span[1], bend: samples[samples.length - 1].bend });
  return samples;
}
function getStaticPitchBend(note) {
  var _a;
  if (note.isDrum || !((_a = note.pitchBend) == null ? void 0 : _a.length)) return 0;
  const samples = getPitchBendSamples(note.pitchBend, note.span);
  const bend = samples[0].bend;
  return samples.every((sample) => sample.bend === bend) ? bend : null;
}
function getNotePitchAtTime(note, time = note.span[0]) {
  var _a;
  if (note.isDrum || !((_a = note.pitchBend) == null ? void 0 : _a.length)) return note.note.midiNumber;
  const samples = getPitchBendSamples(note.pitchBend, note.span);
  const clampedTime = Math.max(note.span[0], Math.min(note.span[1], time));
  const next = samples.findIndex((sample) => sample.time > clampedTime);
  if (next < 0) return note.note.midiNumber + samples[samples.length - 1].bend;
  const before = samples[Math.max(0, next - 1)];
  const after = samples[next];
  const fraction = after.time === before.time ? 0 : (clampedTime - before.time) / (after.time - before.time);
  return note.note.midiNumber + before.bend + fraction * (after.bend - before.bend);
}

// src/rawlnative/getNoteRectangles.tsx
import * as React from "react";

// src/rawlnative/drumPlayback.ts
import { createContext, useMemo } from "react";
var DrumPlaybackContext = createContext(null);
var useDrumPlaybackClock = () => useMemo(() => {
  const buckets = /* @__PURE__ */ new Map();
  let previousPosition = null;
  let includePrevious = true;
  const register = (start, pulse) => {
    if (!Number.isFinite(start)) return () => {
    };
    const second = Math.floor(start);
    let bucket = buckets.get(second);
    if (!bucket) buckets.set(second, bucket = /* @__PURE__ */ new Set());
    const entry = { start, pulse };
    bucket.add(entry);
    return () => {
      bucket.delete(entry);
      if (!bucket.size) buckets.delete(second);
    };
  };
  return {
    register,
    reset: () => {
      previousPosition = null;
      includePrevious = true;
    },
    advance: (time) => {
      var _a;
      if (!Number.isFinite(time)) return;
      const previous = previousPosition;
      previousPosition = time;
      if (previous === null || time < previous || time - previous > 0.5) {
        includePrevious = true;
        return;
      }
      if (time === previous) return;
      for (let second = Math.floor(previous); second <= Math.floor(time); second++) {
        (_a = buckets.get(second)) == null ? void 0 : _a.forEach(({ start, pulse }) => {
          if ((includePrevious ? start >= previous : start > previous) && start <= time) pulse();
        });
      }
      includePrevious = false;
    }
  };
}, []);

// src/rawlnative/notePlayback.ts
import { createContext as createContext2, useMemo as useMemo2 } from "react";

// src/rawlnative/playbackIndex.ts
function createNotePlaybackIndex() {
  const levels = /* @__PURE__ */ new Map();
  const active = /* @__PURE__ */ new Set();
  let position = null;
  function setPlaying(entry, playing) {
    if (active.has(entry) === playing) return;
    if (playing) active.add(entry);
    else active.delete(entry);
    entry.update(playing);
  }
  return {
    register(start, end, update) {
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        update(false);
        return () => {
        };
      }
      const entry = { start, end, update };
      let width = 1;
      while ((end - start) / width > 64) width *= 64;
      let buckets = levels.get(width);
      if (!buckets) levels.set(width, buckets = /* @__PURE__ */ new Map());
      const first = Math.floor(start / width);
      const last = Math.ceil(end / width) - 1;
      for (let second = first; second <= last; second++) {
        let bucket = buckets.get(second);
        if (!bucket) buckets.set(second, bucket = /* @__PURE__ */ new Set());
        bucket.add(entry);
      }
      const playing = position !== null && start <= position && position < end;
      if (playing) active.add(entry);
      update(playing);
      return () => {
        active.delete(entry);
        for (let second = first; second <= last; second++) {
          const bucket = buckets.get(second);
          bucket.delete(entry);
          if (!bucket.size) buckets.delete(second);
        }
        if (!buckets.size) levels.delete(width);
      };
    },
    reset() {
      active.forEach((entry) => setPlaying(entry, false));
      position = null;
    },
    advance(time) {
      if (!Number.isFinite(time) || time === position) return;
      active.forEach((entry) => {
        if (time < entry.start || time >= entry.end) setPlaying(entry, false);
      });
      levels.forEach((buckets, width) => {
        var _a;
        (_a = buckets.get(Math.floor(time / width))) == null ? void 0 : _a.forEach((entry) => {
          if (entry.start <= time && time < entry.end) setPlaying(entry, true);
        });
      });
      position = time;
    }
  };
}
function findPlaybackMeasure(measures, time) {
  if (!Number.isFinite(time) || !measures.length || time < measures[0]) return null;
  let low = 0;
  let high = measures.length;
  while (low < high) {
    const middle = low + high >>> 1;
    if (measures[middle] <= time) low = middle + 1;
    else high = middle;
  }
  return low;
}
function createSectionPlaybackClock() {
  const sectionIndex = createNotePlaybackIndex();
  const unscoped = createNotePlaybackIndex();
  const groups = /* @__PURE__ */ new Map();
  const activeGroups = /* @__PURE__ */ new Set();
  let position = null;
  return {
    register(start, end, update, section) {
      if (!section) return unscoped.register(start, end, update);
      const key = `${section[0]}:${section[1]}`;
      let group = groups.get(key);
      if (!group) {
        const created = { index: createNotePlaybackIndex(), count: 0, remove: () => {
        } };
        group = created;
        groups.set(key, created);
        created.remove = sectionIndex.register(section[0], section[1], (playing) => {
          if (playing) activeGroups.add(created);
          else {
            activeGroups.delete(created);
            created.index.reset();
          }
        });
        if (position !== null && activeGroups.has(created)) created.index.advance(position);
      }
      group.count++;
      const unregister = group.index.register(Math.max(start, section[0]), Math.min(end, section[1]), update);
      return () => {
        unregister();
        if (--group.count === 0) {
          group.remove();
          activeGroups.delete(group);
          groups.delete(key);
        }
      };
    },
    reset() {
      sectionIndex.reset();
      unscoped.reset();
      position = null;
    },
    advance(time) {
      if (!Number.isFinite(time)) return;
      position = time;
      sectionIndex.advance(time);
      activeGroups.forEach((group) => group.index.advance(time));
      unscoped.advance(time);
    }
  };
}

// src/rawlnative/notePlayback.ts
var NotePlaybackContext = createContext2(null);
var PlaybackSectionContext = createContext2(null);
var useNotePlaybackClock = () => useMemo2(createSectionPlaybackClock, []);

// src/rawlnative/voiceOrderContext.ts
import { createContext as createContext3 } from "react";
var VoiceZIndicesContext = createContext3(/* @__PURE__ */ new Map());

// src/rawlnative/strumContext.ts
import { createContext as createContext4 } from "react";
var StrumNotesContext = createContext4(/* @__PURE__ */ new Set());

// src/rawlnative/getNoteRectangles.tsx
var GM_DRUM_KIT = {
  28: "\u{1F91C}",
  31: "\u{1F552}",
  //"Metronome Click",
  35: "\u{1F9B5}",
  //"Acoustic Bass Drum",
  36: "\u{1F9B6}\u{1F3FC}",
  //"Bass Drum 1",
  37: "\u{1F3D1}",
  //"Side Stick",
  38: "\u{1F941}",
  //"Acoustic Snare",
  39: "\u{1F44F}",
  //"Hand Clap",
  40: "\u26A1",
  //"Electric Snare",
  41: "0\uFE0F\u20E3",
  //"Low Floor Tom",
  42: "\u{1F512}",
  // "Closed Hi Hat",
  43: "1\uFE0F\u20E3",
  //"High Floor Tom",
  44: "\u{1F6B4}\u200D\u2640\uFE0F",
  //"Pedal Hi-Hat",
  45: "2\uFE0F\u20E3",
  //"Low Tom",
  46: "\u{1F4BF}",
  //"Open Hi-Hat",
  47: "3\uFE0F\u20E3",
  // "Low-Mid Tom",
  48: "4\uFE0F\u20E3",
  //"Hi-Mid Tom",
  49: "\u{1F4A5}",
  //"Crash Cymbal 1",
  50: "5\uFE0F\u20E3",
  //"High Tom",
  51: "\u{1F697}",
  //"Ride Cymbal 1",
  52: "\u{1F1E8}\u{1F1F3}",
  //"Chinese Cymbal",
  53: "\u{1F6CE}\uFE0F",
  //"Ride Bell",
  54: "\u23F0",
  //"Tambourine",
  55: "\u{1F4A6}",
  //"Splash Cymbal",
  56: "\u{1F404}",
  57: "\u{1F525}",
  //"Crash Cymbal 2",
  58: "\u{1F4F3}",
  59: "\u{1F699}",
  //"Ride Cymbal 2",
  60: "\u{1F53C}",
  61: "\u{1F53D}",
  62: "\u{1F57A}",
  63: "\u{1F483}",
  64: "\u{1FA98}",
  65: "\u2B06\uFE0F",
  66: "\u2B07\uFE0F",
  67: "\u{1F5FC}",
  68: "\u{1F366}",
  69: "\u{1F361}",
  70: "\u{1F389}",
  71: "\u{1F426}",
  72: "\u{1F4A8}",
  73: "#\uFE0F\u20E3",
  74: "\u{1F4F6}",
  75: "\u{1F511}",
  76: "\u{1FAB5}",
  77: "\u{1F333}",
  78: "\u{1F42D}",
  79: "\u{1F1E7}\u{1F1F7}",
  80: "\u2A3B",
  81: "\u25B3",
  82: "\u26B1\uFE0F",
  //'Shaker',
  83: "\u{1F385}\u{1F3FB}",
  //"Jingle Bell",
  84: "\u{1F6BF}",
  85: "\u{1F330}",
  86: "\u{1F37A}",
  87: "\u{1F6E2}\uFE0F"
};
var ModulationOnsetEditingContext = React.createContext({
  active: false,
  isAllowed: (_note) => false
});
var DrumEmoji = ({ isPlayingNow, collapsed, startSeconds, size, left, top, zIndex, onClick, onMouseEnter, onMouseLeave, cursor, onsetAllowed, children }) => {
  const elementRef = React.useRef(null);
  const animationRef = React.useRef(null);
  const registerDrum = React.useContext(DrumPlaybackContext);
  const section = React.useContext(PlaybackSectionContext);
  const pulse = React.useCallback(() => {
    var _a;
    if (!elementRef.current || collapsed) return;
    (_a = animationRef.current) == null ? void 0 : _a.cancel();
    animationRef.current = elementRef.current.animate(
      [
        {
          fontSize: `${size * 4}px`,
          width: `${size * 4}px`,
          height: `${size * 4}px`,
          top: `${top - size * 3 / 2}px`
        },
        {
          fontSize: `${size}px`,
          width: `${size}px`,
          height: `${size}px`,
          top: `${top}px`
        }
      ],
      { duration: 1e3, easing: "ease-out", fill: "backwards" }
    );
  }, [size, top, collapsed]);
  React.useLayoutEffect(() => {
    var _a;
    if (collapsed) (_a = animationRef.current) == null ? void 0 : _a.cancel();
  }, [collapsed]);
  React.useLayoutEffect(() => {
    if (registerDrum && (!section || startSeconds >= section[0] && startSeconds < section[1])) {
      return registerDrum(startSeconds, pulse);
    }
  }, [registerDrum, startSeconds, pulse, section]);
  React.useLayoutEffect(() => {
    if (!registerDrum && isPlayingNow) pulse();
  }, [registerDrum, isPlayingNow, pulse]);
  React.useEffect(() => () => {
    var _a;
    return (_a = animationRef.current) == null ? void 0 : _a.cancel();
  }, []);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: elementRef,
      "data-modulation-onset-note": onClick ? "true" : void 0,
      "data-modulation-onset-allowed": onsetAllowed ? "true" : void 0,
      onClick,
      onMouseEnter,
      onMouseLeave,
      style: {
        position: "absolute",
        fontSize: collapsed ? 0 : size,
        height: collapsed ? 1 : size,
        width: size,
        lineHeight: 1,
        overflow: "visible",
        left,
        top: collapsed ? top + size / 2 : top,
        backgroundColor: collapsed ? "#888" : void 0,
        pointerEvents: onClick ? "auto" : "none",
        cursor: cursor != null ? cursor : onClick ? "e-resize" : void 0,
        fontFamily: "Helvetica, sans-serif",
        color: "white",
        transform: "translateX(-50%)",
        transition: "none",
        whiteSpace: "nowrap",
        zIndex: zIndex != null ? zIndex : collapsed ? 10 : 1e3
      }
    },
    children
  );
};
var nextPitchBendGradientId = 0;
var PitchBendNote = ({
  points,
  span,
  height,
  width,
  secondsToX,
  pitchToOffset,
  colorPitchClass,
  tonalPitchStops,
  outlined,
  interactive
}) => {
  const [gradientId] = React.useState(
    () => `pitch-bend-gradient-${nextPitchBendGradientId++}`
  );
  const startX = secondsToX(span[0]);
  const samples = getPitchBendSamples(points, span).map((point) => ({
    x: Math.max(0, Math.min(width, secondsToX(point.time) - startX)),
    bend: point.bend
  }));
  if (!samples.length || width <= 0) return null;
  const edge = (sample, bottom) => `${sample.x} ${pitchToOffset(sample.bend) + (bottom ? height : 0)}`;
  const path = `M ${samples.map((sample) => edge(sample, false)).join(" L ")} L ${[...samples].reverse().map((sample) => edge(sample, true)).join(" L ")} Z`;
  const stops = [];
  const basePitch = typeof colorPitchClass === "number" ? colorPitchClass : 0;
  samples.forEach((sample, index) => {
    const pitch = basePitch + sample.bend;
    if (index > 0) {
      const previous = samples[index - 1];
      const previousPitch = basePitch + previous.bend;
      const crossings = [];
      for (let anchor = Math.floor(Math.min(previousPitch, pitch)) + 1; anchor < Math.max(previousPitch, pitch); anchor++) {
        crossings.push({
          x: previous.x + (sample.x - previous.x) * ((anchor - previousPitch) / (pitch - previousPitch)),
          pitch: anchor
        });
      }
      if (pitch < previousPitch) crossings.reverse();
      stops.push(...crossings);
    }
    stops.push({ x: sample.x, pitch });
  });
  const colorStops = (tonalPitchStops == null ? void 0 : tonalPitchStops.length) ? applyTonalPitchStops(stops, tonalPitchStops, basePitch, width) : stops;
  return /* @__PURE__ */ React.createElement(
    "svg",
    {
      width,
      height,
      style: {
        position: "absolute",
        inset: 0,
        overflow: "visible",
        pointerEvents: "none"
      }
    },
    /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement(
      "linearGradient",
      {
        id: gradientId,
        gradientUnits: "userSpaceOnUse",
        x1: 0,
        y1: 0,
        x2: width,
        y2: 0,
        colorInterpolation: "sRGB"
      },
      colorStops.map((stop, index) => /* @__PURE__ */ React.createElement(
        "stop",
        {
          key: index,
          offset: stop.x / width,
          stopColor: typeof colorPitchClass === "number" ? interpolatedPitchColor(stop.pitch) : "white"
        }
      ))
    )),
    /* @__PURE__ */ React.createElement(
      "path",
      {
        d: path,
        fill: `url(#${gradientId})`,
        stroke: outlined ? "black" : "none",
        strokeWidth: 0.5,
        strokeLinejoin: "round",
        style: { pointerEvents: interactive ? "visiblePainted" : "none" }
      }
    )
  );
};
var getNoteRectangles = (notes, midiNumberToY, noteHeight, handleNoteClick, handleMouseEnter, handleMouseLeave, secondsToX, enableManualRemeasuring, hoveredColors, showSourceLocation = false, drumNoteToY, hoveredVoiceIndex = null, sectionEndX, sectionStartX, getNoteAttributes) => {
  const renderableNotes = notes.filter((note) => note.span[1] > note.span[0]);
  const durationBucket = (note) => Math.round(Math.log(Math.max(1e-3, note.span[1] - note.span[0])) / Math.log(1.1));
  const notesByVoice = /* @__PURE__ */ new Map();
  renderableNotes.forEach((note) => {
    var _a, _b;
    const displayVoiceIndex = (_a = note.displayVoiceIndex) != null ? _a : note.voiceIndex;
    const voiceNotes = (_b = notesByVoice.get(displayVoiceIndex)) != null ? _b : [];
    voiceNotes.push(note);
    notesByVoice.set(displayVoiceIndex, voiceNotes);
  });
  const stackingPriorities = /* @__PURE__ */ new Map();
  notesByVoice.forEach((voiceNotes) => {
    voiceNotes.sort(
      (a, b) => durationBucket(b) - durationBucket(a) || a.note.midiNumber - b.note.midiNumber
    );
    let rank = 0;
    const ranks = voiceNotes.map((note, index) => {
      const previous = voiceNotes[index - 1];
      if (previous && (durationBucket(previous) !== durationBucket(note) || previous.note.midiNumber !== note.note.midiNumber)) rank++;
      return rank;
    });
    voiceNotes.forEach((note, index) => {
      stackingPriorities.set(note, Math.round(ranks[index] * 999 / Math.max(1, rank)));
    });
  });
  return renderableNotes.map((note) => /* @__PURE__ */ React.createElement(
    NoteRectangle,
    {
      key: `nr_${note.id}`,
      note,
      stackingPriority: stackingPriorities.get(note),
      midiNumberToY,
      noteHeight,
      handleNoteClick,
      handleMouseEnter,
      handleMouseLeave,
      secondsToX,
      enableManualRemeasuring,
      hoveredColors,
      showSourceLocation,
      drumNoteToY,
      hoveredVoiceIndex,
      sectionEndX,
      sectionStartX,
      attributes: getNoteAttributes == null ? void 0 : getNoteAttributes(note)
    }
  ));
};
var NoteRectangle = React.memo(({
  note,
  stackingPriority,
  midiNumberToY,
  noteHeight,
  handleNoteClick,
  handleMouseEnter,
  handleMouseLeave,
  secondsToX,
  enableManualRemeasuring,
  hoveredColors,
  showSourceLocation,
  drumNoteToY,
  hoveredVoiceIndex,
  sectionEndX,
  sectionStartX,
  attributes
}) => {
  var _a, _b, _c, _d;
  const onsetEditing = React.useContext(ModulationOnsetEditingContext);
  const onsetCursor = onsetEditing.active && handleNoteClick ? onsetEditing.isAllowed(note) ? "crosshair" : "not-allowed" : void 0;
  const registerNote = React.useContext(NotePlaybackContext);
  const section = React.useContext(PlaybackSectionContext);
  const voiceZIndices = React.useContext(VoiceZIndicesContext);
  const strumNotes = React.useContext(StrumNotesContext);
  const isStrumNote = !note.isDrum && strumNotes.has(note.id);
  const displayVoiceIndex = (_a = note.displayVoiceIndex) != null ? _a : note.voiceIndex;
  const voiceZIndex = voiceZIndices.get(displayVoiceIndex);
  const [playing, setPlaying] = React.useState(false);
  const elementRef = React.useRef(null);
  const playingRef = React.useRef(false);
  const bendPlayingRef = React.useRef(false);
  const geometryRef = React.useRef(null);
  const updatePlaying = React.useCallback((active) => {
    playingRef.current = active;
    const geometry = geometryRef.current;
    if (!geometry) return;
    if (geometry.hasMovingPitchBend) {
      if (bendPlayingRef.current !== active) {
        bendPlayingRef.current = active;
        setPlaying(active);
      }
      return;
    }
    const element = elementRef.current;
    if (!element) return;
    const { showFullNote: showFullNote2, noteUnderCursor: noteUnderCursor2, baseHeight: baseHeight2, baseTop: baseTop2, collapsedHeight: collapsedHeight2 } = geometry;
    const height2 = showFullNote2 ? baseHeight2 * (active || noteUnderCursor2 ? 2 : 1) : collapsedHeight2;
    element.style.height = `${height2}px`;
    element.style.top = `${showFullNote2 ? baseTop2 - (height2 - baseHeight2) : baseTop2 + baseHeight2 - height2}px`;
  }, []);
  const isPlayingNow = registerNote && !note.isDrum ? playing : note.isPlayingNow;
  const {
    isDrum,
    note: { midiNumber, relativeNumber },
    color,
    voiceIndex,
    isActive,
    sourceLocation,
    noteUnderCursor
  } = note;
  const number = (_c = (_b = note.displayMidiNumber) != null ? _b : relativeNumber) != null ? _c : midiNumber;
  const staticBend = getStaticPitchBend(note);
  const rectangleBend = staticBend != null ? staticBend : 0;
  const heightScale = isStrumNote ? 0.5 : 1;
  const baseHeight = noteHeight * 2 * heightScale;
  const baseTop = (isDrum && drumNoteToY ? drumNoteToY(note) : midiNumberToY(isDrum ? number + 12 : number + rectangleBend)) - noteHeight + noteHeight * 2 * (1 - heightScale);
  const displaySpan = (_d = note.displaySpan) != null ? _d : note.span;
  const left = secondsToX(displaySpan[0]);
  const width = secondsToX(displaySpan[1]) - left;
  const noteZIndex = isStrumNote ? 5 : voiceZIndex !== void 0 ? voiceZIndex + stackingPriority : void 0;
  const isOtherVoice = hoveredVoiceIndex !== null && !voiceHoverContains(hoveredVoiceIndex, voiceIndex);
  const isHighlighted = !isOtherVoice && (isDrum || !hoveredColors || hoveredColors.includes(color));
  const showFullNote = voiceHoverContains(hoveredVoiceIndex, voiceIndex) || isActive && isHighlighted;
  const collapsedHeight = (isOtherVoice ? 1 : 0.5) * heightScale;
  const activeHeight = isPlayingNow ? baseHeight * 2 : baseHeight;
  const height = showFullNote ? noteUnderCursor ? baseHeight * 2 : activeHeight : collapsedHeight;
  const top = showFullNote ? noteUnderCursor ? baseTop - baseHeight : baseTop - (activeHeight - baseHeight) : baseTop + baseHeight - collapsedHeight;
  const hasMovingPitchBend = !isDrum && width > 0 && staticBend === null;
  const rectanglePitchClass = typeof note.colorPitchClass === "number" ? ((note.colorPitchClass + rectangleBend) % 12 + 12) % 12 : note.colorPitchClass;
  const rectangleColor = rectangleBend === 0 ? color : noteColorClass(rectanglePitchClass);
  const fractionalColor = typeof rectanglePitchClass === "number" && !Number.isInteger(rectanglePitchClass);
  const middlePitch = getNotePitchAtTime(note, (note.span[0] + note.span[1]) / 2);
  const middleBend = middlePitch - midiNumber;
  const pitchDotClass = !isDrum && typeof note.colorPitchClass === "number" ? notePitchDotClass(note.colorPitchClass + middleBend) : "";
  const quarterToneMarkerPosition = !pitchDotClass && !isDrum && typeof note.colorPitchClass === "number" ? getQuarterToneMarkerPosition(note.colorPitchClass + middleBend) : null;
  const markerBendOffset = hasMovingPitchBend ? midiNumberToY(number + middleBend) - midiNumberToY(number) : 0;
  const previewAtPointer = (event) => {
    const fraction = width > 0 ? (event.clientX - event.currentTarget.getBoundingClientRect().left) / width : 0;
    const time = displaySpan[0] + fraction * (displaySpan[1] - displaySpan[0]);
    handleMouseEnter(note, event, time);
  };
  geometryRef.current = {
    showFullNote,
    noteUnderCursor: !!noteUnderCursor,
    baseHeight,
    baseTop,
    collapsedHeight,
    hasMovingPitchBend
  };
  React.useLayoutEffect(() => {
    if (registerNote && !note.isDrum) {
      return registerNote(note.span[0], note.span[1], updatePlaying, section);
    }
  }, [registerNote, note.isDrum, note.span[0], note.span[1], section, updatePlaying]);
  React.useLayoutEffect(() => {
    if (registerNote && !note.isDrum) updatePlaying(playingRef.current);
  });
  const continuationLength = 30;
  const fadeInEnd = !isDrum && sectionStartX !== void 0 && left < sectionStartX ? sectionStartX - left : void 0;
  const fadeStart = !isDrum && sectionEndX !== void 0 && left + width > sectionEndX ? sectionEndX - left : void 0;
  const maskStops = [
    ...fadeInEnd !== void 0 ? [`transparent ${fadeInEnd - continuationLength}px`, `black ${fadeInEnd}px`] : [],
    ...fadeStart !== void 0 ? [`black ${fadeStart}px`, `transparent ${fadeStart + continuationLength}px`] : []
  ];
  const continuationMask = maskStops.length ? `linear-gradient(to right, ${maskStops.join(", ")})` : void 0;
  const clipLeft = fadeInEnd !== void 0 ? Math.max(0, fadeInEnd - continuationLength) : -1;
  const clipRight = fadeStart !== void 0 ? Math.max(0, width - fadeStart - continuationLength) : -1;
  const maskPadding = (hasMovingPitchBend ? noteHeight * 2 + 1 : 1) + (quarterToneMarkerPosition ? QUARTER_TONE_MARKER_OFFSET + QUARTER_TONE_MARKER_SIZE / 2 : 0);
  let sourceLocationText = "";
  if (sourceLocation) {
    const commandType = sourceLocation.command === "insert" ? "i" : sourceLocation.command === "copy" ? "c" : sourceLocation.command === "ac" ? "ac" : "";
    if (commandType && sourceLocation.row && sourceLocation.col) {
      sourceLocationText = `${commandType} ${sourceLocation.row},${sourceLocation.col}`;
    }
  }
  return isDrum ? isActive || voiceHoverContains(hoveredVoiceIndex, voiceIndex) ? /* @__PURE__ */ React.createElement(
    DrumEmoji,
    {
      key: `nr_${note.id}`,
      collapsed: !showFullNote,
      isPlayingNow,
      startSeconds: note.span[0],
      size: baseHeight * 1.5,
      left,
      top: baseTop - noteHeight / 2,
      zIndex: noteZIndex,
      cursor: onsetCursor,
      onMouseEnter: onsetEditing.active ? () => handleMouseEnter(note) : void 0,
      onMouseLeave: onsetEditing.active ? handleMouseLeave : void 0,
      onsetAllowed: !!handleNoteClick && onsetEditing.active && onsetEditing.isAllowed(note),
      onClick: (enableManualRemeasuring || onsetEditing.active) && handleNoteClick ? (e) => {
        e.stopPropagation();
        handleNoteClick(note, e);
      } : void 0
    },
    GM_DRUM_KIT[midiNumber] || midiNumber
  ) : null : /* @__PURE__ */ React.createElement(
    "div",
    {
      ...attributes,
      title: void 0,
      ref: elementRef,
      "data-note-id": note.id,
      "data-modulation-onset-note": handleNoteClick ? "true" : void 0,
      "data-modulation-onset-allowed": handleNoteClick && onsetEditing.active && onsetEditing.isAllowed(note) ? "true" : void 0,
      key: `nr_${note.id}`,
      className: `${hasMovingPitchBend ? "pitch-bend-note" : fractionalColor ? "fractional-pitch-note" : rectangleColor} voiceShape-${displayVoiceIndex} ${pitchDotClass} ${noteUnderCursor ? "note-under-cursor" : ""}${(attributes == null ? void 0 : attributes.className) ? ` ${attributes.className}` : ""}`,
      style: {
        position: "absolute",
        height: `${height}px`,
        width,
        overflow: "visible",
        top,
        left,
        maskImage: continuationMask,
        WebkitMaskImage: continuationMask,
        maskSize: `100% calc(100% + ${maskPadding * 2}px)`,
        WebkitMaskSize: `100% calc(100% + ${maskPadding * 2}px)`,
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskClip: "no-clip",
        WebkitMaskClip: "no-clip",
        clipPath: fadeInEnd !== void 0 || fadeStart !== void 0 ? `inset(-${maskPadding}px ${clipRight}px -${maskPadding}px ${clipLeft}px)` : void 0,
        pointerEvents: handleNoteClick && !hasMovingPitchBend ? "auto" : "none",
        zIndex: noteZIndex != null ? noteZIndex : 10 + stackingPriority + (noteUnderCursor ? 100 : 0),
        boxSizing: "border-box",
        backgroundColor: !hasMovingPitchBend && fractionalColor ? interpolatedPitchColor(rectanglePitchClass) : void 0,
        ...{ "--pitch-dot-offset": `${markerBendOffset}px` },
        display: "grid",
        boxShadow: showFullNote && !hasMovingPitchBend ? "0 0 0px 0.5px black" : "",
        cursor: onsetCursor != null ? onsetCursor : enableManualRemeasuring ? "e-resize" : handleNoteClick ? "pointer" : "default",
        opacity: noteUnderCursor ? 1 : void 0,
        ...attributes == null ? void 0 : attributes.style
      },
      onClick: (e) => {
        e.stopPropagation();
        if (handleNoteClick) {
          handleNoteClick(note, e);
        }
      },
      onMouseEnter: previewAtPointer,
      onMouseMove: previewAtPointer,
      onMouseLeave: () => !isDrum && handleMouseLeave()
    },
    hasMovingPitchBend && /* @__PURE__ */ React.createElement(
      PitchBendNote,
      {
        points: note.pitchBend,
        span: note.span,
        height,
        width,
        secondsToX,
        pitchToOffset: (bend) => midiNumberToY(number + bend) - midiNumberToY(number),
        colorPitchClass: note.colorPitchClass,
        tonalPitchStops: note.tonalPitchStops,
        outlined: showFullNote,
        interactive: !!handleNoteClick
      }
    ),
    showFullNote && quarterToneMarkerPosition && /* @__PURE__ */ React.createElement(
      "div",
      {
        "data-quartertone": "true",
        "data-quartertone-position": quarterToneMarkerPosition,
        "aria-hidden": "true",
        style: {
          position: "absolute",
          left: "50%",
          // Anchor to the corresponding edge as playback changes note height.
          top: quarterToneMarkerPosition === "above" ? markerBendOffset - QUARTER_TONE_MARKER_OFFSET : `calc(100% + ${markerBendOffset + QUARTER_TONE_MARKER_OFFSET}px)`,
          width: QUARTER_TONE_MARKER_SIZE,
          height: QUARTER_TONE_MARKER_SIZE,
          background: "white",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none"
        }
      }
    ),
    showSourceLocation && sourceLocationText && showFullNote && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: "-16px",
          left: 0,
          color: "white",
          fontSize: "10px",
          whiteSpace: "nowrap",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: "1px 3px",
          borderRadius: "2px",
          pointerEvents: "none"
        }
      },
      sourceLocationText
    )
  );
});

// src/rawlnative/NoteLayer.tsx
import * as React2 from "react";

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

// src/rawlnative/NoteLayer.tsx
var noop = () => {
};
function NoteLayer({ notes, midiNumberToY, noteHeight, handleNoteClick = null, handleMouseEnter = noop, handleMouseLeave = noop, onNoteAudition, auditionEnabled = true, secondsToX, enableManualRemeasuring = false, hoveredColors = null, showSourceLocation = false, drumNoteToY, hoveredVoiceIndex = null, sectionEndX, sectionStartX, getNoteAttributes }) {
  const onsetEditing = React2.useContext(ModulationOnsetEditingContext);
  const current = React2.useRef({ onNoteAudition, auditionEnabled, enableManualRemeasuring, onsetEditing });
  current.current = { onNoteAudition, auditionEnabled, enableManualRemeasuring, onsetEditing };
  const gesture = React2.useMemo(() => createShiftHoverAudition({
    audition: (note, event, time) => {
      var _a, _b;
      return (_b = (_a = current.current).onNoteAudition) == null ? void 0 : _b.call(_a, note, event, time);
    },
    isEnabled: (note, event, time) => {
      const state = current.current;
      return !!state.onNoteAudition && !state.enableManualRemeasuring && !state.onsetEditing.active && note.isActive !== false && (typeof state.auditionEnabled === "function" ? state.auditionEnabled(note, event, time) : state.auditionEnabled);
    }
  }), []);
  const enter = (note, event, time) => {
    gesture.enter(note, event, time);
    handleMouseEnter(note, event, time);
  };
  const leave = () => {
    gesture.leave();
    handleMouseLeave();
  };
  return /* @__PURE__ */ React2.createElement(React2.Fragment, null, getNoteRectangles(notes, midiNumberToY, noteHeight, handleNoteClick, enter, leave, secondsToX, enableManualRemeasuring, hoveredColors, showSourceLocation, drumNoteToY, hoveredVoiceIndex, sectionEndX, sectionStartX, getNoteAttributes));
}

// src/rawlnative/native-style.mjs
var nativeFallback = ":where(:not([data-pitch-class]))";
var nativeColorStyles = () => `
  :root {
    ${RAWL_COLORS.map(
  ({ background }, pitch) => `--pitch-color-${pitch}: ${background};`
).join("\n")}
  }

  .noteColor_default, .noteColor_default_colors {
    background-color: ${pitchColor(0)};
  }

  ${RAWL_COLORS.map(({ dot }, pitch) => {
  const attribute = `[data-pitch-class="${pitch}"]`;
  const colorClass = `.${noteColorClass(pitch)}${nativeFallback}`;
  return `
    ${attribute}, ${colorClass} {
      background-color: ${pitchColor(pitch)};
    }
    ${dot ? `
      ${attribute}::after, ${colorClass}::after, .pitchDot_${pitch}${nativeFallback}::after {
        content: "";
        position: absolute;
        top: calc(50% + var(--pitch-dot-offset, 0px));
        left: 50%;
        width: ${dot.size}px;
        height: ${dot.size}px;
        background-color: ${dot.color};
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
    ` : ""}
  `;
}).join("\n")}
`;
var modulationOnsetStyles = `
  .modulation-onset-editing,
  .modulation-onset-editing * {
    cursor: not-allowed !important;
  }

  .modulation-onset-editing [data-modulation-onset-allowed="true"],
  .modulation-onset-editing [data-modulation-onset-allowed="true"] * {
    cursor: crosshair !important;
  }
`;

// src/rawlnative/modulation-onset-editing.js
import { useEffect as useEffect2, useState as useState2 } from "react";
function isModulationOnsetAllowed(start, range) {
  return range != null && Number.isFinite(start) && start >= range[0] && start < range[1];
}
function useModulationOnsetEditing({ getRange, noteStart, onChoose }) {
  const [shiftHeld, setShiftHeld] = useState2(false);
  useEffect2(() => {
    const update = (event) => setShiftHeld(event.shiftKey);
    const clear = () => setShiftHeld(false);
    window.addEventListener("keydown", update);
    window.addEventListener("keyup", update);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", update);
      window.removeEventListener("keyup", update);
      window.removeEventListener("blur", clear);
    };
  }, []);
  const isAllowed = (note) => isModulationOnsetAllowed(noteStart(note), getRange());
  return {
    active: shiftHeld && getRange() != null,
    isAllowed,
    chooseNote(note, event) {
      var _a;
      const range = getRange();
      if (!((_a = event == null ? void 0 : event.shiftKey) != null ? _a : shiftHeld) || range == null) return false;
      if (isModulationOnsetAllowed(noteStart(note), range)) onChoose(note);
      return true;
    },
    onClickCapture(event) {
      var _a, _b;
      if (!event.shiftKey || getRange() == null || ((_b = (_a = event.target).closest) == null ? void 0 : _b.call(_a, '[data-modulation-onset-note="true"]'))) return;
      event.preventDefault();
      event.stopPropagation();
    }
  };
}
export {
  DrumPlaybackContext,
  ModulationOnsetEditingContext,
  NoteLayer,
  NotePlaybackContext,
  PlaybackSectionContext,
  QUARTER_TONE_MARKER_OFFSET,
  QUARTER_TONE_MARKER_SIZE,
  RAWL_COLORS,
  StrumNotesContext,
  VoiceZIndicesContext,
  createNotePlaybackIndex,
  createSectionPlaybackClock,
  createShiftHoverAudition,
  findPlaybackMeasure,
  getNotePitchAtTime,
  getNoteRectangles,
  getPitchBendSamples,
  getQuarterToneMarkerPosition,
  getStaticPitchBend,
  interpolatedPitchColor,
  isModulationOnsetAllowed,
  isQuarterTonePitch,
  modulationOnsetStyles,
  nativeColorStyles,
  noteColorClass,
  noteLetterColors,
  notePitchDotClass,
  pitchBendToSemitones,
  pitchColor,
  useDrumPlaybackClock,
  useModulationOnsetEditing,
  useNotePlaybackClock,
  voiceHoverContains
};
