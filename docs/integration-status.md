# Consumer status

The shared public source is https://github.com/vpavlenko/librawl. Rawl and Caplin pin the frozen `librawl-0.3.0.tgz`, SHA256 `0678d2340f1d4ecd4fb597156227e6f3a60ec5d141019dc9b39588ea44b78b65`, from commit `3999bc3c0e920b15cc4a7faf5366dcfc5e9ceced` and tag `v0.3.0`. Version 0.3 has 53 passing tests. Insights additionally pins backward-compatible 0.3.1 (54 passing tests), SHA256 `9f49fbb081b249a0efcec0feb8ea466b81af52c21a0cc6d9d0ef2b8da7b2c741`, from tag `v0.3.1` / commit `f474105cb1bc8d291b8b10100e9d317bc2750761`; the optional per-measure beat grouping preserves mixed authored meters without changing existing defaults. Version 0.2 remains available as a separate immutable rollback artifact.

| Consumer | Source integration | Published state |
| --- | --- | --- |
| Rawl | React/DOM 19.3.1; native note renderer/contexts, tonic symbol, palette, voice shapes, threaded UI transport and PCM clock; shared tempo keyboard binding | Rawl master `1f79832aaaaa9ac65b8b6f2c78367f834ce4d830`; deployed through `npm run deploy-lite`, gh-pages `cd2b73a01d9d0e5e00d89b64d13f5ce093ee69b9` |
| Caplin | One native React note root per final display row; shared SoundFont scheduler and tempo binding; recordings and authored notation stay host-owned | Public Site 207, source `8894371970c5d9b1450f9df4f9ed5b99e5353622`; canonical checkout `91b56d97c5fb0e8a0fec07eaf435e0bfa8cb34da` / reader `eeaa2b0b6c5b11e1b20ffe8983b166130124e7b6`; all 20,964 unrelated files preserved |
| Insights Roadmaps | Shared native React note rendering, SoundFont/sax playback, measure headers, automatic per-score recoloring and tempo binding; explicit pickup measure maps | Public Site 15, source `78ab10471e780142b48017de6b57aafe9ac426ec`; 486 arrangements, 237/269 compositions with melodies; grouped/colored catalogue, RN definitions and four source-faithful aligned comparisons |

The audio output worklet is unchanged from the original Rawl source (SHA256 `c0d987933f339e99de72ad77b79f75fffb7dd82b6800cb2558387d6df88a6e13`). A shared library update never replaces the host sequencer, synthesis worker, book content, source melodies, saved annotations, recording alignment, drafts or corpus state.

Rawl's TypeScript check, 49 focused tests and four playback/protocol gates pass. Caplin's 110 checks and 500-dataset/985-row/66,798-rectangle corpus audit pass. The Caplin archive preserves its existing 404 recording references and bundles no MP3s. Both public releases were read back anonymously and matched the expected runtime assets.

Chrome validated the preceding renderer/React migration, with a user-confirmed Caplin playback start. Current keyboard binding and scheduling changes have automated interaction coverage; current computer-control rendering was unavailable for a fresh browser comparison, so those two verification scopes are distinct.

The original Caplin canonical GitHub push is blocked by pre-existing oversized archives in unpushed ancestor commits. No unrelated history is rewritten to resolve that. The public library and Site source repositories are independent and published successfully.

The final Insights combined release passes 215 tests with zero failures or skips. Its original 403 performance JSON and 403 MIDI files are byte-identical to source commit `743a1791c8092e809ad2f92725de4b6d73ece0b7`. Source navigation and unresolved source tonic cases remain documented among the 32 compositions without a verified melody. Insights in Jazz.pdf is excluded from the deployment.
