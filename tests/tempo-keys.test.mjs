import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {bindTempoKeys} from '../src/audio/tempo-keys.js';
test('Rawl tempo keys use one listener, native coarse/fine steps and return a disposer',()=>{
 const w=new JSDOM('<body><input><textarea></textarea><select></select><div contenteditable="true"><span>x</span></div></body>').window,d=w.document,values=[];let enabled=true;
 const off=bindTempoKeys({target:d,adjustTempo:delta=>values.push(delta),enabled:()=>enabled});
 const press=(key,target=d,options={})=>{const event=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options});target.dispatchEvent(event);return event.defaultPrevented;};
 for(const key of ['-','=','_','+'])assert.equal(press(key),true);assert.deepEqual(values,[-.1,.1,-.01,.01]);
 for(const el of d.querySelectorAll('input,textarea,select,span'))assert.equal(press('=',el),false);
 for(const options of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true}])assert.equal(press('=',d,options),false);
 enabled=false;assert.equal(press('='),false);enabled=true;const dialog=d.createElement('dialog');dialog.open=true;d.body.append(dialog);assert.equal(press('='),false);dialog.remove();
 assert.equal(press('a'),false);off();assert.equal(press('='),false);assert.equal(values.length,4);w.close();
});
