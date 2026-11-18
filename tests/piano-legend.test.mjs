import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FoldablePianoLegend, PianoLegend } from 'librawl/components';

const modes = [{ title: 'major', chords: [
  { name: 'bII', pitches: [1, 5, 8] },
  { name: 'V/V', pitches: [2, 6, 9] },
] }];

function render(Component, props) {
  return new JSDOM(renderToStaticMarkup(createElement(Component, props))).window.document.body;
}

function dots(root) {
  return Array.from(root.querySelectorAll('.rawln-piano-pitch-dot'), dot => ({
    color: dot.style.background,
    size: [dot.style.width, dot.style.height],
    hidden: dot.getAttribute('aria-hidden'),
  }));
}

const expected = [
  { color: 'white', size: ['1px', '1px'], hidden: 'true' },
  { color: 'black', size: ['2px', '2px'], hidden: 'true' },
];

test('piano pitch dots match the original marks in both sizes and after transposing', () => {
  for (const inline of [false, true]) {
    const keys = render(PianoLegend, { inline, currentTonic: 7 });
    assert.deepEqual(dots(keys), expected);
    assert.equal(keys.querySelectorAll('.rawln-piano-key').length, 12);
    if (!inline) {
      const labels = [...keys.querySelectorAll('.rawln-piano-key:has(> .rawln-piano-pitch-dot)')]
        .map(key => key.textContent);
      assert.deepEqual(labels, ['♭2', '♯4']);
    }
  }
});

test('chord stairs retain both relative pitch dots', t => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => 'true' }, configurable: true });
  t.after(() => {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
  });
  const legend = render(FoldablePianoLegend, { modes, currentTonic: 7 });
  const chordNotes = legend.querySelector('.rawln-piano-chords');
  assert.equal(chordNotes.querySelectorAll('.rawln-piano-chord > i').length, 6);
  assert.deepEqual(dots(chordNotes), expected);
  assert.equal(legend.querySelector('.rawln-piano-legend').dataset.expanded, 'true');
});
