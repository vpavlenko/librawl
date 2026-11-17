# Source notices

The tonic-symbol implementation was extracted from vpavlenko/rawl, commit c5c9bb0407534d9b7eb9a8267078c006fa340ee6, `src/components/rawl/AnalysisGrid.tsx`. The exact source fixture and hashes are retained under `tests/fixtures`. GPLv3 terms are retained in LICENSE.

The beat-based notation component, geometry and palette were extracted from the Lego Insights Roadmaps implementation at commit21eaa3601d9f974e3a046906a535c82fb753608f, itself based on Rawl and Caplin. Its limited view model is documented separately from Rawl's complete seconds-based renderer.

The SoundFont scheduler comes from Caplin's shared `packages/music/soundfont-playback.js`, with Lego's optional sax-bank and audition-program additions generalized as explicit configuration. The pinned original source, protected-region hashes and asset identities are retained in `docs/audio-provenance.json` and `tests/fixtures/soundfont-caplin-reference.js`.

No book PDF, source corpus, recording, SoundFont bank, synthesizer binary or credential is included here. Host integrations retain the relevant third-party notices and source licenses.
