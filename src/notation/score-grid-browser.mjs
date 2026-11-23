// Standalone browser integration for score surfaces without a React root.
import {RAWL_COLORS} from './palette.mjs';
import {
  TONIC_NAMES, MODULATION_BADGE_WIDTH, guidePitches, positionedTonalGuides,
  tonicEvents, tonicMarkers, tonicRegions,
} from './score-grid.mjs';

export {guidePitches};
export {measureSubdivisionBeats} from './score-grid.mjs';
export {alignScoreRows} from './geometry.mjs';

const timeline = ({tonic, changes, beats}) => Number.isFinite(beats) && beats > 0
  ? tonicEvents(tonic, changes, beats) : [];

export function segments(options) {
  return tonicRegions(timeline(options), 0, options.beats)
    .map(({start, ...region}) => ({...region, beat: start}));
}

export function keyMarkers(options) {
  const events = timeline(options);
  const firstTonic = events.findIndex(event => event.tonic != null);
  return tonicMarkers(events).map(({delta, ...marker}, index) => ({...marker, initial: index === firstTonic}));
}

export function tonicAtBeat(options, beat, includeBoundary = false) {
  const keys = timeline(options);
  let tonic = keys[0]?.tonic ?? null;
  for (const region of keys) {
    if (includeBoundary ? region.beat <= beat : region.beat < beat) tonic = region.tonic;
    else break;
  }
  return tonic;
}

const length = value => typeof value === 'number' ? value + 'px' : value;

export function appendMeasureGuides(score, {
  measures = [], beats = [], barClass = 'rawl-guide', beatClass = 'rawl-beat',
  phraseClass = 'phrase-start', top, height,
}) {
  const rulerLine = (entry, className) => {
    const element = score.ownerDocument.createElement('div');
    element.className = className;
    element.style.left = length(entry.left);
    const y = entry.top ?? top, size = entry.height ?? height;
    if (y != null) element.style.top = length(y);
    if (size != null) {
      element.style.height = length(size);
      element.style.bottom = 'auto';
    }
    if (entry.beat != null) element.dataset.beat = entry.beat;
    if (entry.row != null) element.dataset.row = entry.row;
    score.append(element);
    return element;
  };
  const bars = measures.map(entry => {
    const className = [barClass, entry.phrase && phraseClass, entry.terminal && 'terminal', entry.edge && 'edge-label']
      .filter(Boolean).join(' ');
    const measure = rulerLine(entry, className);
    if (entry.sectionEnd != null) measure.dataset.sectionEnd = entry.sectionEnd;
    if (entry.number != null) measure.dataset.measure = entry.number;
    if (entry.number != null && !entry.terminal && entry.showLabel !== false) {
      const label = score.ownerDocument.createElement('span');
      label.textContent = entry.number;
      measure.append(label);
    }
    return measure;
  });
  return {bars, beatLines: beats.map(entry => rulerLine(entry, beatClass))};
}

function layer(document, className, height, zIndex) {
  const element = document.createElement('div');
  element.className = className;
  element.setAttribute('aria-hidden', 'true');
  element.style.cssText = `position:absolute;left:0;top:0;width:100%;height:${height}px;pointer-events:none;overflow:hidden;z-index:${zIndex}`;
  return element;
}

