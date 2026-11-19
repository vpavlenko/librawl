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

    function Editor() {
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
        ...props, selectedMeasure, sectionEditing, onMeasureSelect: select,
        renderMeasureExtras(measure, onSectionKeyDown) {
          if (selectedMeasure !== measure.beat) return null;
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
    const open = (beat, options) => {
      const label = element.querySelector(`.rawln-measure-number[data-beat="${beat}"]`);
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
    } finally {
      flushSync(() => root.unmount());
      await new Promise(setImmediate);
      dom.window.close();
      Object.assign(globalThis, old);
    }
  });
}
