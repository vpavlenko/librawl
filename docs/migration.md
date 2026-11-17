# Migration and regression gates

The ordering is deliberate: protect rawl.rocks behavior, then remove duplicate implementations. Runtime changes are validated in isolated checkouts before being considered for production.

| Area | Current extraction | Remaining work |
| --- | --- | --- |
| Rawl React runtime | React19.3.1 integration is being validated separately from production | Complete compiler, browser, console, playback and persistence gates before release |
| Tonic flags | Original Rawl component is canonical here; Rawl keeps its context-reading wrapper | Integrate the same primitive into Caplin's annotation/label adapter after DOM parity tests |
| Lego renderer | Beat adapter uses the shared native note renderer and section clock | Complete the consumer artifact and browser gates before publishing this migration |
| Caplin audio | Same prepared-plan scheduler, optional banks and unchanged default profile | Keep source realization, ornaments, recording alignment and drafts in the host |
| Rawl audio | Original threaded UI transport and byte-identical output worklet extracted; injected workers, assets and browser boundary; source/protocol/clock parity checks pass | Validate the host wrapper in Chrome; sequencer and synthesis worker remain host-owned |
| Complete note visuals | Native source and contexts extracted; 102 cases match the original under React16 and React19; Rawl bridges and Caplin final-row React adapter implemented in isolated checkouts | Finish real-browser consumer validation; preserve host source/time identity |
| Measure editing | Still host orchestration | Extract visual primitives with editing slots; preserve phrase patches, pickups, expressive measures and saved annotations |

Lego now adapts its smaller model to the complete Rawl renderer. Rawl uses seconds-based spans, separate display spans/pitches, pitch bends, quartertones, drum pulses, strumming, grouped instruments, annotation editing and a consumed-PCM playback clock. Caplin adds authored ornaments, dynamics, exact notated measure labels, recording alignment and saved composition drafts. Each must retain its existing identity and timing during extraction.

Required gates for each move:

1. Compare output against the current production implementation using fixed source fixtures.
2. Preserve note/controller/source data and saved-state identifiers.
3. Test pause, seek, tempo changes, cancellation, held notes, natural end and visual output-clock alignment.
4. Check real rendered geometry and interactions in Chrome; inspect compile/runtime console errors.
5. Pin the library artifact/commit; production must have a straightforward rollback.
6. Remove the corresponding host implementation only after the host imports the shared module and those gates pass.

The legacy Caplin sync script refuses stale manifests or divergent canonical/mirror bytes before writing. It generates distributions from this source; mirrors are not separate editable implementations.

Caplin's React migration is a guarded, idempotent source patch plus a generated browser artifact; its 364-example corpus check covers 712 rows and 43,492 displayed note rectangles without mutating source or realized notes. See [the integration boundary](../integrations/caplin/react-README.md). Both original dirty host checkouts and public production releases stay unchanged until their review and browser gates pass.
