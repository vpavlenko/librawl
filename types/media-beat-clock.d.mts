/** Convert between written beats and elapsed media seconds. */
export function createMediaBeatClock(secondsPerBeat: number,
  beatAnchors?: readonly (readonly [displayBeat: number, playedBeat: number])[]): {
  secondsAt(beat: number): number;
  beatAt(seconds: number): number;
};
