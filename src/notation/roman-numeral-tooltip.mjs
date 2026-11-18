// Pitch diagrams and approved explanations adapted from Caplin's
// reader/dist/{piano-chord-legend,score-annotations}.js (GPL-3.0-only).
import {RAWL_COLORS, colorIndex} from './palette.mjs';
import {chordContext, figurePitch, qualityPitch, firstRomanChord, romanNumeralColors, romanNumeralHTML} from './roman-numerals.mjs';

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

// Exact Russian interface copy approved by the user on2026-11-02.
const explanations = {
  roman: 'Римская цифра — ступень основного тона аккорда.',
  case: 'Прописная цифра — мажорное трезвучие; строчная — минорное.',
  flat: '♭ перед цифрой понижает основной тон на полутон относительно мажорной гаммы тоники.',
  sharp: '♯ перед цифрой повышает основной тон на полутон относительно мажорной гаммы тоники.',
  diminishedTriad: 'o — уменьшенное трезвучие.',
  diminishedSeventh: 'o7 — уменьшенный септаккорд.',
  halfDiminished: 'ø7 — полууменьшенный септаккорд.',
  minor: 'минорный септаккорд',
  neapolitan: 'неаполитанский аккорд',
  applied: '/ — аккорд рассчитан относительно ступени справа как временной тоники.',
  figureParentheses: 'Скобки объединяют фигуры, относящиеся к одной гармонии.',
  augmentedSixth:
    '+6 — увеличенная секста; It, Fr, Ger — итальянский, французский и немецкий варианты аккорда.',
  cadentialSixFour: 'Кадансовый 6/4 — задержания над доминантовым басом с разрешением в 5/3.',
};
const figureIntervals = {
  6: '6 — секста',
  64: '6/4 — секста и кварта',
  7: '7 — септима',
  65: '6/5 — секста и квинта',
  43: '4/3 — кварта и терция',
  42: '4/2 — кварта и секунда',
  2: '2 — секунда',
  53: '5/3 — квинта и терция',
};
// Caplin, printed27/PDF50, already-approved canonical translation p50-b5.
const harmonicParentheses =
  'Используйте круглые скобки для обозначения гармонического подчинения, особенно внутри органных пунктов и секвенций.';
