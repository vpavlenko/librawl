import React, {useLayoutEffect} from 'react';
import {createPortal, flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {RawlMeasureHeader} from '../../src/notation/RawlMeasureHeader.jsx';
import {useTonicRecoloring} from '../../src/notation/recolor.jsx';

const emptyChanges = [];

function MeasureHeaders({rows, tonic, changes, measureMap, beatBeats, barBeats, phraseStarts, modulationMarkerPlacement, publish}) {
  const editor = useTonicRecoloring({changes, barBeats, measureMap});
  useLayoutEffect(() => publish(editor));
  return rows.map(({score, row, axis}) => createPortal(
    <div className="rawln" style={{position: 'absolute', inset: `${axis.guideTop}px 0 0`, pointerEvents: 'none'}}>
      <RawlMeasureHeader row={row} height={axis.notesBottom - axis.guideTop}
        tonic={tonic} changes={editor.changes} measureMap={measureMap} beatBeats={beatBeats}
        barBeats={barBeats} phraseStarts={phraseStarts} modulationMarkerPlacement={modulationMarkerPlacement} selectedMeasure={editor.selectedMeasure}
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
  const captureClick = event => state.onsetEditing.onClickCapture(event);
  function paintTargets() {
    const {active, isAllowed} = state.onsetEditing;
    panel.classList.toggle('modulation-onset-editing', active);
    for (const note of panel.querySelectorAll('[data-modulation-onset-note][data-start]')) {
      if (active && isAllowed({start: Number(note.dataset.start)})) note.dataset.modulationOnsetAllowed = 'true';
      else delete note.dataset.modulationOnsetAllowed;
    }
  }
  function publish(next) {
    const wasActive = state?.onsetEditing.active ?? false;
    const previousMeasure = state?.selectedMeasure;
    state = next;
    const active = next.onsetEditing.active;
    if (wasActive !== active || (active && previousMeasure !== next.selectedMeasure)) paintTargets();
    if (next.changes === painted) return;
    // Existing hosts may repaint a separate React note root synchronously.
    // Drain the latest state once the header commit has finished.
    queueMicrotask(() => {
      if (destroyed || state.changes === painted) return;
      painted = state.changes;
      onTonicChange?.(painted);
      if (state.onsetEditing.active) paintTargets();
    });
  }
  flushSync(() => root.render(<MeasureHeaders {...options} changes={changes} publish={publish} />));
  panel.addEventListener('click', captureClick, true);
  return {
    get selectedMeasure() { return state.selectedMeasure; },
    hoverNote(note) { if (!destroyed) flushSync(() => state.hoverNote(note)); },
    chooseNote(note, event) { return !destroyed && flushSync(() => state.chooseNote(note, event)); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      panel.removeEventListener('click', captureClick, true);
      panel.classList.remove('modulation-onset-editing');
      for (const note of panel.querySelectorAll('[data-modulation-onset-allowed]')) delete note.dataset.modulationOnsetAllowed;
      root.unmount();
      element.remove();
    },
  };
}
