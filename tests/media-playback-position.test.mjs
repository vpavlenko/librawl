import test from 'node:test';
import assert from 'node:assert/strict';
import {bindMediaPlaybackPosition} from 'librawl/audio';

test('media highlighting samples only the playhead across pause, seek, and resume',()=>{
 const media=new EventTarget(),positions=[],frames=new Map();
 let frameID=0;
 Object.assign(media,{
  ownerDocument:{defaultView:{
   requestAnimationFrame(callback){frames.set(++frameID,callback);return frameID;},
   cancelAnimationFrame(id){frames.delete(id);},
  }},
  paused:true, ended:false, readyState:0, error:null, currentTime:0,
 });
 const emit=type=>media.dispatchEvent(new Event(type));
 const frame=()=>{
  const [id,callback]=frames.entries().next().value;
  frames.delete(id);
  callback();
 };
 const current=()=>positions.at(-1);
 const unbind=bindMediaPlaybackPosition(media,time=>positions.push(time));
 assert.equal(current(),null);
 media.readyState=1;
 emit('loadedmetadata');
 assert.equal(current(),0);
 media.paused=false;
 emit('play');
 media.currentTime=3;
 frame();
 assert.equal(current(),3);
 media.currentTime=4;
 media.paused=true;
 emit('pause');
 assert.equal(current(),4);
 assert.equal(frames.size,0);
 media.currentTime=8;
 emit('seeking');
 emit('seeked');
 assert.equal(current(),8);
 assert.equal(frames.size,0);
 media.paused=false;
 emit('play');
 assert.equal(current(),8);
 assert.equal(frames.size,1);
 media.error={};
 emit('error');
 assert.equal(current(),null);
 assert.equal(frames.size,0);
 unbind();
 assert.equal(current(),null);
 const count=positions.length;
 emit('play');
 emit('seeked');
 assert.equal(positions.length,count);
});
