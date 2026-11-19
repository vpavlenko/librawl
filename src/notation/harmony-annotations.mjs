import {romanNumeralHTML} from './roman-numerals.mjs';
import {arrowCurve, arrowGeometry} from './harmony-arrows.mjs';

export * from './roman-numerals.mjs';
export {romanNumeralTooltipModel, romanNumeralTooltipHTML, romanNumeralDiagramColumns,
  romanNumeralSymbolNotes, romanNumeralExplanations} from './roman-numeral-tooltip.mjs';
export {bindRomanNumeralTooltip} from './bind-roman-numeral-tooltip.mjs';
export {arrowCurve, arrowGeometry} from './harmony-arrows.mjs';

const ROW_HEIGHT = 22;
const ROW_PAD = 2;
const SVG = 'http://www.w3.org/2000/svg';

// Caplin's ordered interval packing, keeping the source anchor independent
// of the edge clamp and the chosen display row.
function placeLabels(labels, start, end, width) {
  const rowEnds = [];
  for (const point of labels) {
    const ink = point.label.offsetWidth;
    const anchor = (point.beat - start) / (end - start) * width;
    const left = Math.max(0, Math.min(width - ink, anchor - ink * .12));
    let row = rowEnds.findIndex(right => right + 4 <= left);
    if (row < 0) row = rowEnds.length;
    const right = left + ink;
    const top = ROW_PAD + row * ROW_HEIGHT;
    Object.assign(point, {left, right, top, bottom: top + point.label.offsetHeight, row});
    rowEnds[row] = right;
    point.label.style.left = left + 'px';
    point.label.dataset.annotationRow = row;
  }
  return ROW_PAD + rowEnds.length * ROW_HEIGHT;
}

function curveIsClear(curve, geometry, obstacles, width) {
  const clear = ([x, y]) => x >= 1 && x <= width - 1 &&
    !obstacles.some(box => x > box.left - 1 && x < box.right + 1 &&
      y > box.top - 1 && y < box.bottom + 1);
  if (!geometry.headPoints.every(clear)) return false;
  for (let step = 0; step <= 40; step++) {
    const t = step / 40, u = 1 - t;
    const point = [0, 1].map(i => u ** 3 * curve[i] + 3 * u ** 2 * t * curve[i + 2] +
      3 * u * t ** 2 * curve[i + 4] + t ** 3 * curve[i + 6]);
    if (!clear(point)) return false;
  }
  return true;
}

function tonicizationArrow(from, to, obstacles, width, bandHeight, above) {
  const direction = above ? -1 : 1;
  const forward = from.left <= to.left;
  const gap = forward ? to.left - from.right : from.left - to.right;
  const edge = box => above ? box.top : box.bottom;
  if (from.row === to.row && gap >= 17) {
    const x1 = forward ? from.right + 3 : from.left - 3;
    const x2 = forward ? to.left - 3 : to.right + 3;
    const curve = arrowCurve([x1, edge(from) - 2 * direction], [x2, edge(to) - 2 * direction], direction);
    const geometry = arrowGeometry(curve);
    if (curveIsClear(curve, geometry, obstacles, width)) return {curve, geometry};
  }

  // Like Caplin, bow into reserved space if a direct route overlaps a
  // spelling. Endpoints stay beside the measured labels, even on wrapped rows.
  const ends = box => [((box.left + box.right) / 2), box.left - 3, box.right + 3]
    .filter(x => x > 1 && x < width - 1);
  for (const depth of [12, 24, 40]) {
    const bow = above ? -depth : bandHeight + depth;
    for (const x1 of ends(from)) for (const x2 of ends(to)) {
      const y1 = edge(from) + 3 * direction, y2 = edge(to) + 3 * direction;
      if (Math.abs(x1 - x2) < 3) continue;
      const run = Math.sign(x2 - x1) * Math.min(10, Math.abs(x2 - x1) / 3);
      const curve = [x1, y1, x1 + run, bow, x2 - run, bow, x2, y2];
      const geometry = arrowGeometry(curve);
      if (curveIsClear(curve, geometry, obstacles, width)) return {curve, geometry};
    }
  }
  return null;
}

