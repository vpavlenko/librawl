import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {flushSync} from 'react-dom';

const require = createRequire(import.meta.url);
const {outputFiles: [{text}]} = await build({
  entryPoints: [fileURLToPath(new URL('./measure-headers.jsx', import.meta.url))],
  bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'transform',
  external: ['react', 'react-dom', 'react-dom/client'],
});
const module = {exports: {}};
vm.runInThisContext(`(function(module, exports, require) {${text}\n})`)(module, module.exports, require);
const {mountMeasureHeaders} = module.exports;

test('shared headers carry source numbers and recolor selected tonic regions across rows', async () => {
  const dom = new JSDOM('<main><div></div><div></div></main>', {pretendToBeVisual: true});
  const window = dom.window;
  Object.assign(globalThis, {window, document: window.document});
  const panel = document.querySelector('main');
  const scores = [...panel.children];
  for (const score of scores) score.getBoundingClientRect = () => ({width: 500, height: 70});
  const changes = [{beat: 4, tonic: 7}];
  const measureMap = [
    {start: 0, duration: 4, sourceNumber: 17},
    {start: 4, duration: 4, sourceNumber: 18},
    {start: 8, duration: 0.25, sourceNumber: 19},
  ];
  const colors = [];
  const handle = mountMeasureHeaders(panel, {
    tonic: 0, changes, measureMap, phraseStarts: [4],
    rows: [{start: 0, end: 4}, {start: 4, end: 8.25}].map((row, index) => ({
      score: scores[index], row, axis: {guideTop: 4, notesBottom: 70},
    })),
    onTonicChange: next => colors.push(next),
  });
  const selected = () => panel.querySelector('.rawln-measure-number[aria-pressed="true"]')?.dataset.scoreMeasure;
  const keyboard = (element, key) => flushSync(() => {
    element.dispatchEvent(new window.KeyboardEvent('keydown', {key, bubbles: true}));
  });
  try {
    const labels = [...panel.querySelectorAll('.rawln-measure-number')];
    assert.deepEqual(labels.map(label => label.textContent), ['17', '18', '19']);
    assert.equal(panel.querySelectorAll('.rawln-measure-grid').length, 2);
    assert.equal(scores[1].querySelector('.rawln-modulation').dataset.tonic, '7');
    labels[1].focus();
    keyboard(labels[1], 'Enter');
    assert.equal(selected(), '18');
    assert.equal(document.activeElement, labels[1]);
    handle.hoverNote({pitch: 62});
    await Promise.resolve();
    assert.equal(colors.at(-1)[0].tonic, 2);
    assert.equal(scores[1].querySelector('.rawln-modulation').dataset.tonic, '2');
    handle.hoverNote(null);
    await Promise.resolve();
    assert.equal(colors.at(-1), changes);
    handle.hoverNote({pitch: 65});
    keyboard(labels[1], 'Escape');
    await Promise.resolve();
    assert.equal(selected(), undefined);
    assert.equal(colors.at(-1), changes);
    assert.equal(document.activeElement, document.body);
    assert.equal(labels[1].tabIndex, 0);
    assert.equal(labels[1].getAttribute('aria-pressed'), 'false');
    const otherControl = document.createElement('button');
    document.body.append(otherControl);
    keyboard(labels[1], 'Enter');
    assert.equal(selected(), '18');
    otherControl.focus();
    keyboard(otherControl, 'Escape');
    assert.equal(selected(), undefined);
    assert.equal(document.activeElement, otherControl);
    flushSync(() => labels[1].click());
    assert.equal(handle.chooseNote({pitch: 64}), true);
    await Promise.resolve();
    assert.equal(selected(), undefined);
    assert.equal(scores[1].querySelector('.rawln-modulation').dataset.tonic, '4');
    assert.equal(handle.chooseNote({pitch: 65}), false);
    assert.deepEqual(changes, [{beat: 4, tonic: 7}]);
  } finally {
    handle.destroy();
    assert.equal(panel.querySelectorAll('.rawln-measure-grid').length, 0);
    dom.window.close();
  }
});

