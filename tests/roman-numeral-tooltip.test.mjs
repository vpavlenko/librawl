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

test('An annotated non-chord bass appears in the Jazz tooltip heading and caption', () => {
  const notation = '♯IV+', options = {jazz: true, rootPitch: 6};
  const model = romanNumeralTooltipModel(notation, options, {
    pitches: [-5, 6, 10, 14], rootPitches: [6, 10, 14], rootNotation: notation,
    bass: {label: '⑤', pitch: 7, caption: 'A♭ bass'},
  });
  const document = parse(romanNumeralTooltipHTML(notation, options, model));
  assert.deepEqual(notePitches(document), [-5, 6, 10, 14]);
  const label = document.querySelector('.rawln-rn-tooltip-label .rawln-roman');
  assert.equal(label.textContent, '♯IV+/⑤');
  assert.equal(label.querySelector('.chord-bass').dataset.root, '7');
  assert.equal(document.querySelector('.rawln-rn-tooltip-kind').textContent, 'triad');
  assert.equal(document.querySelector('.rawln-rn-tooltip-inversion'), null);
  assert.equal(document.querySelector('.rawln-rn-tooltip-bass').textContent, 'A♭ bass');
});

test('An annotated inversion adds the bass only to its actual voicing', () => {
  const notation = 'I', options = {jazz: true};
  const model = romanNumeralTooltipModel(notation, options, {
    pitches: [4, 7, 12], rootPitches: [0, 4, 7], rootNotation: notation, inversion: 1,
    bass: {label: '③', pitch: 4, caption: '<b>E</b> bass'},
  });
  const document = parse(romanNumeralTooltipHTML(notation, options, model));
  const [root, inversion] = document.querySelectorAll('.rawln-rn-tooltip-column');
  assert.equal(root.querySelector('.rawln-rn-tooltip-label').textContent, 'I');
  assert.equal(root.querySelector('.rawln-rn-tooltip-bass'), null);
  assert.equal(inversion.querySelector('.rawln-rn-tooltip-label').textContent, 'I/③');
  assert.equal(inversion.querySelector('.rawln-rn-tooltip-inversion').textContent, 'first inversion');
  assert.equal(inversion.querySelector('.rawln-rn-tooltip-bass').textContent, '<b>E</b> bass');
  assert.equal(inversion.querySelector('.rawln-rn-tooltip-bass b'), null);
});

test('Jazz ninths use the seventh-chord caption and preserve the supplied voicing', () => {
  for (const [notation, rootPitches, pitches] of [
    ['♭II9', [1, 5, 8, 11, 15], [8, 11, 13, 15, 17]],
    ['♭IIm9', [1, 4, 8, 11, 15], [8, 11, 13, 15, 16]],
    ['♭IImaj9', [1, 5, 8, 12, 15], [8, 12, 13, 15, 17]],
    ['♭II7b9', [1, 5, 8, 11, 14], [8, 11, 13, 14, 17]],
    ['♭II7#5#9', [1, 5, 9, 11, 16], [9, 11, 13, 16, 17]],
  ]) {
    const options = {jazz: true};
    const model = romanNumeralTooltipModel(notation, options, {
      pitches, rootPitches, rootNotation: notation, inversion: 2,
    });
    const document = parse(romanNumeralTooltipHTML(notation, options, model));
    assert.deepEqual(notePitches(document), pitches);
    assert.equal(document.querySelectorAll('.rawln-rn-tooltip-column').length, 1);
    assert.equal(document.querySelector('.rawln-rn-tooltip-kind').textContent, 'seventh chord');
    assert.equal(document.querySelector('.rawln-rn-tooltip-inversion'), null);
  }

  for (const [notation, pitches, kind] of [
    ['♭II7', [8, 11, 13, 17], 'seventh chord'],
    ['♭IIadd9', [8, 13, 15, 17], undefined],
    ['♭II6/9', [8, 10, 13, 15, 17], undefined],
  ]) {
    const document = parse(romanNumeralDiagramColumns([{notation, pitches, inversion: 2}], {jazz: true}));
    assert.equal(document.querySelector('.rawln-rn-tooltip-kind')?.textContent, kind);
    assert.equal(document.querySelector('.rawln-rn-tooltip-inversion').textContent, 'second inversion');
  }
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
