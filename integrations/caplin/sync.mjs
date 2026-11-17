#!/usr/bin/env node
/** Replace one reviewed canonical Caplin module and its compatibility mirror. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const libraryRoot=fileURLToPath(new URL('../../',import.meta.url));
export const originalCaplinSha256='ff8d94ca51fd09645c459f7c17ca054d675f0211c43c12c9c4a9119585ddedbf';
const sourceName='packages/music/soundfont-playback.js',mirrorName='reader/dist/soundfont-playback.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function artifactMetadata(bytes){
 const text=bytes.toString('utf8'),version=text.match(/librawl(?:\s+version\s*:\s*|@)([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?)/i)?.[1],sourceSha256=text.match(/audio(?:[ -]source)?[ -]sha256\s*[:=]\s*([a-f0-9]{64})/i)?.[1];
 if(!version||!sourceSha256)throw Error('Generated artifact must declare librawl version and audio source sha256');
 return {version,sourceSha256};
}
export async function syncCaplin({canonicalRepo,readerDir,artifact=path.join(libraryRoot,'dist/browser/soundfont-playback.js'),expectedSha=originalCaplinSha256,check=false}={}){
 if(!canonicalRepo||!readerDir)throw Error('Both canonicalRepo and readerDir are required');
 if(!/^[a-f0-9]{64}$/.test(expectedSha))throw Error('Expected SHA256 must contain 64 lowercase hexadecimal digits');
 const canonical=path.join(path.resolve(canonicalRepo),sourceName),mirror=path.join(path.resolve(readerDir),'dist/soundfont-playback.js'),manifestPath=path.join(path.resolve(canonicalRepo),'packages/shared-modules.json');
 const [before,mirrorBefore,manifestBytes,generated,pkg,source]=await Promise.all([fs.readFile(canonical),fs.readFile(mirror),fs.readFile(manifestPath),fs.readFile(artifact),fs.readFile(path.join(libraryRoot,'package.json'),'utf8').then(JSON.parse),fs.readFile(path.join(libraryRoot,'src/audio/soundfont-playback.js'))]);
 if(!before.equals(mirrorBefore))throw Error('Canonical module and reader mirror have drifted; refusing to overwrite');
 const manifestText=manifestBytes.toString('utf8'),manifest=JSON.parse(manifestText),entries=manifest.modules?.filter(item=>item.source===sourceName)??[];
 if(entries.length!==1||entries[0].caplinMirror!==mirrorName)throw Error('Expected exactly one matching shared-module manifest entry');
 const currentSha=sha(before),generatedSha=sha(generated),metadata=artifactMetadata(generated);
 if(entries[0].sha256!==currentSha)throw Error('Shared-module manifest SHA does not match the existing canonical module');
 if(metadata.version!==pkg.version||metadata.sourceSha256!==sha(source))throw Error('Generated artifact version/source digest is stale; rebuild librawl');
 if(check){if(!before.equals(generated))throw Error('Canonical module does not match the current librawl artifact');return {status:'verified',version:metadata.version,sha256:currentSha,sourceSha256:metadata.sourceSha256};}
 if(before.equals(generated))return {status:'unchanged',version:metadata.version,sha256:currentSha,sourceSha256:metadata.sourceSha256};
 if(currentSha!==expectedSha)throw Error('Canonical module differs from the reviewed expected SHA; pass an explicitly reviewed --expected-sha for an upgrade');
 // Preserve formatting and every unrelated byte: replace only this entry's hash.
 const sourceToken='"'+sourceName+'"',at=manifestText.indexOf(sourceToken),start=manifestText.lastIndexOf('{',at),end=manifestText.indexOf('}',at)+1,region=manifestText.slice(start,end),updatedRegion=region.replace(/("sha256"\s*:\s*")[a-f0-9]{64}("\s*)/,(_,left,right)=>left+generatedSha+right);
 if(at<0||start<0||end<=start||region===updatedRegion)throw Error('Could not locate the isolated manifest fingerprint');
 const updatedManifest=Buffer.from(manifestText.slice(0,start)+updatedRegion+manifestText.slice(end)),parsed=JSON.parse(updatedManifest.toString('utf8')),expected=structuredClone(manifest);expected.modules.find(item=>item.source===sourceName).sha256=generatedSha;
 if(JSON.stringify(parsed)!==JSON.stringify(expected))throw Error('Manifest update changed more than the matching SHA');
 try{
  await fs.writeFile(canonical,generated);
  // The canonical package is the source of truth for the compatibility copy.
  await fs.copyFile(canonical,mirror);
  await fs.writeFile(manifestPath,updatedManifest);
 }catch(error){
  await Promise.allSettled([fs.writeFile(canonical,before),fs.writeFile(mirror,mirrorBefore),fs.writeFile(manifestPath,manifestBytes)]);throw error;
 }
 if(!(await fs.readFile(canonical)).equals(await fs.readFile(mirror)))throw Error('Post-sync canonical/mirror mismatch');
 return {status:'updated',version:metadata.version,sha256:generatedSha,sourceSha256:metadata.sourceSha256,previousSha256:currentSha,files:[canonical,mirror,manifestPath]};
}
async function main(){
 const args=process.argv.slice(2),options={};
 while(args.length){const flag=args.shift();if(flag==='--check')options.check=true;else if(['--canonical-repo','--reader-dir','--artifact','--expected-sha'].includes(flag)){const value=args.shift();if(!value||value.startsWith('--'))throw Error('Missing value for '+flag);options[{'--canonical-repo':'canonicalRepo','--reader-dir':'readerDir','--artifact':'artifact','--expected-sha':'expectedSha'}[flag]]=value;}else throw Error('Unknown option '+flag);}
 console.log(JSON.stringify(await syncCaplin(options)));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
