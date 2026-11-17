# Caplin adapter

The built `dist/browser/soundfont-playback.js` installs the existing
`SoundFontPlayback` browser API with the default Caplin profile. It uses the
original GeneralUser bank, piano auditions, clock, scheduling and room policy.
It does not include book content, SoundFont files or synthesizer vendor files;
the existing reader supplies those unchanged assets.

The browser artifact must declare `librawl version: <version>` and
`audio source sha256: <digest>`. The digest identifies
`src/audio/soundfont-playback.js`. Rebuild the library before synchronization.
The canonical Caplin package module remains the source for its compatibility
copy; never edit the reader copy independently.

```sh
node integrations/caplin/sync.mjs \
  --canonical-repo /path/to/caplin-checkout \
  --reader-dir /path/to/caplin-reader-checkout

node integrations/caplin/sync.mjs \
  --canonical-repo /path/to/caplin-checkout \
  --reader-dir /path/to/caplin-reader-checkout --check
```

The script requires byte-identical existing canonical and mirror files and a
matching `packages/shared-modules.json` fingerprint. Initial migration accepts
only the pinned original Caplin engine hash. A later upgrade requires the
reviewed current file hash through `--expected-sha`; rerunning an identical
artifact is harmless. Only the canonical engine, its reader mirror and that
single manifest fingerprint change. Validation happens before writes, and a
write failure attempts to restore the three original files.

The default reader directory may be in the canonical checkout or a separate
Git worktree. Supply it explicitly. This script does not commit, publish or
modify deployed sites. Existing Caplin synchronization checks still apply.

The legacy initialization check substitutes the literal
`import('./vendor/spessasynth/index.js')`. The browser adapter preserves that
literal in its footer and passes the original browser global as its environment.
This retains the existing test harness without putting a test hook in the core
factory.

Run the self-contained synchronization guard tests with:

```sh
node --test integrations/caplin/sync.test.mjs
```

The isolated integration result is recorded in [verification.json](verification.json).
Six existing Caplin gates pass against the generated adapter: initialization,
transport, ordinary/overlapping audition, reverb, performance and the mfp
baseline. The separate reader worktree's missing chapter11 baseline was read
from the original repository through a narrowly scoped filesystem redirect;
no original fixture or test was changed. Four additional PCM/subset gates need
the retained SpessaSynth QA core and were not run during this synchronization.
