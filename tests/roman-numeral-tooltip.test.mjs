import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {JSDOM} from 'jsdom';
import {bindRomanNumeralTooltip} from '../src/notation/bind-roman-numeral-tooltip.mjs';
import {romanNumeralDiagramColumns, romanNumeralExplanations, romanNumeralTooltipHTML, romanNumeralTooltipModel} from '../src/notation/roman-numeral-tooltip.mjs';

const parse = html => new JSDOM(html).window.document;
const notePitches = column => [...column.querySelectorAll('.rawln-rn-tooltip-note')].map(note => Number(note.dataset.pitch));

test('Caplin RN tooltip shares a pitch axis, spells inversions and anchors tonic and fifth guides', () => {
  const label = 'V⁶₅/V';
  const model = romanNumeralTooltipModel(label);
  assert.deepEqual(model.pitches, [6,9,12,14]);
  assert.deepEqual(model.rootPitches, [2,6,9,12]);
  const document = parse(romanNumeralTooltipHTML(label, {}, model));
  const columns = [...document.querySelectorAll('.rawln-rn-tooltip-column')];
  assert.deepEqual(columns.map(notePitches), [model.rootPitches, model.pitches]);
  assert.deepEqual(columns.map(column => column.querySelector('.rawln-rn-tooltip-grid').style.height),
    Array(2).fill(columns[0].querySelector('.rawln-rn-tooltip-grid').style.height));
  for (const column of columns) {
    for (const note of column.querySelectorAll('.rawln-rn-tooltip-note:is([data-degree="0"], [data-degree="7"])')) {
      const guide = column.querySelector(`.rawln-rn-tooltip-guide[data-pitch="${note.dataset.pitch}"]`);
      assert.equal(parseFloat(guide.style.top), parseFloat(note.style.top) + 12);
    }
  }
  assert.equal(columns[1].querySelector('.rawln-rn-tooltip-kind').textContent, 'квинтсекстаккорд');
  assert.equal(document.querySelector('[data-symbol="applied"]').textContent,
    '/ — аккорд рассчитан относительно ступени справа как временной тоники.');
  assert.equal(document.querySelector('[data-symbol="figures65"]').textContent,
    'Цифры справа обозначают интервалы над басом: 6/5 — секста и квинта.');
  assert.equal(document.querySelector('[data-symbol="intervals"]'), null);
});

test('Jazz tooltip preserves explicit extensions and bass while avoiding figured-bass descriptions', () => {
  const notation = 'Imaj9/II', options = {jazz: true, rootPitch: 0, bassPitch: 2};
  const model = romanNumeralTooltipModel(notation, options, {pitches: [-10,0,4,7,11,14]});
  const document = parse(romanNumeralTooltipHTML(notation, options, model));
  assert.deepEqual(notePitches(document), [-10,0,4,7,11,14]);
  assert.equal(document.querySelector('.chord-bass').textContent, 'II');
  assert.equal(document.querySelector('.rawln-rn-explanations'), null);
  assert.equal(romanNumeralTooltipModel(notation, options, {pitches: [Infinity]}), null);
  assert.equal(romanNumeralTooltipModel(notation, options, {pitches: [99999999999]}), null);
});

