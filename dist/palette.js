/*! librawl version: 0.3.2; audio source sha256: 1950f8ca50b0b94fa1b6151f1a309a2413e8c0643f095f3ce0582bb45234c149; GPL-3.0-only */

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
export {
  RAWL_COLORS,
  colorIndex
};