export function romanNumeralSymbolNotes(model) {
  const token = firstRomanChord(model.label ?? '') ?? model.token ?? model.label ?? '',
    context = chordContext(token, { mode: model.mode }),
    notes = [];
  const add = (symbol, key, contextChord = token) => {
    if (!notes.some((n) => n.key === key && n.symbol === symbol)) notes.push({ symbol, key, contextChord });
  };
  const parts = token.split('/');
  for (const [partIndex, part] of parts.entries()) {
    const contextChord = parts.slice(partIndex).join('/'),
      addPart = (symbol, key) => add(symbol, key, contextChord);
    const info = chordContext(part, { mode: model.mode })?.first;
    if (info) {
      if (info.named) {
        addPart(
          info.name + (info.name === 'N' ? '' : ' +6'),
          info.name === 'N' ? 'neapolitan' : 'augmentedSixth',
        );
      } else {
        const symbol = info.name + ' = ' + (info.degree + 1);
        addPart(symbol, 'roman');
        if (!info.quality) addPart(symbol, 'case');
      }
      if (info.accidental) addPart(info.accidental, info.accidental === '♭' ? 'flat' : 'sharp');
      if (info.quality)
        addPart(
          info.quality === '°' ? 'o' : 'ø',
          info.quality === 'ø'
            ? 'halfDiminished'
            : (partIndex === 0 ? model.seventh : /[⁷₅₃₂]/u.test(info.tail))
            ? 'diminishedSeventh'
            : 'diminishedTriad',
        );
    }
  }
  if (!context && /[m°ø]/u.test(token))
    add(
      token.includes('m') ? 'm' : token.includes('ø') ? 'ø' : 'o',
      token.includes('m') ? 'minor' : token.includes('ø') ? 'halfDiminished' : 'diminishedSeventh',
    );
  if (context?.figures && (!context.first.named || context.first.name === 'N'))
    add(context.figures, model.cadentialSixFour ? 'cadentialSixFour' : 'figures' + context.figures);
  else if (/[⁷]/u.test(token)) add('7', 'figures7');
  if (parts.length > 1) add('/', 'applied');
  if (context?.first.tail.includes('(')) add('( )', 'figureParentheses');
  if (
    /^\(/u.test(model.label ?? token) ||
    (/\)$/u.test(model.label ?? token) && !context?.first.tail.includes('('))
  )
    add('( )', 'harmonicParentheses');
  return notes;
}
function explanationSymbol(note, model) {
  const context = chordContext(note.contextChord, {
    mode: model.mode,
    seventhInterval: model.seventhInterval,
    cadentialSixFour: !!model.cadentialSixFour,
  });
  const colored = (text, pitch, kind = 'root') => {
    if (!Number.isFinite(pitch)) return escape(text);
    pitch = colorIndex(pitch + (model.colorOffset ?? 0));
    return `<span class="chord-${kind} colored" data-root="${pitch}" style="--chord-color:${
      romanNumeralColors[pitch]
    }">${escape(text)}</span>`;
  };
  const symbol =
    note.symbol === '6453'
      ? '6/4–5/3'
      : note.symbol === 'Gr +6'
      ? 'Gr / Ger +6'
      : note.symbol.replace(/^(65|64|43|42|53)$/u, (m) => m[0] + '/' + m[1]);
  const pitchForFigure = (n) =>
    figurePitch(n, context) ??
    (!context && n === 7 && Number.isInteger(model.rootPitch)
      ? model.rootPitch - (model.colorOffset ?? 0) + (note.contextChord.includes('°') ? 9 : 10)
      : null);
  if (note.key === 'roman' || note.key === 'case') {
    const [roman, degree] = symbol.split(' = ');
    return colored(roman, context?.root) + ' = ' + colored(degree, context?.root);
  }
  if (note.key === 'flat' || note.key === 'sharp' || note.key === 'neapolitan')
    return colored(symbol, context?.root);
  if (note.key.startsWith('figures') || note.key === 'cadentialSixFour')
    return [...symbol]
      .map((c) => (/\d/.test(c) ? colored(c, pitchForFigure(Number(c)), 'figure') : escape(c)))
      .join('');
  if (note.key === 'augmentedSixth')
    return (
      colored(symbol.replace(/ \+6$/u, ''), context?.root) +
      ' ' +
      colored('+6', figurePitch(6, context), 'figure')
    );
  if (['diminishedTriad', 'diminishedSeventh', 'halfDiminished'].includes(note.key))
    return colored(
      symbol,
      qualityPitch(context) ??
        (!context && Number.isInteger(model.rootPitch)
          ? model.rootPitch - (model.colorOffset ?? 0) + 6
          : null),
      'quality',
    );
  if (note.key === 'minor')
    return colored(
      symbol,
      Number.isInteger(model.rootPitch) ? model.rootPitch - (model.colorOffset ?? 0) : context?.root,
    );
  return escape(symbol);
}
export function romanNumeralExplanations(model) {
  const rootModel =
    model.inversion && !model.special && model.rootPitches
      ? {
          ...model,
          pitches: model.rootPitches,
          inversion: 0,
          label: model.rootLabel,
          token: model.rootLabel,
          originalLabel: model.rootLabel,
          cadentialSixFour: false,
        }
      : null;
  const notes = [
      ...(rootModel ? romanNumeralSymbolNotes(rootModel).map((note) => ({ note, owner: rootModel })) : []),
      ...romanNumeralSymbolNotes(model).map((note) => ({ note, owner: model })),
    ],
    byText = new Map(),
    rows = new Map();
  for (const { note, owner } of notes) {
    let text = note.key === 'harmonicParentheses' ? harmonicParentheses : explanations[note.key];
    if (note.key.startsWith('figures')) {
      const intervals = figureIntervals[note.key.slice(7)];
      if (intervals) text = 'Цифры справа обозначают интервалы над басом: ' + intervals + '.';
    }
    if (!text) continue;
    if (!byText.has(text)) byText.set(text, { key: note.key, symbols: new Set() });
    byText.get(text).symbols.add(explanationSymbol(note, owner));
  }
  for (const [text, item] of byText) {
    const symbol = [...item.symbols].join(', ');
    if (!rows.has(symbol)) rows.set(symbol, []);
    rows.get(symbol).push(`<span data-symbol="${escape(item.key)}">${escape(text)}</span>`);
  }
  return rows.size
    ? `<dl class="rawln-rn-explanations">${[...rows]
        .map(([symbol, texts]) => `<div><dt>${symbol}</dt><dd>${texts.join(' ')}</dd></div>`)
        .join('')}</dl>`
    : '';
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
  if (column.special) return [options.jazz || options.english ? 'augmented sixth' : 'увеличенная секста'];
  const inversion = column.inversion;
  if (options.jazz) {
    const third = column.pitches.length === 3 && !/(?:sus|add|omit|no)/i.test(column.notation);
    const seventh = column.pitches.length === 4 && /7/.test(column.notation);
    return [third ? 'triad' : seventh ? 'seventh chord' : '',
      typeof inversion === 'number' ? englishInversions[inversion] : ''];
  }
  if (options.english) {
    const kinds = column.seventh
      ? ['seventh chord', 'six-five chord', 'four-three chord', 'four-two chord']
      : ['triad', 'sixth chord', 'six-four chord'];
    return [kinds[inversion ?? 0], englishInversions[inversion ?? 0]];
  }
  return [column.seventh ? seventhNames[inversion ?? 0] : triadNames[inversion ?? 0], inversionNames[inversion ?? 0]];
}

