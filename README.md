# librawl

Shared React notation and playback modules for [Rawl](https://github.com/vpavlenko/rawl), [Lego](https://github.com/vpavlenko/lego) and Caplin.

The library owns the Rawl note renderer, tonic flags, palette, playback highlight clocks, configurable SoundFont playback and the shared qanun bank. Hosts retain their data, navigation, analysis editing and other synthesis assets.

## Modules

| Export | Current responsibility |
| --- | --- |
| `librawl` | Controlled `RawlNotation` and `RawlMeasureHeader`; the beat adapter delegates notes to the native renderer; notes, tonic regions, four-bar/custom phrase boundaries, recoloring callbacks, melody layering, note-height playback highlighting, host header/footer slots |
| `librawl/components` | `TonicSymbol`, extracted from Rawl's actual `AnalysisGrid.NewTonicSymbol`; original styles, classes and Unicode arrows by default, optional host arrow/attribute slots |
| `librawl/native` | Actual Rawl `getNoteRectangles`, `NoteLayer`, shared contexts, section-scoped playback indexes, bends, quartertones, drums, strums, voice stacking and source attributes |
| `librawl/native.css` | Original Rawl pitch variables, dots and voice shapes; opt in where the host does not own recoloring CSS |
| `librawl/geometry` | Beat-based Lego/Caplin geometry helpers; no changes to audio times |
| `librawl/harmony-annotations` | Standalone Roman numerals and beat-aligned score annotation lanes with tonicization arrows |
| `librawl/palette` | Exact twelve-color Rawl palette and distinguishing dots |
| `librawl/native-audio` | Rawl threaded transport and consumed-PCM clock; injected worker and browser constructors |
| `librawl/midi-output-worklet.js` | Byte-identical original output processor; copy to the host asset base |
| `librawl/audio` | Configurable SoundFont factory and host transport with an injected plan factory |
| `librawl/style.css` | Notation styles only |
| `librawl/harmony.css` | Optional host chord/RN overlay styles |

Package modules require React and React DOM 19. The standalone Caplin browser adapter bundles React 19 because its host has no React runtime. The native renderer is compared against the original Rawl in 102 cases under React 19. Built ESM/CommonJS and legacy Webpack subpath entries are committed so consumers do not need a JSX or TypeScript compiler for this package.

## Styles

Load the stylesheets for the components you render. Import each sheet once at the application entry point. For a static reader, link the CSS files from the same pinned librawl package as the JavaScript, then load your host layout styles.

| What you render | Stylesheets to import |
| --- | --- |
| `RawlNotation` from `librawl` | `librawl/style.css` and `librawl/native.css` |
| `RawlMeasureHeader`, `TonalGrid` or `TonicSymbol` on its own | `librawl/style.css` |
| `MaqamScaleDiagram` from `librawl/components` | `librawl/style.css` and `librawl/native.css` |
| `NoteLayer` or `getNoteRectangles` inside a host-owned score | `librawl/native.css` and the host's score layout styles |
| Roman numerals, guitar chord symbols or Roman-numeral tooltips | `librawl/roman-numerals.css` |
| Beat-aligned harmony annotations | `librawl/roman-numerals.css` and `librawl/harmony-annotations.css` |
| Playback footer, piano legend or score-size sliders | `librawl/playback-footer.css`, `librawl/piano-legend.css` or `librawl/score-size-sliders.css` for the corresponding widget |

`style.css` lays out notation and measure headers. `native.css` supplies the pitch colors, distinguishing dots and voice shapes for the note rectangles. For the full React score, import both as shown under [React notation](#react-notation).

### Static readers

Copy `dist/native.css` and `dist/browser/caplin-notes.js` from the same package archive into your static assets directory. This example uses the adapter in a host-owned score layout.

```html
<link rel="stylesheet" href="./vendor/librawl/native.css">
<link rel="stylesheet" href="./reader.css">
<script defer src="./vendor/librawl/caplin-notes.js"></script>
```

If the reader also loads the browser harmony-annotation adapter, add links to `dist/roman-numerals.css` and `dist/harmony-annotations.css` from that archive. A reader that wants the combined stylesheet can link `dist/legacy-style.css` once for notation, native notes, host chord overlays, Roman numerals and harmony annotations. Widget CSS is separate.

If the notes appear but ♭2 and ♯4 lack their dots, check that `native.css` loaded and inspect the computed `::after` on a note with `pitchDot_1` or `pitchDot_6`. The standard dots are white on ♭2 and black on ♯4.

### Hosts that update pitch colors

React consumers pass the current tonic-relative pitch through the native note model. A host that updates its own semitone note elements can set `data-pitch-class` to a tonic-relative integer from 0 to 11. Update that attribute during a preview to change both the note color and its dot. The stylesheet uses the native note classes for elements without the attribute.

For maqam reference diagrams, `maqamTonicOffset(name)` from `librawl/native` returns the offset from the first degree to the diagram's tonic. Use the same reference for pitch colors and tonal guides. The Sikah family uses its third degree, 3.5 semitones above its first.

`MaqamScaleDiagram` draws a static reference using the native note and tonal grid components. Pass lower and scale pitches in semitones from the first degree. Jins brackets and named extensions use inclusive indices into the scale array.

When a host injects the same palette rules through CSS-in-JS, use `nativeColorStyles()` from `librawl/native` and import `librawl/voice-shapes.css` once, as Rawl does. For the standard CSS cascade, give a colored element its fallback background only when no pitch color applies.

## Roman numerals and score annotations

Use `RomanNumeral` from `librawl/components` in React, or `romanNumeralHTML` from `librawl/roman-numerals` in static markup. Both use `librawl/roman-numerals.css`.
Use `ROMAN_NUMERAL_DEGREES` from `librawl/roman-numerals` to spell roots by semitone offset from the tonic. Roman numeral roots use this table in uppercase or lowercase, with either ASCII or Unicode accidentals.

On a light surface, set `theme: 'light'` to outline the tonic glyphs I and i. For prose assembled with `romanNumeralContent`, set `data-roman-theme="light"` on the paper container and `data-roman-notation` on each chord wrapper.

Mount score annotations against the rendered score element. Pass that row's absolute beat range, then remove the lanes with the returned cleanup function when replacing the row. Lanes default to below the score. Use `position: 'above'` for an upper lane and `options.theme: 'light'` for paper. Set `endInclusive` only when a label at the last edge belongs to that row. Arrows join explicit annotation IDs on the same row and side.

```js
import {mountHarmonyAnnotations} from 'librawl/harmony-annotations';
import 'librawl/roman-numerals.css';
import 'librawl/harmony-annotations.css';

const removeAnnotations = mountHarmonyAnnotations(score, {
  start: 0,
  end: 8,
  annotations: [
    {id: 'applied', beat: 0, notation: 'V⁷/V', options: {hideAppliedTarget: true}},
    {id: 'dominant', beat: 4, notation: 'V'},
  ],
  arrows: [{from: 'applied', to: 'dominant'}],
});
```

Use `guitarChordHTML("Dm7", {tonic: 0})` from `librawl/roman-numerals` for letter-name chords. The tonic pitch class sets the reference for the symbol colors. This uses the same stylesheet.

Static readers can load `librawl/browser/harmony-annotations.js` for `LibrawlHarmony`. Load it before the reader's script and use the styles from the same archive. The bundle exposes the same chord formatters, score annotation renderer and tooltip helpers used by the React components. Readers can supply source-resolved pitches to `romanNumeralDiagramColumns` and use `romanNumeralTooltipModel` for a tooltip inferred from the written symbol.

## React notation

```jsx
import {RawlNotation} from 'librawl';
import 'librawl/style.css';
import 'librawl/native.css';

<RawlNotation
  notes={notes}
  beats={128}
  rows={[{start:0,end:32},{start:32,end:64}]}
  barBeats={4}
  phraseStarts={[0,16,32,48,64,80,96,112,128]}
  changes={[{beat:0,tonic:0},{beat:32,tonic:5}]}
  position={audibleBeat}
  onNote={audition}
/>
```

`notes` use MIDI pitches and absolute quarter-note beats. `position` is the audible position, or `null` before the scheduled attack. A closing phrase boundary draws its line without adding an extra measure number. Hosts own navigation, saved annotations, corpus data, chord realization, controls and audio state.

```js
import {createSoundFontPlayback} from 'librawl/audio';
const audio=createSoundFontPlayback({assetBase:new URL('./',location.href).href});
const engine=await audio.prepare(context);
```

The default profile retains Caplin's host-provided bank and URLs. Additional banks and selectable audition programs are opt-in. Lego uses the generated sax profile. No audio context is created merely by importing this library.

The calibrated qanun bank used by Rawl is available from `librawl/soundfonts/qanun.sf2`. `librawl/soundfonts/qanun.json` exports its versioned filename, byte length and SHA-256. A host can resolve the binary at build time and copy it into its static assets under that filename. The bank retains the source program numbers and maps all melodic programs to the same qanun samples. See the [source notices](NOTICE.md) for sample credit.

`createTransport` binds bare Space to pause the active transport in a browser. Focused controls and text editing keep their keyboard behavior. A fresh Space press when playback is idle uses the browser default. A host with its own shortcut can pass `keyboardTarget: false`. Call `destroy()` when removing a transport.

Custom players can call `bindPlaybackKeys({pause})` from `librawl/audio` or `LibrawlPlaybackKeys.bindPlaybackKeys` from the standalone browser build. Call `setActive(true)` when starting playback and `setActive(false)` on pause, stop, end or error. A reader can pass `preventScrollWhenIdle: true` to keep its reading position on Space. Call `destroy()` when removing the binding. See the [consumer inventory](docs/integration-status.md#consumers-to-check-before-changing-librawl) before changing shared behavior.

During playback, `engine.setRate(rate)` changes speed without replaying sounding notes, reconnecting mixers, resetting controllers or clearing the room. The rate is an absolute multiplier relative to the original plan passed to `play`, rather than the preceding rate. A plan created at80 BPM needs `setRate(120/80)` to reach120 BPM. Each new `play` starts at rate1; `createTransport.setTempo` performs this conversion automatically, including after pause/resume. A tempo change during preparation keeps loading and uses the latest tempo when constructing the plan.

The same clock object continues reporting the audible beat. `clock.endTime()` returns the revised AudioContext end time; `clock.remaining()` returns seconds from current audible presentation time to that end, including startup/output latency. Hosts with a completion timer must rearm it after changing rate. SpessaSynth cannot cancel already queued MIDI messages through its public API: those messages keep their timing, and the new rate starts at their committed fence, at most one140ms scheduling horizon ahead during playback. Unsent note-offs and attacks use the revised clock. Rapid changes at the same fence coalesce. Stop, pause and seek retain their existing cleanup/reconstruction behavior; the native Rawl worker transport remains unchanged.

This scheduler consumes prepared note/program/CC plans. It does not claim arbitrary SMF, pitch-bend, aftertouch, multi-port or Rawl WASM backend equivalence. Rawl's threaded transport and consumed-sample clock are available through `librawl/native-audio`; the host retains its existing sequencer, worker and synthesis assets. See [migration status](docs/migration.md).

## Development

```sh
npm ci
npm run check
```

Tests include a pinned original-renderer oracle and pinned original Caplin engine; neither requires another checkout. Generated browser adapters preserve the current `SoundFontPlayback` API for legacy hosts.

Consumers should pin a reviewed commit or a checksummed package artifact. There is no runtime dependency on a moving CDN or branch. Compiled distribution files and compatibility mirrors are generated artifacts; edit canonical source here and regenerate them.

## License

The extracted Rawl code is GPL-3.0-only. The packaged qanun bank carries its sample credits in [NOTICE.md](NOTICE.md). The other synthesis and corpus assets retain their existing licenses and notices with each host. See the source provenance under `docs/` and `tests/fixtures/`.

## Score controls

```jsx
import {TransposeControl} from 'librawl/components';
import 'librawl/transpose-control.css';

<TransposeControl value={transpose} onChange={setTranspose} firstTonic={tonic} />
```

`TransposeControl` offers one-semitone steps and a picker from −12 to +12.
The host owns transposition and can add the saved setting with `persist` and
`onPersistChange`. Use `placement="top"` for a toolbar above the instrument,
`captureKeys={false}` to keep instrument shortcuts active while the picker is
closed, and `--rawlt-focus-color` to match the host’s focus indicator.

`ScoreSizeSliders` uses the lower-right corner by default. Connect
`useScorePinch` to the scroll container, and wrap its score in
`ScorePinchContent` with the returned ref. Touch gestures lock to one axis.
Trackpad pinch changes time spacing, and Shift+pinch changes note height.


`FoldablePianoLegend` sits beside the corner sliders, with auditions delegated
to its host. Enable Caplin's pitch-diagram popup with `RomanNumeral`'s `tooltip`
prop. Jazz hosts can provide an ordered voicing directly.

Inside a score, melodic playback doubles the height of sounding notes upward
from their resting bottom edge. The playback highlight ends with each note's
sounding span and clears during rests. Keep the score plot free of a moving
vertical playback line. Pausing keeps the notes and any current measure edges
highlighted at the paused position.

For an HTML media element, use `bindMediaPlaybackPosition` from `librawl/audio`
to read the playback position. A native `NoteLayer` can use a
`createNotePlaybackIndex` and `NotePlaybackContext` from `librawl/native`.
Advance the index with the media position in the same time coordinates as the
notes' sounding spans, and reset it when clearing the playback position.
When playback uses recording seconds, supply each visible measure's
`playbackSpans`, including repetitions where they share an overlay. Custom
layouts can use `PlaybackMeasureLayer` with their existing playback clock.

`RawlNotation` accepts a beat-based `onSeek` callback or `playbackClock.seek`.
An unconnected score still moves its note highlight when clicked. An app can
bind Space to a persistent transport with `bindPlaybackKeys({toggle})`.

## Local consumers

`npm run sync:local` builds and pins one content-addressed archive in the active
12, Rawl, and Insights Roadmaps checkouts, and refreshes the local Caplin and
Mortensen reader artifacts. Reuse `npm run watch:local` to sync after source
saves. In this checkout, `.git/librawl-sync-local` enables the same sync after
`npm run build`. Run `npm run sync:local -- --dry-run` to inspect the pins.
The sync works locally and keeps release snapshots. Restart a running Vite or
Webpack dev server after its dependency is replaced.

React hosts rendering their own score shell use `RawlMeasureHeader` and `TonalGrid` from
`librawl/components` with `librawl/style.css`. Pass authored measures and key
changes to the header, or position them against the host clock and pass a
`layout`. Use `renderMeasureExtras` for editor controls in a measure label.
`RawlNotation` supports temporary section editing by default. Select an interior
phrase start for Split (Enter), or the first measure of a later section for Merge
(Shift+Enter). The score keeps its notes, measures, and playback times. Edited rows
belong to the mounted viewer and are available through `onSectionRowsChange`
for hosts rendering their own overlays.

With a measure selected, `z`, `x`, `c`, and `v` step back four to one
measures. `b`, `n`, `m`, and comma step forward one to four. At a
phrase start these keys shift that phrase and the following phrase starts in
the displayed score group. Hosts can persist the edits with
`onPhraseStartsChange` and return the result through `phraseStarts`. Pass
`sectionEditing={false}` to disable structural editing.

Hosts that render their own rows can pass `sectionEditing` with `sectionStarts`,
`onSplit`, and `onGlue` to `RawlMeasureHeader` or `RawlNotation`. Attach the second
`renderMeasureExtras` argument to a rhythm input to support the shortcuts when the
field is empty. Its third argument identifies the available section action.

A selected measure can also display the shared rhythm field. Supply
`rhythmEditing` to receive edits for an authored measure. A positive integer
sets beats per measure, while sums such as `3+2` set beat groups. Hosts with their
own layouts can use `MeasureRhythmInput` and apply the edit to their ruler.

### Modulation onsets and pickups

When a mid-measure tonic change acts as a pickup into the following measure,
associate it with that following measure. Set `TonicChange.beat` to the sounding
onset, `measureBeat` to the following downbeat, and `onsetOverride` to `true`.
For example, `{ beat: 3.5, measureBeat: 4, tonic: 9, onsetOverride: true }`
starts the new tonic in the pickup and makes the change editable from beat 4.
If the change belongs to the sounding measure, use that measure's downbeat.

To author a pickup in the viewer, select the destination measure and hold Shift
while hovering a note to preview moving the change to its onset. Shift-click
commits the move. Eligible note onsets are in the selected measure or its
predecessor. Hosts rendering parts of the same score in separate `RawlNotation`
instances can pass a shared `useTonicRecoloring` controller as `recoloring`.

With a measure map, `modulationMarkerPlacement="following-measure"` can display
an unpinned mid-measure flag at the following barline. Explicit onset overrides
keep the flag at the sounding onset.

When measure selection is enabled, clicking a modulation flag or its interval
forwards the click to the associated measure number. In positioned headers, set
the marker's `measureBeat` or `number` when it differs from the sounding onset.

`TonalGrid` takes positioned key regions and the host pitch axis.

Plain DOM hosts load `librawl/browser/score-grid.js`. Its `TonalGrid` global
mounts horizontal guides and key labels and provides `appendMeasureGuides`
for positioned bars and beats. The React and plain DOM paths use the same
pitch guides and tonic timeline. Hosts own score source data and playback.

Modulation flags name the opening tonic by default. Pass
`showModulationTonics={true}` to `RawlNotation` or `RawlMeasureHeader` to add
the destination tonic beside the interval at each change. Plain DOM hosts can
pass `showModulationTonics: true` to `TonalGrid.mount`.
