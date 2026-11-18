import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RomanNumeral} from 'librawl/components';
import {guitarChordHTML, romanNumeralHTML} from 'librawl/roman-numerals';
import {staveGeometry} from 'librawl/geometry';

const elements = (notation, options) => new JSDOM(romanNumeralHTML(notation, options)).window.document;
const degree = (document, selector) => [...document.querySelectorAll(selector)].map(node => Number(node.dataset.root));

test('Caplin colors applied roots and stacked inversion figures by sounding pitch', () => {
  const document = elements('V⁶₅/V');
  assert.deepEqual(degree(document,'.chord-root'),[2,7]);
  assert.deepEqual(degree(document,'.chord-figure'),[0,6]);
  assert.equal(document.querySelector('.figures').children.length,2);
});

test('Jazz extensions retain atomic figures, minor case and independent slash-bass colors', () => {
  const document = elements('IIm7/IV',{jazz:true,bassPitch:5});
  assert.equal(document.querySelector('.chord-root').textContent,'ii');
  assert.deepEqual(degree(document,'.chord-figure'),[0]);
  assert.deepEqual(degree(document,'.chord-bass'),[5]);
  const extended = elements('V13♭9',{jazz:true});
  assert.deepEqual([...extended.querySelectorAll('.chord-figure')].map(node=>node.dataset.figure),['13','9']);
  assert.deepEqual(degree(extended,'.chord-figure'),[4,8]);
  assert.equal(elements('<script>alert(1)</script>',{jazz:true}).querySelector('script'),null);
});

test('Jazz major-seventh markers color the chord third independently of the seventh', () => {
  for (const notation of ['IVmaj7', 'IVM7', 'IVΔ7', 'IV△7']) {
    const document = elements(notation, {jazz:true});
    assert.equal(document.body.textContent, 'IVΔ7');
    assert.equal(document.querySelector('.chord-quality').textContent, 'Δ');
    assert.deepEqual(degree(document,'.chord-quality'), [9]);
    assert.deepEqual(degree(document,'.chord-figure'), [4]);
  }
  assert.equal(elements('IVmaj7',{jazz:true,colorQuality:false}).querySelector('.chord-quality'),null);
});

test('Letter-name chord colors use the current tonic while preserving the chord spelling', () => {
  const document = new JSDOM(guitarChordHTML('Dm7',{tonic:2})).window.document;
  assert.equal(document.body.textContent,'Dm7');
  assert.deepEqual(degree(document,'.chord-root'),[0]);
  assert.equal(document.querySelector('.chord-quality').textContent,'m');
  assert.deepEqual(degree(document,'.chord-quality'),[3]);
  assert.deepEqual(degree(document,'.chord-figure'),[10]);
  assert.equal(new JSDOM(guitarChordHTML('Ddim')).window.document.querySelector('.chord-quality'),null);
  assert.equal(new JSDOM(guitarChordHTML('Dm7<img src=x>')).window.document.querySelector('img'),null);
});

test('Score scaling preserves baseline pitch spacing and reserves room for growing notes', () => {
  const defaults=staveGeometry({low:60,high:62});
  assert.equal(defaults.pitchStep,3);
  assert.equal(defaults.glyphHeight,5);
  const zoom=staveGeometry({low:60,high:62},{noteScale:2});
  assert.equal(zoom.pitchToY(60)-zoom.pitchToY(61),6);
  assert.equal(zoom.glyphHeight,10);
  assert.equal(zoom.noteTop-zoom.glyphHeight,defaults.noteTop-defaults.glyphHeight);
});


test('sans root accidental spacing leaves the chord text and extension markup intact', () => {
  const options={jazz:true,font:'sans-serif'};
  const notation='bIIIb13';
  const rendered=new JSDOM(renderToStaticMarkup(createElement(RomanNumeral,{notation,options}))).window.document;
  for(const document of [elements(notation,options),rendered]){
    const chord=document.querySelector('.rawln-roman');
    assert.equal(chord.getAttribute('data-roman-font'),'sans-serif');
    assert.equal(chord.textContent,'♭III♭13');
    assert.equal(chord.querySelector('.chord-root > .chord-accidental').textContent,'♭');
    assert.equal(chord.querySelector('.chord-figure').textContent,'♭13');
    assert.equal(chord.querySelector('.chord-figure .chord-accidental'),null);
  }
  assert.equal(elements('♭III').querySelector('.rawln-roman').hasAttribute('data-roman-font'),false);
});
