/** Paint from the audio clock at display cadence, including on start and resume. */
export function observePlaybackPosition(readPosition, paintPosition) {
  let frame;
  function tick() {
    paintPosition(readPosition());
    frame = requestAnimationFrame(tick);
  }
  tick();
  return () => cancelAnimationFrame(frame);
}
