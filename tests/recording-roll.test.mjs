import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {RawlNotation} from 'librawl';
import {createSectionPlaybackClock} from 'librawl/native';

test('recording intervals drive notes independently of overlapping display beats', async () => {
  const window = new JSDOM('<div id="root"></div>').window;
  globalThis.window = window;
  globalThis.document = window.document;
  const element = document.getElementById('root');
  const root = createRoot(element);
  const clock = createSectionPlaybackClock();
  const sounding = () => [...element.querySelectorAll('.rawln-sounding')].map(note => [
    note.dataset.note, note.closest('.rawln-row').dataset.start,
  ]);
  const notes = [
    {id:'first',pitch:60,start:1,duration:2,voice:0,playbackSpan:[10,14]},
    {id:'later',pitch:62,start:1,duration:2,voice:0,playbackSpan:[20,24]},
  ];
  clock.advance(21);
  try {
    flushSync(() => root.render(React.createElement(RawlNotation, {
      notes, beats:4, rows:[{start:0,end:2},{start:2,end:4}], playbackClock:clock,
      recolorable:false,
      renderUnderlay:(row,axis) => React.createElement('div', {
        'data-underlay-top':axis.pitchToY(62),
      }),
    })));
    const note = element.querySelector('[data-note="later"]');
    assert.equal(note.style.height, '10px');
    assert.deepEqual(sounding(), [['later','0']]);
    clock.advance(12);
    assert.deepEqual(sounding(), [['first','2']]);
    assert.equal(note.style.height, '5px');
    assert.equal(element.querySelector('.rawln-score [data-underlay-top]').dataset.underlayTop,'20');
  } finally {
    flushSync(() => root.unmount());
    await new Promise(resolve => setTimeout(resolve,20));
    window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('alignScoreRows aligns the downbeats with equal time scale across pickup and full rows', async () => {
  const {alignScoreRows} = await import('librawl/geometry');
  const {rows, width} = alignScoreRows([
    {start:0,end:52,anchor:4}, {start:52,end:100,anchor:52}, {start:100,end:112},
  ]);
  assert.equal(width,52);
  assert.equal(rows[0].style.width,'100%');
  const beatPercent = 100 / 52;
  for (const row of rows.slice(1)) {
    assert(Math.abs(parseFloat(row.style.marginLeft) - 4 * beatPercent) < 1e-9);
    assert(Math.abs(parseFloat(row.style.width) - (row.end-row.start) * beatPercent) < 1e-9);
  }
});

test('score seeking uses the transport clock while measure recoloring keeps playback in place', async () => {
  const {window} = new JSDOM('<div id="root"></div>');
  globalThis.window = window;
  globalThis.document = window.document;
  const element = document.getElementById('root');
  const root = createRoot(element);
  const seeks = [];
  const clock = {...createSectionPlaybackClock(), seek: beat => seeks.push(beat)};
  const notes = [{id:'note',pitch:62,start:1,duration:1,voice:0}];
  const click = (node, x = 0) => flushSync(() => node.dispatchEvent(
    new window.MouseEvent('click', {bubbles:true, clientX:x}),
  ));
  try {
    flushSync(() => root.render(React.createElement(RawlNotation, {notes, beats:4, playbackClock:clock})));
    const score = element.querySelector('.rawln-score');
    score.getBoundingClientRect = () => ({left:10,width:200});
    click(score, 110);
    click(element.querySelector('[data-note="note"]'));
    assert.deepEqual(seeks,[2,1]);
    click(element.querySelector('.rawln-measure-number'));
    click(element.querySelector('[data-note="note"]'));
    assert.deepEqual(seeks,[2,1]);
    assert.equal(element.querySelector('[data-note="note"]').dataset.degree,'0');
  } finally {
    flushSync(() => root.unmount());
    await new Promise(resolve => setTimeout(resolve,20));
    window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
});
