import assert from 'node:assert/strict';
import test from 'node:test';
import React, {useState} from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {RawlNotation} from 'librawl';
import {RawlMeasureHeader} from 'librawl/components';

const measures = [0, 4, 8, 12].map((beat, index) => ({
  beat, number: index + 1, left: index * 100, isPhraseStart: beat !== 12,
}));

for (const Host of [RawlMeasureHeader, RawlNotation]) {
  test(`${Host.name} handles section keys in the selected measure menu`, async () => {
    const dom = new JSDOM('<div id="root"></div>', {pretendToBeVisual: true});
    const {window} = dom;
    const old = {window: globalThis.window, document: globalThis.document};
    Object.assign(globalThis, {window, document: window.document});
    // React can select its legacy input-event path when imported before JSDOM.
    window.HTMLElement.prototype.attachEvent = () => {};
    window.HTMLElement.prototype.detachEvent = () => {};
    const element = window.document.querySelector('#root');
    const root = createRoot(element);
    const changes = [];
    const rhythmValues = [];
    const props = Host === RawlNotation
      ? {notes: [], beats: 16, phraseStarts: [0, 4, 8]}
      : {layout: {measures, beats: [], markers: []}};

    function Editor({withInput = true}) {
      const [selectedMeasure, select] = useState(null);
      const [sectionStarts, setSections] = useState([0, 8]);
      const sectionEditing = {
        sectionStarts,
        onSplit({beat}) {
          changes.push(['split', beat]);
          setSections(starts => [...starts, beat]);
          select(null);
        },
        onGlue({beat}) {
          changes.push(['glue', beat]);
          setSections(starts => starts.filter(start => start !== beat));
          select(null);
        },
      };
      return React.createElement(Host, {
        ...props, selectedMeasure, sectionEditing,
        onMeasureSelect: beat => select(current => current === beat ? null : beat),
        renderMeasureExtras(measure, onSectionKeyDown) {
          if (!withInput || selectedMeasure !== measure.beat) return null;
          return React.createElement('input', {
            autoFocus: true,
            onKeyDown(event) {
              onSectionKeyDown?.(event);
              if (!event.defaultPrevented && event.key === 'Enter' && event.currentTarget.value.trim()) {
                rhythmValues.push(event.currentTarget.value);
              }
            },
          });
        },
      });
    }

    const press = (target, options = {}) => {
      const event = new window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true, ...options});
      flushSync(() => target.dispatchEvent(event));
      return event.defaultPrevented;
    };
    const numberAt = (beat) => element.querySelector(`.rawln-measure-number[data-beat="${beat}"]`);
    const open = (beat, options) => {
      const label = numberAt(beat);
      assert.ok(press(label, options), 'The measure number still opens its menu');
      const input = label.querySelector('input');
      assert.ok(input);
      assert.equal(window.document.activeElement, input);
      return input;
    };

    try {
      flushSync(() => root.render(React.createElement(Editor)));
      assert.ok(press(open(4)));
      assert.deepEqual(changes, [['split', 4]]);
      assert.equal(element.querySelector('input'), null);
      assert.ok(press(open(4, {key: ' '}), {shiftKey: true}));
      assert.deepEqual(changes, [['split', 4], ['glue', 4]]);

      assert.ok(press(open(0), {shiftKey: true}), 'The first section stays intact');
      assert.ok(press(open(4), {shiftKey: true}), 'A phrase that is not a section cannot be glued');
      assert.ok(press(open(8)), 'Enter at an existing section leaves the boundary intact');
      assert.ok(press(open(12)), 'Splitting requires an existing phrase boundary');
      assert.deepEqual(changes, [['split', 4], ['glue', 4]]);

      const input = open(4);
      for (const options of [{ctrlKey: true}, {metaKey: true}, {altKey: true}, {isComposing: true}]) {
        assert.equal(press(input, options), false);
      }
      input.value = '3+2+3';
      assert.equal(press(input), false, 'Nonempty input reaches the rhythm editor');
      assert.deepEqual(rhythmValues, ['3+2+3']);
      assert.deepEqual(changes, [['split', 4], ['glue', 4]]);

      flushSync(() => root.render(React.createElement(Editor, {withInput: false})));
      const label = numberAt(4);
      label.focus();
      const command = () => element.querySelector('.rawln-measure-menu button');
      assert.equal(command().textContent, 'Split');
      assert.equal(command().parentElement.previousElementSibling, label);
      assert.equal(element.querySelectorAll('.rawln-measure-menu').length, 1);
      for (const options of [{ctrlKey: true}, {metaKey: true}, {altKey: true}, {isComposing: true}]) {
        assert.equal(press(label, options), false);
        assert.equal(label.getAttribute('aria-pressed'), 'true');
      }
      assert.ok(press(label, {key: ' '}), 'Space still closes the selected menu');
      assert.equal(command(), null);
      assert.equal(window.document.activeElement, label);
      assert.ok(press(label));
      assert.ok(press(label));
      assert.deepEqual(changes.at(-1), ['split', 4]);
      assert.equal(command(), null);
      assert.ok(press(label));
      assert.equal(command().textContent, 'Glue');
      assert.ok(press(label, {shiftKey: true}));
      assert.deepEqual(changes.at(-1), ['glue', 4]);
      assert.equal(command(), null);

      const first = numberAt(0);
      assert.ok(press(first));
      assert.equal(command(), null);
      assert.ok(press(first, {shiftKey: true}));
      assert.equal(changes.length, 4, 'The initial section stays intact');

      assert.ok(press(numberAt(8)));
      assert.equal(command().textContent, 'Glue');
      let outerClicks = 0;
      window.document.addEventListener('click', () => outerClicks++);
      flushSync(() => command().click());
      assert.equal(outerClicks, 0, 'Clicking a command cannot trigger the surrounding score');
      assert.deepEqual(changes.at(-1), ['glue', 8]);
      assert.equal(command(), null);
    } finally {
      flushSync(() => root.unmount());
      await new Promise(setImmediate);
      dom.window.close();
      Object.assign(globalThis, old);
    }
  });
}

