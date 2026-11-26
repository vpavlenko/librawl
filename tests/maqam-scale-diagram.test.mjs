import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {MaqamScaleDiagram} from 'librawl/components';
import {noteColorClass} from 'librawl/native';

test('renders equal-height notes and anchors the grid and quarter tones to the Sikah third', async () => {
  const {window} = new JSDOM('<main></main>');
  const globals = {window: globalThis.window, document: globalThis.document};
  const {document} = window;
  Object.assign(globalThis, {window, document});
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {get: () => 560});
  const container = document.querySelector('main');
  const root = createRoot(container);

  try {
    flushSync(() => root.render(React.createElement(MaqamScaleDiagram, {
      name: 'Rahat al-Arwah',
      lower: [-3.5, -1.5],
      scale: [0, 1.5, 3.5, 7.5, 8, 12],
      groups: [{label: 'Sikah 1', start: 0, end: 2}, {label: 'Hijaz 3', start: 2, end: 5}],
      shoulders: [{name: 'Huzzam', start: 2, end: 5}],
    })));
    const diagram = container.querySelector('.rawln-maqam-scale');
    const note = pitch => diagram.querySelector(`[data-maqam-pitch="${pitch}"]`);
    const notes = [...diagram.querySelectorAll('[data-maqam-pitch]')];
    const marker = pitch => note(pitch).querySelector('[data-quartertone-position]');
    assert.equal(diagram.getAttribute('aria-label'), 'Rahat al-Arwah');
    assert.equal(diagram.dataset.tonicOffset, '3.5');
    assert.equal(diagram.querySelector('.rawln-tonic-line').dataset.pitch, '3.5');
    assert.equal(note(3.5).dataset.maqamPitchClass, '0');
    assert.ok(note(3.5).classList.contains(noteColorClass(0)));
    assert.equal(notes.length, 8);
    assert.equal(new Set(notes.map(element => element.style.height)).size, 1);
    assert.ok(parseFloat(notes[0].style.width) > 0);
    assert.equal(marker(1.5), null);
    assert.equal(marker(3.5), null);
    assert.equal(marker(0).dataset.quartertonePosition, 'below');
    assert.equal(marker(8).dataset.quartertonePosition, 'above');
    assert.match(marker(0).style.top, /100%/);
    assert.equal(marker(8).style.top, '-2px');
    assert.deepEqual([...diagram.querySelectorAll('.rawln-maqam-label')].map(element => element.textContent),
      ['Sikah 1', 'Huzzam', 'Hijaz 3']);
  } finally {
    flushSync(() => root.unmount());
    await new Promise(resolve => setImmediate(resolve));
    Object.assign(globalThis, globals);
    window.close();
  }
});
