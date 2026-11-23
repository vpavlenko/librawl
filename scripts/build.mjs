import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {nativeColorStyles,modulationOnsetStyles} from '../src/rawlnative/native-style.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
const hash=file=>createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const digest=hash('src/audio/soundfont-playback.js');
const banner=`/*! librawl version: ${pkg.version}; audio source sha256: ${digest}; GPL-3.0-only */`;
// Keep bundled module names relative to the package, including in builds with linked dependencies.
const modulePaths = {absWorkingDir: root, preserveSymlinks: true};
for(const [name,entry] of Object.entries({index:'src/index.jsx',components:'src/components.jsx',geometry:'src/notation/geometry.mjs','roman-numerals':'src/notation/roman-numerals.mjs','harmony-annotations':'src/notation/harmony-annotations.mjs',palette:'src/notation/palette.mjs',audio:'src/audio.js',native:'src/rawlnative/index.ts','native-audio':'src/audio/native/index.ts'}))for(const [format,extension]of [['esm','js'],['cjs','cjs']])await build({...modulePaths,entryPoints:[path.join(root,entry)],outfile:path.join(out,`${name}.${extension}`),bundle:true,format,platform:'browser',target:'es2018',jsx:'transform',external:['react','react-dom','librawl/native'],banner:{js:banner},logLevel:'error'});
for(const name of ['style.css','harmony.css','roman-numerals.css','harmony-annotations.css'])fs.copyFileSync(path.join(root,'src/notation',name),path.join(out,name));
for(const name of ['playback-footer.css','score-size-sliders.css','piano-legend.css'])fs.copyFileSync(path.join(root,'src/components',name),path.join(out,name));

fs.copyFileSync(path.join(root,'src/notation/index.d.ts'),path.join(out,'notation.d.ts'));
for(const name of ['index','components','audio','geometry','palette','native','native-audio','roman-numerals','piano-legend','harmony-annotations'])fs.copyFileSync(path.join(root,`types/${name}.d.ts`),path.join(out,`${name}.d.ts`));
fs.copyFileSync(path.join(root,'src/rawlnative/voice-shapes.css'),path.join(out,'voice-shapes.css'));
fs.writeFileSync(path.join(out,'native.css'),nativeColorStyles()+modulationOnsetStyles+fs.readFileSync(path.join(out,'voice-shapes.css'),'utf8'));
fs.writeFileSync(path.join(out,'legacy-style.css'),['style.css','native.css','harmony.css','roman-numerals.css','harmony-annotations.css'].map(name=>fs.readFileSync(path.join(out,name),'utf8')).join(''));
await build({...modulePaths,entryPoints:[path.join(root,'integrations/caplin/react-notes.jsx')],outfile:path.join(out,'browser/caplin-notes.js'),bundle:true,format:'iife',globalName:'LibrawlCaplinNotes',platform:'browser',target:'es2018',jsx:'transform',define:{'process.env.NODE_ENV':'"production"'},banner:{js:banner},logLevel:'error'});
const environment="typeof window==='undefined'?globalThis:window";
const base="(function(global){global.SoundFontPlayback=LibrawlAudio.createSoundFontPlayback({environment:global,importLibrary:()=>import('./vendor/spessasynth/index.js')";
const profiles={
 'soundfont-playback':base+"});})("+environment+");",
 'soundfont-playback-sax':base+",allowAuditionPrograms:true,clearQueuedMidi:true,additionalBanks:[{url:'assets/soundfonts/GeneralUser-GS-alto-sax.sf2',name:'alto-sax',bytes:505140,sha256:'d7079d82a5fb6c985770578a89db8db153c20cefff38ed94270bb790bf3378e6'}]});})("+environment+");"
};
fs.mkdirSync(path.join(out,'browser'),{recursive:true});
for(const name of ['spessasynth-seek-processor.js','spessasynth-seek-registration.js'])fs.copyFileSync(path.join(root,'src/audio',name),path.join(out,'browser',name));
for(const [name,globalName] of [['tempo-keys','LibrawlTempoKeys'],['playback-keys','LibrawlPlaybackKeys']])await build({...modulePaths,entryPoints:[path.join(root,`src/audio/${name}.js`)],outfile:path.join(out,`browser/${name}.js`),bundle:true,format:'iife',globalName,platform:'browser',target:'es2018',banner:{js:banner},logLevel:'error'});
await build({...modulePaths,entryPoints:[path.join(root,'src/notation/harmony-annotations.mjs')],outfile:path.join(out,'browser/harmony-annotations.js'),bundle:true,format:'iife',globalName:'LibrawlHarmony',platform:'browser',target:'es2018',banner:{js:banner},footer:{js:"if(typeof module==='object'&&module.exports)module.exports=LibrawlHarmony;"},logLevel:'error'});
await build({...modulePaths,entryPoints:[path.join(root,'src/notation/score-grid-browser.mjs')],outfile:path.join(out,'browser/score-grid.js'),bundle:true,format:'iife',globalName:'TonalGrid',platform:'browser',target:'es2018',banner:{js:banner},footer:{js:"if(typeof window!=='undefined')window.TonalGrid=TonalGrid;if(typeof module==='object'&&module.exports)module.exports=TonalGrid;"},logLevel:'error'});
fs.copyFileSync(path.join(root,'src/audio/native/midi-output-worklet.js'),path.join(out,'browser/midi-output-worklet.js'));
for(const [name,footer]of Object.entries(profiles))await build({...modulePaths,entryPoints:[path.join(root,'src/audio/soundfont-playback.js')],outfile:path.join(out,'browser',`${name}.js`),bundle:true,format:'iife',globalName:'LibrawlAudio',platform:'browser',target:'es2018',banner:{js:banner},footer:{js:footer},logLevel:'error'});
const audioSources=['src/audio/soundfont-playback.js','src/audio/continuous-playback.js','src/audio/transport.js','src/audio/playback-keys.js','src/audio/spessasynth-seek-processor.js','src/audio/spessasynth-seek-registration.js'];
fs.writeFileSync(path.join(out,'provenance.json'),JSON.stringify({version:pkg.version,audioSourceSha256:digest,audioSources:Object.fromEntries(audioSources.map(file=>[file,hash(file)])),files:Object.fromEntries(fs.readdirSync(out).filter(n=>n!=='provenance.json'&&fs.statSync(path.join(out,n)).isFile()).map(n=>[n,createHash('sha256').update(fs.readFileSync(path.join(out,n))).digest('hex')]))},null,2)+'\n');
console.log(JSON.stringify({version:pkg.version,audioSourceSha256:digest,status:'built'}));
