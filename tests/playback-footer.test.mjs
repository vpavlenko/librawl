import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {PlaybackFooter} from 'librawl/components';

test('PlaybackFooter keeps musical marks and delegates transport controls to its host', async () => {
  const {window} = new JSDOM('<div id="root"></div>');
  globalThis.window = window;
  globalThis.document = window.document;
  const element = document.getElementById('root');
  const root = createRoot(element);
  let toggles = 0;
  const rates = [];
  const volumes = [];
  const props = {
    position: 59.99, duration: 100, playing: false,
    onTogglePlay: () => toggles++, onSeek: () => {},
    rate: 1, onRateChange: rate => rates.push(rate),
    volume: 0.75, onVolumeChange: volume => volumes.push(volume),
    volumeMax: 1.5, keyboardShortcuts: true,
    timeline: {
      sections: [20], phrases: [35],
      bassBars: [{start: -4, end: 40, color: 'red'}],
    },
  };
  try {
    flushSync(() => root.render(React.createElement(PlaybackFooter, props)));
    assert.deepEqual([...element.querySelectorAll('.rawlp-time')].map(time => time.textContent), ['0:59','1:40']);
    assert.deepEqual([...element.querySelectorAll('.rawlp-section-mark')].map(mark => mark.style.left), ['20%','100%']);
    const bass = element.querySelector('.rawlp-bass-bar');
    assert.equal(bass.style.left,'0%');
    assert.equal(bass.style.width,'40%');
    assert.equal(element.querySelector('[aria-label="Volume"]').max,'150');
    element.querySelector('[aria-label="Play"]').click();
    element.querySelector('[aria-label="Speed up"]').click();
    element.querySelector('[aria-label="Volume"]').dispatchEvent(new window.MouseEvent('dblclick',{bubbles:true}));
    document.dispatchEvent(new window.KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true,cancelable:true}));
    assert.equal(toggles,2);
    assert.deepEqual(rates,[1.1]);
    assert.deepEqual(volumes,[1]);
    flushSync(() => root.render(React.createElement(PlaybackFooter,{...props,position:60,playing:true})));
    assert.equal(element.querySelector('.rawlp-bass-bar'),bass);
    assert.equal(element.querySelector('.rawlp-time').textContent,'1:00');
    assert(element.querySelector('[aria-label="Pause"]'));
  } finally {
    flushSync(() => root.unmount());
    await new Promise(resolve => setTimeout(resolve,20));
    window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('PlaybackFooter follows the live audio clock frame by frame and stops when paused', async () => {
  const {window} = new JSDOM('<div id="root"></div>');
  globalThis.window = window;
  globalThis.document = window.document;
  const frames = new Map();
  let frameId = 0;
  globalThis.requestAnimationFrame = callback => {
    frames.set(++frameId, callback);
    return frameId;
  };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const element = document.getElementById('root');
  const root = createRoot(element);
  let liveTime = 1;
  const props = {
    position: 0, duration: 12, playing: true, getPosition: () => liveTime,
    onTogglePlay: () => {}, onSeek: () => {},
    timeline: {sections: [4, 8]},
  };
  function advance(time) {
    liveTime = time;
    assert.equal(frames.size, 1);
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback();
  }
  try {
    flushSync(() => root.render(React.createElement(PlaybackFooter, props)));
    const slider = element.querySelector('input[aria-label="Seek"]');
    const mark = element.querySelector('.rawlp-section-mark');
    assert.equal(slider.valueAsNumber, 1);
    advance(1.017);
    assert.equal(slider.valueAsNumber, 1.017);
    advance(2.125);
    assert.equal(slider.valueAsNumber, 2.125);
    assert.equal(slider.getAttribute('aria-valuetext'), '0:02');
    assert.equal(element.querySelector('.rawlp-section-mark'), mark);
    flushSync(() => root.render(React.createElement(PlaybackFooter, {...props, position: 2.2, playing: false})));
    assert.equal(slider.valueAsNumber, 2.2);
    assert.equal(frames.size, 0);
    flushSync(() => root.render(React.createElement(PlaybackFooter, props)));
    assert.equal(frames.size, 1);
  } finally {
    flushSync(() => root.unmount());
    await new Promise(resolve => setTimeout(resolve,20));
    window.close();
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    delete globalThis.window;
    delete globalThis.document;
  }
  assert.equal(frames.size, 0);
});
