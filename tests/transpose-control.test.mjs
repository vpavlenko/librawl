import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {setTimeout} from 'node:timers/promises';
import React from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {MAX_TRANSPOSE_SEMITONES, TransposeControl} from 'librawl/components';

function mount(t, initialProps) {
  const {window} = new JSDOM('<div id="root"></div><button id="outside">Outside</button>');
  const {document} = window;
  globalThis.window = window;
  globalThis.document = document;
  const element = document.querySelector('#root');
  const root = createRoot(element);
  const render = props => flushSync(() => root.render(React.createElement(TransposeControl, props)));
  const query = selector => element.querySelector(selector);
  const click = selector => flushSync(() => query(selector).click());
  t.after(async () => {
    flushSync(() => root.unmount());
    await setTimeout(20);
    window.close();
    delete globalThis.window;
    delete globalThis.document;
  });
  render(initialProps);
  return {window, document, render, query, click};
}

test('transpose picker forwards choices and persistence, then restores focus on Escape', t => {
  const changes = [];
  const persistence = [];
  const props = {
    value: 0, firstTonic: 2, persist: false,
    onChange: value => changes.push(value),
    onPersistChange: value => persistence.push(value),
  };
  const {window, document, render, query, click} = mount(t, props);
  const trigger = query('[aria-haspopup="dialog"]');
  click('[aria-label="Transpose down one semitone"]');
  click('[aria-haspopup="dialog"]');
  const dialog = query('[role="dialog"]');
  assert.equal(dialog.dataset.placement, 'bottom');
  assert.equal(dialog.querySelectorAll('button[aria-pressed]').length, 2 * MAX_TRANSPOSE_SEMITONES + 1);
  assert.equal(document.activeElement, dialog.querySelector('[aria-label="0 semitones, tonic D"]'));
  click('[aria-label="+3 semitones, tonic F"]');
  click('input[type="checkbox"]');
  assert.deepEqual(changes, [-1, 3]);
  assert.deepEqual(persistence, [true]);
  flushSync(() => document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', {
    key: 'Escape', bubbles: true, cancelable: true,
  })));
  assert.equal(query('[role="dialog"]'), null);
  assert.equal(document.activeElement, trigger);

  render({...props, value: MAX_TRANSPOSE_SEMITONES});
  assert.equal(query('[aria-label="Transpose up one semitone"]').disabled, true);
  render({...props, value: -MAX_TRANSPOSE_SEMITONES});
  assert.equal(query('[aria-label="Transpose down one semitone"]').disabled, true);
});

test('a top toolbar keeps host shortcuts when closed and labels quarter-tone tonics', t => {
  const {window, document, query, click} = mount(t, {
    value: -2, firstTonic: 0.5, onChange() {}, placement: 'top', captureKeys: false,
  });
  const trigger = query('[aria-haspopup="dialog"]');
  trigger.getBoundingClientRect = () => ({bottom: 60});
  const keypresses = [];
  window.addEventListener('keydown', event => keypresses.push(event.key));
  const pressA = target => target.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'a', bubbles: true}));
  pressA(trigger);
  click('[aria-haspopup="dialog"]');
  const picker = query('[role="dialog"]');
  assert.equal(picker.dataset.placement, 'top');
  assert.equal(picker.style.getPropertyValue('--rawlt-anchor-bottom'), '60px');
  assert.equal(picker.querySelector('input[type="checkbox"]'), null);
  const selected = picker.querySelector('[aria-pressed="true"]');
  assert.equal(selected.getAttribute('aria-label'), '−2 semitones, tonic B♭ +50¢');
  assert.equal(document.activeElement, selected);
  pressA(selected);
  assert.deepEqual(keypresses, ['a']);
  flushSync(() => document.querySelector('#outside').dispatchEvent(new window.Event('pointerdown', {bubbles: true})));
  assert.equal(query('[role="dialog"]'), null);
  assert.match(readFileSync(createRequire(import.meta.url).resolve('librawl/transpose-control.css'), 'utf8'), /position: fixed/);
});
