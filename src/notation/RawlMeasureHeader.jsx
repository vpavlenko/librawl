import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {CornerDownLeft, CornerRightUp} from 'lucide-react';
import {MODULATION_BADGE_HEIGHT, TonicSymbol} from '../components/TonicSymbol.jsx';
import {measureHeaderLayout, mod, sameBeat} from './geometry.mjs';
import {RAWL_COLORS} from './palette.mjs';

const EMPTY_CHANGES = [];
const measureNumberTop = -4;
const measureDigits = {
  display: 'block', lineHeight: MODULATION_BADGE_HEIGHT + 'px', position: 'relative', top: -measureNumberTop, width: 'max-content',
};
const clickableMarker = {pointerEvents: 'auto', cursor: 'pointer'};
const cssLength = value => typeof value === 'number' ? value + 'px' : value;
const offsetLeft = (left, offset) => typeof left === 'number'
  ? left + offset
  : offset < 0 ? `calc(${left} - ${-offset}px)` : offset > 0 ? `calc(${left} + ${offset}px)` : left;

function arrow({direction}) {
  return <svg viewBox="4 4 16 16" aria-hidden="true">
    {direction === 'down' ? <><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>
      : <><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></>}
  </svg>;
}

function nearestLabelLeft(anchor, width, bounds, occupied) {
  let start = bounds.left;
  let nearest = null;
  for (const item of [...occupied, {left: bounds.right, right: bounds.right}].sort((a, b) => a.left - b.left)) {
    const end = Math.min(item.left, bounds.right);
    if (start + width <= end) {
      const candidate = Math.max(start, Math.min(end - width, anchor));
      if (nearest === null || Math.abs(candidate - anchor) < Math.abs(nearest - anchor)) nearest = candidate;
    }
    start = Math.max(start, item.right);
  }
  if (nearest !== null) return nearest;
  // If a tightly zoomed-out row has no gap, keep the text clear at its edge.
  const left = Math.min(bounds.left, ...occupied.map(item => item.left)) - width;
  const right = Math.max(bounds.right, ...occupied.map(item => item.right));
  return Math.abs(left - anchor) <= Math.abs(right - anchor) ? left : right;
}

// Place the text independently so the flag can still start exactly at the note.
function fitModulationLabels(header, digits, labels, commands) {
  const bounds = header.getBoundingClientRect();
  const width = parseFloat(header.ownerDocument.defaultView.getComputedStyle(header).width);
  if (!width || !bounds.width) return;
  const scale = bounds.width / width;
  const digitRects = new Map(digits.map(digit => [digit.parentElement.dataset.beat, digit.getBoundingClientRect()]));
  const commandRects = commands.map(command => command.getBoundingClientRect());
  const occupied = [...digitRects.values(), ...commandRects];
  const positions = labels.map(label => {
    const marker = label.parentElement;
    const anchor = marker.getBoundingClientRect().left;
    const width = label.getBoundingClientRect().width;
    const overflow = marker.hasAttribute('data-overflow-copy');
    const digit = overflow || marker.dataset.onsetOverride ? null : digitRects.get(marker.dataset.beat);
    return {label, anchor, width, digit, overflow};
  });
  function place({label, anchor, width}, left) {
    label.style.setProperty('--rawln-label-shift', (left - anchor) / scale - parseFloat(label.style.left) + 'px');
    occupied.push({left, right: left + width});
  }
  for (const position of positions) {
    if (!position.digit) continue;
    const left = position.digit.right;
    const touchesCommand = commandRects.some(box => box.left < left + position.width && box.right > left);
    place(position, touchesCommand ? nearestLabelLeft(left, position.width, bounds, occupied) : left);
  }
  for (const position of positions) {
    if (!position.overflow) continue;
    const left = position.anchor + parseFloat(position.label.style.left) * scale;
    const overlaps = occupied.some(box => box.left < left + position.width && box.right > left);
    // Keep the flag anchored; only move its text if it covers a control.
    const extended = {left: Math.min(bounds.left, left - position.width), right: bounds.right};
    place(position, overlaps ? nearestLabelLeft(left, position.width, extended, occupied) : left);
  }
  for (const position of positions) {
    if (!position.digit && !position.overflow) place(position, nearestLabelLeft(position.anchor, position.width, bounds, occupied));
  }
}

