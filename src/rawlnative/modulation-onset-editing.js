import {useEffect, useState} from 'react';

export function isModulationOnsetAllowed(start, range) {
  return range != null && Number.isFinite(start) && start >= range[0] && start < range[1];
}

/** Coordinates the Shift gesture for hosts with their own timing and storage. */
export function useModulationOnsetEditing({getRange, noteStart, onChoose}) {
  const [shiftHeld, setShiftHeld] = useState(false);
  useEffect(() => {
    const update = event => setShiftHeld(event.shiftKey);
    const clear = () => setShiftHeld(false);
    window.addEventListener('keydown', update);
    window.addEventListener('keyup', update);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', update);
      window.removeEventListener('keyup', update);
      window.removeEventListener('blur', clear);
    };
  }, []);

  const isAllowed = note => isModulationOnsetAllowed(noteStart(note), getRange());
  return {
    active: shiftHeld && getRange() != null,
    isAllowed,
    chooseNote(note, event) {
      const range = getRange();
      if (!(event?.shiftKey ?? shiftHeld) || range == null) return false;
      if (isModulationOnsetAllowed(noteStart(note), range)) onChoose(note);
      return true;
    },
    onClickCapture(event) {
      if (!event.shiftKey || getRange() == null ||
          event.target.closest?.('[data-modulation-onset-note="true"]')) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
