# Consumer status

The public shared source is https://github.com/vpavlenko/librawl. Rendering, the Rawl palette, note shapes, doubled active-note heights, measure controls, Shift-hover audition, and shared tempo bindings are implemented in the library. Lego and Caplin also use its SoundFont scheduler; Rawl retains its native PCM/WASM transport through the library's native adapter.

## Consumers to check before changing librawl

| Checkout | Playback and regression surface |
| --- | --- |
| `~/repos/rawl` | Native worker transport, app Space play/pause, editor Shift+Space, rendered notes and consumed PCM clock. |
| `~/repos/caplin` | Caplin, Temperley and Mortensen readers. Check the reader shortcuts, MIDI and original-recording ownership, focused controls, reading position, and score playback. Mortensen uses the standalone playback-key binding. |
| `~/repos/12` | React notation and playback footer from the notation build. Its solo recordings use the browser audio element. Check transport controls, seek and audio-driven highlights. |
| `~/repos/lego` | Insights Roadmaps and other notation and playback integrations. Check the SoundFont transport, browser audio controls, and score highlighting. |

Review each checkout against its pinned library build during shared changes. Adopt updated builds per consumer once its affected behavior has been verified. Keep this list current when adding a consumer.

## Published integrations

| Consumer | Current integration | Published state |
| --- | --- | --- |
| Rawl | React/DOM 19.3.1; librawl 0.3.4 native renderer and transport adapter; shared Shift-hover and tempo gesture | Master `c87e915b073d9953f6d9eefa7f376e5d2bd0b8a2`; `npm run deploy-lite`; gh-pages `6c0d8fe47f5568da618a42e4be2949791eea7e75` |
| Caplin | librawl 0.3.4 native React rows and SoundFont scheduling; continuous tempo changes preserve sounding notes | Public Site 208, source `1ca85621877f94f15c7c824087f85ecd8029e3ee` |
| Insights Roadmaps | librawl 0.3.5 renderer, standalone measure header and shared audio; source melodies can be aligned to PDF harmony independently of reharmonization | Public Site 22, source `e7df7903defd045fc632f888c1de4bd1e656ecdf`; 507 arrangements, 258/269 compositions with melodies, 151 additional PDF melody overlays |

The frozen 0.3.4 tarball has SHA256 `43b61397c67d338612896021c1c89305dbda476d17d7aba031a906f414f423c1`. Version 0.3.5 is tagged at `39275211820230239fead8df2f3defb9bc3e2d0e`; the frozen Lego tarball has SHA256 `6ef2b829adb8361defb9dd3d1c3e07a25d759774c63571a0b51099d70ff9a108`. Its native renderer and audio profiles are unchanged from 0.3.4. The added standalone-header fix carries the active tonic across a row boundary without repeating the modulation arrow or interval. Rawl and Caplin therefore retain their verified 0.3.4 pins.

Version 0.3.5 passes 78 library checks. Rawl passes TypeScript, 58 focused checks and four MIDI/playback gates. Caplin passes 110 checks and its 500-dataset, 985-row, 66,798-rectangle audit. Continuous SoundFont tempo changes were checked against real controller/scheduler paths with zero held-note retriggers. The output worklet remains byte-identical to the original Rawl implementation, SHA256 `c0d987933f339e99de72ad77b79f75fffb7dd82b6800cb2558387d6df88a6e13`.

Insights passes 283 checks, including actual DOM rendering, mapped audio-onset/highlight agreement, pickup alignment, and piano/sax MIDI round trips. Its existing 507 performance JSON and MIDI pairs remain unchanged. New overlays preserve PDF changes and brick annotations; 59 retain all 114 pickup notes through a derived pre-roll clock. Source melodies and original source arrangements stay separate. Reharmonization is not a melody-attachment gate. Automatic imported brick parsing and its inferred key changes are hidden from all website views and catalogues.

The full dotted-duration audit verified all 266 active heads and found 716 expanded written dotted-eighth occurrences, but no written dotted-sixteenth glyphs. Eighty-two alternate-encoding interpretations remain unapproved; the separate source-pinned Satin Doll review is applied only to its reviewed cells. Default melody swing is exactly 67%, with source-bound straight exceptions. Interpretation changes affect derived playback/display, not archived source MIDI.

Browser scope is distinct from automated DOM/audio checks: Rawl's preceding migration was rendered in Chrome, and the user confirmed Caplin playback. The latest native Chrome preview refresh was inconclusive; release verification additionally compares public runtime assets, mapped melody files and MIDI downloads against local outputs. No physical-device or every-recording audition is implied.

The original Caplin checkout and all 20,965 unrelated files remain preserved. Its canonical GitHub push is still blocked by pre-existing oversized files in ancestor history; no unrelated history was rewritten. Rawl's original unrelated whitepaper files remain excluded from deployment. `Insights in Jazz.pdf` is excluded from the reader archive; only the supplied consolidated roadmaps PDF is published.