function arrow(direction) {
  const paths = direction === 'down' ? ['M12 5v14', 'm19 12-7 7-7-7'] : ['m5 12 7-7 7 7', 'M12 19V5'];
  const content = paths.map(path => `<path d="${path}" />`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-arrow-${direction}" width="9" height="9" viewBox="4 4 16 16" style="vertical-align:baseline" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${content}</svg>`;
}

/** Mount the same guide model as the React TonalGrid. The caller owns the
 * musical domain, marked key events, and any padding at the ends of rows. */
export function mount(score, options) {
  const document = score.ownerDocument;
  const existingGrid = options.reuse ? score.querySelector(':scope > .tonal-grid') : null;
  const existingMarkers = options.reuse ? score.querySelector(':scope > .tonal-grid-markers') : null;
  if (!options.reuse) {
    score.querySelectorAll(':scope > .tonal-grid,:scope > .tonal-grid-markers').forEach(element => element.remove());
  }
  const {
    low, high, pitchToY, beats, top = 16, height = score.clientHeight,
    showTonicMarkers = true, showModulationTonics = false,
  } = options;
  const start = options.startBeat ?? 0, end = options.endBeat ?? beats;
  const regions = tonicRegions(timeline(options), start, end)
    .map(({start, ...region}) => ({...region, beat: start}));
  if (options.boundaryTonic != null) regions.push({beat: end, end, tonic: options.boundaryTonic, boundary: true});
  const step = Math.abs(pitchToY(low + 1) - pitchToY(low));
  if (!regions.length || !Number.isFinite(step) || step <= 0) return {segments: regions, destroy() {}};

  const grid = existingGrid ?? layer(document, 'tonal-grid', height, 0);
  const markers = existingMarkers ?? layer(document, 'tonal-grid-markers', top, 3);
  grid.replaceChildren();
  markers.replaceChildren();
  grid.style.height = height + 'px';
  grid.style.clipPath = `inset(${top}px -30px 0 0)`;
  grid.style.overflow = 'visible';
  const percent = beat => beat / beats * 100 + '%';
  const positions = regions.map(region => ({tonic: region.tonic, left: percent(region.beat),
    width: region.boundary ? '30px' : percent(region.end - region.beat)}));
  for (const {kind, pitch, y, tonic, left, width} of positionedTonalGuides(positions, {low, high}, pitch => pitchToY(pitch) + step)) {
    const line = document.createElement('div');
    line.className = 'tonal-grid-' + kind;
    line.dataset.pitch = pitch;
    line.dataset.tonic = tonic;
    line.style.cssText = `position:absolute;left:${left};width:${width};pointer-events:none;z-index:0;top:${y}px;` +
      (kind === 'tonic' ? `height:${step * .5}px;background:linear-gradient(to top,#333,transparent)`
        : 'height:0;border-bottom:.5px dashed #333');
    grid.append(line);
  }

  for (const region of options.markerEvents ?? keyMarkers(options)) {
    if (region.continued) continue;
    const {tonic, delta} = tonicMarkers([{tonic: region.previousTonic ?? null}, region]).at(-1);
    const initial = region.initial ?? delta == null;
    if (!showTonicMarkers || tonic == null || delta === 0 || (!initial && delta == null) ||
        region.beat < start || region.beat >= end) continue;
    const left = percent(region.beat), offset = delta == null ? 18 : 30;
    if (delta != null) {
      const badge = document.createElement('div');
      badge.className = 'tonal-grid-key-badge';
      badge.dataset.tonic = tonic;
      const color = RAWL_COLORS[(delta + 12) % 12].background;
      badge.style.cssText = `position:absolute;left:${left};top:0;width:${MODULATION_BADGE_WIDTH}px;height:12px;pointer-events:none;background:${color};mask-image:linear-gradient(to right,#000,transparent);-webkit-mask-image:linear-gradient(to right,#000,transparent)`;
      markers.append(badge);
    }
    const label = document.createElement('span');
    label.className = 'tonal-grid-key';
    label.dataset.tonic = tonic;
    label.dataset.anchor = region.beat / beats;
    label.dataset.offset = offset;
    if (delta != null) {
      label.innerHTML = arrow(delta < 0 ? 'down' : 'up');
      label.append(document.createTextNode(String(Math.abs(delta))));
    }
    if (initial || showModulationTonics) {
      if (delta != null) label.append(document.createTextNode(' '));
      label.append(document.createTextNode(region.label ?? TONIC_NAMES[tonic]));
    }
    label.style.cssText = `position:absolute;top:-2px;left:calc(${left} + ${offset}px);font:700 12px/16px sans-serif;color:#fff;white-space:nowrap;user-select:none;pointer-events:none;z-index:1`;
    markers.append(label);
  }
  score.prepend(grid);
  if (showTonicMarkers) score.append(markers);
  return {segments: regions, destroy() { grid.remove(); markers.remove(); }};
}
