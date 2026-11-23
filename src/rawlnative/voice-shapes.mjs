const radius = 6;
// Clockwise from top left: each bit marks a rounded corner.
const voiceShapes = [15, 5, 10, 9, 6, 3, 12, 14, 13, 11, 7, 1, 2, 4, 8, 0];

export const voiceCornerRadii = voice => [1, 2, 4, 8].map(
  corner => (voiceShapes[voice] & corner) ? radius : 0,
);

export const voiceShapeStyles = () => voiceShapes.map((_, voice) =>
  `.voiceShape-${voice} {\n    border-radius: ${voiceCornerRadii(voice).map(r => `${r}px`).join(' ')};\n}\n`,
).join('\n');
