import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RomanNumeral} from 'librawl/components';
import {guitarChordHTML, ROMAN_NUMERAL_DEGREES, romanNumeralContent, romanNumeralHTML} from 'librawl/roman-numerals';
import {staveGeometry} from 'librawl/geometry';

const elements = (notation, options) => new JSDOM(romanNumeralHTML(notation, options)).window.document;
const degree = (document, selector) => [...document.querySelectorAll(selector)].map(node => Number(node.dataset.root));

test('light surfaces outline both spellings of the tonic glyph', () => {
  const theme = 'light';
  const stylesheet = readFileSync(new URL('../dist/roman-numerals.css', import.meta.url), 'utf8');
  const dom = new JSDOM(`<style>${stylesheet}</style>
    ${romanNumeralHTML('I⁶₄', {theme})} ${romanNumeralHTML('i', {theme})}
    ${romanNumeralHTML('Imaj7', {theme, jazz: true, colorRoots: false})}
    ${romanNumeralHTML('i')} ${romanNumeralHTML('I/V', {theme})}
    ${romanNumeralHTML('♭III', {theme, colorOffset: 9})}
    ${guitarChordHTML('C', {theme})}
    <article data-roman-theme="light"><span data-roman-notation="i">${romanNumeralContent('i')}</span></article>`);
  const {document} = dom.window;
  try {
    const rule = [...document.styleSheets[0].cssRules].find(entry =>
      entry.style?.getPropertyValue('-webkit-text-fill-color') === 'transparent');
    assert(rule);
    assert.match(rule.style.getPropertyValue('-webkit-text-stroke'), /#222$/);
    const outlined = () => [...document.querySelectorAll(rule.selectorText)].map(node => node.textContent);
    assert.deepEqual(outlined(), ['I', 'i', 'I', 'i']);
    document.querySelector('article').dataset.romanTheme = 'dark';
    assert.deepEqual(outlined(), ['I', 'i', 'I']);
  } finally {
    dom.window.close();
  }
});

test('Caplin colors applied roots and stacked inversion figures by sounding pitch', () => {
  const document = elements('V⁶₅/V');
  assert.deepEqual(degree(document,'.chord-root'),[2,7]);
  assert.deepEqual(degree(document,'.chord-figure'),[0,6]);
  assert.equal(document.querySelector('.figures').children.length,2);
});

test('Both Roman numeral renderers recognize the same twelve Rawl roots', () => {
  assert.deepEqual(ROMAN_NUMERAL_DEGREES, ['I','♭II','II','♭III','III','IV','♯IV','V','♭VI','VI','♭VII','VII']);
  for (const jazz of [false, true]) {
    ROMAN_NUMERAL_DEGREES.forEach((name, pitch) => {
      for (const spelling of [name, name.toLowerCase(), name.replace('♭','b').replace('♯','#')]) {
        const document = elements(spelling, {jazz});
        assert.deepEqual(degree(document, '.chord-root'), [pitch]);
        assert.equal(document.body.textContent, spelling.replace('b','♭').replace('#','♯'));
      }
    });
    for (const spelling of ['#I','♯I','#II','#III','♯iii','bV','♭V','♭IV','##V','bbVI','V/#I']) {
      const document = elements(spelling, {jazz, ...(jazz && spelling.includes('/') ? {bassPitch:1} : {})});
      assert.equal(document.body.textContent, spelling);
      assert.equal(document.querySelector('.chord-root'), null, spelling);
    }
  }
  assert.deepEqual(degree(elements('V⁷/bII'), '.chord-root'), [8, 1]);
  assert.deepEqual(degree(elements('I7/#IV', {jazz:true,bassPitch:6}), '.chord-bass'), [6]);
  assert.deepEqual(degree(elements('I7#9', {jazz:true}), '.chord-figure'), [10, 3]);
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

test('An explicit augmented quality uses the raised fifth independently of the seventh', () => {
  const roman = elements('♯IV+7', {jazz:true});
  const guitar = new JSDOM(guitarChordHTML('B+7', {tonic:5})).window.document;
  for (const document of [roman, guitar]) {
    assert.equal(document.querySelector('.chord-quality').textContent, '+');
    assert.deepEqual(degree(document,'.chord-root'), [6]);
    assert.deepEqual(degree(document,'.chord-quality'), [2]);
    assert.deepEqual(degree(document,'.chord-figure'), [4]);
  }
  assert.equal(roman.body.textContent, '♯IV+7');
  assert.equal(guitar.body.textContent, 'B+7');
  const uncolored = elements('♯IV+7', {jazz:true,colorQuality:false});
  assert.equal(uncolored.querySelector('.chord-quality'),null);
  assert.equal(uncolored.body.textContent,'♯IV+7');
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
