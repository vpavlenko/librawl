# librawl

Shared React notation and playback modules for [Rawl](https://github.com/vpavlenko/rawl), [Lego](https://github.com/vpavlenko/lego) and Caplin.

The library owns the actual Rawl note renderer, tonic flags, palette, playback highlight clocks and configurable SoundFont playback. Hosts retain their data, navigation, analysis editing and synthesis assets.

## Modules

| Export | Current responsibility |
| --- | --- |
| `librawl` | Controlled `RawlNotation` and `RawlMeasureHeader`; the beat adapter delegates notes to the native renderer; notes, tonic regions, four-bar/custom phrase boundaries, recoloring callbacks, melody layering, note-height playback highlighting, host header/footer slots |
| `librawl/components` | `TonicSymbol`, extracted from Rawl's actual `AnalysisGrid.NewTonicSymbol`; original styles, classes and Unicode arrows by default, optional host arrow/attribute slots |
| `librawl/native` | Actual Rawl `getNoteRectangles`, `NoteLayer`, shared contexts, section-scoped playback indexes, bends, quartertones, drums, strums, voice stacking and source attributes |
| `librawl/native.css` | Original Rawl pitch variables, dots and voice shapes; opt in where the host does not own recoloring CSS |
| `librawl/geometry` | Beat-based Lego/Caplin geometry helpers; no changes to audio times |
| `librawl/palette` | Exact twelve-color Rawl palette and distinguishing dots |
| `librawl/native-audio` | Rawl threaded transport and consumed-PCM clock; injected worker and browser constructors |
| `librawl/midi-output-worklet.js` | Byte-identical original output processor; copy to the host asset base |
| `librawl/audio` | Configurable SoundFont factory and host transport with an injected plan factory |
| `librawl/style.css` | Notation styles only |
| `librawl/harmony.css` | Optional host chord/RN overlay styles |

React is a peer dependency for package modules. The optional legacy Caplin browser adapter bundles React 19 because its host has no React runtime. The native renderer is compared against the original Rawl in 102 cases under both React16.14 and React19.3.1. Built ESM/CommonJS and legacy Webpack subpath entries are committed so consumers do not need a JSX or TypeScript compiler for this package.

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

Assets remain explicitly host-owned. The default profile retains Caplin's bank and URLs. Additional banks and selectable audition programs are opt-in; the generated sax profile is used by Lego. No audio context is created merely by importing this library.

This scheduler consumes prepared note/program/CC plans. It does not claim arbitrary SMF, pitch-bend, aftertouch, multi-port or Rawl WASM backend equivalence. Rawl's threaded transport and consumed-sample clock are available through `librawl/native-audio`; the host retains its existing sequencer, worker and synthesis assets. See [migration status](docs/migration.md).

## Development

```sh
npm ci --legacy-peer-deps
npm run check
```

The legacy peer flag is needed only by the React16 test aliases alongside the React19 development runtime. Tests include a pinned original-renderer oracle and pinned original Caplin engine; neither requires another checkout. Generated browser adapters preserve the current `SoundFontPlayback` API for legacy hosts.

Consumers should pin a reviewed commit or a checksummed package artifact. There is no runtime dependency on a moving CDN or branch. Compiled distribution files and compatibility mirrors are generated artifacts; edit canonical source here and regenerate them.

## License

GPL-3.0-only for extracted Rawl code. This code is not public domain. SoundFont, synthesizer and book/corpus assets are not included in the package; their existing licenses and notices remain with each host. See [NOTICE.md](NOTICE.md) and the recorded provenance under `docs/` and `tests/fixtures/`.