function rowLayout(options) {
  const {row} = options;
  const layout = measureHeaderLayout(options);
  const x = beat => (beat - row.start) / (row.end - row.start) * 100 + '%';
  return {
    measures: layout.measures.map(measure => ({
      ...measure, left: measure.left + '%',
      barLeft: Math.abs(measure.beat - row.start) < 1e-7 ? 0 : offsetLeft(x(measure.beat), -1),
    })),
    beats: layout.beats.map(beat => ({beat, left: x(beat)})),
    markers: layout.markers.map(marker => ({...marker, left: offsetLeft(x(marker.beat), marker.pixelOffset)})),
  };
}

function measureSectionAction(sectionEditing, measure) {
  if (!sectionEditing) return;
  const {sectionStarts, canSplit, canMerge, onSplit, onGlue} = sectionEditing;
  const hasEarlierSection = sectionStarts.some(start => start < measure.beat && !sameBeat(start, measure.beat));
  if (sectionStarts.some(start => sameBeat(start, measure.beat))) {
    if (hasEarlierSection && (canMerge?.(measure) ?? true)) return {kind: 'merge', apply: onGlue};
    return;
  }
  if (hasEarlierSection && (canSplit?.(measure) ?? measure.isPhraseStart)) return {kind: 'split', apply: onSplit};
}

function releaseMeasureFocus(element) {
  const position = element?.closest('.rawln-measure-position');
  const active = position?.ownerDocument.activeElement;
  if (position?.contains(active)) active.blur();
}

function forwardMarkerClick(event, marker, header) {
  const scoreRoot = '.rawln, .Rawl';
  const score = header.closest(scoreRoot);
  const matches = control => marker.measureBeat != null
    ? sameBeat(Number(control.dataset.beat), marker.measureBeat)
    : marker.number != null ? control.dataset.scoreMeasure === String(marker.number)
      : sameBeat(Number(control.dataset.beat), marker.beat);
  const selector = '.rawln-measure-number[role="button"]';
  const control = [...header.querySelectorAll(selector)].find(matches) ??
    (score && [...score.querySelectorAll(selector)].find(candidate => candidate.closest(scoreRoot) === score && matches(candidate)));
  if (!control) return;
  event.stopPropagation();
  control.focus({preventScroll: true});
  const {MouseEvent} = control.ownerDocument.defaultView;
  control.dispatchEvent(new MouseEvent('click', event.nativeEvent));
}

/** A shared score header, with an optional prepositioned ruler for hosts
 * that lay out their score against an arbitrary clock or editor viewport. */
