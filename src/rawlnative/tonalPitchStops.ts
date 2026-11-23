import type { TonalPitchStop } from "./types";

// A tonic change shifts pitch classes by whole semitones, so the existing
// semitone stops stay at the same horizontal positions.
export function applyTonalPitchStops(
  curve: { x: number; pitch: number }[],
  tonalStops: readonly TonalPitchStop[],
  basePitch: number,
  width: number,
) {
  let shift = tonalStops[0].pitchClass - basePitch;
  let next = 1;
  const result: typeof curve = [];
  for (const [index, point] of curve.entries()) {
    while (next < tonalStops.length && tonalStops[next].offset * width <= point.x) {
      const { offset, pitchClass } = tonalStops[next++];
      const x = offset * width;
      const previous = curve[index - 1] ?? point;
      const pitch = point.x === previous.x ? point.pitch
        : previous.pitch + (point.pitch - previous.pitch) * (x - previous.x) / (point.x - previous.x);
      result.push({ x, pitch: pitch + shift });
      shift = pitchClass - basePitch;
      result.push({ x, pitch: pitch + shift });
    }
    const pitch = point.pitch + shift;
    const last = result.at(-1);
    if (last?.x !== point.x || last.pitch !== pitch) result.push({ x: point.x, pitch });
  }
  return result;
}
