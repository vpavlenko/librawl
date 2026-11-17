# Consumer status

The shared public source is https://github.com/vpavlenko/librawl. Consumers pin the same frozen `librawl-0.3.0.tgz`, SHA256 `0678d2340f1d4ecd4fb597156227e6f3a60ec5d141019dc9b39588ea44b78b65`, from commit `3999bc3c0e920b15cc4a7faf5366dcfc5e9ceced` and tag `v0.3.0`. The package has 53 passing tests. Version 0.2 remains available as a separate immutable rollback artifact.

| Consumer | Source integration | Published state |
| --- | --- | --- |
| Rawl | React/DOM 19.3.1; native note renderer/contexts, tonic symbol, palette, voice shapes, threaded UI transport and PCM clock; shared tempo keyboard binding | Rawl master `1f79832aaaaa9ac65b8b6f2c78367f834ce4d830`; deployed through `npm run deploy-lite`, gh-pages `cd2b73a01d9d0e5e00d89b64d13f5ce093ee69b9` |
| Caplin | One native React note root per final display row; shared SoundFont scheduler and tempo binding; recordings and authored notation stay host-owned | Public Site 207, source `8894371970c5d9b1450f9df4f9ed5b99e5353622`; original canonical checkout is updated separately while preserving unrelated dirty work |
| Insights Roadmaps | Shared native React note rendering, SoundFont/sax playback, measure headers, automatic per-score recoloring and tempo binding; explicit pickup measure maps | Version 14 remains the previously published reader; expanded melodies and catalogue UI are undergoing final combined integration |

The audio output worklet is unchanged from the original Rawl source (SHA256 `c0d987933f339e99de72ad77b79f75fffb7dd82b6800cb2558387d6df88a6e13`). A shared library update never replaces the host sequencer, synthesis worker, book content, source melodies, saved annotations, recording alignment, drafts or corpus state.

Rawl's TypeScript check, 49 focused tests and four playback/protocol gates pass. Caplin's 110 checks and 500-dataset/985-row/66,798-rectangle corpus audit pass. The Caplin archive preserves its existing 404 recording references and bundles no MP3s. Both public releases were read back anonymously and matched the expected runtime assets.

Chrome validated the preceding renderer/React migration, with a user-confirmed Caplin playback start. Current keyboard binding and scheduling changes have automated interaction coverage; current computer-control rendering was unavailable for a fresh browser comparison, so those two verification scopes are distinct.

The original Caplin canonical GitHub push is blocked by pre-existing oversized archives in unpushed ancestor commits. No unrelated history is rewritten to resolve that. The public library and Site source repositories are independent and published successfully.
