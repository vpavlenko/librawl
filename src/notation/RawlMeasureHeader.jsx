import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {TonicSymbol} from '../components/TonicSymbol.jsx';
import {measureHeaderLayout, mod} from './geometry.mjs';
import {RAWL_COLORS} from './palette.mjs';

const EMPTY_CHANGES = [];
const cssLength = value => typeof value === 'number' ? value + 'px' : value;
const offsetLeft = (left, offset) => typeof left === 'number'
  ? left + offset
  : offset < 0 ? `calc(${left} - ${-offset}px)` : offset > 0 ? `calc(${left} + ${offset}px)` : left;

function arrow({direction}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {direction === 'down' ? <><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>
      : <><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></>}
  </svg>;
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

/** A shared score header, with an optional prepositioned ruler for hosts
 * that lay out their score against an arbitrary clock or editor viewport. */
export function RawlMeasureHeader({
  row, layout: positioned, height = '100%', tonic = 0, changes = EMPTY_CHANGES,
  barBeats = 4, beatBeats = 1, phraseStarts, measureMap, selectedMeasure = null,
  onMeasureSelect, hideInitialTonic = false, showHeader = true, transpose = 0,
  renderMeasureExtras, modulationMarkerPlacement,
}) {
  const element = useRef(null);
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
  const {measures, beats, markers} = useMemo(() => positioned ?? rowLayout({
    row, tonic, changes, barBeats, beatBeats, phraseStarts, measureMap, width, selectedMeasure, hideInitialTonic, modulationMarkerPlacement,
  }), [positioned, row, tonic, changes, barBeats, beatBeats, phraseStarts, measureMap, width, selectedMeasure, hideInitialTonic, modulationMarkerPlacement]);
  const select = (event, measure) => {
    event.stopPropagation();
    onMeasureSelect(measure.beat, measure, event.currentTarget);
  };
  return <div ref={element} className="rawln-measure-grid" style={{height}}>
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
          return <div key={marker.beat} className="rawln-modulation"
            data-beat={marker.beat} data-tonic={marker.tonic} data-join={marker.join ? marker.name : undefined}
            data-onset-override={marker.onsetOverride || undefined} data-origin-beat={marker.originBeat}
            data-continued={marker.continued || undefined} style={{left: marker.left}} title={marker.name}>
            <TonicSymbol left={0} number={marker.number}
              previousTonic={marker.previousTonic} modulationDiff={interval}
              tonicStart={marker.tonic} transpose={transpose}
              alignToOnset={marker.onsetOverride && !marker.continued}
              labelClassName="rawln-modulation-label" flagClassName="rawln-modulation-flag"
              labelAttributes={{style: {left: marker.labelOffset}}}
              flagAttributes={{'data-degree': interval ?? undefined, style: {background: RAWL_COLORS[interval]?.background}}}
              renderArrow={arrow} />
          </div>;
        })}
      </div>
      <div className="rawln-measure-labels" aria-hidden={!onMeasureSelect || undefined}>
        {measures.filter(measure => !measure.terminal && measure.showLabel !== false).map(measure => {
          const labelLeft = offsetLeft(measure.left, measure.labelOffset ?? 6);
          return <div className="rawln-measure-position" key={measure.beat}
            style={{gridTemplateColumns: `minmax(0, ${cssLength(labelLeft)}) max-content`}}>
            <div className="rawln-measure-number" role={onMeasureSelect ? 'button' : undefined}
              tabIndex={onMeasureSelect ? 0 : undefined}
              aria-pressed={onMeasureSelect ? selectedMeasure === measure.beat : undefined}
              onClick={onMeasureSelect ? event => select(event, measure) : undefined}
              onKeyDown={onMeasureSelect ? event => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  select(event, measure);
                }
              } : undefined}
              data-beat={measure.beat} data-modulation={measure.hasModulation || undefined}
              data-score-measure={measure.number}
              style={{color: measure.color, pointerEvents: onMeasureSelect ? 'auto' : undefined,
                cursor: onMeasureSelect ? 'pointer' : undefined}}>
              {renderMeasureExtras?.(measure)}
              <span>{measure.number}</span>
            </div>
          </div>;
        })}
      </div>
    </>}
  </div>;
}