function createLane(score, position, points, arrows, start, end) {
  const document = score.ownerDocument;
  const lane = document.createElement('div');
  lane.className = 'rawln-harmony-lane';
  lane.dataset.position = position;
  const overlay = document.createElementNS(SVG, 'svg');
  overlay.classList.add('rawln-harmony-arrows');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('focusable', 'false');
  lane.append(overlay);
  const labels = points.map(point => {
    const label = document.createElement('span');
    label.className = 'rawln-harmony-label';
    label.setAttribute('role', 'math');
    label.dataset.beat = point.beat;
    if (point.original !== undefined) label.title = point.original;
    if (point.id !== undefined) label.dataset.annotationId = point.id;
    label.setAttribute('aria-label', point.notation);
    label.innerHTML = romanNumeralHTML(point.notation, point.options);
    lane.append(label);
    return {...point, label};
  });
  const ids = new Map(labels.filter(point => point.id !== undefined).map(point => [point.id, point]));
  const links = arrows.map(arrow => ({from: ids.get(arrow.from), to: ids.get(arrow.to)}))
    .filter(({from, to}) => from && to && from !== to);
  if (position === 'above') score.before(lane);
  else score.after(lane);

  function fit(width) {
    if (!width) return;
    lane.style.width = width + 'px';
    const bandHeight = placeLabels(labels, start, end, width);
    const above = position === 'above';
    let minY = 0, maxY = bandHeight;
    overlay.replaceChildren();
    for (const {from, to} of links) {
      const arrow = tonicizationArrow(from, to, labels, width, bandHeight, above);
      if (!arrow) continue;
      const {curve, geometry} = arrow;
      // Bézier control points bound the path; the head geometry can extend
      // past those points by up to its half width.
      const ys = [...curve.filter((_, i) => i % 2), ...geometry.headPoints.map(point => point[1])];
      minY = Math.min(minY, Math.floor(Math.min(...ys) - 2));
      maxY = Math.max(maxY, Math.ceil(Math.max(...ys) + 2));
      const link = document.createElementNS(SVG, 'g');
      link.dataset.from = from.id;
      link.dataset.to = to.id;
      const shaft = document.createElementNS(SVG, 'path');
      shaft.classList.add('rawln-harmony-arrow-shaft');
      shaft.setAttribute('d', geometry.shaftPath);
      const head = document.createElementNS(SVG, 'path');
      head.setAttribute('d', geometry.headPath);
      link.append(shaft, head);
      overlay.append(link);
    }
    for (const point of labels) point.label.style.top = (point.top - minY) + 'px';
    lane.style.height = (maxY - minY) + 'px';
    overlay.setAttribute('viewBox', `0 ${minY} ${width} ${maxY - minY}`);
  }
  return {lane, fit};
}

/**
 * Attach authored Roman numerals to one score row. Timelines use the same
 * absolute beats as the score; glyph wrapping never changes note geometry.
 */
export function mountHarmonyAnnotations(score, {
  start, end, annotations = [], arrows = [], endInclusive = false,
}) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new RangeError('Harmony annotations require a finite, increasing beat range');
  }
  const visible = annotations.filter(({beat}) => beat >= start &&
    (endInclusive ? beat <= end : beat < end)).sort((a, b) => a.beat - b.beat);
  const lanes = [];
  for (const side of ['above', 'below']) {
    const points = visible.filter(point => (point.position ?? 'below') === side);
    if (points.length) lanes.push(createLane(score, side, points, arrows, start, end));
  }
  if (!lanes.length) return () => {};
  const fit = () => lanes.forEach(lane => lane.fit(score.clientWidth));
  const view = score.ownerDocument.defaultView;
  const observer = view?.ResizeObserver ? new view.ResizeObserver(fit) : null;
  if (observer) observer.observe(score);
  else view?.addEventListener('resize', fit);
  fit();
  return () => {
    observer?.disconnect();
    view?.removeEventListener('resize', fit);
    lanes.forEach(({lane}) => lane.remove());
  };
}