test('RawlNotation edits its own rows without a section editor or persistence', async () => {
  const dom = new JSDOM('<div id="root"></div>', {url: 'https://example.test', pretendToBeVisual: true});
  const {window} = dom;
  const old = {window: globalThis.window, document: globalThis.document};
  Object.assign(globalThis, {window, document: window.document});
  const element = window.document.querySelector('#root');
  const root = createRoot(element);
  const notes = Object.freeze([Object.freeze({id: 'note', pitch: 60, start: 9, duration: 2, voice: 0})]);
  const rows = Object.freeze([Object.freeze({start: 0, end: 8}), Object.freeze({start: 8, end: 16})]);
  const rowsSeen = [];
  const observeRows = next => rowsSeen.push(next);
  const render = (key = 'first', options = {}) => flushSync(() => root.render(React.createElement(RawlNotation, {
    key, notes, beats: 16, rows, phraseStarts: [0, 4, 12], onSectionRowsChange: observeRows, ...options,
  })));
  const ranges = () => Array.from(element.querySelectorAll('.rawln-row'), row => [Number(row.dataset.start), Number(row.dataset.end)]);
  const label = beat => element.querySelector(`.rawln-measure-number[data-beat="${beat}"]`);
  const action = () => element.querySelector('.rawln-section-command');
  const press = (beat, shiftKey = false) => {
    label(beat).focus();
    flushSync(() => label(beat).dispatchEvent(new window.KeyboardEvent('keydown', {
      key: 'Enter', shiftKey, bubbles: true, cancelable: true,
    })));
  };
  const click = target => flushSync(() => target.dispatchEvent(new window.MouseEvent('click', {bubbles: true})));

  try {
    render();
    assert.deepEqual(ranges(), [[0, 8], [8, 16]]);
    press(0);
    press(0, true);
    assert.equal(action(), null);
    assert.deepEqual(ranges(), [[0, 8], [8, 16]]);
    press(4);
    assert.equal(action().textContent, 'Split');
    press(4);
    assert.deepEqual(ranges(), [[0, 4], [4, 8], [8, 16]]);
    assert.equal(window.document.activeElement, label(4));
    assert.equal(action().textContent, 'Glue');
    assert.equal(rowsSeen.at(-1).length, 3);
    assert.equal(element.querySelectorAll('[data-note="note"]').length, 1);

    press(4, true);
    assert.deepEqual(ranges(), [[0, 8], [8, 16]]);
    assert.equal(rowsSeen.at(-1), null);
    click(label(8));
    click(action());
    assert.deepEqual(ranges(), [[0, 16]]);
    assert.equal(action().textContent, 'Split', 'A glued source boundary can be restored');
    click(action());
    assert.deepEqual(ranges(), [[0, 8], [8, 16]]);

    click(label(12));
    click(action());
    assert.deepEqual(ranges(), [[0, 8], [8, 12], [12, 16]]);
    assert.equal(window.localStorage.length, 0);
    render('second');
    assert.deepEqual(ranges(), [[0, 8], [8, 16]]);
    render('pickup', {rows: [{start: 0, end: 8, anchor: 4}, rows[1]]});
    click(label(4));
    press(4);
    assert.equal(action(), null, 'The opening section stays attached to its pickup');
    assert.deepEqual(ranges(), [[0, 8], [8, 16]]);
    render('disabled', {sectionEditing: false});
    click(label(4));
    assert.equal(action(), null);
  } finally {
    flushSync(() => root.unmount());
    await new Promise(setImmediate);
    Object.assign(globalThis, old);
    dom.window.close();
  }
});
