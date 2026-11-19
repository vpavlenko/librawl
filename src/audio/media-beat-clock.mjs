/** Convert written beats to/from media seconds through a monotonic performance map. */
export function createMediaBeatClock(secondsPerBeat, beatAnchors = []) {
  if (!Number.isFinite(secondsPerBeat) || secondsPerBeat <= 0) {
    throw new RangeError('Media playback needs a positive secondsPerBeat');
  }

  const anchors = beatAnchors.map(([displayBeat, playedBeat], index) => {
    const previous = beatAnchors[index - 1];
    if (!Number.isFinite(displayBeat) || !Number.isFinite(playedBeat) ||
        (previous && (previous[0] >= displayBeat || previous[1] >= playedBeat))) {
      throw new RangeError('Media beat anchors must increase in both clocks');
    }
    return [displayBeat, playedBeat];
  });

  function interpolate(value, from, to) {
    if (!anchors.length || !Number.isFinite(value)) return value;
    let left = 0;
    let right = anchors.length - 1;
    // The local swing ratio should never stretch time outside the authored map.
    if (value <= anchors[left][from]) return anchors[left][to] + (value - anchors[left][from]);
    if (value >= anchors[right][from]) return anchors[right][to] + (value - anchors[right][from]);
    while (right - left > 1) {
      const middle = Math.floor((left + right) / 2);
      if (anchors[middle][from] <= value) left = middle;
      else right = middle;
    }

    const start = anchors[left];
    const end = anchors[right];
    const fraction = (value - start[from]) / (end[from] - start[from]);
    return start[to] + fraction * (end[to] - start[to]);
  }

  return {
    secondsAt: displayBeat => interpolate(displayBeat, 0, 1) * secondsPerBeat,
    beatAt: seconds => interpolate(seconds / secondsPerBeat, 1, 0),
  };
}
