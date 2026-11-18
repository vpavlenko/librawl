/*! librawl version: 0.3.5-local; audio source sha256: 71b00333d99d3a7d882060d12d513caeb32390b6548f595fa062dabfc235d734; GPL-3.0-only */

// src/notation/palette.mjs
var RAWL_COLORS = [
  { background: "white", foreground: "black" },
  { background: "#820000", foreground: "white", dot: { color: "white", size: 1 } },
  { background: "red", foreground: "black" },
  { background: "#007000", foreground: "white" },
  { background: "#00fb47", foreground: "black" },
  { background: "#9500b3", foreground: "white" },
  { background: "#ea7eff", foreground: "black", dot: { color: "black", size: 2 } },
  { background: "#787878", foreground: "black" },
  { background: "#0000ff", foreground: "white" },
  { background: "#03b9d5", foreground: "black" },
  { background: "#ff7328", foreground: "white" },
  { background: "#ffff00", foreground: "black" }
];

// src/notation/roman-numerals.mjs
var escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var supers = "\u2070\xB9\xB2\xB3\u2074\u2075\u2076\u2077\u2078\u2079";
var subs = "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089";
var roots = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
var palette = RAWL_COLORS.map((color) => color.background);
var atom = "(?:[\u266D\u266F]?[IViv]+[\xB0\xF8]?|It|Fr|Ger|Gr|N)[\u207A\u2070\xB9\xB2\xB3\u2074\u2075\u2076\u2077\u2078\u2079\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089]*(?:\\([\u2070\xB9\xB2\xB3\u2074\u2075\u2076\u2077\u2078\u2079\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089\u2013\u2014\\s-]+\\))?";
var chordPattern = new RegExp("(?<![\\p{L}\\p{N}])(" + atom + "(?:/" + atom + ")*)(?![\\p{L}\\p{N}])", "gu");
var mod = (value, n = 12) => (value % n + n) % n;
var numeralIndex = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };
var special = { It: { root: 8, degree: 5, tones: [[5, 8], [0, 0], [3, 6]] }, Fr: { root: 8, degree: 5, tones: [[5, 8], [0, 0], [1, 2], [3, 6]] }, Ger: { root: 8, degree: 5, tones: [[5, 8], [0, 0], [2, 3], [3, 6]] }, Gr: { root: 8, degree: 5, tones: [[5, 8], [0, 0], [2, 3], [3, 6]] }, N: { root: 1, degree: 1, tones: [[1, 1], [3, 5], [5, 8]] } };
function partInfo(part) {
  var _a, _b;
  const m = part.match(/^([♭♯]?)(It|Fr|Ger|Gr|N|[IViv]+)([°ø]?)(.*)$/);
  if (!m || !/^[⁺⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉()–—\s-]*$/u.test(m[4])) return null;
  const named = special[m[2]], degree = (_a = named == null ? void 0 : named.degree) != null ? _a : numeralIndex[m[2].toUpperCase()];
  if (degree === void 0) return null;
  return { accidental: m[1], name: m[2], quality: m[3], tail: m[4], degree, root: (_b = named == null ? void 0 : named.root) != null ? _b : mod(roots[m[2].toUpperCase()] + (m[1] === "\u266D" ? -1 : m[1] === "\u266F" ? 1 : 0)), named };
}
function chordContext(chord, options = {}) {
  var _a;
  const parts = chord.split("/").map(partInfo);
  if (!parts.every(Boolean)) return null;
  const first = parts[0], target = parts.slice(1).reduce((a, p) => ({ root: mod(a.root + p.root), degree: mod(a.degree + p.degree, 7) }), { root: 0, degree: 0 });
  const targetPart = parts[1], localMode = targetPart ? targetPart.quality ? null : targetPart.name === targetPart.name.toLowerCase() ? "minor" : targetPart.named && targetPart.name !== "N" ? null : "major" : options.mode;
  const root = mod(first.root + target.root), degree = mod(first.degree + target.degree, 7), figures = first.tail.replace(/[⁺()–—-]/g, "").split("").map((c) => supers.includes(c) ? supers.indexOf(c) : subs.indexOf(c)).filter((n) => n >= 0).join("");
  let tones, bass;
  if (first.named) {
    tones = first.named.tones.map(([d, p]) => ({ degree: mod(d + target.degree, 7), pitch: mod(p + target.root) }));
    bass = tones[0];
  } else {
    const minor = first.name === first.name.toLowerCase(), third = first.quality ? 3 : minor ? 3 : 4, fifth = first.quality ? 6 : 7;
    tones = [{ degree, pitch: root }, { degree: mod(degree + 2, 7), pitch: mod(root + third) }, { degree: mod(degree + 4, 7), pitch: mod(root + fifth) }];
    const seventh2 = [9, 10, 11].includes(options.seventhInterval) ? options.seventhInterval : first.quality === "\xB0" ? 9 : first.quality === "\xF8" || minor || first.name === "V" ? 10 : localMode === "major" && ["I", "IV"].includes(first.name) || localMode === "minor" && ["\u266DIII", "\u266DVI"].includes(first.accidental + first.name) ? 11 : null;
    if (/^(?:7|65|43|42|2)/.test(figures) && seventh2 !== null) tones.push({ degree: mod(degree + 6, 7), pitch: mod(root + seventh2) });
    const inversion = /^65/.test(figures) ? 1 : /^43/.test(figures) ? 2 : /^(42|2)/.test(figures) ? 3 : /^64/.test(figures) ? 2 : /^6/.test(figures) ? 1 : 0;
    bass = tones[inversion];
    if (first.tail.startsWith("(") || options.cadentialSixFour === true && /^64/.test(figures) && first.name === "V") {
      bass = tones[0];
      if (first.name === "V") {
        tones.push({ degree: mod(degree + 3, 7), pitch: mod(root + 5) });
        if (localMode === "major" || localMode === "minor") tones.push({ degree: mod(degree + 5, 7), pitch: mod(root + (localMode === "minor" ? 8 : 9)) });
      }
    }
  }
  if (first.name === "N" && /^6/.test(figures)) bass = tones[1];
  const seventh = (_a = tones.find((t) => t.degree === mod(degree + 6, 7))) != null ? _a : null;
  const stackedSeventh = /^(65|43|42)$/.test(figures) && !first.named && !first.tail.startsWith("(");
  return { root, degree, tones, bass, first, figures, seventh, stackedSeventh };
}
function figurePitch(number, context) {
  var _a, _b, _c, _d;
  if (!(context == null ? void 0 : context.bass) || number < 1 || number > 9) return null;
  if (context.stackedSeventh) {
    if (number === Number(context.figures[1])) return context.bass.pitch;
    if (number === Number(context.figures[0])) return context.figures === "42" ? (_b = (_a = context.tones.find((t) => t.degree === mod(context.degree + 2, 7))) == null ? void 0 : _a.pitch) != null ? _b : null : (_d = (_c = context.seventh) == null ? void 0 : _c.pitch) != null ? _d : null;
  }
  if (number === 4 && context.figures.startsWith("64")) return context.first.name === "V" && context.bass.pitch === context.root ? mod(context.root + 5) : context.bass.pitch;
  if (number === 6 && context.first.tail === "\u2076" && (!context.first.named || context.first.name === "N")) return context.bass.pitch;
  const degree = mod(context.bass.degree + number - 1, 7), tones = context.tones.filter((t) => t.degree === degree);
  return tones.length === 1 ? tones[0].pitch : null;
}
function qualityPitch(context) {
  var _a, _b, _c, _d, _e;
  if (!context || !context.first.quality) return null;
  const represented = /* @__PURE__ */ new Set([context.root, (_a = context.bass) == null ? void 0 : _a.pitch, (_b = context.seventh) == null ? void 0 : _b.pitch]);
  const remaining = context.tones.filter((t) => !represented.has(t.pitch));
  return (_e = (_d = (_c = remaining.find((t) => t.degree === mod(context.degree + 4, 7))) != null ? _c : remaining[0]) == null ? void 0 : _d.pitch) != null ? _e : null;
}
var colorStyle = (pitch) => `data-root="${pitch}" style="--chord-color:${palette[pitch]}"`;
var displayPitch = (pitch, options) => pitch === null || pitch === void 0 ? null : mod(pitch + (options.colorOffset || 0));
function figureDigits(text, context, options) {
  return [...text].map((c) => {
    const n = supers.includes(c) ? supers.indexOf(c) : subs.indexOf(c), pitch = displayPitch(figurePitch(n, context), options);
    return options.colorFigures && pitch !== null ? `<span class="chord-figure colored" data-figure="${n}" ${colorStyle(pitch)}>${n}</span>` : String(n);
  }).join("");
}
function figuresMarkup(top, bottom, context, options, augmented = false) {
  const pitch = augmented ? displayPitch(figurePitch(supers.indexOf(top[0]), context), options) : null;
  const prefix = augmented ? options.colorFigures && pitch !== null ? `<span class="chord-figure colored" data-figure-sign="+" ${colorStyle(pitch)}>+</span>` : '<span class="chord-figure" data-figure-sign="+">+</span>' : "";
  return `<span class="figures${augmented ? " augmented" : ""}"><span>${prefix}${figureDigits(top, context, options)}</span><span${bottom ? "" : ' aria-hidden="true"'}>${figureDigits(bottom, context, options)}</span></span>`;
}
function typography(text, context = null, options = {}) {
  let result = "";
  for (let i = 0; i < text.length; ) {
    const char = text[i];
    if (supers.includes(char)) {
      let top = "", bottom = "";
      while (i < text.length && supers.includes(text[i])) top += text[i++];
      while (i < text.length && subs.includes(text[i])) bottom += text[i++];
      result += context || bottom || options.figuredBass ? figuresMarkup(top, bottom, context, options) : `<sup>${figureDigits(top, context, options)}</sup>`;
    } else if ("\xB0\xF8".includes(char)) {
      const pitch = displayPitch(qualityPitch(context), options), quality = options.colorQuality && pitch !== null ? `<sup class="chord-quality colored" ${colorStyle(pitch)}>${char === "\xB0" ? "o" : char}</sup>` : `<sup class="chord-quality">${char === "\xB0" ? "o" : char}</sup>`;
      result += `<span class="figures quality-figure" data-quality="${char === "\xB0" ? "diminished" : "half-diminished"}"><span>${quality}</span><span aria-hidden="true"></span></span>`;
      i++;
    } else if (char === "\u207A") {
      i++;
      if (supers.includes(text[i]) && (context || options.figuredBass)) {
        let top = "", bottom = "";
        while (i < text.length && supers.includes(text[i])) top += text[i++];
        while (i < text.length && subs.includes(text[i])) bottom += text[i++];
        result += figuresMarkup(top, bottom, context, options, true);
      } else result += "<sup>+</sup>";
    } else {
      result += escape(char);
      i++;
    }
  }
  return result;
}
function beforeChord(text, chord) {
  const opening = text.match(/\($/);
  return opening && /^[♭♯]/.test(chord) ? typography(text.slice(0, opening.index)) + '<span class="chord-opening-parenthesis">(</span>' : typography(text);
}
function markup(text, options = {}) {
  var _a, _b, _c, _d;
  const { colorRoots = false } = options;
  options = { ...options, figuredBass: (_a = options.figuredBass) != null ? _a : true, colorFigures: (_b = options.colorFigures) != null ? _b : colorRoots, colorQuality: (_c = options.colorQuality) != null ? _c : colorRoots };
  const qualityOnly = String(text).match(/^(\()?([m°ø])(⁷)(\))?$/u);
  if (qualityOnly && colorRoots && Number.isInteger(options.rootPitch)) {
    const pitch = mod(options.rootPitch), quality = qualityOnly[2], seventh = mod(pitch + (quality === "\xB0" ? 9 : 10));
    const context = { bass: { degree: 0, pitch }, tones: [{ degree: 6, pitch: seventh }], first: { tail: "\u2077" } };
    const label = quality === "m" ? `<span class="chord-root colored" ${colorStyle(pitch)}>m</span>` : `<span class="figures quality-figure" data-quality="${quality === "\xB0" ? "diminished" : "half-diminished"}"><span><sup class="chord-quality colored" ${colorStyle(mod(pitch + 6))}>${quality === "\xB0" ? "o" : quality}</sup></span><span aria-hidden="true"></span></span>`;
    return (qualityOnly[1] ? "(" : "") + label + typography(qualityOnly[3], context, { ...options, colorOffset: 0 }) + (qualityOnly[4] ? ")" : "");
  }
  const inheritedParts = (_d = options.contextChord) == null ? void 0 : _d.split("/");
  if (inheritedParts) inheritedParts[0] += String(text).replace(/[()\s–—-]/g, "");
  const inherited = inheritedParts ? chordContext(inheritedParts.join("/"), options) : null;
  let result = "", last = 0;
  for (const match of text.matchAll(chordPattern)) {
    result += beforeChord(text.slice(last, match.index), match[0]);
    const parts = match[0].split("/");
    result += (options.hideAppliedTarget ? parts.slice(0, 1) : parts).map((part, index) => {
      const info = partInfo(part), context = chordContext(parts.slice(index).join("/"), options), root = displayPitch(context == null ? void 0 : context.root, options);
      if (!info || root === null || root === void 0) return typography(part);
      const accidental = info.accidental ? `<span class="chord-accidental${info.accidental === "\u266F" ? " sharp" : ""}">${info.accidental}</span>` : "";
      return `<span class="chord-root${colorRoots ? " colored" : ""}" data-root="${root}"${colorRoots ? ` style="--chord-color:${palette[root]}"` : ""}>${accidental}${info.name}</span>${typography(info.quality + info.tail, context, options)}`;
    }).join("/");
    last = match.index + match[0].length;
  }
  return result + typography(text.slice(last), inherited, options);
}
var jazzNumeral = /^(?<accidentals>[b#♭♯]*)(?<written>VII|III|VI|IV|II|V|I|vii|iii|vi|iv|ii|v|i)(?<tail>.*)$/u;
var guitarChord = /^(?<written>[A-G])(?<accidentals>[b#♭♯]*)(?<tail>.*)$/u;
var noteRoots = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
var majorSeventh = /^(?:maj|M(?=\d)|[△Δ])/;
var jazzFigures = /([b#♭♯]*)(13|11|[1-9])|(?:maj|dim|sus|add|alt|no|omit|aug)|[^]/gu;
var jazzIntervals = { 1: 0, 2: 2, 4: 5, 6: 9, 8: 12, 9: 14, 11: 17, 13: 21 };
var prettyAccidental = (text) => text.replaceAll("b", "\u266D").replaceAll("#", "\u266F");
function jazzMarkup(notation, options, guitar = false) {
  var _a, _b, _c;
  const hasBass = options.bassPitch !== void 0 && options.bassPitch !== null;
  const slash = hasBass ? notation.lastIndexOf("/") : -1;
  const symbol = slash < 0 ? notation : notation.slice(0, slash);
  const match = (guitar ? guitarChord : jazzNumeral).exec(symbol);
  if (!match) return escape(notation);
  const { accidentals, written, tail } = match.groups;
  const alteration = (signs) => [...signs].reduce((pitch, sign) => pitch + ("b\u266D".includes(sign) ? -1 : 1), 0);
  const spelledRoot = guitar ? noteRoots[written] - ((_a = options.tonic) != null ? _a : 0) : roots[written.toUpperCase()];
  const computedRoot = mod(spelledRoot + alteration(accidentals));
  const root = (_b = options.rootPitch) != null ? _b : computedRoot;
  const halfDim = tail.startsWith("\xF8") || /^m7b5/.test(tail);
  const dim = /^(?:°|o|dim)/.test(tail);
  const explicitMinor = /^(?:m(?!aj)|-)/.test(tail);
  const minor = explicitMinor || written === written.toLowerCase();
  const name = !guitar && (minor || dim || halfDim) ? written.toLowerCase() : written;
  const accidental = [...prettyAccidental(accidentals)].map((sign) => `<span class="chord-accidental${sign === "\u266F" ? " sharp" : ""}">${sign}</span>`).join("");
  const quality = halfDim ? "\xF8" : dim ? "\xB0" : "";
  const suffix = guitar ? tail : tail.replace(/^m7b5/, "7").replace(/^(?:ø|°|o|dim|m(?!aj)|-)/, "").replace(majorSeventh, "\u0394");
  const qualityContext = quality && !guitar ? chordContext(name + quality + "\u2077", { seventhInterval: dim ? 9 : 10 }) : null;
  const qualityMarkup = qualityContext ? typography(quality, qualityContext, {
    colorQuality: (_c = options.colorQuality) != null ? _c : options.colorRoots,
    colorOffset: mod(root - roots[name.toUpperCase()])
  }) : "";
  const color = options.colorRoots ? ` colored" ${colorStyle(mod(root))}` : '"';
  const rootLabel = guitar ? name + prettyAccidental(accidentals) : accidental + name;
  const rootMarkup = `<span class="chord-root${color}>${rootLabel}</span>`;
  const figures = [...suffix.matchAll(jazzFigures)].map(([token, signs, digits], index) => {
    var _a2, _b2, _c2, _d;
    if (!digits) {
      const label2 = escape(prettyAccidental(token));
      if (index !== 0 || !((_a2 = options.colorQuality) != null ? _a2 : options.colorRoots)) return label2;
      const third = guitar && token === "m" ? 3 : !guitar && token === "\u0394" ? 4 : null;
      return third === null ? label2 : `<span class="chord-quality colored" ${colorStyle(mod(root + third))}>${label2}</span>`;
    }
    const n = Number(digits);
    const interval = n === 7 ? dim ? 9 : majorSeventh.test(suffix) ? 11 : 10 : n === 3 ? minor ? 3 : 4 : n === 5 ? quality ? 6 : /^(?:\+|aug)/.test(suffix) ? 8 : 7 : jazzIntervals[n];
    const label = prettyAccidental(signs) + digits;
    const pitch = (_c2 = (_b2 = options.figurePitches) == null ? void 0 : _b2[label]) != null ? _c2 : interval === void 0 ? null : mod(root + interval + alteration(signs));
    return ((_d = options.colorFigures) != null ? _d : options.colorRoots) && pitch !== null ? `<span class="chord-figure colored" data-figure="${digits}" ${colorStyle(mod(pitch))}>${escape(label)}</span>` : escape(label);
  }).join("");
  const bass = slash < 0 ? "" : `<span class="chord-slash">/</span><span class="chord-bass${options.colorRoots ? " colored" : ""}" ${colorStyle(mod(options.bassPitch))}>${escape(prettyAccidental(notation.slice(slash + 1)))}</span>`;
  const suffixMarkup = guitar || !figures ? figures : `<sup class="roman-jazz-figures">${figures}</sup>`;
  return `${rootMarkup}${qualityMarkup}${suffixMarkup}${bass}`;
}
function guitarChordHTML(notation, options = {}) {
  const content = jazzMarkup(String(notation), { colorRoots: true, ...options }, true);
  return `<span class="rawln-roman rawln-guitar-chord" data-roman-theme="${options.theme === "light" ? "light" : "dark"}">${content}</span>`;
}
function romanNumeralContent(notation, options = {}) {
  const settings = { colorRoots: true, ...options };
  return settings.jazz ? jazzMarkup(String(notation), settings) : markup(String(notation), settings);
}
function romanNumeralHTML(notation, options = {}) {
  return `<span class="rawln-roman" data-roman-theme="${options.theme === "light" ? "light" : "dark"}"${options.font === "sans-serif" ? ' data-roman-font="sans-serif"' : ""}>${romanNumeralContent(notation, options)}</span>`;
}
var firstRomanChord = (notation) => {
  var _a;
  return (_a = String(notation).matchAll(chordPattern).next().value) == null ? void 0 : _a[0];
};
export {
  chordContext,
  figurePitch,
  firstRomanChord,
  guitarChordHTML,
  qualityPitch,
  romanNumeralContent,
  romanNumeralHTML
};
