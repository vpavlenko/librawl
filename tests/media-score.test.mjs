import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {MediaScore} from 'librawl/components';

test('inline media scores share transport ownership and reset the native note clock on stop and end', async () => {
  const {window} = new JSDOM('<div id="root"></div>');
  const {document} = window;
  const frames = new Map();
  let id = 0;
  Object.assign(globalThis, {
    window, document,
    requestAnimationFrame(callback) { frames.set(++id, callback); return id; },
    cancelAnimationFrame(frame) { frames.delete(frame); },
  });
  const states = new WeakMap();
  function state(media) {
    if (!states.has(media)) states.set(media, {paused: true, time: 0});
    return states.get(media);
  }
  const prototype = window.HTMLMediaElement.prototype;
  Object.defineProperties(prototype, {
    paused: {get() { return state(this).paused; }},
    duration: {get() { return 1.5; }},
    currentTime: {get() { return state(this).time; }, set(value) { state(this).time = value; }},
    play: {value() {
      state(this).paused = false;
      this.dispatchEvent(new window.Event('play'));
      this.dispatchEvent(new window.Event('playing'));
      return Promise.resolve();
    }},
    pause: {value() {
      if (!state(this).paused) {
        state(this).paused = true;
        this.dispatchEvent(new window.Event('pause'));
      }
    }},
  });
  const host = document.getElementById('root');
  const root = createRoot(host);
  const labels = {play: 'Играть', pause: 'Пауза', stop: 'Стоп', seek: 'Позиция'};
  const score = {
    beats: 2, recolorable: false,
    notes: [
      {id: 'first', pitch: 60, start: 0, duration: 1, voice: 0},
      {id: 'second', pitch: 62, start: 1, duration: 1, voice: 0},
    ],
  };
  function click(panel, label) {
    flushSync(() => panel.querySelector(`button[aria-label="${label}"]`).click());
  }
  function advance() {
    for (const [frame, callback] of [...frames]) {
      if (frames.delete(frame)) callback();
    }
  }
  function space() {
    const event = new window.KeyboardEvent('keydown', {code: 'Space', bubbles: true, cancelable: true});
    flushSync(() => document.body.dispatchEvent(event));
    return event.defaultPrevented;
  }
  function scrub(panel, seconds) {
    const slider = panel.querySelector('input[aria-label="Позиция"]');
    const pointer = type => {
      const event = new window.MouseEvent(type, {bubbles: true});
      Object.defineProperty(event, 'pointerId', {value: 1});
      return event;
    };
    flushSync(() => {
      slider.dispatchEvent(pointer('pointerdown'));
      slider.value = String(seconds);
      slider.dispatchEvent(pointer('pointerup'));
    });
  }
  try {
    flushSync(() => root.render(React.createElement(React.Fragment, null, ...['a', 'b'].map(key =>
      React.createElement(MediaScore, {key, score, labels, src: `${key}.mp3`, secondsPerBeat: .5}),
    ))));
    const [first, second] = host.querySelectorAll('.rawlp-media-score');
    const firstAudio = first.querySelector('audio');
    const secondAudio = second.querySelector('audio');
    assert.equal(first.querySelector('footer').classList.contains('rawlp-footer-inline'), true);
    assert.equal(space(), false);
    click(first, 'Играть');
    assert.equal(firstAudio.paused, false);
    assert.equal(first.querySelector('.rawln-sounding').dataset.note, 'first');
    firstAudio.currentTime = .6;
    advance();
    assert.equal(first.querySelector('.rawln-sounding').dataset.note, 'second');
    assert.equal(first.querySelector('[aria-label="Позиция"]').valueAsNumber, .6);
    assert.equal(space(), true);
    assert.equal(firstAudio.paused, true);
    assert.equal(space(), false);
    click(first, 'Играть');
    const notation = second.querySelector('.rawln-score');
    notation.getBoundingClientRect = () => ({left: 0, width: 100});
    flushSync(() => notation.dispatchEvent(new window.MouseEvent('click', {clientX: 75, bubbles: true})));
    assert.equal(firstAudio.paused, true);
    assert.equal(firstAudio.currentTime, 0);
    assert.equal(first.querySelector('.rawln-sounding'), null);
    assert.equal(secondAudio.paused, false);
    assert.equal(secondAudio.currentTime, .75);
    assert.equal(second.querySelector('.rawln-sounding').dataset.note, 'second');
    click(second, 'Стоп');
    assert.equal(secondAudio.paused, true);
    assert.equal(secondAudio.currentTime, 0);
    assert.equal(second.querySelector('.rawln-sounding'), null);
    scrub(second, .25);
    assert.equal(secondAudio.paused, true);
    assert.equal(secondAudio.currentTime, .25);
    click(second, 'Играть');
    secondAudio.currentTime = 1.5;
    flushSync(() => secondAudio.dispatchEvent(new window.Event('ended')));
    assert.equal(secondAudio.currentTime, 0);
    assert.equal(second.querySelector('.rawln-sounding'), null);
    assert.equal(frames.size, 0);
  } finally {
    flushSync(() => root.unmount());
    await new Promise(resolve => setTimeout(resolve, 20));
    window.close();
    for (const key of ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame']) delete globalThis[key];
  }
});
