import {RAWL_COLORS} from "../notation/palette.mjs";
export {RAWL_COLORS};
export const pitchColor = (pitch) =>
  `var(--pitch-color-${((pitch % 12) + 12) % 12})`;

export const interpolatedPitchColor = (pitch) => {
  const lower = Math.floor(pitch);
  const fraction = pitch - lower;
  return fraction === 0 ? pitchColor(lower)
    : `color-mix(in srgb, ${pitchColor(lower)} ${(1 - fraction) * 100}%, ${pitchColor(lower + 1)})`;
};

export const noteColorClass = (pitch) =>
  `noteColor_${pitch}_colors`;

export const notePitchDotClass = (pitch) => {
  if (!Number.isFinite(pitch)) return "";
  const nearest = Math.round(pitch);
  const pitchClass = ((nearest % 12) + 12) % 12;
  return Math.abs(pitch - nearest) <= 0.25 && RAWL_COLORS[pitchClass].dot
    ? `pitchDot_${pitchClass}` : "";
};

export const noteLetterColors = (prefix = "") =>
  RAWL_COLORS.map(({ foreground }, pitch) => `
    ${prefix}.${noteColorClass(pitch)} {
      color: ${foreground} !important;
      background-color: ${pitchColor(pitch)} !important;
      --background-color: ${pitchColor(pitch)};
    }
  `).join("\n");

