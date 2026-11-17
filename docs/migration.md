# Migration and regression gates

The ordering is deliberate: protect rawl.rocks behavior, then remove duplicate implementations. Runtime changes are validated in isolated checkouts before being considered for production.

| Area | Shared implementation | Host boundary |
| --- | --- | --- |
| Rawl React runtime | React/DOM 19.3.1 integrated and published | Existing app state, corpus, annotations and synthesis workers remain in Rawl |
| Tonic flags | Original Rawl primitive plus optional host slots | Rawl keeps its context-reading wrapper; source identity and tonic-edit persistence stay host-owned |
| Note visuals | Native renderer, bends, quartertones, drums, strums, voice stacking and section clock | Lego adapts quarter beats; Caplin mounts final display rows without moving React nodes |
| SoundFont playback | Original prepared-plan scheduler with optional sax profile | Musical realization, ornaments, recording alignment and drafts stay host-owned |
| Rawl audio | Original threaded UI transport and consumed-PCM clock; byte-identical output worklet | Sequencer, workers, WASM and assets remain host-owned |
| Measure recoloring | Automatic per-score selection, hover preview, commit and Escape; exported hook/helpers for controlled hosts | Hosts may persist edits or retain existing analysis orchestration |
| Measure geometry | Rawl headers/flags/phrase grid, with optional exact source measure maps | Pickup maps preserve authored times and source labels |
| Tempo shortcuts | One exported keyboard binding for coarse and fine Rawl speed deltas | Hosts connect their existing BPM/rate controls and bounds |


Lego now adapts its smaller model to the complete Rawl renderer. Rawl uses seconds-based spans, separate display spans/pitches, pitch bends, quartertones, drum pulses, strumming, grouped instruments, annotation editing and a consumed-PCM playback clock. Caplin adds authored ornaments, dynamics, exact notated measure labels, recording alignment and saved composition drafts. Each must retain its existing identity and timing during extraction.

Required gates for each move:

1. Compare output against the current production implementation using fixed source fixtures.
2. Preserve note/controller/source data and saved-state identifiers.
3. Test pause, seek, tempo changes, cancellation, held notes, natural end and visual output-clock alignment.
4. Check real rendered geometry and interactions in Chrome; inspect compile/runtime console errors.
5. Pin the library artifact/commit; production must have a straightforward rollback.
6. Remove the corresponding host implementation only after the host imports the shared module and those gates pass.

The legacy Caplin sync script refuses stale manifests or divergent canonical/mirror bytes before writing. It generates distributions from this source; mirrors are not separate editable implementations.

Caplin's React migration is a guarded, idempotent source patch plus a generated browser artifact; its 364-example corpus check covers 712 rows and 43,492 displayed note rectangles without mutating source or realized notes. See [the integration boundary](../integrations/caplin/react-README.md). The original dirty host checkouts preserve unrelated work; see [current source and release evidence](integration-status.md) for completed gates and remaining boundaries.
