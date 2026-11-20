/*! librawl version: 0.4.1-local; audio source sha256: 76f73238ecd37f8747ca6b9c5ea8b19675b7cc1977a886b66f6012c991fda089; GPL-3.0-only */
var LibrawlHarmony = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

  // src/notation/harmony-annotations.mjs
  var harmony_annotations_exports = {};
  __export(harmony_annotations_exports, {
    arrowCurve: () => arrowCurve,
    arrowGeometry: () => arrowGeometry,
    beforeChord: () => beforeChord,
    bindRomanNumeralTooltip: () => bindRomanNumeralTooltip,
    chordContext: () => chordContext,
    figurePitch: () => figurePitch,
    firstRomanChord: () => firstRomanChord,
    guitarChordHTML: () => guitarChordHTML,
    mountHarmonyAnnotations: () => mountHarmonyAnnotations,
    partInfo: () => partInfo,
    qualityPitch: () => qualityPitch,
    romanNumeralColors: () => romanNumeralColors,
    romanNumeralContent: () => romanNumeralContent,
    romanNumeralDiagramColumns: () => romanNumeralDiagramColumns,
    romanNumeralExplanations: () => romanNumeralExplanations,
    romanNumeralHTML: () => romanNumeralHTML,
    romanNumeralMatches: () => romanNumeralMatches,
    romanNumeralSymbolNotes: () => romanNumeralSymbolNotes,
    romanNumeralTooltipHTML: () => romanNumeralTooltipHTML,
    romanNumeralTooltipModel: () => romanNumeralTooltipModel,
    rootOf: () => rootOf,
    typography: () => typography
  });

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
  var colorIndex = (semitones) => (semitones % 12 + 12) % 12;

  // src/notation/roman-numerals.mjs
  var escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var supers = "\u2070\xB9\xB2\xB3\u2074\u2075\u2076\u2077\u2078\u2079";
  var subs = "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089";
  var roots = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
  var romanNumeralColors = RAWL_COLORS.map(({ background }) => {
    var _a;
    return (_a = { white: "#fff", red: "#ff0000" }[background]) != null ? _a : background;
  });
  var palette = romanNumeralColors;
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
  function rootOf(chord) {
    const parts = chord.split("/").map(partInfo);
    return parts.every(Boolean) ? mod(parts.reduce((root, part) => root + part.root, 0)) : null;
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
        const tonicGlyph = !info.accidental && /^[Ii]$/.test(info.name) ? " data-roman-tonic" : "";
        return `<span class="chord-root${colorRoots ? " colored" : ""}" data-root="${root}"${colorRoots ? ` style="--chord-color:${palette[root]}"` : ""}${tonicGlyph}>${accidental}${info.name}</span>${typography(info.quality + info.tail, context, options)}`;
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
    const tonicGlyph = !guitar && !accidentals && /^[Ii]$/.test(name);
    const color = options.colorRoots ? ` colored" ${colorStyle(mod(root))}` : tonicGlyph ? `" data-root="${mod(root)}"` : '"';
    const rootLabel = guitar ? name + prettyAccidental(accidentals) : accidental + name;
    const rootMarkup = `<span class="chord-root${color}${tonicGlyph ? " data-roman-tonic" : ""}>${rootLabel}</span>`;
    const qualityIntervals = guitar ? { m: 3, "+": 8 } : { "\u0394": 4, "+": 8 };
    const figures = [...suffix.matchAll(jazzFigures)].map(([token, signs, digits], index) => {
      var _a2, _b2, _c2, _d;
      if (!digits) {
        const label2 = escape(prettyAccidental(token));
        if (index !== 0 || !((_a2 = options.colorQuality) != null ? _a2 : options.colorRoots)) return label2;
        const interval2 = qualityIntervals[token];
        return interval2 === void 0 ? label2 : `<span class="chord-quality colored" ${colorStyle(mod(root + interval2))}>${label2}</span>`;
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
  var romanNumeralMatches = (notation) => String(notation).matchAll(chordPattern);
  var firstRomanChord = (notation) => {
    var _a;
    return (_a = romanNumeralMatches(notation).next().value) == null ? void 0 : _a[0];
  };

  // src/notation/harmony-arrows.mjs
  var arrowStyle = Object.freeze({ headLength: 8.5, headHalfWidth: 2.3 });
  function arrowCurve(from, to, direction = 1) {
    const span = Math.abs(to[0] - from[0]), sign = Math.sign(to[0] - from[0]) || 1;
    const run = Math.min(span * 0.32, 17), depth = direction * Math.min(12, Math.max(5, span * 0.17));
    return [...from, from[0] + sign * run, from[1] + depth, to[0] - sign * run, to[1] + depth, ...to];
  }
  function arrowGeometry(coords, routed = false) {
    const mix = (a2, b2, t) => a2.map((v, i) => v + (b2[i] - v) * t), segments = [];
    if (!routed) segments.push(Array.from({ length: 4 }, (_, i) => coords.slice(i * 2, i * 2 + 2)));
    else {
      const points = coords, addLine = (a2, b2) => segments.push([a2, mix(a2, b2, 1 / 3), mix(a2, b2, 2 / 3), b2]);
      let current = points[0];
      for (let i = 1; i < points.length - 1; i++) {
        const a2 = points[i - 1], b2 = points[i], c2 = points[i + 1], incoming = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]), outgoing = Math.hypot(c2[0] - b2[0], c2[1] - b2[1]), radius = Math.min(1.5, incoming / 3, outgoing / 3);
        if (!radius) continue;
        const enter = mix(b2, a2, radius / incoming), leave = mix(b2, c2, radius / outgoing);
        addLine(current, enter);
        segments.push([enter, mix(enter, b2, 2 / 3), mix(leave, b2, 2 / 3), leave]);
        current = leave;
      }
      addLine(current, points.at(-1));
    }
    const point = (c2, t) => {
      const u = 1 - t;
      return [0, 1].map((i) => u * u * u * c2[0][i] + 3 * u * u * t * c2[1][i] + 3 * u * t * t * c2[2][i] + t * t * t * c2[3][i]);
    };
    const tangent = (c2, t) => {
      const u = 1 - t;
      return [0, 1].map((i) => 3 * u * u * (c2[1][i] - c2[0][i]) + 6 * u * t * (c2[2][i] - c2[1][i]) + 3 * t * t * (c2[3][i] - c2[2][i]));
    };
    const table = [];
    let length = 0, previous = segments[0][0];
    segments.forEach((c2, index) => {
      for (let step = 0; step <= 64; step++) {
        const t = step / 64, p = point(c2, t);
        length += Math.hypot(p[0] - previous[0], p[1] - previous[1]);
        table.push({ length, index, t });
        previous = p;
      }
    });
    const at = (distance) => {
      const end2 = table.findIndex((p) => p.length >= distance), b2 = table[end2 < 0 ? table.length - 1 : end2], a2 = table[Math.max(0, end2 - 1)];
      const t = a2.index === b2.index && b2.length > a2.length ? a2.t + (b2.t - a2.t) * (distance - a2.length) / (b2.length - a2.length) : b2.t;
      return { index: b2.index, t, point: point(segments[b2.index], t), tangent: tangent(segments[b2.index], t) };
    };
    const headLength = Math.min(arrowStyle.headLength, length * 0.55), halfWidth = Math.min(arrowStyle.headHalfWidth, headLength * 0.32), left = [], right = [];
    for (let step = 0; step <= 24; step++) {
      const fraction = step / 24, p = at(length - headLength + fraction * headLength), size = Math.hypot(...p.tangent) || 1, w = halfWidth * (1 - fraction), nx = -p.tangent[1] / size, ny = p.tangent[0] / size;
      left.push([p.point[0] + nx * w, p.point[1] + ny * w]);
      right.push([p.point[0] - nx * w, p.point[1] - ny * w]);
    }
    const end = at(length - headLength * 0.45), c = segments[end.index], a = mix(c[0], c[1], end.t), b = mix(c[1], c[2], end.t), d = mix(c[2], c[3], end.t), e = mix(a, b, end.t), f = mix(b, d, end.t);
    const shaft = [...segments.slice(0, end.index), [c[0], a, e, mix(e, f, end.t)]], command = (c2) => ` C${c2.slice(1).flat().join(" ")}`, headPoints = [...left, ...right.reverse().slice(1)];
    return { shaftPath: `M${shaft[0][0].join(" ")}${shaft.map(command).join("")}`, headPath: `M${headPoints.map((p) => p.join(" ")).join(" L")} Z`, headPoints, tip: segments.at(-1)[3], tangent: tangent(segments.at(-1), 1), shaftEnd: end.point, headLength };
  }

  // src/notation/roman-numeral-tooltip.mjs
  var degreeNames = ["1", "\u266D2", "2", "\u266D3", "3", "4", "\u266F4", "5", "\u266D6", "6", "\u266D7", "7"];
  var triadNames = ["\u0442\u0440\u0435\u0437\u0432\u0443\u0447\u0438\u0435", "\u0441\u0435\u043A\u0441\u0442\u0430\u043A\u043A\u043E\u0440\u0434", "\u043A\u0432\u0430\u0440\u0442\u0441\u0435\u043A\u0441\u0442\u0430\u043A\u043A\u043E\u0440\u0434"];
  var seventhNames = ["\u0441\u0435\u043F\u0442\u0430\u043A\u043A\u043E\u0440\u0434", "\u043A\u0432\u0438\u043D\u0442\u0441\u0435\u043A\u0441\u0442\u0430\u043A\u043A\u043E\u0440\u0434", "\u0442\u0435\u0440\u0446\u043A\u0432\u0430\u0440\u0442\u0430\u043A\u043A\u043E\u0440\u0434", "\u0441\u0435\u043A\u0443\u043D\u0434\u0430\u043A\u043A\u043E\u0440\u0434"];
  var inversionNames = ["\u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0432\u0438\u0434", "\u043F\u0435\u0440\u0432\u043E\u0435 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435", "\u0432\u0442\u043E\u0440\u043E\u0435 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435", "\u0442\u0440\u0435\u0442\u044C\u0435 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435"];
  var englishInversions = ["root position", "first inversion", "second inversion", "third inversion"];
  var escape2 = (text) => String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
  function stack(pitches) {
    const ordered = [];
    for (let pitch of pitches) {
      while (ordered.length && pitch <= ordered.at(-1)) pitch += 12;
      ordered.push(pitch);
    }
    return ordered;
  }
  function explicitModel(tooltip) {
    const { pitches, rootPitches, rootNotation, inversion } = tooltip;
    const validPitch = (pitch) => Number.isInteger(pitch) && Math.abs(pitch) <= 127;
    if (!(pitches == null ? void 0 : pitches.length) || !pitches.every(validPitch)) return null;
    const root = (rootPitches == null ? void 0 : rootPitches.length) && rootPitches.every(validPitch) ? [...new Set(rootPitches)].sort((a, b) => a - b) : void 0;
    return {
      pitches: [...new Set(pitches)].sort((a, b) => a - b),
      rootPitches: root,
      rootNotation,
      inversion,
      seventh: (root != null ? root : pitches).length === 4
    };
  }
  function romanNumeralTooltipModel(notation, options = {}, tooltip = true) {
    var _a, _b, _c;
    if (tooltip !== true) {
      return tooltip ? explicitModel(tooltip) : null;
    }
    if (options.jazz) return null;
    const bare = String(notation).replace(/(?:…|\.{3})$/u, "").replace(/[[\]]/g, "");
    const token = (_a = firstRomanChord(bare)) != null ? _a : options.contextChord ? options.contextChord.replace(/^[^/]+/, (root2) => root2 + bare.replace(/[()\s–—-]/g, "")) : null;
    const context = token && chordContext(token, options);
    if (!(context == null ? void 0 : context.bass)) return null;
    let tones = context.tones.map((note) => note.pitch), bass = context.bass.pitch;
    const { first, root, figures } = context;
    const cadentialSixFour = first.name === "V" && bass === root && figures.startsWith("64") && (first.tail.startsWith("(") || options.cadentialSixFour);
    if (cadentialSixFour) {
      const third = (_b = context.tones.find((note) => note.degree === (context.degree + 5) % 7)) == null ? void 0 : _b.pitch;
      tones = [colorIndex(root + 5), third != null ? third : colorIndex(root + (options.mode === "minor" ? 8 : 9)), root];
    } else if (first.quality === "\xF8" && tones.length === 3) {
      tones.push(colorIndex(root + 10));
    }
    const offset = (_c = options.colorOffset) != null ? _c : 0;
    tones = [...new Set(tones.map((pitch) => colorIndex(pitch + offset)))];
    bass = colorIndex(bass + offset);
    const inversion = tones.indexOf(bass);
    if (inversion < 0) return null;
    const special2 = !!first.named && first.name !== "N";
    const seventh = tones.length === 4;
    const applied = token.includes("/") ? token.slice(token.indexOf("/") + 1) : "";
    const rootNotation = cadentialSixFour ? applied || (options.mode === "minor" ? "i" : "I") : first.accidental + first.name + first.quality + (seventh ? "\u2077" : "") + (applied ? "/" + applied : "");
    return {
      pitches: stack([...tones.slice(inversion), ...tones.slice(0, inversion)]),
      rootPitches: stack(tones),
      rootNotation,
      inversion,
      seventh,
      special: special2,
      cadentialSixFour,
      token
    };
  }
  var explanations = {
    roman: "\u0420\u0438\u043C\u0441\u043A\u0430\u044F \u0446\u0438\u0444\u0440\u0430 \u2014 \u0441\u0442\u0443\u043F\u0435\u043D\u044C \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0433\u043E \u0442\u043E\u043D\u0430 \u0430\u043A\u043A\u043E\u0440\u0434\u0430.",
    case: "\u041F\u0440\u043E\u043F\u0438\u0441\u043D\u0430\u044F \u0446\u0438\u0444\u0440\u0430 \u2014 \u043C\u0430\u0436\u043E\u0440\u043D\u043E\u0435 \u0442\u0440\u0435\u0437\u0432\u0443\u0447\u0438\u0435; \u0441\u0442\u0440\u043E\u0447\u043D\u0430\u044F \u2014 \u043C\u0438\u043D\u043E\u0440\u043D\u043E\u0435.",
    flat: "\u266D \u043F\u0435\u0440\u0435\u0434 \u0446\u0438\u0444\u0440\u043E\u0439 \u043F\u043E\u043D\u0438\u0436\u0430\u0435\u0442 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0442\u043E\u043D \u043D\u0430 \u043F\u043E\u043B\u0443\u0442\u043E\u043D \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043C\u0430\u0436\u043E\u0440\u043D\u043E\u0439 \u0433\u0430\u043C\u043C\u044B \u0442\u043E\u043D\u0438\u043A\u0438.",
    sharp: "\u266F \u043F\u0435\u0440\u0435\u0434 \u0446\u0438\u0444\u0440\u043E\u0439 \u043F\u043E\u0432\u044B\u0448\u0430\u0435\u0442 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0442\u043E\u043D \u043D\u0430 \u043F\u043E\u043B\u0443\u0442\u043E\u043D \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043C\u0430\u0436\u043E\u0440\u043D\u043E\u0439 \u0433\u0430\u043C\u043C\u044B \u0442\u043E\u043D\u0438\u043A\u0438.",
    diminishedTriad: "o \u2014 \u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u043D\u043E\u0435 \u0442\u0440\u0435\u0437\u0432\u0443\u0447\u0438\u0435.",
    diminishedSeventh: "o7 \u2014 \u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u043D\u044B\u0439 \u0441\u0435\u043F\u0442\u0430\u043A\u043A\u043E\u0440\u0434.",
    halfDiminished: "\xF87 \u2014 \u043F\u043E\u043B\u0443\u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u043D\u044B\u0439 \u0441\u0435\u043F\u0442\u0430\u043A\u043A\u043E\u0440\u0434.",
    minor: "\u043C\u0438\u043D\u043E\u0440\u043D\u044B\u0439 \u0441\u0435\u043F\u0442\u0430\u043A\u043A\u043E\u0440\u0434",
    neapolitan: "\u043D\u0435\u0430\u043F\u043E\u043B\u0438\u0442\u0430\u043D\u0441\u043A\u0438\u0439 \u0430\u043A\u043A\u043E\u0440\u0434",
    applied: "/ \u2014 \u0430\u043A\u043A\u043E\u0440\u0434 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0441\u0442\u0443\u043F\u0435\u043D\u0438 \u0441\u043F\u0440\u0430\u0432\u0430 \u043A\u0430\u043A \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u0442\u043E\u043D\u0438\u043A\u0438.",
    figureParentheses: "\u0421\u043A\u043E\u0431\u043A\u0438 \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u044F\u044E\u0442 \u0444\u0438\u0433\u0443\u0440\u044B, \u043E\u0442\u043D\u043E\u0441\u044F\u0449\u0438\u0435\u0441\u044F \u043A \u043E\u0434\u043D\u043E\u0439 \u0433\u0430\u0440\u043C\u043E\u043D\u0438\u0438.",
    augmentedSixth: "+6 \u2014 \u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u043D\u0430\u044F \u0441\u0435\u043A\u0441\u0442\u0430; It, Fr, Ger \u2014 \u0438\u0442\u0430\u043B\u044C\u044F\u043D\u0441\u043A\u0438\u0439, \u0444\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u0438\u0439 \u0438 \u043D\u0435\u043C\u0435\u0446\u043A\u0438\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u0430\u043A\u043A\u043E\u0440\u0434\u0430.",
    cadentialSixFour: "\u041A\u0430\u0434\u0430\u043D\u0441\u043E\u0432\u044B\u0439 6/4 \u2014 \u0437\u0430\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u044F \u043D\u0430\u0434 \u0434\u043E\u043C\u0438\u043D\u0430\u043D\u0442\u043E\u0432\u044B\u043C \u0431\u0430\u0441\u043E\u043C \u0441 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435\u043C \u0432 5/3."
  };
  var figureIntervals = {
    6: "6 \u2014 \u0441\u0435\u043A\u0441\u0442\u0430",
    64: "6/4 \u2014 \u0441\u0435\u043A\u0441\u0442\u0430 \u0438 \u043A\u0432\u0430\u0440\u0442\u0430",
    7: "7 \u2014 \u0441\u0435\u043F\u0442\u0438\u043C\u0430",
    65: "6/5 \u2014 \u0441\u0435\u043A\u0441\u0442\u0430 \u0438 \u043A\u0432\u0438\u043D\u0442\u0430",
    43: "4/3 \u2014 \u043A\u0432\u0430\u0440\u0442\u0430 \u0438 \u0442\u0435\u0440\u0446\u0438\u044F",
    42: "4/2 \u2014 \u043A\u0432\u0430\u0440\u0442\u0430 \u0438 \u0441\u0435\u043A\u0443\u043D\u0434\u0430",
    2: "2 \u2014 \u0441\u0435\u043A\u0443\u043D\u0434\u0430",
    53: "5/3 \u2014 \u043A\u0432\u0438\u043D\u0442\u0430 \u0438 \u0442\u0435\u0440\u0446\u0438\u044F"
  };
  var harmonicParentheses = "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u0440\u0443\u0433\u043B\u044B\u0435 \u0441\u043A\u043E\u0431\u043A\u0438 \u0434\u043B\u044F \u043E\u0431\u043E\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0433\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u043F\u043E\u0434\u0447\u0438\u043D\u0435\u043D\u0438\u044F, \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E \u0432\u043D\u0443\u0442\u0440\u0438 \u043E\u0440\u0433\u0430\u043D\u043D\u044B\u0445 \u043F\u0443\u043D\u043A\u0442\u043E\u0432 \u0438 \u0441\u0435\u043A\u0432\u0435\u043D\u0446\u0438\u0439.";
  function romanNumeralSymbolNotes(model) {
    var _a, _b, _c, _d, _e, _f, _g;
    const token = (_d = (_c = (_b = firstRomanChord((_a = model.label) != null ? _a : "")) != null ? _b : model.token) != null ? _c : model.label) != null ? _d : "", context = chordContext(token, { mode: model.mode }), notes = [];
    const add = (symbol, key, contextChord = token) => {
      if (!notes.some((n) => n.key === key && n.symbol === symbol)) notes.push({ symbol, key, contextChord });
    };
    const parts = token.split("/");
    for (const [partIndex, part] of parts.entries()) {
      const contextChord = parts.slice(partIndex).join("/"), addPart = (symbol, key) => add(symbol, key, contextChord);
      const info = (_e = chordContext(part, { mode: model.mode })) == null ? void 0 : _e.first;
      if (info) {
        if (info.named) {
          addPart(
            info.name + (info.name === "N" ? "" : " +6"),
            info.name === "N" ? "neapolitan" : "augmentedSixth"
          );
        } else {
          const symbol = info.name + " = " + (info.degree + 1);
          addPart(symbol, "roman");
          if (!info.quality) addPart(symbol, "case");
        }
        if (info.accidental) addPart(info.accidental, info.accidental === "\u266D" ? "flat" : "sharp");
        if (info.quality)
          addPart(
            info.quality === "\xB0" ? "o" : "\xF8",
            info.quality === "\xF8" ? "halfDiminished" : (partIndex === 0 ? model.seventh : /[⁷₅₃₂]/u.test(info.tail)) ? "diminishedSeventh" : "diminishedTriad"
          );
      }
    }
    if (!context && /[m°ø]/u.test(token))
      add(
        token.includes("m") ? "m" : token.includes("\xF8") ? "\xF8" : "o",
        token.includes("m") ? "minor" : token.includes("\xF8") ? "halfDiminished" : "diminishedSeventh"
      );
    if ((context == null ? void 0 : context.figures) && (!context.first.named || context.first.name === "N"))
      add(context.figures, model.cadentialSixFour ? "cadentialSixFour" : "figures" + context.figures);
    else if (/[⁷]/u.test(token)) add("7", "figures7");
    if (parts.length > 1) add("/", "applied");
    if (context == null ? void 0 : context.first.tail.includes("(")) add("( )", "figureParentheses");
    if (/^\(/u.test((_f = model.label) != null ? _f : token) || /\)$/u.test((_g = model.label) != null ? _g : token) && !(context == null ? void 0 : context.first.tail.includes("(")))
      add("( )", "harmonicParentheses");
    return notes;
  }
  function explanationSymbol(note, model) {
    var _a, _b, _c;
    const context = chordContext(note.contextChord, {
      mode: model.mode,
      seventhInterval: model.seventhInterval,
      cadentialSixFour: !!model.cadentialSixFour
    });
    const colored = (text, pitch, kind = "root") => {
      var _a2;
      if (!Number.isFinite(pitch)) return escape2(text);
      pitch = colorIndex(pitch + ((_a2 = model.colorOffset) != null ? _a2 : 0));
      return `<span class="chord-${kind} colored" data-root="${pitch}" style="--chord-color:${romanNumeralColors[pitch]}">${escape2(text)}</span>`;
    };
    const symbol = note.symbol === "6453" ? "6/4\u20135/3" : note.symbol === "Gr +6" ? "Gr / Ger +6" : note.symbol.replace(/^(65|64|43|42|53)$/u, (m) => m[0] + "/" + m[1]);
    const pitchForFigure = (n) => {
      var _a2, _b2;
      return (_b2 = figurePitch(n, context)) != null ? _b2 : !context && n === 7 && Number.isInteger(model.rootPitch) ? model.rootPitch - ((_a2 = model.colorOffset) != null ? _a2 : 0) + (note.contextChord.includes("\xB0") ? 9 : 10) : null;
    };
    if (note.key === "roman" || note.key === "case") {
      const [roman, degree] = symbol.split(" = ");
      return colored(roman, context == null ? void 0 : context.root) + " = " + colored(degree, context == null ? void 0 : context.root);
    }
    if (note.key === "flat" || note.key === "sharp" || note.key === "neapolitan")
      return colored(symbol, context == null ? void 0 : context.root);
    if (note.key.startsWith("figures") || note.key === "cadentialSixFour")
      return [...symbol].map((c) => /\d/.test(c) ? colored(c, pitchForFigure(Number(c)), "figure") : escape2(c)).join("");
    if (note.key === "augmentedSixth")
      return colored(symbol.replace(/ \+6$/u, ""), context == null ? void 0 : context.root) + " " + colored("+6", figurePitch(6, context), "figure");
    if (["diminishedTriad", "diminishedSeventh", "halfDiminished"].includes(note.key))
      return colored(
        symbol,
        (_b = qualityPitch(context)) != null ? _b : !context && Number.isInteger(model.rootPitch) ? model.rootPitch - ((_a = model.colorOffset) != null ? _a : 0) + 6 : null,
        "quality"
      );
    if (note.key === "minor")
      return colored(
        symbol,
        Number.isInteger(model.rootPitch) ? model.rootPitch - ((_c = model.colorOffset) != null ? _c : 0) : context == null ? void 0 : context.root
      );
    return escape2(symbol);
  }
  function romanNumeralExplanations(model) {
    const rootModel = model.inversion && !model.special && model.rootPitches ? {
      ...model,
      pitches: model.rootPitches,
      inversion: 0,
      label: model.rootLabel,
      token: model.rootLabel,
      originalLabel: model.rootLabel,
      cadentialSixFour: false
    } : null;
    const notes = [
      ...rootModel ? romanNumeralSymbolNotes(rootModel).map((note) => ({ note, owner: rootModel })) : [],
      ...romanNumeralSymbolNotes(model).map((note) => ({ note, owner: model }))
    ], byText = /* @__PURE__ */ new Map(), rows = /* @__PURE__ */ new Map();
    for (const { note, owner } of notes) {
      let text = note.key === "harmonicParentheses" ? harmonicParentheses : explanations[note.key];
      if (note.key.startsWith("figures")) {
        const intervals = figureIntervals[note.key.slice(7)];
        if (intervals) text = "\u0426\u0438\u0444\u0440\u044B \u0441\u043F\u0440\u0430\u0432\u0430 \u043E\u0431\u043E\u0437\u043D\u0430\u0447\u0430\u044E\u0442 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u044B \u043D\u0430\u0434 \u0431\u0430\u0441\u043E\u043C: " + intervals + ".";
      }
      if (!text) continue;
      if (!byText.has(text)) byText.set(text, { key: note.key, symbols: /* @__PURE__ */ new Set() });
      byText.get(text).symbols.add(explanationSymbol(note, owner));
    }
    for (const [text, item] of byText) {
      const symbol = [...item.symbols].join(", ");
      if (!rows.has(symbol)) rows.set(symbol, []);
      rows.get(symbol).push(`<span data-symbol="${escape2(item.key)}">${escape2(text)}</span>`);
    }
    return rows.size ? `<dl class="rawln-rn-explanations">${[...rows].map(([symbol, texts]) => `<div><dt>${symbol}</dt><dd>${texts.join(" ")}</dd></div>`).join("")}</dl>` : "";
  }
  function pitchGeometry(columns) {
    const height = 12, step = 6, pitches = columns.flatMap((column) => column.pitches);
    const low = Math.min(...pitches), high = Math.max(...pitches);
    const absoluteTop = (pitch) => -pitch * step;
    const start = absoluteTop(high), end = absoluteTop(low) + height, guides = [];
    const firstOctave = Math.floor(low / 12) - 1, lastOctave = Math.ceil(high / 12) + 1;
    for (let octave = lastOctave; octave >= firstOctave; octave--) {
      for (const degree of [7, 0]) {
        const pitch = octave * 12 + degree, y = absoluteTop(pitch) + height;
        guides.push({ pitch, degree, y });
      }
    }
    const before = guides.filter((guide) => guide.y + 1 < start).at(-1);
    const after = guides.find((guide) => guide.y > end);
    const visible = [before, ...guides.filter((guide) => guide.y + 1 >= start && guide.y <= end), after].filter(Boolean);
    const top = Math.min(start, ...visible.map((guide) => guide.y)) - 4;
    const bottom = Math.max(end, ...visible.map((guide) => guide.y + 1)) + 4;
    return {
      height,
      gridHeight: bottom - top,
      y: (pitch) => absoluteTop(pitch) - top,
      guides: visible.map((guide) => ({ ...guide, y: guide.y - top }))
    };
  }
  function caption(column, options) {
    if (column.cadentialSixFour) return ["6/4"];
    if (column.special) return [options.jazz || options.english ? "augmented sixth" : "\u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u043D\u0430\u044F \u0441\u0435\u043A\u0441\u0442\u0430"];
    const inversion = column.inversion;
    if (options.jazz) {
      const third = column.pitches.length === 3 && !/(?:sus|add|omit|no)/i.test(column.notation);
      const seventh = column.pitches.length === 4 && /7/.test(column.notation);
      return [
        third ? "triad" : seventh ? "seventh chord" : "",
        typeof inversion === "number" ? englishInversions[inversion] : ""
      ];
    }
    if (options.english) {
      const kinds = column.seventh ? ["seventh chord", "six-five chord", "four-three chord", "four-two chord"] : ["triad", "sixth chord", "six-four chord"];
      return [kinds[inversion != null ? inversion : 0], englishInversions[inversion != null ? inversion : 0]];
    }
    return [column.seventh ? seventhNames[inversion != null ? inversion : 0] : triadNames[inversion != null ? inversion : 0], inversionNames[inversion != null ? inversion : 0]];
  }
  function romanNumeralDiagramColumns(columns, options = {}) {
    const geometry = pitchGeometry(columns);
    const guides = geometry.guides.map(({ pitch, degree, y }) => `<span class="rawln-rn-tooltip-guide" data-degree="${degree}" data-pitch="${pitch}" style="top:${y}px;height:1px"></span>`).join("");
    const diagram = columns.map((column) => {
      var _a, _b;
      const notation = (_b = (_a = column.label) != null ? _a : column.notation) != null ? _b : "";
      const { mode, seventhInterval, cadentialSixFour, colorOffset, rootPitch } = column;
      const context = { mode, seventhInterval, cadentialSixFour, colorOffset, rootPitch };
      const supplied = Object.fromEntries(Object.entries(context).filter(([, value]) => value !== void 0));
      const label = romanNumeralHTML(notation, {
        ...options,
        ...supplied,
        theme: "dark",
        colorRoots: true,
        ...column.labelOptions
      });
      const notes = column.pitches.map((pitch) => {
        const degree = colorIndex(pitch);
        return `<span class="rawln-rn-tooltip-note" data-degree="${degree}" data-pitch="${pitch}" style="top:${geometry.y(pitch)}px;background:${RAWL_COLORS[degree].background}">${degreeNames[degree]}</span>`;
      }).join("");
      const intervals = column.pitches.slice(1).map((pitch, index) => {
        const previous = column.pitches[index], y = (geometry.y(pitch) + geometry.y(previous) + geometry.height) / 2;
        return `<span class="rawln-rn-tooltip-interval" data-semitones="${pitch - previous}" style="top:${y}px">+${pitch - previous}</span>`;
      }).join("");
      const [kind, inversion] = options.sequence ? [] : caption({ ...column, notation }, options);
      const kindHTML = kind ? `<div class="rawln-rn-tooltip-kind">${kind}</div>` : "";
      const inversionHTML = inversion ? `<div class="rawln-rn-tooltip-inversion">${inversion}</div>` : "";
      return `<section class="rawln-rn-tooltip-column" data-chord="${escape2(notation)}"><div class="rawln-rn-tooltip-label">${label}</div><div class="rawln-rn-tooltip-grid" style="height:${geometry.gridHeight}px">${guides}${notes}${intervals}</div>${kindHTML}${inversionHTML}</section>`;
    }).join(options.sequence ? '<span class="cadence-sequence-arrow" aria-hidden="true">\u2192</span>' : "");
    return `<div class="rawln-rn-tooltip-columns${options.sequence ? " cadence-sequence" : ""}">${diagram}</div>`;
  }
  function romanNumeralTooltipHTML(notation, options, model) {
    const columns = [
      ...model.inversion && !model.special && model.rootPitches && model.rootNotation ? [{ ...model, pitches: model.rootPitches, notation: model.rootNotation, inversion: 0, cadentialSixFour: false, labelOptions: { bassPitch: null } }] : [],
      { ...model, notation }
    ];
    const copy = !options.jazz && model.token ? romanNumeralExplanations({
      ...options,
      ...model,
      label: notation,
      rootLabel: model.rootNotation
    }) : "";
    return romanNumeralDiagramColumns(columns, options) + copy;
  }

  // src/notation/bind-roman-numeral-tooltip.mjs
  var active = /* @__PURE__ */ new WeakMap();
  var nextId = 0;
  function bindRomanNumeralTooltip(anchor, render) {
    const document = anchor.ownerDocument;
    const window = document.defaultView;
    let tooltip = null, timer = 0;
    const clear = () => window.clearTimeout(timer);
    const relatedInside = (element, related) => related instanceof window.Node && (element == null ? void 0 : element.contains(related));
    const outside = (event) => {
      if (!relatedInside(anchor, event.target) && !relatedInside(tooltip, event.target)) hide();
    };
    const scroll = (event) => {
      if (!relatedInside(tooltip, event.target)) hide();
    };
    const escape3 = (event) => {
      if (event.key === "Escape") hide();
    };
    const events = [
      ["scroll", scroll, true],
      ["resize", hide],
      ["blur", hide],
      ["pointerdown", outside, true],
      ["keydown", escape3]
    ];
    function hide() {
      var _a;
      clear();
      if (!tooltip) return;
      const revision = ((_a = anchor.getAttribute("aria-describedby")) != null ? _a : "").split(/\s+/).filter((id) => id && id !== tooltip.id);
      if (revision.length) anchor.setAttribute("aria-describedby", revision.join(" "));
      else anchor.removeAttribute("aria-describedby");
      tooltip.remove();
      tooltip = null;
      for (const [type, listener, capture] of events) window.removeEventListener(type, listener, capture);
      if (active.get(document) === hide) active.delete(document);
    }
    function show() {
      var _a;
      clear();
      if (tooltip) return;
      (_a = active.get(document)) == null ? void 0 : _a();
      active.set(document, hide);
      tooltip = document.createElement("div");
      tooltip.className = "rawln-rn-tooltip";
      tooltip.id = "rawln-rn-tooltip-" + ++nextId;
      tooltip.setAttribute("role", "tooltip");
      tooltip.innerHTML = render();
      tooltip.addEventListener("pointerenter", clear);
      tooltip.addEventListener("pointerleave", (event) => {
        if (!relatedInside(anchor, event.relatedTarget)) hide();
      });
      document.body.append(tooltip);
      const uses = anchor.getAttribute("aria-describedby");
      anchor.setAttribute("aria-describedby", uses ? uses + " " + tooltip.id : tooltip.id);
      for (const [type, listener, capture] of events) window.addEventListener(type, listener, capture);
      const box = anchor.getBoundingClientRect(), bounds = tooltip.getBoundingClientRect();
      const left = Math.min(window.innerWidth - bounds.width - 8, box.left + (box.width - bounds.width) / 2);
      const top = box.top >= bounds.height + 9 ? box.top - bounds.height - 9 : Math.min(window.innerHeight - bounds.height - 8, box.bottom + 9);
      tooltip.style.left = Math.max(8, left) + "px";
      tooltip.style.top = Math.max(8, top) + "px";
    }
    const leave = (event) => {
      if (event.pointerType === "touch" || relatedInside(anchor, event.relatedTarget) || relatedInside(tooltip, event.relatedTarget)) return;
      clear();
      timer = window.setTimeout(hide, 140);
    };
    const stop = (event) => event.stopPropagation();
    const click = (event) => {
      stop(event);
      show();
    };
    const key = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        stop(event);
        show();
      }
    };
    const triggers = [
      ["pointerover", show],
      ["pointerout", leave],
      ["focusin", show],
      ["focusout", leave],
      ["pointerdown", stop],
      ["click", click],
      ["keydown", key]
    ];
    for (const [type, listener] of triggers) anchor.addEventListener(type, listener);
    return () => {
      hide();
      for (const [type, listener] of triggers) anchor.removeEventListener(type, listener);
    };
  }

  // src/notation/harmony-annotations.mjs
  var ROW_HEIGHT = 22;
  var ROW_PAD = 2;
  var SVG = "http://www.w3.org/2000/svg";
  function placeLabels(labels, start, end, width) {
    const rowEnds = [];
    for (const point of labels) {
      const ink = point.label.offsetWidth;
      const anchor = (point.beat - start) / (end - start) * width;
      const left = Math.max(0, Math.min(width - ink, anchor - ink * 0.12));
      let row = rowEnds.findIndex((right2) => right2 + 4 <= left);
      if (row < 0) row = rowEnds.length;
      const right = left + ink;
      const top = ROW_PAD + row * ROW_HEIGHT;
      Object.assign(point, { left, right, top, bottom: top + point.label.offsetHeight, row });
      rowEnds[row] = right;
      point.label.style.left = left + "px";
      point.label.dataset.annotationRow = row;
    }
    return ROW_PAD + rowEnds.length * ROW_HEIGHT;
  }
  function curveIsClear(curve, geometry, obstacles, width) {
    const clear = ([x, y]) => x >= 1 && x <= width - 1 && !obstacles.some((box) => x > box.left - 1 && x < box.right + 1 && y > box.top - 1 && y < box.bottom + 1);
    if (!geometry.headPoints.every(clear)) return false;
    for (let step = 0; step <= 40; step++) {
      const t = step / 40, u = 1 - t;
      const point = [0, 1].map((i) => u ** 3 * curve[i] + 3 * u ** 2 * t * curve[i + 2] + 3 * u * t ** 2 * curve[i + 4] + t ** 3 * curve[i + 6]);
      if (!clear(point)) return false;
    }
    return true;
  }
  function tonicizationArrow(from, to, obstacles, width, bandHeight, above) {
    const direction = above ? -1 : 1;
    const forward = from.left <= to.left;
    const gap = forward ? to.left - from.right : from.left - to.right;
    const edge = (box) => above ? box.top : box.bottom;
    if (from.row === to.row && gap >= 17) {
      const x1 = forward ? from.right + 3 : from.left - 3;
      const x2 = forward ? to.left - 3 : to.right + 3;
      const curve = arrowCurve([x1, edge(from) - 2 * direction], [x2, edge(to) - 2 * direction], direction);
      const geometry = arrowGeometry(curve);
      if (curveIsClear(curve, geometry, obstacles, width)) return { curve, geometry };
    }
    const ends = (box) => [(box.left + box.right) / 2, box.left - 3, box.right + 3].filter((x) => x > 1 && x < width - 1);
    for (const depth of [12, 24, 40]) {
      const bow = above ? -depth : bandHeight + depth;
      for (const x1 of ends(from)) for (const x2 of ends(to)) {
        const y1 = edge(from) + 3 * direction, y2 = edge(to) + 3 * direction;
        if (Math.abs(x1 - x2) < 3) continue;
        const run = Math.sign(x2 - x1) * Math.min(10, Math.abs(x2 - x1) / 3);
        const curve = [x1, y1, x1 + run, bow, x2 - run, bow, x2, y2];
        const geometry = arrowGeometry(curve);
        if (curveIsClear(curve, geometry, obstacles, width)) return { curve, geometry };
      }
    }
    return null;
  }
  function createLane(score, position, points, arrows, start, end) {
    const document = score.ownerDocument;
    const lane = document.createElement("div");
    lane.className = "rawln-harmony-lane";
    lane.dataset.position = position;
    const overlay = document.createElementNS(SVG, "svg");
    overlay.classList.add("rawln-harmony-arrows");
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("focusable", "false");
    lane.append(overlay);
    const labels = points.map((point) => {
      const label = document.createElement("span");
      label.className = "rawln-harmony-label";
      label.setAttribute("role", "math");
      label.dataset.beat = point.beat;
      if (point.id !== void 0) label.dataset.annotationId = point.id;
      label.setAttribute("aria-label", point.notation);
      label.innerHTML = romanNumeralHTML(point.notation, point.options);
      lane.append(label);
      return { ...point, label };
    });
    const ids = new Map(labels.filter((point) => point.id !== void 0).map((point) => [point.id, point]));
    const links = arrows.map((arrow) => ({ from: ids.get(arrow.from), to: ids.get(arrow.to) })).filter(({ from, to }) => from && to && from !== to);
    if (position === "above") score.before(lane);
    else score.after(lane);
    function fit(width) {
      if (!width) return;
      lane.style.width = width + "px";
      const bandHeight = placeLabels(labels, start, end, width);
      const above = position === "above";
      let minY = 0, maxY = bandHeight;
      overlay.replaceChildren();
      for (const { from, to } of links) {
        const arrow = tonicizationArrow(from, to, labels, width, bandHeight, above);
        if (!arrow) continue;
        const { curve, geometry } = arrow;
        const ys = [...curve.filter((_, i) => i % 2), ...geometry.headPoints.map((point) => point[1])];
        minY = Math.min(minY, Math.floor(Math.min(...ys) - 2));
        maxY = Math.max(maxY, Math.ceil(Math.max(...ys) + 2));
        const link = document.createElementNS(SVG, "g");
        link.dataset.from = from.id;
        link.dataset.to = to.id;
        const shaft = document.createElementNS(SVG, "path");
        shaft.classList.add("rawln-harmony-arrow-shaft");
        shaft.setAttribute("d", geometry.shaftPath);
        const head = document.createElementNS(SVG, "path");
        head.setAttribute("d", geometry.headPath);
        link.append(shaft, head);
        overlay.append(link);
      }
      for (const point of labels) point.label.style.top = point.top - minY + "px";
      lane.style.height = maxY - minY + "px";
      overlay.setAttribute("viewBox", `0 ${minY} ${width} ${maxY - minY}`);
    }
    return { lane, fit };
  }
  function mountHarmonyAnnotations(score, {
    start,
    end,
    annotations = [],
    arrows = [],
    endInclusive = false
  }) {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new RangeError("Harmony annotations require a finite, increasing beat range");
    }
    const visible = annotations.filter(({ beat }) => beat >= start && (endInclusive ? beat <= end : beat < end)).sort((a, b) => a.beat - b.beat);
    const lanes = [];
    for (const side of ["above", "below"]) {
      const points = visible.filter((point) => {
        var _a;
        return ((_a = point.position) != null ? _a : "below") === side;
      });
      if (points.length) lanes.push(createLane(score, side, points, arrows, start, end));
    }
    if (!lanes.length) return () => {
    };
    const fit = () => lanes.forEach((lane) => lane.fit(score.clientWidth));
    const view = score.ownerDocument.defaultView;
    const observer = (view == null ? void 0 : view.ResizeObserver) ? new view.ResizeObserver(fit) : null;
    if (observer) observer.observe(score);
    else view == null ? void 0 : view.addEventListener("resize", fit);
    fit();
    return () => {
      observer == null ? void 0 : observer.disconnect();
      view == null ? void 0 : view.removeEventListener("resize", fit);
      lanes.forEach(({ lane }) => lane.remove());
    };
  }
  return __toCommonJS(harmony_annotations_exports);
})();
if(typeof module==='object'&&module.exports)module.exports=LibrawlHarmony;
