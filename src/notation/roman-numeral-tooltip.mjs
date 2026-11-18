// Pitch diagrams and approved explanations adapted from Caplin's
// reader/dist/{piano-chord-legend,score-annotations}.js (GPL-3.0-only).
import {RAWL_COLORS, colorIndex} from './palette.mjs';
import {chordContext, figurePitch, qualityPitch, firstRomanChord, romanNumeralHTML} from './roman-numerals.mjs';

const degreeNames = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
const triadNames = ['трезвучие', 'секстаккорд', 'квартсекстаккорд'];
const seventhNames = ['септаккорд', 'квинтсекстаккорд', 'терцквартаккорд', 'секундаккорд'];
const inversionNames = ['основной вид', 'первое обращение', 'второе обращение', 'третье обращение'];
const englishInversions = ['root position', 'first inversion', 'second inversion', 'third inversion'];
const escape = text => String(text).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function stack(pitches) {
  const ordered = [];
  for (let pitch of pitches) {
    while (ordered.length && pitch <= ordered.at(-1)) pitch += 12;
    ordered.push(pitch);
  }
  return ordered;
}

function explicitModel(tooltip) {
  const {pitches, rootPitches, rootNotation, inversion} = tooltip;
  const validPitch = pitch => Number.isInteger(pitch) && Math.abs(pitch) <= 127;
  if (!pitches?.length || !pitches.every(validPitch)) return null;
  const root = rootPitches?.length && rootPitches.every(validPitch)
    ? [...new Set(rootPitches)].sort((a,b) => a-b) : undefined;
  return {
    pitches: [...new Set(pitches)].sort((a,b) => a-b),
    rootPitches: root,
    rootNotation,
    inversion,
    seventh: (root ?? pitches).length === 4,
  };
}

export function romanNumeralTooltipModel(notation, options = {}, tooltip = true) {
  if (tooltip !== true) {
    return tooltip ? explicitModel(tooltip) : null;
  }
  if (options.jazz) return null;
  const bare = String(notation).replace(/(?:…|\.{3})$/u, '').replace(/[[\]]/g, '');
  const token = firstRomanChord(bare) ?? (options.contextChord
    ? options.contextChord.replace(/^[^/]+/, root => root + bare.replace(/[()\s–—-]/g, '')) : null);
  const context = token && chordContext(token, options);
  if (!context?.bass) return null;

  let tones = context.tones.map(note => note.pitch), bass = context.bass.pitch;
  const {first, root, figures} = context;
  const cadentialSixFour = first.name === 'V' && bass === root && figures.startsWith('64') &&
    (first.tail.startsWith('(') || options.cadentialSixFour);
  if (cadentialSixFour) {
    const third = context.tones.find(note => note.degree === (context.degree + 5) % 7)?.pitch;
    tones = [colorIndex(root + 5), third ?? colorIndex(root + (options.mode === 'minor' ? 8 : 9)), root];
  } else if (first.quality === 'ø' && tones.length === 3) {
    // A lone 6 in the source still describes a half-diminished seventh.
    tones.push(colorIndex(root + 10));
  }
  const offset = options.colorOffset ?? 0;
  tones = [...new Set(tones.map(pitch => colorIndex(pitch + offset)))];
  bass = colorIndex(bass + offset);
  const inversion = tones.indexOf(bass);
  if (inversion < 0) return null;
  const special = !!first.named && first.name !== 'N';
  const seventh = tones.length === 4;
  const applied = token.includes('/') ? token.slice(token.indexOf('/') + 1) : '';
  const rootNotation = cadentialSixFour ? applied || (options.mode === 'minor' ? 'i' : 'I')
    : first.accidental + first.name + first.quality + (seventh ? '⁷' : '') + (applied ? '/' + applied : '');
  return {
    pitches: stack([...tones.slice(inversion), ...tones.slice(0, inversion)]),
    rootPitches: stack(tones),
    rootNotation,
    inversion,
    seventh,
    special,
    cadentialSixFour,
    token,
  };
}

