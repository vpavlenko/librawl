import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {TonalGrid, RawlMeasureHeader} from 'librawl/components';
import {RawlNotation} from 'librawl';
import {tonicMarkers, markersForRow, visibleBeatLines, measureSubdivisionBeats} from 'librawl/geometry';
import * as browserGrid from '../src/notation/score-grid-browser.mjs';

test('React and standalone score guides share pitch, placement and tonic regions', () => {
  const {document} = new JSDOM('<main id="score"></main>').window;
  const score = document.getElementById('score');
  const range = {low:48, high:72};
  const pitchToY = pitch => 18 + (72 - pitch) * 3;
  const options = {...range, tonic:0, changes:[{beat:4,tonic:7}], beats:8, pitchToY, height:100};
  const mounted = browserGrid.mount(score, options);
  const regions = mounted.segments.map(region => ({
    tonic:region.tonic, left:region.beat / 8 * 100 + '%', width:(region.end - region.beat) / 8 * 100 + '%',
  }));
  const markup = renderToStaticMarkup(React.createElement(TonalGrid, {regions, range, pitchToY:pitch => pitchToY(pitch) + 3}));
  const reactGrid = new JSDOM(markup).window.document.querySelector('.rawln-grid');
  const properties = nodes => [...nodes].map(({dataset,style}) => [dataset.pitch,dataset.tonic,style.left,style.top,style.width]);
  assert.deepEqual(properties(reactGrid.children), properties(score.querySelector('.tonal-grid').children));
  assert.equal(score.querySelector('.tonal-grid-key-badge').style.left, '50%');
  assert.deepEqual([...score.querySelectorAll('.tonal-grid-key')].map(label => label.textContent), ['C', '5']);
  assert.equal(browserGrid.tonicAtBeat(options, 4), 0);
  assert.equal(browserGrid.tonicAtBeat(options, 4, true), 7);
  mounted.destroy();
  assert.equal(score.childElementCount, 0);
  const named = browserGrid.mount(score, {...options, showModulationTonics:true});
  assert.deepEqual([...score.querySelectorAll('.tonal-grid-key')].map(label => label.textContent), ['C', '5 G']);
  named.destroy();
});

test('scores can opt into naming modulation destinations independently of the opening tonic', () => {
  const props = {
    notes: [], beats: 12, tonic: 0,
    changes: [{beat:4,tonic:7}, {beat:7.9,tonic:1,measureBeat:8,onsetOverride:true}],
    rows: [{start:0,end:8}, {start:8,end:12}],
  };
  const labels = options => {
    const markup = renderToStaticMarkup(React.createElement(RawlNotation, {...props, ...options}));
    const {document} = new JSDOM(markup).window;
    return [...document.querySelectorAll('.rawln-modulation-label')].map(label => label.textContent);
  };
  assert.deepEqual(labels({}), ['C', '5', '6']);
  assert.deepEqual(labels({showModulationTonics:true}), ['C', '5 G', '6 D♭']);
  assert.deepEqual(labels({showModulationTonics:true, hideInitialTonic:true}), ['5 G', '6 D♭']);
});

test('a positioned editor header retains the preceding flag and its own controls', () => {
  const events = tonicMarkers([{beat:0,tonic:0},{beat:1.5,tonic:7,onsetOverride:true}]);
  const markers = markersForRow(events, {start:2,end:5,toPixels:beat => 55 + beat * 50,numberAt:() => 8});
  assert.equal(markers.length, 2);
  assert.equal(markers[0].overflowCopy, true);
  assert.equal(markers[1].originBeat, 1.5);
  assert.equal(markers[1].delta, null);
  const measures = [{beat:2,number:8,left:55,width:150,isPhraseStart:true, labelOffset:7}];
  const beatTimes = measureSubdivisionBeats(2, 5, 1);
  const beats = visibleBeatLines([2,5], beatTimes, beat => beat * 50)
    .map(beat => ({beat,left:55 + (beat - 2) * 50}));
  const layout = {measures, beats, markers:markers.map(marker => ({...marker,left:55 + (marker.beat - 2) * 50 + marker.pixelOffset}))};
  const props = {layout, renderMeasureExtras:() => React.createElement('input', {type:'text'})};
  const doc = new JSDOM(renderToStaticMarkup(React.createElement(RawlMeasureHeader, props))).window.document;
  assert.equal(doc.querySelector('.rawln-bar').style.left,'55px');
  assert.equal(doc.querySelector('.rawln-measure-number span').textContent,'8');
  assert(doc.querySelector('[data-score-measure="8"] input'));
  const repeat = doc.querySelector('.rawln-modulation[data-overflow-copy]');
  assert.equal(repeat.style.left,'30px');
  assert.equal(repeat.querySelector('.rawln-modulation-label').textContent,'5');
  assert.ok(repeat.querySelector('svg'));
  assert.equal(doc.querySelector('.rawln-modulation[data-continued] .rawln-modulation-label'),null);
  assert.deepEqual([...doc.querySelectorAll('.rawln-beat-bar')].map(el=>el.style.left),['105px','155px']);

  const score = doc.createElement('div');
  const dom = browserGrid.appendMeasureGuides(score,{measures:[{...measures[0],phrase:true}],
    beats,top:20,height:84});
  assert.equal(dom.bars[0].querySelector('span').textContent,'8');
  assert.equal(dom.bars[0].classList.contains('phrase-start'),true);
  assert.equal(dom.beatLines[0].style.left,'105px');
  assert.equal(dom.beatLines[0].style.bottom,'auto');
});

test('modulation labels and measure digits share the flag line height with anchored controls', () => {
  const header = hasModulation => React.createElement(RawlMeasureHeader, {
    layout: {
      measures: [{beat: 4, number: 5, left: 100, hasModulation}],
      beats: [],
      markers: hasModulation ? [{beat: 4, left: 100, number: 5, tonic: 2, previousTonic: 0, delta: 2}] : [],
    },
    selectedMeasure: 4,
    onMeasureSelect() {},
    renderMeasureExtras: () => React.createElement('input', {'aria-label': 'Rhythm'}),
  });
  const {document} = new JSDOM(renderToStaticMarkup(React.createElement(React.Fragment, null, header(false), header(true)))).window;
  const [plain, modulated] = document.querySelectorAll('.rawln-measure-number');
  assert.ok(plain.querySelector('input'));
  assert.ok(modulated.querySelector('input'));
  assert.equal(modulated.style.top, plain.style.top);
  assert.equal(modulated.parentElement.style.gridTemplateColumns, plain.parentElement.style.gridTemplateColumns);
  const digits = modulated.querySelector('span');
  assert.equal(parseFloat(modulated.style.top) + parseFloat(digits.style.top), 0);
  assert.equal(digits.style.lineHeight, document.querySelector('.rawln-modulation-flag').style.height);
  assert.equal(digits.style.top, plain.querySelector('span').style.top);
  const interval = document.querySelector('.rawln-modulation-label');
  assert.equal(interval.style.lineHeight, digits.style.lineHeight);
  assert.equal(interval.textContent, '2');
});