export function romanNumeralDiagramColumns(columns, options = {}) {
  const geometry = pitchGeometry(columns);
  const guides = geometry.guides.map(({pitch, degree, y}) => `<span class="rawln-rn-tooltip-guide" data-degree="${degree}" data-pitch="${pitch}" style="top:${y}px;height:1px"></span>`).join('');
  const diagram = columns.map(column => {
    const notation = column.label ?? column.notation ?? '';
    const {mode, seventhInterval, cadentialSixFour, colorOffset, rootPitch} = column;
    const context = {mode, seventhInterval, cadentialSixFour, colorOffset, rootPitch};
    const supplied = Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined));
    const label = romanNumeralHTML(notation, {...options, ...supplied, theme: 'dark', colorRoots: true,
      ...column.labelOptions});
    const notes = column.pitches.map(pitch => {
      const degree = colorIndex(pitch);
      return `<span class="rawln-rn-tooltip-note" data-degree="${degree}" data-pitch="${pitch}" style="top:${geometry.y(pitch)}px;background:${RAWL_COLORS[degree].background}">${degreeNames[degree]}</span>`;
    }).join('');
    const intervals = column.pitches.slice(1).map((pitch, index) => {
      const previous = column.pitches[index], y = (geometry.y(pitch) + geometry.y(previous) + geometry.height) / 2;
      return `<span class="rawln-rn-tooltip-interval" data-semitones="${pitch - previous}" style="top:${y}px">+${pitch - previous}</span>`;
    }).join('');
    const [kind, inversion] = options.sequence ? [] : caption({...column, notation}, options);
    const kindHTML = kind ? `<div class="rawln-rn-tooltip-kind">${kind}</div>` : '';
    const inversionHTML = inversion ? `<div class="rawln-rn-tooltip-inversion">${inversion}</div>` : '';
    return `<section class="rawln-rn-tooltip-column" data-chord="${escape(notation)}"><div class="rawln-rn-tooltip-label">${label}</div><div class="rawln-rn-tooltip-grid" style="height:${geometry.gridHeight}px">${guides}${notes}${intervals}</div>${kindHTML}${inversionHTML}</section>`;
  }).join(options.sequence ? '<span class="cadence-sequence-arrow" aria-hidden="true">→</span>' : '');
  return `<div class="rawln-rn-tooltip-columns${options.sequence ? ' cadence-sequence' : ''}">${diagram}</div>`;
}

export function romanNumeralTooltipHTML(notation, options, model) {
  const columns = [
    ...(model.inversion && !model.special && model.rootPitches && model.rootNotation
      ? [{...model, pitches: model.rootPitches, notation: model.rootNotation, inversion: 0, cadentialSixFour: false, labelOptions: {bassPitch: null}}] : []),
    {...model, notation},
  ];
  const copy = !options.jazz && model.token ? romanNumeralExplanations({
    ...options, ...model, label: notation, rootLabel: model.rootNotation,
  }) : '';
  return romanNumeralDiagramColumns(columns, options) + copy;
}
