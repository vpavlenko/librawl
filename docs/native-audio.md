# Native Rawl audio boundary

`src/audio/native/ThreadedMIDIPlayer.ts` contains Rawl's UI-facing threaded MIDI
transport. `midi-output-worklet.js` is a byte-identical copy of Rawl's consumed-PCM
output processor. Sources are pinned to commit
`c5c9bb0407534d9b7eb9a8267078c006fa340ee6` in
`native-audio-provenance.json`; the original files and existing worklet protocol
gate are checked in as GPL test fixtures.

The class is returned by `createThreadedMIDIPlayerClass(environment)`. Its worker
requests, latest-load metadata handling, generation invalidation, playback
callbacks, consumed-audio clock, controls, failure behavior and disposal retain
their original bodies. The environment replaces only application-specific
imports and browser construction:

```ts
const ThreadedMIDIPlayer = createThreadedMIDIPlayerClass({
  EventEmitter,
  createWorker: () => new SynthWorker(),
  assetBase: () => new URL(
    `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}/`,
    window.location.href,
  ).href,
  AudioWorkletNode,
  MessageChannel,
});
```

The example is a host wrapper, not a library dependency on `process`, `window`,
Webpack or worker-loader. Supplying the existing EventEmitter also preserves
the application's current event runtime without adding a browser polyfill.
The original constructor remains `(context, debugTiming = false)`.

The host keeps the MIDI sequencer/synthesis worker, worker-loader integration,
WASM, soundfonts, sampled instruments and asset URL policy. It must copy the
shared `midi-output-worklet.js` to the supplied asset base. The processor name,
MessagePort protocol, stereo topology, four-block request bound, buffering,
generation guards, starvation handling and output clock remain unchanged.
Nothing in this extraction routes PCM through the main thread or replaces the
existing synthesis worker.

`types/native-audio.d.ts` declares the portable public boundary. Package exports
and host migration are intentionally separate integration work. This extraction
does not itself change Rawl's production imports or deploy rawl.rocks.

Run `node --test tests/native-audio.test.mjs`. The checks verify every pinned
source hash, the complete class body modulo the enumerated environment seams,
byte identity of the output worklet, mock-port parity with the original class,
load/control races, consumed-audio position interpolation and clamping, stale
generation rejection, soundfont invalidation, pending failures and cleanup.
The existing Rawl output-worklet gate runs unchanged against the library copy.
These deterministic checks do not replace Chrome playback or audio-listening
verification when a host switches its imports.
