import {useEffect, useMemo, useState} from 'react';
import {mod, recolorBoundary, sameBeat} from './geometry.mjs';
import {useModulationOnsetEditing} from '../rawlnative/modulation-onset-editing.js';

export {recolorBoundary};
const ROOTS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

function orderChanges(changes) {
  return changes.sort((a, b) => a.beat - b.beat || (a.measureBeat ?? a.beat) - (b.measureBeat ?? b.beat));
}

function recolor(changes, beat, pitch, existing) {
  if (!Number.isFinite(beat) || beat < 0 || !Number.isFinite(pitch)) return changes;
  const tonic = mod(Math.round(pitch));
  const choice = {...(existing ?? {beat}), tonic, root: ROOTS[tonic]};
  const remaining = changes.filter(change => change !== existing &&
    (existing?.measureBeat != null || change.measureBeat != null || !sameBeat(change.beat, beat)));
  const events = orderChanges([...remaining, choice]);
  return events.filter((event, index) =>
    event.measureBeat != null || index === 0 || event.tonic !== events[index - 1].tonic);
}

/** Rawl tonic selection changes analysis only, never source pitches or timing. */
export function recolorModulation(changes, beat, pitch) {
  const existing = changes.find(change => sameBeat(change.beat, beat));
  return recolor(changes, beat, pitch, existing);
}

function onsetRange(measureBeat, barBeats, measureMap) {
  if (!measureMap) return [Math.max(0, measureBeat - barBeats), measureBeat + barBeats];
  const index = measureMap.findIndex(measure => sameBeat(measure.start, measureBeat));
  if (index < 0) return null;
  const measure = measureMap[index];
  const end = measureMap[index + 1]?.start ?? measure.start + measure.duration;
  return [measureMap[Math.max(0, index - 1)].start, end];
}

function snapOnset(changes, change, measureBeat, beat) {
  const snapped = {...change, beat, measureBeat, onsetOverride: true};
  return orderChanges(changes.map(entry => entry === change ? snapped : entry));
}

const clearedSelection = {selectedMeasure: null, selectedElement: null, boundary: null, hoveredNote: null};
const initial = source => ({source, committed: source, ...clearedSelection});

/** Owns selection, hover preview and committed colors for one logical score. */
export function useTonicRecoloring({changes, barBeats = 4, measureMap, onChange}) {
  const [stored, setStored] = useState(() => initial(changes));
  const state = stored.source === changes ? stored : initial(changes);
  const {committed, selectedMeasure, selectedElement, boundary, hoveredNote} = state;
  const selectedChange = selectedMeasure === null ? undefined :
    committed.find(change => sameBeat(change.measureBeat, selectedMeasure)) ??
    committed.findLast(change => change.measureBeat == null && sameBeat(change.beat, boundary));
  const range = selectedChange ? onsetRange(selectedMeasure, barBeats, measureMap) : null;
  const cancel = () => setStored(previous => ({...previous, ...clearedSelection}));

  function commit(next) {
    setStored({...state, committed: next, ...clearedSelection});
    onChange?.(next);
  }

  const onsetEditing = useModulationOnsetEditing({
    getRange: () => range,
    noteStart: note => note.start,
    onChoose: note => commit(snapOnset(committed, selectedChange, selectedMeasure, note.start)),
  });
  const eligibleOnset = hoveredNote && onsetEditing.active && onsetEditing.isAllowed(hoveredNote);
  const preview = useMemo(() => {
    if (boundary === null || !hoveredNote) return committed;
    if (onsetEditing.active) {
      return eligibleOnset ? snapOnset(committed, selectedChange, selectedMeasure, hoveredNote.start) : committed;
    }
    return recolor(committed, boundary, hoveredNote.pitch, selectedChange);
  }, [committed, boundary, hoveredNote, onsetEditing.active, eligibleOnset, selectedChange, selectedMeasure]);

  useEffect(() => {
    if (selectedMeasure === null) return;
    const ownerDocument = selectedElement?.ownerDocument ?? document;
    const escape = event => {
      if (event.key !== 'Escape') return;
      cancel();
      if (selectedElement && ownerDocument.activeElement === selectedElement) selectedElement.blur();
    };
    ownerDocument.addEventListener('keydown', escape);
    return () => ownerDocument.removeEventListener('keydown', escape);
  }, [selectedMeasure, selectedElement]);

  return {
    changes: preview, selectedMeasure, onsetEditing,
    selectMeasure(beat, measure, element) {
      setStored(previous => {
        const current = previous.source === changes ? previous : initial(changes);
        if (current.selectedMeasure === beat) return {...current, ...clearedSelection};
        const boundary = measure?.recolorBeat ?? measure?.modulationBeat ??
          recolorBoundary(current.committed, beat, barBeats, measureMap);
        return {...current, selectedMeasure: beat, selectedElement: element ?? null, boundary, hoveredNote: null};
      });
    },
    hoverNote(note) {
      if (boundary === null) return;
      setStored(previous => ({...previous, hoveredNote: note}));
    },
    chooseNote(note, event) {
      if (boundary === null) return false;
      if (!onsetEditing.chooseNote(note, event)) commit(recolor(committed, boundary, note.pitch, selectedChange));
      return true;
    },
    cancel,
  };
}
