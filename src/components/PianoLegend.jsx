// Keyboard, chord modes and scale patterns from Rawl's PianoLegend and ChordStairs (GPL-3.0-only).
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GraduationCap, Guitar } from 'lucide-react';
import { TONIC_NAMES } from '../notation/geometry.mjs';
import { RAWL_COLORS, colorIndex } from '../notation/palette.mjs';

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEYS = [1, 3, null, 6, 8, 10, null];
const BLACK_LABELS = ['♭2', '♭3', null, '♯4', '♭6', '♭7'];
const ALL_PITCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MOBILE = '(max-width: 767px)';
const ARPEGGIO_DELAY_MS = 60;
const CHORDS = {
  ii: [2, 5, 9], IV: [5, 9, 0], vi: [9, 0, 4], I: [0, 4, 7],
  iii: [4, 7, 11], V: [7, 11, 2], V7: [7, 11, 2, 5],
  iio: [2, 5, 8], iv: [5, 8, 0], bVI: [8, 0, 3], i: [0, 3, 7],
  bIII: [3, 7, 10], v: [7, 10, 2], bVII: [10, 2, 5],
};
const MODES = [
  { title: 'major', names: ['ii', 'IV', 'vi', 'I', 'iii', 'V', 'V7'] },
  { title: 'minor', names: ['iio', 'iv', 'bVI', 'i', 'bIII', 'V', 'V7', 'v', 'bVII'] },
].map(({ title, names }) => ({ title, chords: names.map(name => ({ name, pitches: CHORDS[name] })) }));
const SCALES = [
  { label: 'minor', color: 3, scales: [
    ['phrygian', [0, 1, 3, 5, 7, 8, 10]], ['natural', [0, 2, 3, 5, 7, 8, 10]],
    ['harmonic', [0, 2, 3, 5, 7, 8, 11]], ['dorian', [0, 2, 3, 5, 7, 9, 10]],
  ] },
  { label: 'major', color: 4, scales: [
    ['mixolydian', [0, 2, 4, 5, 7, 9, 10]], ['natural', WHITE_KEYS],
    ['lydian', [0, 2, 4, 6, 7, 9, 11]], ['hijaz', [0, 1, 4, 5, 7, 8, 10]],
  ] },
];

const color = degree => RAWL_COLORS[colorIndex(degree)].background;

function PitchDot({ pitch }) {
  const { dot } = RAWL_COLORS[colorIndex(pitch)];
  if (!dot) return null;
  return <span className="rawln-piano-pitch-dot" aria-hidden="true"
    style={{ width: dot.size, height: dot.size, background: dot.color }} />;
}

