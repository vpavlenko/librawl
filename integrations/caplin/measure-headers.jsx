import React, {useLayoutEffect} from 'react';
import {createPortal, flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {RawlMeasureHeader} from '../../src/notation/RawlMeasureHeader.jsx';
import {useTonicRecoloring} from '../../src/notation/recolor.jsx';

const emptyChanges = [];

function MeasureHeaders({rows, tonic, changes, measureMap, beatBeats, barBeats, phraseStarts, publish}) {
  const editor = useTonicRecoloring({changes, barBeats, measureMap});
  useLayoutEffect(() => publish(editor));
  return rows.map(({score, row, axis}) => createPortal(
    <div className="rawln" style={{position: 'absolute', inset: `${axis.guideTop}px 0 0`, pointerEvents: 'none'}}>
      <RawlMeasureHeader row={row} height={axis.notesBottom - axis.guideTop}
        tonic={tonic} changes={editor.changes} measureMap={measureMap} beatBeats={beatBeats}
        barBeats={barBeats} phraseStarts={phraseStarts} selectedMeasure={editor.selectedMeasure}
        onMeasureSelect={editor.selectMeasure} />
    </div>, score, String(row.start),
  ));
}

/** Mount the shared React ruler and tonic editor inside an existing score surface. */
export function mountMeasureHeaders(panel, {changes = emptyChanges, onTonicChange, ...options}) {
  const element = panel.ownerDocument.createElement('div');
  element.style.display = 'contents';
  panel.append(element);
  const root = createRoot(element);
  let state;
  let painted = changes;
  let destroyed = false;
  function publish(next) {
    state = next;
    if (next.changes === painted) return;
    // Existing hosts may repaint a separate React note root synchronously.
    // Drain the latest state once the header commit has finished.
    queueMicrotask(() => {
      if (destroyed || state.changes === painted) return;
      painted = state.changes;
      onTonicChange?.(painted);
    });
  }
  flushSync(() => root.render(<MeasureHeaders {...options} changes={changes} publish={publish} />));
  return {
    get selectedMeasure() { return state.selectedMeasure; },
    hoverNote(note) { if (!destroyed) flushSync(() => state.hoverNote(note)); },
    chooseNote(note) { return !destroyed && flushSync(() => state.chooseNote(note)); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.unmount();
      element.remove();
    },
  };
}
