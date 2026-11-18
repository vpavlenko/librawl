// The legacy readers own the audio clock and the row grid. Keep the bridge
// in score beats, so repeats, pickup offsets, and audio alignment stay intact.
import {findPlaybackMeasure} from '../../src/rawlnative/playbackIndex.ts';

const rowsByScore = new WeakMap();

export function caplinPlaybackMeasures(model, data) {
  const grid = data.structure?.notatedBars;
  const starts = grid?.starts ?? data.groups ?? data.measures?.map(measure => measure.start) ?? [];
  const labels = grid?.measureLabels ?? data.measureLabels ?? data.measures?.map(measure => measure.label);
  const {row, secondsPerBeat, toX} = model;
  const percent = beat => toX(beat * secondsPerBeat, 100);
  return starts.flatMap((start, index) => {
    const from = Math.max(row.start, start);
    const to = Math.min(row.end, starts[index + 1] ?? data.beats);
    if (!(to > from)) return [];
    return [{
      start: from,
      end: to,
      label: labels?.[index] ?? index + 1,
      left: `clamp(0px, calc(${percent(from)}% - 1px), calc(100% - 1px))`,
      width: `${percent(to) - percent(from)}%`,
    }];
  });
}

export function mountPlaybackMeasure(score) {
  const owners = new Set([score]);
  for (const selector of ['.rawl-period-sections', '.rawl-example']) {
    const owner = score.closest(selector);
    if (owner) owners.add(owner);
  }
  for (const owner of owners) {
    if (!rowsByScore.has(owner)) rowsByScore.set(owner, new Set());
    rowsByScore.get(owner).add(paint);
  }

  let beat = null, clock = null, element = null, measures = [], starts = [], current = null;
  function paint(position, source) {
    if (!Number.isFinite(position) && source !== clock) return;
    beat = position;
    clock = Number.isFinite(beat) ? source : null;
    const next = measures[(findPlaybackMeasure(starts, beat) ?? 0) - 1];
    const measure = next && beat < next.end ? next : null;
    if (!element || measure === current) return;
    current = measure;
    element.hidden = !measure;
    if (measure) {
      element.dataset.measure = String(measure.label);
      element.style.left = measure.left;
      element.style.width = measure.width;
    } else {
      delete element.dataset.measure;
    }
  }

  return {
    update(nextElement, nextMeasures) {
      element = nextElement;
      measures = nextMeasures;
      starts = measures.map(measure => measure.start);
      paint(beat, clock);
    },
    destroy() {
      paint(null, clock);
      for (const owner of owners) {
        const rows = rowsByScore.get(owner);
        rows?.delete(paint);
        if (!rows?.size) rowsByScore.delete(owner);
      }
    },
  };
}

/** Advance every mounted row in this score from the host's playback clock. */
export function setPlaybackMeasure(score, beat, clock = 'midi') {
  for (const paint of rowsByScore.get(score) ?? []) paint(beat, clock);
}
