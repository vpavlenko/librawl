# Source notices

The transpose control adapts Rawl's `src/components/TransposeControl.tsx` at commit 1c62a261b201bc4ee17b1fb68c4a6f43ee6d9e49. Its close icon comes from Lucide under the terms below.

The tonic-symbol implementation was extracted from vpavlenko/rawl, commit c5c9bb0407534d9b7eb9a8267078c006fa340ee6, `src/components/rawl/AnalysisGrid.tsx`. The exact source fixture and hashes are retained under `tests/fixtures`. GPLv3 terms are retained in LICENSE.

The beat-based notation component, geometry and palette were extracted from the Lego Insights Roadmaps implementation at commit21eaa3601d9f974e3a046906a535c82fb753608f, itself based on Rawl and Caplin. Its limited view model is documented separately from Rawl's complete seconds-based renderer.

Roman numerals and tonicization arrow geometry come from Caplin's `packages/music/harmonic-notation.js` (commit `444e2f4`). The annotation layer adapts the ordered interval packing and alternate arrow bows from Caplin's score annotation renderer.

The SoundFont scheduler comes from Caplin's shared `packages/music/soundfont-playback.js`, with Lego's optional sax-bank and audition-program additions generalized as explicit configuration. The pinned original source, protected-region hashes and asset identities are retained in `docs/audio-provenance.json` and `tests/fixtures/soundfont-caplin-reference.js`.

The sampled qanun SoundFont is the exact calibrated bank from [Rawl’s qanun release](https://github.com/vpavlenko/rawl/tree/e7c976709/public/audio/qanun). Its 18 isolated plucks come from Barış Bozkurt’s [kanun recording](https://freesound.org/people/barisbozkurt/sounds/211133/) under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), sliced by the [joetessy/qanun project](https://github.com/joetessy/qanun/tree/781775a018735ba9e7f83f9d84d8ef326bcbc5f2/public/samples/qanun). The unchanged bank retains the original INFO metadata and bank-128 legacy GM percussion from Rawl’s `2MBGMGS.SF2`. The qanun sample license applies to the qanun recordings.

Host integrations retain the relevant notices and licenses for their other assets.

## Lucide icons

ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The MIT License (MIT) (for portions derived from Feather)

Copyright (c) 2013-2023 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
