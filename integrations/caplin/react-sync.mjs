#!/usr/bin/env node
/** Apply reviewed, scoped Caplin hooks and copy the exact built native bridge. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
export const reviewedReaderSha='03dfe29b1a5935c123ceeb9c074f8cdd1d4ea34bb0d2676d5bd71c79c43e8377';
function once(text,before,after){if(!before||text.indexOf(before)<0||text.indexOf(before)!==text.lastIndexOf(before))throw Error('Reviewed source region has drifted');return text.replace(before,()=>after);}
export async function syncCaplinNotes({readerDir,artifact=path.join(root,'dist/browser/caplin-notes.js'),expectedReaderSha=reviewedReaderSha,check=false}={}){
 if(!readerDir)throw Error('readerDir required');
 const dir=path.resolve(readerDir),readerPath=path.join(dir,'dist/reader.js'),shellPath=path.join(dir,'content/startup-shell.html'),indexPath=path.join(dir,'dist/index.html'),assetPath=path.join(dir,'dist/librawl-caplin-notes.js');
 const [before,shell,index,bundle,edits,pkg]=await Promise.all([fs.readFile(readerPath,'utf8'),fs.readFile(shellPath,'utf8'),fs.readFile(indexPath,'utf8'),fs.readFile(artifact),fs.readFile(new URL('./react-reader-edits.json',import.meta.url),'utf8').then(JSON.parse),fs.readFile(path.join(root,'package.json'),'utf8').then(JSON.parse)]);
 if(!bundle.toString('utf8').includes('LibrawlCaplinNotes')||!bundle.toString('utf8').includes('librawl version: '+pkg.version))throw Error('Missing or stale Caplin bridge; rebuild librawl');
 let reader=before;
 const hooked=before.includes('state.noteLayers=noteRows.map(');
 if(!hooked){if(sha(before)!==expectedReaderSha)throw Error('Reader differs from reviewed baseline; review source before passing --expected-reader-sha');for(const edit of edits)reader=once(reader,edit.before,edit.after);}
 for(const edit of edits)if(edit.after&&!reader.includes(edit.after))throw Error('Incomplete or drifted Caplin note hooks');
 const assetSha=sha(bundle),version=sha(reader+assetSha).slice(0,12),assetURL='librawl-caplin-notes.js?librawl='+assetSha.slice(0,12);
 const bridgeTag='<script src="'+assetURL+'" defer></script>';
 let nextShell=shell.replace(/<script src="librawl-caplin-notes\.js[^\"]*" defer><\/script>/g,'');
 const readerTag=nextShell.match(/<script src="reader\.js[^\"]*" defer><\/script>/g);
 if(readerTag?.length!==1)throw Error('Expected one canonical reader script in startup shell');
 nextShell=nextShell.replace(readerTag[0],bridgeTag+readerTag[0]);
 const configMatch=index.match(/window\.ReaderStartup=(\{[^\n]*\});<\/script>/);
 if(!configMatch)throw Error('Missing ReaderStartup configuration');
 const config=JSON.parse(configMatch[1]),beforeConfig=structuredClone(config);
 if(!Array.isArray(config.scripts))throw Error('Missing ordered startup scripts');
 config.scripts=config.scripts.filter(src=>src.split('?')[0]!=='librawl-caplin-notes.js');
 const position=config.scripts.findIndex(src=>src.split('?')[0]==='reader.js');
 if(position<0||config.scripts.filter(src=>src.split('?')[0]==='reader.js').length!==1)throw Error('Expected one deferred reader runtime');
 config.scripts[position]='reader.js?librawl='+version;config.scripts.splice(position,0,assetURL);
 const nextIndex=index.replace(configMatch[1],()=>JSON.stringify(config));
 const writes=[[readerPath,reader],[shellPath,nextShell],[indexPath,nextIndex],[assetPath,bundle]],changes=[];
 for(const [name,value]of writes){const bytes=Buffer.from(value),current=await fs.readFile(name).catch(error=>{if(error.code==='ENOENT')return null;throw error;});if(!current?.equals(bytes))changes.push([name,bytes,current]);}
 if(check&&changes.length)throw Error('Caplin native note integration is not synchronized: '+changes.map(([name])=>path.relative(dir,name)).join(', '));
 if(!check){try{for(const [name,bytes]of changes)await fs.writeFile(name,bytes);}catch(error){await Promise.allSettled(changes.map(([name,,original])=>original?fs.writeFile(name,original):fs.unlink(name).catch(()=>{})));throw error;}}
 return {status:check?'verified':changes.length?'updated':'unchanged',version:pkg.version,assetSha256:assetSha,readerSha256:sha(reader),startupVersion:config.version,cacheRevision:version,sourceBaselineSha256:sha(before),textVersionUnchanged:config.textVersion===beforeConfig.textVersion,files:changes.map(([name])=>name)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),options={};
 while(args.length){const flag=args.shift();if(flag==='--check')options.check=true;else if(['--reader-dir','--artifact','--expected-reader-sha'].includes(flag)){const value=args.shift();if(!value||value.startsWith('--'))throw Error('Missing '+flag);options[{'--reader-dir':'readerDir','--artifact':'artifact','--expected-reader-sha':'expectedReaderSha'}[flag]]=value;}else throw Error('Unknown '+flag);}
 syncCaplinNotes(options).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