test('Tooltip opens on hover, focus and click, and preserves native Space handling', () => {
  const dom = new JSDOM('<div id="scroll"><span id="a" tabindex="0" aria-describedby="extra">V</span><span id="b" tabindex="0">I</span></div>');
  const {window} = dom, {document} = window, first = document.querySelector('#a'), second = document.querySelector('#b');
  first.getBoundingClientRect = () => ({left: 0, top: 0, width: 12, bottom: 18});
  const detachFirst = bindRomanNumeralTooltip(first, () => '<span>V</span>');
  const detachSecond = bindRomanNumeralTooltip(second, () => '<span>I</span>');
  try {
    first.dispatchEvent(new window.MouseEvent('pointerover', {bubbles:true}));
    const popup = () => document.querySelector('[role="tooltip"]');
    assert.equal(popup().textContent,'V');
    assert.equal(first.getAttribute('aria-describedby'),'extra ' + popup().id);
    assert.equal(popup().style.left,'8px');
    assert.equal(popup().style.top,'27px');
    second.focus();
    assert.equal(popup().textContent,'I');
    assert.equal(first.getAttribute('aria-describedby'),'extra');
    first.dispatchEvent(new window.MouseEvent('click', {bubbles:true}));
    assert.equal(popup().textContent,'V');
    assert.equal(first.dispatchEvent(new window.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true})),true);
    first.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert.equal(popup(),null);
    assert.equal(first.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})),false);
    assert.equal(popup().textContent,'V');
    document.querySelector('#scroll').dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true}));
    assert.equal(popup(),null);
    first.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
    assert.equal(popup().textContent,'V');
    detachFirst();
    assert.equal(popup(),null);
    assert.equal(first.getAttribute('aria-describedby'),'extra');
  } finally {
    detachFirst();
    detachSecond();
    window.close();
  }
});

test('source-resolved quality labels and cadence columns share tooltip rendering', () => {
  const label = '(m⁷)';
  const model = {label, pitches: [10, 13, 17, 20], rootPitch: 10, seventh: true, inversion: 0};
  const document = parse(romanNumeralDiagramColumns([model]) + romanNumeralExplanations(model));
  assert.deepEqual([...document.querySelectorAll('.rawln-rn-tooltip-note')].map(note => Number(note.dataset.pitch)), model.pitches);
  assert.equal(document.querySelector('[data-symbol="minor"]').parentElement.previousElementSibling.querySelector('.colored').dataset.root, '10');
  assert.equal(document.querySelector('[data-symbol="figures7"]').parentElement.previousElementSibling.querySelector('.colored').dataset.root, '8');
  assert(document.querySelector('[data-symbol="harmonicParentheses"]'));
  const cadence = parse(romanNumeralDiagramColumns([model, {label: 'I', pitches: [0, 4, 7]}], {sequence: true}));
  assert.deepEqual([...cadence.querySelectorAll('[data-chord]')].map(column => column.dataset.chord), [label, 'I']);
  assert(cadence.querySelector('.cadence-sequence-arrow'));
  assert.equal(cadence.querySelector('.rawln-rn-tooltip-kind'), null);
});

test('tonic symbols use white on the tooltip even with a light-paper host stylesheet', () => {
  const tooltipCSS = readFileSync(new URL('../src/notation/roman-numerals.css', import.meta.url), 'utf8');
  const paperCSS = ':is(.chord-root,.chord-figure,.chord-quality).colored[data-root="0"]{color:#000}';
  for (const [notation, options] of [['I', {}], ['i', {mode: 'minor'}], ['I⁶₄', {}]]) {
    const model = romanNumeralTooltipModel(notation, options);
    const tooltip = romanNumeralTooltipHTML(notation, options, model);
    const dom = new JSDOM(`<style>${paperCSS}</style><style>${tooltipCSS}</style>
      <span class="chord-root colored" data-root="0">I</span>
      <div class="rawln-rn-tooltip" role="tooltip">${tooltip}</div>`);
    const {window} = dom, {document} = window;
    try {
      const color = element => window.getComputedStyle(element).color;
      assert.equal(color(document.body.querySelector(':scope > span')), 'rgb(0, 0, 0)');
      const root = document.querySelector('.rawln-rn-tooltip-label .chord-root');
      assert.equal(color(root), 'rgb(255, 255, 255)');
      const symbols = [...document.querySelectorAll('.rawln-rn-explanations dt .colored[data-root="0"]')];
      assert(symbols.some(symbol => symbol.textContent === '1'));
      assert(symbols.every(symbol => color(symbol) === 'rgb(255, 255, 255)'));
      const note = document.querySelector('.rawln-rn-tooltip-note[data-degree="0"]');
      assert.equal(note.textContent, '1');
      assert.equal(color(note), 'rgb(0, 0, 0)');
      assert.equal(window.getComputedStyle(note).backgroundColor, 'rgb(255, 255, 255)');
    } finally {
      window.close();
    }
  }
});