// Exact Russian interface copy approved for Caplin on 2026-11-02.
const explanations = {
  roman: 'Римская цифра — ступень основного тона аккорда.',
  case: 'Прописная цифра — мажорное трезвучие; строчная — минорное.',
  flat: '♭ перед цифрой понижает основной тон на полутон относительно мажорной гаммы тоники.',
  sharp: '♯ перед цифрой повышает основной тон на полутон относительно мажорной гаммы тоники.',
  diminishedTriad: 'o — уменьшенное трезвучие.',
  diminishedSeventh: 'o7 — уменьшенный септаккорд.',
  halfDiminished: 'ø7 — полууменьшенный септаккорд.',
  neapolitan: 'неаполитанский аккорд',
  applied: '/ — аккорд рассчитан относительно ступени справа как временной тоники.',
  figureParentheses: 'Скобки объединяют фигуры, относящиеся к одной гармонии.',
  augmentedSixth: '+6 — увеличенная секста; It, Fr, Ger — итальянский, французский и немецкий варианты аккорда.',
  cadentialSixFour: 'Кадансовый 6/4 — задержания над доминантовым басом с разрешением в 5/3.',
  // Caplin printed 27 / PDF 50, canonical translation p50-b5.
  harmonicParentheses: 'Используйте круглые скобки для обозначения гармонического подчинения, особенно внутри органных пунктов и секвенций.',
};
const figureIntervals = {
  6: '6 — секста', 64: '6/4 — секста и кварта', 7: '7 — септима', 65: '6/5 — секста и квинта',
  43: '4/3 — кварта и терция', 42: '4/2 — кварта и секунда', 2: '2 — секунда', 53: '5/3 — квинта и терция',
};

function explanationRows(label, model, options) {
  const rows = new Map();
  const byText = new Map();
  const colored = (text, pitch, kind = 'root') => {
    if (!Number.isFinite(pitch)) return escape(text);
    const degree = colorIndex(pitch + (options.colorOffset ?? 0));
    return `<span class="chord-${kind} colored" data-root="${degree}" style="--chord-color:${RAWL_COLORS[degree].background}">${escape(text)}</span>`;
  };
  const add = (key, symbol, text = explanations[key]) => {
    if (!text) return;
    if (!byText.has(text)) byText.set(text, {key, symbols: new Set()});
    byText.get(text).symbols.add(symbol);
  };
  const describe = (token, displayedLabel, cadentialSixFour) => {
    const parts = token.split('/');
    for (const [index, part] of parts.entries()) {
      const context = chordContext(parts.slice(index).join('/'), {...options, cadentialSixFour});
      const info = context?.first;
      if (!info) continue;
      if (info.named) {
        if (info.name === 'N') add('neapolitan', colored('N', context.root));
        else add('augmentedSixth', colored(info.name === 'Gr' ? 'Gr / Ger' : info.name, context.root)
          + ' ' + colored('+6', figurePitch(6, context), 'figure'));
      } else {
        const symbol = colored(info.name, context.root) + ' = ' + colored(info.degree + 1, context.root);
        add('roman', symbol);
        if (!info.quality) add('case', symbol);
      }
      if (info.accidental) add(info.accidental === '♭' ? 'flat' : 'sharp', colored(info.accidental, context.root));
      if (info.quality) {
        const seventh = index === 0 ? model.seventh : /[⁷₅₃₂]/u.test(part);
        const key = info.quality === 'ø' ? 'halfDiminished' : seventh ? 'diminishedSeventh' : 'diminishedTriad';
        add(key, colored(info.quality === '°' ? 'o' : 'ø', qualityPitch(context), 'quality'));
      }
    }
    const context = chordContext(token, {...options, cadentialSixFour});
    const figures = context?.figures;
    if (figures && (!context.first.named || context.first.name === 'N')) {
      const text = figures === '6453' ? '6/4–5/3' : figures.replace(/^(65|64|43|42|53)$/u, m => m[0] + '/' + m[1]);
      const symbol = [...text].map(c => /\d/.test(c) ? colored(c, figurePitch(Number(c), context), 'figure') : escape(c)).join('');
      if (cadentialSixFour) add('cadentialSixFour', symbol);
      else if (figureIntervals[figures]) add(`figures${figures}`, symbol,
        'Цифры справа обозначают интервалы над басом: ' + figureIntervals[figures] + '.');
    }
    if (parts.length > 1) add('applied', '/');
    if (context?.first.tail.includes('(')) add('figureParentheses', '( )');
    else if (/^\(|\)$/u.test(displayedLabel)) add('harmonicParentheses', '( )');
  };
  if (model.inversion && !model.special && model.rootNotation) {
    describe(model.rootNotation, model.rootNotation, false);
  }
  describe(model.token, label, model.cadentialSixFour);
  for (const [text, {key, symbols}] of byText) {
    const symbol = [...symbols].join(', ');
    if (!rows.has(symbol)) rows.set(symbol, []);
    rows.get(symbol).push(`<span data-symbol="${key}">${escape(text)}</span>`);
  }
  return rows.size ? `<dl class="rawln-rn-explanations">${[...rows].map(([symbol, texts]) =>
    `<div><dt>${symbol}</dt><dd>${texts.join(' ')}</dd></div>`).join('')}</dl>` : '';
}