test('the preceding measure and a displaced flag have independent recoloring targets', async () => {
  const dom = new JSDOM('<main><div></div><div></div></main>', {pretendToBeVisual: true});
  const window = dom.window;
  Object.assign(globalThis, {window, document: window.document});
  const panel = document.querySelector('main');
  const scores = [...panel.children];
  const changes = [{beat: 3.5, tonic: 7}];
  const colors = [];
  const handle = mountMeasureHeaders(panel, {
    tonic: 0, changes, modulationMarkerPlacement: 'following-measure',
    measureMap: [{start: 0, duration: 4, sourceNumber: 8},{start: 4, duration: 4, sourceNumber: 9}],
    rows: [{start: 0, end: 4},{start: 4, end: 8}].map((row, index) => ({
      score: scores[index], row, axis: {guideTop: 4, notesBottom: 70},
    })),
    onTonicChange: next => colors.push(next),
  });
  try {
    assert.equal(scores[0].querySelector('.rawln-modulation[data-origin-beat="3.5"]'), null);
    const flag = () => scores[1].querySelector('.rawln-modulation[data-beat="4"][data-origin-beat="3.5"]');
    assert.equal(flag().dataset.tonic, '7');
    const firstMeasure = scores[0].querySelector('.rawln-measure-number');
    flushSync(() => firstMeasure.click());
    handle.hoverNote({pitch: 62});
    await Promise.resolve();
    assert.deepEqual(colors.at(-1).map(({beat, tonic}) => [beat, tonic]), [[0, 2], [3.5, 7]]);
    assert.equal(flag().dataset.tonic, '7');
    flushSync(() => firstMeasure.click());
    await Promise.resolve();
    assert.equal(colors.at(-1), changes);
    flushSync(() => scores[1].querySelector('.rawln-measure-number').click());
    handle.hoverNote({pitch: 62});
    await Promise.resolve();
    assert.deepEqual(colors.at(-1).map(({beat, tonic}) => [beat, tonic]), [[3.5, 2]]);
    assert.equal(flag().dataset.tonic, '2');
    assert.equal(handle.chooseNote({pitch: 64}), true);
    await Promise.resolve();
    assert.deepEqual(colors.at(-1).map(({beat, tonic}) => [beat, tonic]), [[3.5, 4]]);
    assert.equal(flag().dataset.tonic, '4');
    flushSync(() => firstMeasure.click());
    assert.equal(handle.chooseNote({pitch: 65}), true);
    await Promise.resolve();
    assert.deepEqual(colors.at(-1).map(({beat, tonic}) => [beat, tonic]), [[0, 5], [3.5, 4]]);
    assert.equal(flag().dataset.tonic, '4');

    // The existing browser adapter already forwards source notes and works
    // without changes to its host's note click binding.
    const note = document.createElement('div');
    note.dataset.start = '2.75';
    note.dataset.modulationOnsetNote = 'true';
    scores[0].append(note);
    flushSync(() => scores[1].querySelector('.rawln-measure-number').click());
    flushSync(() => document.dispatchEvent(new window.KeyboardEvent('keydown', {
      key: 'Shift', shiftKey: true, bubbles: true,
    })));
    assert.equal(note.dataset.modulationOnsetAllowed, 'true');
    handle.hoverNote({start: 2.75, pitch: 63});
    await Promise.resolve();
    assert.equal(scores[0].querySelector('.rawln-modulation[data-beat="2.75"]').dataset.tonic, '4');
    assert.equal(handle.chooseNote({start: 2.75, pitch: 63}), true);
    await Promise.resolve();
    assert.deepEqual(colors.at(-1).map(({beat, tonic, measureBeat}) => [beat, tonic, measureBeat]),
      [[0, 5, undefined], [2.75, 4, 4]]);
    assert.equal(panel.classList.contains('modulation-onset-editing'), false);
    assert.deepEqual(changes, [{beat: 3.5, tonic: 7}]);
  } finally {
    handle.destroy();
    dom.window.close();
  }
});
