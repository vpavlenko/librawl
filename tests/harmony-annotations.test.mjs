import assert from 'node:assert/strict';
import test from 'node:test';
import {JSDOM} from 'jsdom';
import {mountHarmonyAnnotations, romanNumeralHTML} from 'librawl/harmony-annotations';

function fixture() {
  const dom = new JSDOM('<main><div id="score" style="height:90px"></div></main>');
  const score = dom.window.document.getElementById('score');
  let width = 280, onResize, disconnected = false;
  Object.defineProperty(score, 'clientWidth', {get: () => width});
  Object.defineProperties(dom.window.HTMLSpanElement.prototype, {
    offsetWidth: {get() { return 12 + this.textContent.length; }},
    offsetHeight: {get: () => 20},
  });
  dom.window.ResizeObserver = class {
    constructor(callback) { onResize = callback; }
    observe(target) { assert.equal(target, score); }
    disconnect() { disconnected = true; }
  };
  return {
    dom, score, resize(next) { width = next; onResize(); },
    get disconnected() { return disconnected; },
  };
}

test('mounts two lanes without changing the score, packs collisions and cleans up on removal', () => {
  const view = fixture();
  const {dom, score, resize} = view;
  const remove = mountHarmonyAnnotations(score, {
    start: 4, end: 8,
    annotations: [
      {beat: 0, notation: 'I'},
      {beat: 4, notation: 'ii⁴₂'},
      {beat: 4.3, notation: 'V⁶₅'},
      {beat: 6, notation: 'I', position: 'above', tooltip: false},
      {beat: 8, notation: 'I'},
    ],
  });
  const above = score.previousElementSibling;
  const below = score.nextElementSibling;
  const labels = [...below.querySelectorAll('.rawln-harmony-label')];
  assert.equal(above.dataset.position, 'above');
  assert.equal(below.dataset.position, 'below');
  assert.deepEqual(labels.map(label => label.dataset.beat), ['4', '4.3']);
  assert.equal(labels[0].style.left, '0px');
  assert.deepEqual([...labels[0].querySelectorAll('.chord-figure')].map(figure => figure.dataset.figure), ['4', '2']);
  assert.equal(score.style.height, '90px');
  assert.equal(labels[1].dataset.annotationRow, '1');
  resize(600);
  assert.equal(labels[1].dataset.annotationRow, '0');
  assert.equal(above.querySelector('[data-rn-tooltip]'), null);
  const trigger = labels[1].querySelector('[data-rn-tooltip]');
  trigger.focus();
  assert.equal(trigger.tabIndex, 0);
  assert(dom.window.document.getElementById(trigger.getAttribute('aria-describedby')));
  remove();
  assert.equal(dom.window.document.querySelector('[role="tooltip"]'), null);
  assert.equal(score.previousElementSibling, null);
  assert.equal(score.nextElementSibling, null);
  assert.equal(view.disconnected, true);
  dom.window.close();
});

test('draws explicit arrows in both directions and omits a cross-row target', () => {
  const {dom, score} = fixture();
  const remove = mountHarmonyAnnotations(score, {
    start: 0, end: 16, endInclusive: true,
    annotations: [
      {id: 'applied', beat: 0, notation: 'V⁶₅/V'},
      {id: 'target', beat: 8, notation: 'V'},
      {id: 'next', beat: 17, notation: 'I'},
      {id: 'top-left', beat: 4, notation: 'I', position: 'above'},
      {id: 'top-right', beat: 16, notation: 'V⁷/I', position: 'above'},
    ],
    arrows: [
      {from: 'applied', to: 'target'},
      {from: 'target', to: 'next'},
      {from: 'top-right', to: 'top-left'},
    ],
  });
  const visible = [...score.parentElement.querySelectorAll('svg > g')];
  assert.deepEqual(visible.map(arrow => [arrow.dataset.from, arrow.dataset.to]), [
    ['top-right', 'top-left'], ['applied', 'target'],
  ]);
  for (const arrow of visible) {
    assert.equal(arrow.children.length, 2);
    for (const path of arrow.children) assert.match(path.getAttribute('d'), /^M/);
  }
  assert.match(romanNumeralHTML('ii⁴₂'), /class="figures"/);
  remove();
  dom.window.close();
});