function pitchGeometry(columns) {
  const height = 12, step = 6, pitches = columns.flatMap(column => column.pitches);
  const low = Math.min(...pitches), high = Math.max(...pitches);
  const absoluteTop = pitch => -pitch * step;
  const start = absoluteTop(high), end = absoluteTop(low) + height, guides = [];
  const firstOctave = Math.floor(low / 12) - 1, lastOctave = Math.ceil(high / 12) + 1;
  for (let octave = lastOctave; octave >= firstOctave; octave--) {
    for (const degree of [7, 0]) {
      const pitch = octave * 12 + degree, y = absoluteTop(pitch) + height;
      guides.push({pitch, degree, y});
    }
  }
  const before = guides.filter(guide => guide.y + 1 < start).at(-1);
  const after = guides.find(guide => guide.y > end);
  const visible = [before, ...guides.filter(guide => guide.y + 1 >= start && guide.y <= end), after].filter(Boolean);
  const top = Math.min(start, ...visible.map(guide => guide.y)) - 4;
  const bottom = Math.max(end, ...visible.map(guide => guide.y + 1)) + 4;
  return {height, gridHeight: bottom - top, y: pitch => absoluteTop(pitch) - top,
    guides: visible.map(guide => ({...guide, y: guide.y - top}))};
}

function caption(column, options) {
  if (column.cadentialSixFour) return ['6/4'];
  if (column.special) return [options.jazz ? 'augmented sixth' : 'увеличенная секста'];
  const inversion = column.inversion;
  if (options.jazz) {
    const third = column.pitches.length === 3 && !/(?:sus|add|omit|no)/i.test(column.notation);
    const seventh = column.pitches.length === 4 && /7/.test(column.notation);
    return [third ? 'triad' : seventh ? 'seventh chord' : '',
      typeof inversion === 'number' ? englishInversions[inversion] : ''];
  }
  return [column.seventh ? seventhNames[inversion] : triadNames[inversion], inversionNames[inversion]];
}

export function romanNumeralTooltipHTML(notation, options, model) {
  const columns = [
    ...(model.inversion && !model.special && model.rootPitches && model.rootNotation
      ? [{...model, pitches: model.rootPitches, notation: model.rootNotation, inversion: 0, cadentialSixFour: false}] : []),
    {...model, notation},
  ];
  const geometry = pitchGeometry(columns);
  const guides = geometry.guides.map(({pitch, degree, y}) => `<span class="rawln-rn-tooltip-guide" data-degree="${degree}" data-pitch="${pitch}" style="top:${y}px"></span>`).join('');
  const diagram = columns.map(column => {
    const label = romanNumeralHTML(column.notation, {...options, theme: 'dark', colorRoots: true,
      ...(column.notation !== notation ? {bassPitch: null} : {})});
    const notes = column.pitches.map(pitch => {
      const degree = colorIndex(pitch);
      return `<span class="rawln-rn-tooltip-note" data-degree="${degree}" data-pitch="${pitch}" style="top:${geometry.y(pitch)}px;background:${RAWL_COLORS[degree].background}">${degreeNames[degree]}</span>`;
    }).join('');
    const intervals = column.pitches.slice(1).map((pitch, index) => {
      const previous = column.pitches[index], y = (geometry.y(pitch) + geometry.y(previous) + geometry.height) / 2;
      return `<span class="rawln-rn-tooltip-interval" data-semitones="${pitch - previous}" style="top:${y}px">+${pitch - previous}</span>`;
    }).join('');
    const [kind, inversion] = caption(column, options);
    return `<section class="rawln-rn-tooltip-column"><div class="rawln-rn-tooltip-label">${label}</div><div class="rawln-rn-tooltip-grid" style="height:${geometry.gridHeight}px">${guides}${notes}${intervals}</div>${kind ? `<div class="rawln-rn-tooltip-kind">${kind}</div>` : ''}${inversion ? `<div class="rawln-rn-tooltip-inversion">${inversion}</div>` : ''}</section>`;
  }).join('');
  const copy = !options.jazz && model.token ? explanationRows(notation, model, options) : '';
  return `<div class="rawln-rn-tooltip-columns">${diagram}</div>${copy}`;
}
