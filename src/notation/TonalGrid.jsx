import React from 'react';
import {positionedTonalGuides} from './score-grid.mjs';

export function TonalGrid({regions, range, pitchToY, tonicHeight = 1.5}) {
  const guides = positionedTonalGuides(regions, range, pitchToY);
  return <div className="rawln-grid" aria-hidden="true">
    {guides.map(({kind, pitch, y, tonic, left, width}, i) => <div
      key={i} className={`rawln-${kind}-line`} data-pitch={pitch} data-tonic={tonic}
      style={{left, width, top: y, height: kind === 'tonic' ? tonicHeight : undefined}}
    />)}
  </div>;
}
