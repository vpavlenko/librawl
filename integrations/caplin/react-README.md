# Caplin React note boundary

`react-notes.jsx` renders Caplin notes through the actual extracted Rawl
`getNoteRectangles` component in `src/rawlnative`. The browser build bundles the
same React 19 runtime and native contexts into `LibrawlCaplinNotes`; it does not
use the reduced Lego note model or a second copy of the Rawl component.

Caplin still owns authored beats, realized ornaments, performance plans,
recording alignment, staff assignments, pickup prefixes, row breaks, annotation
layout, note interactions, learner state, drafts and playback controls. The
adapter converts beats to absolute seconds and preserves source note identity.
Its DOM attributes remain compatible with existing Caplin queries and sounding
interval gates. A note crossing a row break has separate displayed rectangles
with the same absolute source span.

## React ownership

The reader builds its final section rows **before** mounting notes. Each row
receives one React root in a `display: contents` wrapper; no React-owned node is
moved or cloned by `PeriodSections`. Ordinary excerpts use one root. Teardown
unmounts every root and disconnects its resize observer before removing the
reader panel. The existing composition editor editing grid stays host-owned;
its reader preview goes through this shared boundary.

The host binds the existing audition handlers to the actual rendered note
nodes. Playback does not rerender React each frame. Caplin's existing sounding
classes retain the 5px resting, 10px MIDI/audition and 12px recording policies.
Resize preserves host classes, hidden state, transpose/preview attributes and
captured node references.

Do not load `native.css` into Caplin yet. Its `noteColor_* !important` rules would
override the existing measure-preview inline recoloring. The adapter uses
Caplin's existing shape CSS and the shared palette, retaining both native and
compatibility voice class names. This is an explicit retained host boundary,
not a claim that Caplin's annotation or editable-grid rendering has moved.

## Install and verify

Build librawl first, then target a reviewed, isolated reader checkout:

```sh
npm run build
node integrations/caplin/react-sync.mjs --reader-dir /path/to/isolated-reader
node integrations/caplin/react-sync.mjs --reader-dir /path/to/isolated-reader --check
node --test integrations/caplin/react-*.test.mjs
node integrations/caplin/react-corpus-check.mjs --reader-dir /path/to/isolated-reader
```

The sync command applies five scoped, reviewed replacements to `dist/reader.js`,
copies the exact generated `dist/browser/caplin-notes.js`, and inserts it directly
before `reader.js` in both the canonical `content/startup-shell.html` and current
`ReaderStartup.scripts`. The normal Caplin startup generator therefore retains
the asset on rebuild. Script-specific hashes invalidate the two changed
runtimes; approved text payloads and `textVersion` remain unchanged. Run sync
after a Caplin build to verify the exact artifact and current runtime hashes.

A fresh source must match the reviewed baseline digest. If it differs, the
command refuses to overwrite it. Review `react-reader.patch` and the source,
then supply `--expected-reader-sha` only for a deliberately reviewed baseline.
Already integrated sources must contain every complete reviewed replacement.
`--check` never changes files. The source patch has no changes to MIDI plans,
recording gates, saved state, editor drafts, annotations or product copy.

The optional corpus check reads private book data in place; no Caplin corpus is
included in this public package. It verifies every row's note population,
absolute and clipped spans, ornaments, midpoint modulation choice, axis and
stacking, and checks that source and realized notes are unchanged.

## Verification boundary

See `react-verification.json` for local automated evidence. Browser rendering,
audio listening, Safari and production deployment are separate checks; passing
the adapter tests does not establish those outcomes. The original dirty Caplin
checkout and production site were not edited by this integration.
