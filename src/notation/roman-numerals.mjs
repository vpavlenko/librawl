// Caplin packages/music/harmonic-notation.js, source commit 444e2f4.
// The notation, local-key pitch context, and figured-bass colors are shared here.
import {RAWL_COLORS} from './palette.mjs';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const supers='⁰¹²³⁴⁵⁶⁷⁸⁹',subs='₀₁₂₃₄₅₆₇₈₉';
const roots={I:0,II:2,III:4,IV:5,V:7,VI:9,VII:11};
// Keep the hex spellings used by the score and prose HTML serializers.
export const romanNumeralColors = RAWL_COLORS.map(({background}) =>
  ({white: '#fff', red: '#ff0000'})[background] ?? background);
const palette=romanNumeralColors;
const atom='(?:[♭♯]?[IViv]+[°ø]?|It|Fr|Ger|Gr|N)[⁺⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]*(?:\\([⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉–—\\s-]+\\))?';
const chordPattern=new RegExp('(?<![\\p{L}\\p{N}])('+atom+'(?:/'+atom+')*)(?![\\p{L}\\p{N}])','gu');
const mod=(value,n=12)=>(value%n+n)%n;
const numeralIndex={I:0,II:1,III:2,IV:3,V:4,VI:5,VII:6};
const special={It:{root:8,degree:5,tones:[[5,8],[0,0],[3,6]]},Fr:{root:8,degree:5,tones:[[5,8],[0,0],[1,2],[3,6]]},Ger:{root:8,degree:5,tones:[[5,8],[0,0],[2,3],[3,6]]},Gr:{root:8,degree:5,tones:[[5,8],[0,0],[2,3],[3,6]]},N:{root:1,degree:1,tones:[[1,1],[3,5],[5,8]]}};
function partInfo(part){
 const m=part.match(/^([♭♯]?)(It|Fr|Ger|Gr|N|[IViv]+)([°ø]?)(.*)$/);if(!m||!/^[⁺⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉()–—\s-]*$/u.test(m[4]))return null;
 const named=special[m[2]],degree=named?.degree??numeralIndex[m[2].toUpperCase()];if(degree===undefined)return null;
 return{accidental:m[1],name:m[2],quality:m[3],tail:m[4],degree,root:named?.root??mod(roots[m[2].toUpperCase()]+(m[1]==='♭'?-1:m[1]==='♯'?1:0)),named};
}
function rootOf(chord){
 const parts=chord.split('/').map(partInfo);return parts.every(Boolean)?mod(parts.reduce((root,part)=>root+part.root,0)):null;
}
function chordContext(chord,options={}){
 const parts=chord.split('/').map(partInfo);if(!parts.every(Boolean))return null;
 const first=parts[0],target=parts.slice(1).reduce((a,p)=>({root:mod(a.root+p.root),degree:mod(a.degree+p.degree,7)}),{root:0,degree:0});
 const targetPart=parts[1],localMode=targetPart?(targetPart.quality?null:targetPart.name===targetPart.name.toLowerCase()?'minor':targetPart.named&&targetPart.name!=='N'?null:'major'):options.mode;
 const root=mod(first.root+target.root),degree=mod(first.degree+target.degree,7),figures=first.tail.replace(/[⁺()–—-]/g,'').split('').map(c=>supers.includes(c)?supers.indexOf(c):subs.indexOf(c)).filter(n=>n>=0).join('');
 let tones,bass;
 if(first.named){tones=first.named.tones.map(([d,p])=>({degree:mod(d+target.degree,7),pitch:mod(p+target.root)}));bass=tones[0];}
 else{
  const minor=first.name===first.name.toLowerCase(),third=first.quality?3:minor?3:4,fifth=first.quality?6:7;
  tones=[{degree,pitch:root},{degree:mod(degree+2,7),pitch:mod(root+third)},{degree:mod(degree+4,7),pitch:mod(root+fifth)}];
  const seventh=[9,10,11].includes(options.seventhInterval)?options.seventhInterval:first.quality==='°'?9:first.quality==='ø'||minor||first.name==='V'?10:(localMode==='major'&&['I','IV'].includes(first.name)||localMode==='minor'&&['♭III','♭VI'].includes(first.accidental+first.name))?11:null;
  if(/^(?:7|65|43|42|2)/.test(figures)&&seventh!==null)tones.push({degree:mod(degree+6,7),pitch:mod(root+seventh)});
  const inversion=/^65/.test(figures)?1:/^43/.test(figures)?2:/^(42|2)/.test(figures)?3:/^64/.test(figures)?2:/^6/.test(figures)?1:0;
  bass=tones[inversion];
  // Parenthesized 6/4–5/3 embellishments keep the dominant bass. Their
  // sixth depends on the local tonic mode, so omit that color if unknown.
  if(first.tail.startsWith('(')||options.cadentialSixFour===true&&/^64/.test(figures)&&first.name==='V'){
   bass=tones[0];
   if(first.name==='V'){
    tones.push({degree:mod(degree+3,7),pitch:mod(root+5)});
    if(localMode==='major'||localMode==='minor')tones.push({degree:mod(degree+5,7),pitch:mod(root+(localMode==='minor'?8:9))});
   }
  }
 }
 if(first.name==='N'&&/^6/.test(figures))bass=tones[1];
 const seventh=tones.find(t=>t.degree===mod(degree+6,7))??null;
 const stackedSeventh=/^(65|43|42)$/.test(figures)&&!first.named&&!first.tail.startsWith('(');
 return{root,degree,tones,bass,first,figures,seventh,stackedSeventh};
}
function figurePitch(number,context){
 if(!context?.bass||number<1||number>9)return null;
 // Two-index seventh inversions use semantic voices rather than literal
 // interval colors: lower=bass; upper=seventh, except 4/2 upper=third.
 if(context.stackedSeventh){
  if(number===Number(context.figures[1]))return context.bass.pitch;
  if(number===Number(context.figures[0]))return context.figures==='42'?context.tones.find(t=>t.degree===mod(context.degree+2,7))?.pitch??null:context.seventh?.pitch??null;
 }
 // In6/4 the sixth names the third of the sounding triad; the lower4
 // names its bass. In dominant-bass V(6/4), color4 as the local tonic.
 // Keep the actual dominant bass for interval and resolution calculations.
 if(number===4&&context.figures.startsWith('64'))return context.first.name==='V'&&context.bass.pitch===context.root?mod(context.root+5):context.bass.pitch;
 // User convention: the lone inversion6 names the bass color. The +6 in a
 // national augmented-sixth label remains the actual raised interval.
 if(number===6&&context.first.tail==='⁶'&&(!context.first.named||context.first.name==='N'))return context.bass.pitch;
 const degree=mod(context.bass.degree+number-1,7),tones=context.tones.filter(t=>t.degree===degree);
 return tones.length===1?tones[0].pitch:null;
}
function qualityPitch(context){
 if(!context||!context.first.quality)return null;
 const represented=new Set([context.root,context.bass?.pitch,context.seventh?.pitch]);
 const remaining=context.tones.filter(t=>!represented.has(t.pitch));
 // In4/2 the upper4 already colors the third, leaving the diminished
 // fifth for the quality mark. Other inversions use the unrepresented tone.
 return (remaining.find(t=>t.degree===mod(context.degree+4,7))??remaining[0])?.pitch??null;
}
const colorStyle=pitch=>`data-root="${pitch}" style="--chord-color:${palette[pitch]}"`;
const displayPitch=(pitch,options)=>pitch===null||pitch===undefined?null:mod(pitch+(options.colorOffset||0));
function figureDigits(text,context,options){return [...text].map(c=>{const n=supers.includes(c)?supers.indexOf(c):subs.indexOf(c),pitch=displayPitch(figurePitch(n,context),options);return options.colorFigures&&pitch!==null?`<span class="chord-figure colored" data-figure="${n}" ${colorStyle(pitch)}>${n}</span>`:String(n);}).join('');}
function figuresMarkup(top,bottom,context,options,augmented=false){
 const pitch=augmented?displayPitch(figurePitch(supers.indexOf(top[0]),context),options):null;
 const prefix=augmented?options.colorFigures&&pitch!==null?`<span class="chord-figure colored" data-figure-sign="+" ${colorStyle(pitch)}>+</span>`:'<span class="chord-figure" data-figure-sign="+">+</span>':'';
 return `<span class="figures${augmented?' augmented':''}"><span>${prefix}${figureDigits(top,context,options)}</span><span${bottom?'':' aria-hidden="true"'}>${figureDigits(bottom,context,options)}</span></span>`;
}
function typography(text,context=null,options={}){
 let result='';
 for(let i=0;i<text.length;){
  const char=text[i];
  if(supers.includes(char)){
   let top='',bottom='';
   while(i<text.length&&supers.includes(text[i]))top+=text[i++];
   while(i<text.length&&subs.includes(text[i]))bottom+=text[i++];
   // Only musical figures share this two-row geometry. Ordinary superscript
   // references in prose must remain sup elements for the footnote binder.
   result+=context||bottom||options.figuredBass?figuresMarkup(top,bottom,context,options):`<sup>${figureDigits(top,context,options)}</sup>`;
  }else if('°ø'.includes(char)){const pitch=displayPitch(qualityPitch(context),options),quality=options.colorQuality&&pitch!==null?`<sup class="chord-quality colored" ${colorStyle(pitch)}>${char==='°'?'o':char}</sup>`:`<sup class="chord-quality">${char==='°'?'o':char}</sup>`;result+=`<span class="figures quality-figure" data-quality="${char==='°'?'diminished':'half-diminished'}"><span>${quality}</span><span aria-hidden="true"></span></span>`;i++;}
  else if(char==='⁺'){
   i++;
   if(supers.includes(text[i])&&(context||options.figuredBass)){
    let top='',bottom='';while(i<text.length&&supers.includes(text[i]))top+=text[i++];while(i<text.length&&subs.includes(text[i]))bottom+=text[i++];
    result+=figuresMarkup(top,bottom,context,options,true);
   }else result+='<sup>+</sup>';
  }
  else {result+=escape(char);i++;}
 }
 return result;
}
function beforeChord(text,chord){
 const opening=text.match(/\($/);
 return opening&&/^[♭♯]/.test(chord)?typography(text.slice(0,opening.index))+'<span class="chord-opening-parenthesis">(</span>':typography(text);
}
function markup(text,options={}){
 const {colorRoots=false}=options;options={...options,figuredBass:options.figuredBass??true,colorFigures:options.colorFigures??colorRoots,colorQuality:options.colorQuality??colorRoots};
 // A source nonfunctional-quality label can still have an audited sounding
 // root. Preserve Caplin's m7 spelling rather than inventing a Roman function.
 const qualityOnly=String(text).match(/^(\()?([m°ø])(⁷)(\))?$/u);
 if(qualityOnly&&colorRoots&&Number.isInteger(options.rootPitch)){
  const pitch=mod(options.rootPitch),quality=qualityOnly[2],seventh=mod(pitch+(quality==='°'?9:10));
  const context={bass:{degree:0,pitch},tones:[{degree:6,pitch:seventh}],first:{tail:'⁷'}};
  const label=quality==='m'?`<span class="chord-root colored" ${colorStyle(pitch)}>m</span>`:`<span class="figures quality-figure" data-quality="${quality==='°'?'diminished':'half-diminished'}"><span><sup class="chord-quality colored" ${colorStyle(mod(pitch+6))}>${quality==='°'?'o':quality}</sup></span><span aria-hidden="true"></span></span>`;
  return (qualityOnly[1]?'(':'')+label+typography(qualityOnly[3],context,{...options,colorOffset:0})+(qualityOnly[4]?')':'');
 }
 const inheritedParts=options.contextChord?.split('/');if(inheritedParts)inheritedParts[0]+=String(text).replace(/[()\s–—-]/g,'');
 const inherited=inheritedParts?chordContext(inheritedParts.join('/'),options):null;
 let result='',last=0;
 for(const match of text.matchAll(chordPattern)){
  result+=beforeChord(text.slice(last,match.index),match[0]);
  const parts=match[0].split('/');
  result+=(options.hideAppliedTarget?parts.slice(0,1):parts).map((part,index)=>{
   const info=partInfo(part),context=chordContext(parts.slice(index).join('/'),options),root=displayPitch(context?.root,options);
   if(!info||root===null||root===undefined)return typography(part);
   const accidental=info.accidental?`<span class="chord-accidental${info.accidental==='♯'?' sharp':''}">${info.accidental}</span>`:'';
   return `<span class="chord-root${colorRoots?' colored':''}" data-root="${root}"${colorRoots?` style="--chord-color:${palette[root]}"`:''}>${accidental}${info.name}</span>${typography(info.quality+info.tail,context,options)}`;
  }).join('/');last=match.index+match[0].length;
 }
 return result+typography(text.slice(last),inherited,options);
}

const jazzNumeral = /^(?<accidentals>[b#♭♯]*)(?<written>VII|III|VI|IV|II|V|I|vii|iii|vi|iv|ii|v|i)(?<tail>.*)$/u;
const guitarChord = /^(?<written>[A-G])(?<accidentals>[b#♭♯]*)(?<tail>.*)$/u;
const noteRoots = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const majorSeventh = /^(?:maj|M(?=\d)|[△Δ])/;
const jazzFigures = /([b#♭♯]*)(13|11|[1-9])|(?:maj|dim|sus|add|alt|no|omit|aug)|[^]/gu;
const jazzIntervals = {1:0,2:2,4:5,6:9,8:12,9:14,11:17,13:21};
const prettyAccidental = text => text.replaceAll('b','♭').replaceAll('#','♯');

function jazzMarkup(notation, options, guitar = false) {
  const hasBass = options.bassPitch !== undefined && options.bassPitch !== null;
  const slash = hasBass ? notation.lastIndexOf('/') : -1;
  const symbol = slash < 0 ? notation : notation.slice(0, slash);
  const match = (guitar ? guitarChord : jazzNumeral).exec(symbol);
  if (!match) return escape(notation);
  const {accidentals, written, tail} = match.groups;
  const alteration = signs => [...signs].reduce((pitch, sign) => pitch + ('b♭'.includes(sign) ? -1 : 1), 0);
  const spelledRoot = guitar ? noteRoots[written] - (options.tonic ?? 0) : roots[written.toUpperCase()];
  const computedRoot = mod(spelledRoot + alteration(accidentals));
  const root = options.rootPitch ?? computedRoot;
  const halfDim = tail.startsWith('ø') || /^m7b5/.test(tail);
  const dim = /^(?:°|o|dim)/.test(tail);
  const explicitMinor = /^(?:m(?!aj)|-)/.test(tail);
  const minor = explicitMinor || written === written.toLowerCase();
  const name = !guitar && (minor || dim || halfDim) ? written.toLowerCase() : written;
  const accidental = [...prettyAccidental(accidentals)].map(sign =>
    `<span class="chord-accidental${sign==='♯'?' sharp':''}">${sign}</span>`).join('');
  const quality = halfDim ? 'ø' : dim ? '°' : '';
  const suffix = guitar ? tail : tail.replace(/^m7b5/, '7').replace(/^(?:ø|°|o|dim|m(?!aj)|-)/,'').replace(majorSeventh,'Δ');
  const qualityContext = quality && !guitar ? chordContext(name + quality + '⁷', {seventhInterval:dim?9:10}) : null;
  const qualityMarkup = qualityContext ? typography(quality, qualityContext, {
    colorQuality:options.colorQuality??options.colorRoots, colorOffset:mod(root-roots[name.toUpperCase()]),
  }) : '';
  const color = options.colorRoots ? ` colored" ${colorStyle(mod(root))}` : '"';
  const rootLabel = guitar ? name + prettyAccidental(accidentals) : accidental + name;
  const rootMarkup = `<span class="chord-root${color}>${rootLabel}</span>`;
  const qualityIntervals = guitar ? {m:3, '+':8} : {'Δ':4, '+':8};
  const figures = [...suffix.matchAll(jazzFigures)].map(([token, signs, digits], index) => {
    if (!digits) {
      const label = escape(prettyAccidental(token));
      if (index !== 0 || !(options.colorQuality ?? options.colorRoots)) return label;
      const interval = qualityIntervals[token];
      return interval === undefined ? label : `<span class="chord-quality colored" ${colorStyle(mod(root + interval))}>${label}</span>`;
    }
    const n = Number(digits);
    const interval = n===7 ? (dim?9:majorSeventh.test(suffix)?11:10)
      : n===3 ? (minor?3:4)
      : n===5 ? (quality?6:/^(?:\+|aug)/.test(suffix)?8:7)
      : jazzIntervals[n];
    const label = prettyAccidental(signs) + digits;
    const pitch = options.figurePitches?.[label] ?? (interval===undefined?null:mod(root+interval+alteration(signs)));
    return (options.colorFigures??options.colorRoots)&&pitch!==null
      ? `<span class="chord-figure colored" data-figure="${digits}" ${colorStyle(mod(pitch))}>${escape(label)}</span>`
      : escape(label);
  }).join('');
  const bass = slash < 0 ? '' : `<span class="chord-slash">/</span><span class="chord-bass${options.colorRoots?' colored':''}" ${colorStyle(mod(options.bassPitch))}>${escape(prettyAccidental(notation.slice(slash+1)))}</span>`;
  const suffixMarkup = guitar || !figures ? figures : `<sup class="roman-jazz-figures">${figures}</sup>`;
  return `${rootMarkup}${qualityMarkup}${suffixMarkup}${bass}`;
}

export function guitarChordHTML(notation, options = {}) {
  const content = jazzMarkup(String(notation), {colorRoots:true, ...options}, true);
  return `<span class="rawln-roman rawln-guitar-chord" data-roman-theme="${options.theme==='light'?'light':'dark'}">${content}</span>`;
}

export function romanNumeralContent(notation, options = {}) {
  const settings = {colorRoots:true, ...options};
  return settings.jazz ? jazzMarkup(String(notation),settings) : markup(String(notation),settings);
}

// The workbench uses this same escaped markup in both React and static DOM views.
export function romanNumeralHTML(notation, options = {}) {
  return `<span class="rawln-roman" data-roman-theme="${options.theme==='light'?'light':'dark'}"${options.font==='sans-serif'?' data-roman-font="sans-serif"':''}>${romanNumeralContent(notation,options)}</span>`;
}

export {beforeChord, chordContext, figurePitch, partInfo, qualityPitch, rootOf, typography};
export const romanNumeralMatches = notation => String(notation).matchAll(chordPattern);
export const firstRomanChord = notation => romanNumeralMatches(notation).next().value?.[0];
