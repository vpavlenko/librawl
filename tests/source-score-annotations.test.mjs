import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {RawlNotation} from 'librawl';

test('authored score marks use native notes, harmony lanes and beat-based seeking', t => {
  const {window} = new JSDOM('<div id="root"></div>');
  globalThis.window = window;
  globalThis.document = window.document;
  const host = document.getElementById('root');
  const root = createRoot(host);
  t.after(async () => {
    flushSync(() => root.unmount());
    await new Promise(resolve => setTimeout(resolve, 20));
    window.close();
    delete globalThis.window;
    delete globalThis.document;
  });

  const sought = [];
  const notes = [
    {id: 'marked', pitch: 65, start: 0, duration: 1.5, voice: 0},
    {id: 'plain', pitch: 63, start: 1.5, duration: .5, voice: 0},
    {id: 'second-row', pitch: 72, start: 8, duration: .5, voice: 0},
  ];
  const sourceAnnotations = {
    noteMarks: [{noteId: 'marked', star: true, arrow: true}],
    unpitched: [{beat: 2, pitch: 75, label: 'Без высоты'}],
    harmony: [{beat: 0, notation: 'I', original: 'F'}, {beat: 8, notation: 'V⁷/V'}],
    spans: [
      {start: 0, end: 2, kind: 'circle'},
      {start: 0, end: 2, kind: 'bracket'},
      {start: 1, end: 9, kind: 'bracket'},
    ],
    doubleBarlines: [4, 8, 12],
    comments: [{beat: 1.5, measure: 'т. 25', text: 'Аккорд F', fragments: [
      {text: 'Аккорд '}, {notation: 'I'},
    ]}],
  };
  const props = {
    notes, beats: 12, sourceAnnotations, onSeek: beat => sought.push(beat),
    rows: [{start: 0, end: 8}, {start: 8, end: 12}],
    measureMap: [
      {start: 0, duration: 4, sourceNumber: 25},
      {start: 4, duration: 4, sourceNumber: 26},
      {start: 8, duration: 4, sourceNumber: 27},
    ],
    phraseStarts: [], hideInitialTonic: true,
  };
  const render = options => flushSync(() => root.render(React.createElement(RawlNotation, options)));
  render(props);

  const marked = host.querySelector('[data-note="marked"]');
  assert.equal(marked.dataset.noteStar, 'true');
  assert.equal(marked.dataset.noteArrow, 'true');
  assert.equal(marked.style.left, '0%');
  assert.equal(marked.style.width, '18.75%');
  assert.equal(host.querySelector('[data-note="plain"]').dataset.noteStar, undefined);
  assert.equal(host.querySelector('.rawln-source-cross').style.left, '25%');
  assert.equal(host.querySelector('.rawln-source-circle').style.width, '25%');

  assert.deepEqual([...host.querySelectorAll('.rawln-harmony-label')].map(label => (
    [label.dataset.beat, label.dataset.original, label.closest('.rawln-row').dataset.start]
  )), [['0', 'F', '0'], ['8', undefined, '8']]);
  assert.equal(host.querySelector('.rawln-harmony-lane').dataset.position, 'above');

  const [first, second] = host.querySelectorAll('.rawln-row');
  assert.deepEqual([...first.querySelectorAll('.rawln-source-bracket')].map(bracket => bracket.style.gridRowStart), ['1', '2']);
  assert.equal(second.querySelector('.rawln-source-bracket').style.width, '25%');
  assert.equal(first.querySelector('.rawln-double-bar[data-beat="4"]').dataset.phraseBoundary, undefined);
  assert.equal(first.querySelector('.rawln-double-bar[data-beat="8"]').dataset.terminal, 'true');
  assert.equal(second.querySelector('.rawln-double-bar[data-beat="12"]').dataset.terminal, 'true');
  assert.deepEqual([...host.querySelectorAll('[data-score-measure]')].map(node => node.dataset.scoreMeasure), ['25', '26', '27']);

  const comment = host.querySelector('.rawln-source-comment');
  assert.equal(comment.textContent, 'т. 25Аккорд I');
  assert.ok(comment.querySelector('.chord-root'));
  assert.ok(comment.querySelector('span [data-rn-tooltip]'));
  comment.querySelector('button').click();
  assert.deepEqual(sought, [1.5]);

  render({...props, sourceAnnotations: undefined});
  assert.equal(host.querySelector('.rawln-harmony-lane'), null);
  assert.equal(host.querySelector('[data-note-star], .rawln-source-comments, .rawln-double-bar'), null);
});
