import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import React from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {RawlNotation} from 'librawl';
import {isModulationOnsetAllowed} from 'librawl/native';

test('default notation previews and moves a modulation across a row boundary', async () => {
  const {window} = new JSDOM('<main></main>', {pretendToBeVisual: true});
  const globals = {window: globalThis.window, document: globalThis.document};
  const {document} = window;
  Object.assign(globalThis, {window, document});
  const style = document.createElement('style');
  style.textContent = readFileSync(new URL('../dist/native.css', import.meta.url), 'utf8');
  document.head.append(style);
  const container = document.querySelector('main');
  const root = createRoot(container);
  const measureMap = [
    {start: 0, duration: 1, sourceNumber: 0},
    {start: 1, duration: 4, sourceNumber: 1},
    {start: 5, duration: 3, sourceNumber: 2},
    {start: 8, duration: 4, sourceNumber: 3},
  ];
  const changes = [{beat: 5, tonic: 7, name: 'G'}];
  const notes = [
    {id: 'before', start: 0.75, pitch: 60},
    {id: 'start', start: 1, pitch: 62},
    {id: 'across', start: 4.75, pitch: 64, playbackSpan: [41, 42]},
    {id: 'current', start: 7, pitch: 65},
    {id: 'after', start: 8, pitch: 67},
  ].map(note => ({voice: 0, duration: 0.5, ...note}));
  const saved = [];
  const seeks = [];
  const measure = beat => container.querySelector(`.rawln-measure-number[data-beat="${beat}"]`);
  const note = (id, row = 0) => container.querySelectorAll(`[data-note="${id}"]`)[row];
  const marker = beat => container.querySelector(`.rawln-modulation[data-beat="${beat}"]`);
  const isEditing = () => container.querySelector('.modulation-onset-editing') != null;
  const click = (node, shiftKey = false) => {
    const event = new window.MouseEvent('click', {shiftKey, bubbles: true, cancelable: true});
    flushSync(() => node.dispatchEvent(event));
    return event.defaultPrevented;
  };
  const settle = () => new Promise(resolve => setTimeout(resolve, 20));
  const hover = async node => {
    node.dispatchEvent(new window.MouseEvent('mouseover', {bubbles: true}));
    await settle();
  };
  const shift = held => flushSync(() => document.dispatchEvent(new window.KeyboardEvent(
    held ? 'keydown' : 'keyup', {key: 'Shift', shiftKey: held, bubbles: true})));

  try {
    flushSync(() => root.render(React.createElement(RawlNotation, {
      beats: 12, rows: [{start: 0, end: 5}, {start: 5, end: 12}], notes, measureMap, changes,
      onChangesChange: value => saved.push(value), onSeek: beat => seeks.push(beat),
    })));
    assert.match(decodeURIComponent(note('across').style.cursor), /M16 9a5 5/);
    click(marker(5).querySelector('.rawln-modulation-flag'));
    assert.equal(measure(5).getAttribute('aria-pressed'), 'true');
    assert.equal(document.activeElement, measure(5));
    assert.match(decodeURIComponent(note('across').style.cursor), /m2 22 .* 3 21, pointer$/);
    await hover(note('across'));
    assert.equal(marker(5).dataset.tonic, '4');
    shift(true);
    assert.equal(isEditing(), true);
    assert.equal(marker(4.75).dataset.tonic, '7');
    assert.equal(marker(4.75).dataset.onsetOverride, 'true');
    assert.equal(note('before').dataset.modulationOnsetAllowed, undefined);
    assert.equal(note('start').dataset.modulationOnsetAllowed, 'true');
    assert.equal(note('after').dataset.modulationOnsetAllowed, undefined);
    assert.equal(window.getComputedStyle(note('across')).cursor, 'e-resize');
    assert.equal(window.getComputedStyle(note('across', 1)).cursor, 'e-resize');
    assert.equal(window.getComputedStyle(note('after')).cursor, 'not-allowed');
    assert.equal(click(container.querySelector('.rawln-score'), true), true);
    click(note('after'), true);
    assert.deepEqual(saved, []);
    assert.deepEqual(seeks, []);
    assert.equal(measure(5).getAttribute('aria-pressed'), 'true');
    shift(false);
    assert.match(decodeURIComponent(note('across').style.cursor), /m2 22 .* 3 21, pointer$/);
    assert.equal(marker(5).dataset.tonic, '4');

    shift(true);
    click(note('across', 1), true);
    assert.deepEqual(saved.at(-1), [{beat: 4.75, tonic: 7, name: 'G', measureBeat: 5, onsetOverride: true}]);
    assert.equal(isEditing(), false);
    assert.match(decodeURIComponent(note('across').style.cursor), /M16 9a5 5/);
    shift(false);
    click(measure(1));
    shift(true);
    assert.equal(isEditing(), false, 'The preceding measure does not acquire the modulation');
    shift(false);
    click(marker(4.75).querySelector('.rawln-modulation-label'));
    assert.equal(measure(5).getAttribute('aria-pressed'), 'true');
    assert.equal(document.activeElement, measure(5));
    shift(true);
    await hover(note('current'));
    assert.equal(marker(7).dataset.tonic, '7', 'The same measure can move the modulation again');
    flushSync(() => window.dispatchEvent(new window.Event('blur')));
    assert.equal(isEditing(), false);
    assert.equal(marker(4.75).dataset.tonic, '5');
    click(note('current'), true);
    assert.deepEqual(saved.at(-1), [{beat: 7, tonic: 7, name: 'G', measureBeat: 5, onsetOverride: true}]);
    assert.deepEqual(changes, [{beat: 5, tonic: 7, name: 'G'}]);
  } finally {
    flushSync(() => root.unmount());
    await settle();
    Object.assign(globalThis, globals);
    window.close();
  }
});

test('the shared onset window is half-open and uses exact source times', () => {
  for (const time of [0.999999999, 8, Infinity, NaN]) assert.equal(isModulationOnsetAllowed(time, [1, 8]), false);
  for (const time of [1, 4.75, 7.999999999]) assert.equal(isModulationOnsetAllowed(time, [1, 8]), true);
  assert.equal(isModulationOnsetAllowed(0, null), false);
});