export function RawlMeasureHeader({
  row, layout: positioned, height = '100%', tonic = 0, changes = EMPTY_CHANGES,
  barBeats = 4, beatBeats = 1, phraseStarts, measureMap, selectedMeasure = null,
  onMeasureSelect, hideInitialTonic = false, showModulationTonics = false, showContinuedTonic = false, showHeader = true, transpose = 0,
  renderMeasureExtras, modulationMarkerPlacement, sectionEditing,
}) {
  const element = useRef(null);
  const previousSelection = useRef(selectedMeasure);
  const [width, setWidth] = useState(0);
  const hasPositionedLayout = !!positioned;
  useLayoutEffect(() => {
    if (hasPositionedLayout) return;
    const el = element.current, view = el.ownerDocument.defaultView;
    const fit = () => setWidth(el.getBoundingClientRect().width || el.clientWidth);
    const Observer = view?.ResizeObserver ?? globalThis.ResizeObserver;
    const observer = Observer ? new Observer(fit) : null;
    fit();
    observer?.observe(el);
    view?.addEventListener('resize', fit);
    return () => { observer?.disconnect(); view?.removeEventListener('resize', fit); };
  }, [hasPositionedLayout]);
  useLayoutEffect(() => {
    const previous = previousSelection.current;
    previousSelection.current = selectedMeasure;
    if (previous === null || previous === selectedMeasure) return;
    releaseMeasureFocus(element.current.querySelector(`.rawln-measure-number[data-beat="${previous}"]`));
  }, [selectedMeasure]);
  const {measures, beats, markers} = useMemo(() => positioned ?? rowLayout({
    row, tonic, changes, barBeats, beatBeats, phraseStarts, measureMap, width, selectedMeasure, hideInitialTonic, modulationMarkerPlacement,
  }), [positioned, row, tonic, changes, barBeats, beatBeats, phraseStarts, measureMap, width, selectedMeasure, hideInitialTonic, modulationMarkerPlacement]);
  useLayoutEffect(() => {
    if (!showHeader) return;
    const header = element.current;
    const labels = [...header.querySelectorAll('.rawln-modulation-label')];
    if (!labels.length) return;
    const digits = [...header.querySelectorAll('.rawln-measure-digits')];
    const commands = [...header.querySelectorAll('.rawln-section-command')];
    const view = header.ownerDocument.defaultView;
    const fit = () => fitModulationLabels(header, digits, labels, commands);
    fit();
    const Observer = view.ResizeObserver ?? globalThis.ResizeObserver;
    const observer = Observer ? new Observer(fit) : null;
    for (const node of [header, ...digits, ...labels, ...commands]) observer?.observe(node);
    view.addEventListener('resize', fit);
    return () => {
      observer?.disconnect();
      view.removeEventListener('resize', fit);
    };
  }, [markers, measures, renderMeasureExtras, selectedMeasure, showHeader]);
  const select = (event, measure) => {
    event.stopPropagation();
    const control = event.currentTarget;
    // Pressing Shift can make a pointer-focused measure match :focus-visible.
    if (event.type === 'click' && event.detail > 0 && control.ownerDocument.activeElement === control) {
      control.dataset.pointerFocused = 'true';
    }
    onMeasureSelect(measure.beat, measure, control);
  };
  const applySection = (event, measure, action) => {
    releaseMeasureFocus(event.currentTarget);
    action.apply(measure);
  };
  const editSection = (event, measure, action) => {
    if (event.defaultPrevented || event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey ||
      event.nativeEvent.isComposing || event.currentTarget.value?.trim()) return;
    event.preventDefault();
    event.stopPropagation();
    if (action && (action.kind === 'merge') === event.shiftKey) applySection(event, measure, action);
  };
  return <div ref={element} className="rawln-measure-grid"
    data-modulation-tonics={showModulationTonics || undefined} style={{height}}>
    {measures.map(measure => <div
      className={'rawln-bar' + (measure.isPhraseStart ? ' rawln-phrase-bar' : '')}
      key={measure.beat} data-beat={measure.beat}
      data-phrase-boundary={measure.isPhraseStart || undefined} data-terminal={measure.terminal || undefined}
      style={{left: measure.barLeft ?? measure.left}}
    />)}
    {beats.map(({beat, left}) => <div className="rawln-beat-bar" key={beat} data-beat={beat} style={{left}} />)}
    {showHeader && <>
      <div className="rawln-modulations">
        {markers.map(marker => {
          const interval = marker.delta == null ? null : mod(marker.delta);
          const initial = marker.initial ?? marker.previousTonic === null;
          const showTonicName = marker.continued ? showContinuedTonic : initial || (showModulationTonics && interval != null);
          const clickable = onMeasureSelect && interval != null && !marker.continued && !marker.overflowCopy;
          const hitStyle = clickable ? clickableMarker : undefined;
          return <div key={marker.beat} className="rawln-modulation"
            data-beat={marker.beat} data-tonic={marker.tonic} data-join={marker.join ? marker.name : undefined}
            data-onset-override={marker.onsetOverride || undefined} data-origin-beat={marker.originBeat}
            data-continued={marker.continued || undefined} data-overflow-copy={marker.overflowCopy || undefined}
            aria-hidden={marker.overflowCopy || undefined} style={{left: marker.left}} title={marker.overflowCopy ? undefined : marker.name}
            onClick={clickable ? event => forwardMarkerClick(event, marker, element.current) : undefined}>
            <TonicSymbol left={0} number={marker.number}
              previousTonic={marker.previousTonic} modulationDiff={interval}
              tonicStart={marker.tonic} transpose={transpose}
              alignToOnset={marker.onsetOverride && !marker.continued}
              labelClassName="rawln-modulation-label" flagClassName="rawln-modulation-flag"
              showLabel={showTonicName || (!marker.continued && interval != null)} showTonicName={showTonicName}
              labelAttributes={{style: {left: marker.overflowCopy ? marker.labelOffset ?? 0 : 0, top: 0, lineHeight: MODULATION_BADGE_HEIGHT + 'px', ...hitStyle}}}
              flagAttributes={{'data-degree': interval ?? undefined, style: {background: RAWL_COLORS[interval]?.background, ...hitStyle}}}
              renderArrow={arrow} />
          </div>;
        })}
      </div>
      <div className="rawln-measure-labels" aria-hidden={!(onMeasureSelect || sectionEditing) || undefined}>
        {measures.filter(measure => !measure.terminal && measure.showLabel !== false).map(measure => {
          const labelLeft = offsetLeft(measure.left, measure.labelOffset ?? 6);
          const isSelected = selectedMeasure === measure.beat;
          const action = isSelected ? measureSectionAction(sectionEditing, measure) : undefined;
          const CommandIcon = action?.kind === 'merge' ? CornerRightUp : CornerDownLeft;
          const commandName = action?.kind === 'merge' ? 'Merge' : 'Split';
          const menu = action && <button type="button" className="rawln-section-command"
            data-section-action={action.kind}
            aria-label={commandName} title={commandName}
            onMouseDown={event => event.preventDefault()}
            onClick={event => {
              event.stopPropagation();
              applySection(event, measure, action);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
            }}>
            <CommandIcon size={14} aria-hidden="true" focusable={false} />
          </button>;
          return <div className="rawln-measure-position" key={measure.beat}
            style={{gridTemplateColumns: `minmax(0, ${cssLength(labelLeft)}) max-content`}}>
            <div className="rawln-measure-number" role={onMeasureSelect ? 'button' : undefined}
              tabIndex={onMeasureSelect ? 0 : undefined}
              aria-pressed={onMeasureSelect ? isSelected : undefined}
              onClick={onMeasureSelect ? event => select(event, measure) : undefined}
              onBlur={onMeasureSelect ? event => {
                if (event.target === event.currentTarget) delete event.currentTarget.dataset.pointerFocused;
              } : undefined}
              onKeyDown={onMeasureSelect ? event => {
                if (event.target !== event.currentTarget) return;
                if (isSelected && sectionEditing && event.key === 'Enter') {
                  editSection(event, measure, action);
                } else if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  select(event, measure);
                }
              } : undefined}
              data-beat={measure.beat} data-modulation={measure.hasModulation || undefined}
              data-score-measure={measure.number}
              style={{color: measure.color, top: measureNumberTop, pointerEvents: onMeasureSelect ? 'auto' : undefined,
                cursor: onMeasureSelect ? 'pointer' : undefined}}>
              {renderMeasureExtras?.(measure, sectionEditing && isSelected
                ? event => editSection(event, measure, action) : undefined, action?.kind)}
              <span className="rawln-measure-digits" style={measureDigits}>{measure.number}</span>
            </div>
            {menu != null && <div className="rawln-measure-menu">{menu}</div>}
          </div>;
        })}
      </div>
    </>}
  </div>;
}