const tonicName = degree => TONIC_NAMES[colorIndex(degree)];
const romanName = name => name.replace('b', '♭');
const chordQualities = { '4 3': '', '3 4': 'm', '3 3': 'dim', '3 4 3': 'm7', '4 3 3': '7', '4 3 4': 'maj7', '3 3 4': 'ø7' };
// Same degree spelling as Rawl's guitar-chord view, including minor-key enharmonics.
const minorTonics = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
function guitarName(name, pitches, tonic, minor) {
  const intervals = pitches.slice(1).map((pitch, i) => colorIndex(pitch - pitches[i])).join(' ');
  const quality = chordQualities[intervals];
  if (quality === undefined) return;
  const root = tonic + pitches[0];
  let expected = tonic;
  let letter = 'CDEFGAB'.indexOf((minor ? minorTonics : TONIC_NAMES)[colorIndex(tonic)][0]);
  for (const part of name.split('/').reverse()) {
    const match = /^([b#]*)([ivIV]+)/.exec(part);
    const degree = match ? ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'].indexOf(match[2].toUpperCase()) : -1;
    if (degree < 0) return tonicName(root) + quality;
    letter = (letter + degree) % 7;
    expected += WHITE_KEYS[degree];
    for (const accidental of match[1]) expected += accidental === 'b' ? -1 : 1;
  }
  if (colorIndex(expected) !== colorIndex(root)) return tonicName(root) + quality;
  const accidental = colorIndex(root - WHITE_KEYS[letter] + 6) - 6;
  return 'CDEFGAB'[letter] + (accidental < 0 ? '♭'.repeat(-accidental) : '♯'.repeat(accidental)) + quality;
}

export function PianoLegend({
  currentTonic = 0, inline = false, enabledPitches = ALL_PITCHES, activePitch = null, onAudition,
}) {
  const [playing, setPlaying] = useState(null);
  const timer = useRef(null);
  const stop = useRef(null);
  useEffect(() => () => {
    clearTimeout(timer.current);
    stop.current?.();
  }, []);
  function renderKey(pitch, label, left, raised) {
    const enabled = enabledPitches.includes(pitch);
    const active = activePitch === pitch;
    const interactive = !inline && enabled && !!onAudition;
    const Element = interactive ? 'button' : 'span';
    return <Element key={pitch}
      {...(interactive ? { type: 'button', 'aria-label': tonicName(pitch + currentTonic), onClick: () => {
        clearTimeout(timer.current);
        stop.current?.();
        setPlaying(pitch);
        stop.current = onAudition([pitch + currentTonic], { kind: 'note' });
        timer.current = setTimeout(() => setPlaying(null), 200);
      } } : { 'aria-hidden': true })}
      className="rawln-piano-key" data-raised={raised || undefined} data-active={active || undefined}
      data-hidden={!enabled && !active || undefined} data-playing={playing === pitch || undefined}
      style={{ left: `${left * 100 / 7}%`, background: color(pitch) }}>
      <PitchDot pitch={pitch} />
      {!inline && <>{pitch === 0 && <span className="rawln-piano-tonic">{tonicName(currentTonic)}</span>}{label}</>}
    </Element>;
  }
  return <div className={`rawln-piano-keys${inline ? ' rawln-piano-inline' : ''}`}>
    {WHITE_KEYS.map((pitch, i) => renderKey(pitch, i + 1, i, false))}
    {BLACK_KEYS.map((pitch, i) => pitch === null ? null : renderKey(pitch, BLACK_LABELS[i], i + 0.5, true))}
  </div>;
}

export function InlinePianoLegend(props) {
  return <PianoLegend {...props} inline />;
}

function ChordRow({ mode, tonic, guitar, onAudition, setHoveredColors }) {
  const [playing, setPlaying] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const voiced = [];
  for (const chord of mode.chords) {
    if (!chord.pitches.length) continue;
    if (chord.positions?.length === chord.pitches.length) {
      voiced.push(chord);
      continue;
    }
    const previous = voiced[voiced.length - 1]?.positions[0];
    const root = chord.pitches[0];
    const distance = previous == null ? 0 : colorIndex(root - previous);
    const bass = previous == null ? root : previous + (distance > 6 ? distance - 12 : distance);
    const positions = [bass];
    for (let i = 1; i < chord.pitches.length; i++) {
      positions.push(positions[i - 1] + colorIndex(chord.pitches[i] - chord.pitches[i - 1]));
    }
    voiced.push({ ...chord, positions });
  }
  if (!voiced.length) return null;
  const top = Math.max(...voiced.flatMap(chord => chord.positions));
  const bottom = Math.min(...voiced.flatMap(chord => chord.positions));
  const tonicIndex = voiced.findIndex(({ name }) => name === 'I' || name === 'i');
  const minor = mode.title.toLowerCase().includes('minor') || voiced.some(({ name }) => name === 'i');
  return <div className="rawln-piano-mode">
    <div className="rawln-piano-chords" style={{ '--rawln-piano-chord-count': voiced.length, height: (top - bottom) * 3 + 52 }}>
      {voiced.map(({ name, pitches, positions, romanLabel }, i) => {
        const showAbove = i < tonicIndex;
        const alternateLabel = guitar ? guitarName(name, pitches, tonic, minor) : undefined;
        const label = alternateLabel ?? romanName(name);
        const labelTop = 22 + (top - positions[showAbove ? positions.length - 1 : 0]) * 3 + (showAbove ? -20 : 9);
        const Element = onAudition ? 'button' : 'span';
        const clearHover = () => setHoveredColors?.(null);
        const preview = () => setHoveredColors?.(pitches.map(pitch => `noteColor_${colorIndex(pitch)}_colors`));
        return <Element key={`${name}-${i}`} className="rawln-piano-chord"
          {...(onAudition ? { type: 'button', 'aria-label': label, onClick: () => {
            clearTimeout(timer.current);
            setPlaying({ index: i, serial: Date.now() });
            onAudition(positions.map(pitch => pitch + tonic), { kind: 'chord' });
            timer.current = setTimeout(() => setPlaying(null), 600);
          } } : {})}
          onMouseEnter={preview} onMouseLeave={clearHover} onFocus={preview} onBlur={clearHover}>
          {positions.map((position, j) => <i key={`${j}-${playing?.index === i ? playing.serial : ''}`} aria-hidden="true"
            data-playing={playing?.index === i || undefined}
            style={{ top: 22 + (top - position) * 3, background: color(pitches[j]), animationDelay: `${ARPEGGIO_DELAY_MS * j}ms` }}>
            <PitchDot pitch={pitches[j]} />
          </i>)}
          <span style={{ top: labelTop }}>{alternateLabel ?? romanLabel ?? label}</span>
        </Element>;
      })}
    </div>
    {mode.title && <div className="rawln-piano-mode-title">{mode.title}</div>}
  </div>;
}

function getMobile() {
  return typeof window !== 'undefined' && window.matchMedia?.(MOBILE).matches === true;
}

function storedExpansion(key, mobile) {
  try {
    const value = globalThis.localStorage?.getItem(mobile ? `${key}Mobile` : key);
    if (value === 'true' || value === 'false') return value === 'true';
  } catch {
    // Storage may be unavailable inside a private or embedded browser context.
  }
  return false;
}

function reserveCollapsedLegendSpace(legend) {
  const { ownerDocument: document } = legend;
  const window = document.defaultView;
  let scroller = legend.parentElement;
  while (scroller && scroller !== document.body &&
    !/^(auto|scroll|overlay)$/.test(window.getComputedStyle(scroller).overflowY)) {
    scroller = scroller.parentElement;
  }
  const target = scroller ?? document.body;
  const spacer = document.createElement('div');
  spacer.className = 'rawln-piano-clearance';
  spacer.setAttribute('aria-hidden', 'true');
  const main = legend.closest('main');
  const placement = main && target.contains(main) ? main : target;
  placement.append(spacer);

  const update = () => {
    const scrollBottom = target === document.body
      ? window.innerHeight
      : Math.min(window.innerHeight, target.getBoundingClientRect().top + target.clientTop + target.clientHeight);
    const needed = legend.getClientRects().length
      ? Math.max(0, scrollBottom - legend.getBoundingClientRect().top + 4)
      : 0;
    spacer.style.setProperty('--rawln-piano-needed-clearance', `${needed}px`);
    spacer.style.setProperty('--rawln-piano-existing-clearance',
      window.getComputedStyle(legend).getPropertyValue('--rawln-piano-existing-clearance') || '0px');
  };
  const observer = window.ResizeObserver ? new window.ResizeObserver(update) : null;
  observer?.observe(legend);
  if (target !== document.body) observer?.observe(target);
  window.addEventListener('resize', update);
  update();
  return () => {
    observer?.disconnect();
    window.removeEventListener('resize', update);
    spacer.remove();
  };
}

export function FoldablePianoLegend({
  currentTonic = 0, modes = MODES, onAudition, setHoveredColors, storageKey = 'showLegend',
}) {
  const [mobile, setMobile] = useState(getMobile);
  const [expanded, setExpanded] = useState(() => storedExpansion(storageKey, mobile));
  const [scale, setScale] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [guitar, setGuitar] = useState(false);
  const audition = useRef(null);
  const legend = useRef(null);

  useEffect(() => {
    if (!expanded && legend.current) return reserveCollapsedLegendSpace(legend.current);
  }, [expanded]);

  function stop() {
    const run = audition.current;
    audition.current = null;
    run?.cancel?.();
  }

  useEffect(() => {
    const media = window.matchMedia?.(MOBILE);
    const changed = event => setMobile(event.matches);
    media?.addEventListener?.('change', changed);
    return () => media?.removeEventListener?.('change', changed);
  }, []);
  useEffect(() => setExpanded(storedExpansion(storageKey, mobile)), [storageKey, mobile]);
  useEffect(() => {
    setHighlight(null);
    setScale(null);
    return stop;
  }, [currentTonic, expanded]);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (!next) setHoveredColors?.(null);
    try {
      globalThis.localStorage?.setItem(mobile ? `${storageKey}Mobile` : storageKey, JSON.stringify(next));
    } catch {
      // The fold still works when storage is disabled.
    }
  }

  function play(pitches, { kind, onActiveNote }) {
    stop();
    setHighlight(null);
    const run = {};
    audition.current = run;
    run.cancel = onAudition(pitches, { kind, onActiveNote: index => {
      if (audition.current === run) onActiveNote?.(index);
    } });
  }

  function playScale(pitches) {
    const sequence = [...pitches, 12];
    play(sequence.map(pitch => pitch + currentTonic), {
      kind: 'scale', onActiveNote: index => setHighlight(index == null ? null : sequence[index]),
    });
  }

  const Chevron = expanded ? ChevronDown : ChevronUp;
  const chordNamesLabel = guitar ? 'Show Roman numerals' : 'Show guitar chords';
  return <aside ref={legend} className="rawln-piano-legend" data-expanded={expanded}>
    <div className="rawln-piano-header">
      <button type="button" className="rawln-piano-fold" onClick={toggle} aria-label="Piano legend"
        aria-expanded={expanded}>
        <Chevron size={14} aria-hidden="true" />
        {!expanded && <InlinePianoLegend />}
      </button>
      {expanded && <button type="button" className="rawln-piano-names" aria-pressed={guitar}
        aria-label={chordNamesLabel} title={chordNamesLabel} onClick={() => setGuitar(!guitar)}>
        <GraduationCap size={14} className="rawln-piano-name-roman" aria-hidden="true" />
        <span className="rawln-piano-name-track" aria-hidden="true" />
        <Guitar size={14} className="rawln-piano-name-guitar" aria-hidden="true" />
      </button>}
    </div>
    <div className="rawln-piano-panel" hidden={!expanded}>
      {expanded && <>
        {modes.map((mode, i) => <ChordRow key={i} mode={mode} tonic={currentTonic} guitar={guitar}
          onAudition={onAudition ? play : undefined} setHoveredColors={setHoveredColors} />)}
        <div className="rawln-piano-octaves">
          {[0, 12].map(octave => <PianoLegend key={octave} currentTonic={currentTonic + octave}
            enabledPitches={scale ?? ALL_PITCHES} activePitch={highlight == null ? null : highlight - octave}
            onAudition={onAudition ? play : undefined} />)}
        </div>
        {SCALES.map(group => <div key={group.label} className="rawln-piano-scale-row">
          <span style={{ background: color(group.color), color: RAWL_COLORS[group.color].foreground }}>{group.label}</span>
          {group.scales.map(([label, pitches]) => {
            const Element = onAudition ? 'button' : 'span';
            return <Element key={label} className="rawln-piano-scale" style={{
              background: `linear-gradient(to right, ${[1, 2, 3, 5, 6].map((degree, i) => `${color(pitches[degree])} ${i * 20}% ${(i + 1) * 20}%`).join(', ')})`,
            }} {...(onAudition ? { type: 'button', 'aria-label': `Play ${label} ${group.label} scale`,
              onClick: () => playScale(pitches) } : {})}
              onMouseEnter={() => setScale(pitches)} onMouseLeave={() => setScale(null)}
              onFocus={() => setScale(pitches)} onBlur={() => setScale(null)}>
              {label}
            </Element>;
          })}
        </div>)}
      </>}
    </div>
  </aside>;
}
