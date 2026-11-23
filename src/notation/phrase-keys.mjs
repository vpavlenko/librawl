export const PHRASE_SHIFT_KEYS = Object.freeze({
  z: -4, x: -3, c: -2, v: -1, b: 1, n: 2, m: 3, ',': 4,
});

export function handlePhraseShiftKey(event, onShift) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
      (event.nativeEvent ?? event).isComposing) return false;
  const offset = PHRASE_SHIFT_KEYS[event.key];
  if (!Number.isInteger(offset)) return false;
  event.preventDefault();
  event.stopPropagation();
  onShift(offset);
  return true;
}
