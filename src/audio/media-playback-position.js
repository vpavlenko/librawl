/** Keep the score at the media playhead, including while transport is paused. */
export function bindMediaPlaybackPosition(media, onPosition) {
 const view = media.ownerDocument.defaultView ?? globalThis;
 let frame = null;
 const sync = () => onPosition(media.readyState && !media.error ? media.currentTime : null);
 const cancel = () => {
  if (frame !== null) view.cancelAnimationFrame(frame);
  frame = null;
 };
 const tick = () => {
  frame = null;
  sync();
  if (!media.paused && !media.ended && !media.error) frame = view.requestAnimationFrame(tick);
 };
 const start = () => { cancel(); tick(); };
 const freeze = () => { cancel(); sync(); };
 const clear = () => { cancel(); onPosition(null); };
 const listeners = {
  play: start, pause: freeze, ended: freeze, seeking: sync, seeked: sync,
  loadedmetadata: sync, error: clear, emptied: clear,
 };
 for (const [event, listener] of Object.entries(listeners)) media.addEventListener(event, listener);
 if (media.paused) sync();
 else start();
 return () => {
  for (const [event, listener] of Object.entries(listeners)) media.removeEventListener(event, listener);
  clear();
 };
}
