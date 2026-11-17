// Matches ~/repos/rawl/src/components/rawl/colors.ts (RAWL_COLORS).
// Index is the tonic-relative chromatic degree, or signed shift modulo 12.
export const RAWL_COLORS = [
  { background: 'white', foreground: 'black' },
  { background: '#820000', foreground: 'white', dot: { color: 'white', size: 1 } },
  { background: 'red', foreground: 'black' },
  { background: '#007000', foreground: 'white' },
  { background: '#00fb47', foreground: 'black' },
  { background: '#9500b3', foreground: 'white' },
  { background: '#ea7eff', foreground: 'black', dot: { color: 'black', size: 2 } },
  { background: '#787878', foreground: 'black' },
  { background: '#0000ff', foreground: 'white' },
  { background: '#03b9d5', foreground: 'black' },
  { background: '#ff7328', foreground: 'white' },
  { background: '#ffff00', foreground: 'black' },
];
export const colorIndex = semitones => ((semitones % 12) + 12) % 12;
