/** The synth worker and its assets remain application-owned. */
export interface NativeEventEmitter {
  emit(event:string,...args:any[]):any;
  on(event:string,listener:(...args:any[])=>void):any;
  off(event:string,listener:(...args:any[])=>void):any;
}
export interface ThreadedMIDIEnvironment {
  EventEmitter:new()=>NativeEventEmitter;
  createWorker:()=>Worker;
  assetBase:string|(()=>string);
  AudioWorkletNode:typeof AudioWorkletNode;
  MessageChannel:typeof MessageChannel;
  console?:Pick<Console,'debug'|'error'>;
}
export interface ThreadedMIDIPlayer extends NativeEventEmitter {
  initialize(destination:AudioNode):Promise<void>;
  loadData(data:ArrayBuffer|Uint8Array,filepath:string,shouldAutoPlay?:boolean,excludedVoices?:number[],drumVoices?:number[],transpose?:number,timbre?:'qanun'):Promise<any>;
  isPlaying():boolean;
  isPaused():boolean;
  getDurationMs():number;
  getTempo():number;
  getNumVoices():number;
  getVoiceMask():boolean[];
  getVoiceName(index:number):string;
  getMetadata():any;
  getPositionMs():number;
  togglePause():boolean;
  pause():void;
  stop():void;
  suspend():void;
  eject():void;
  seekMs(ms:number):void;
  setTempo(tempo:number):void;
  setVoiceMask(mask:boolean[]):void;
  setDrumVoices(voices:number[]):void;
  setForcedPanning(enabled:boolean):void;
  setTranspose(semitones:number):void;
  setParameter(id:string,value:any):void;
  loadSoundfont(name:string,data:ArrayBuffer):Promise<any>;
  setPlaybackStartedCallback(callback?:(()=>void)|null):void;
  dispose():void;
}
export interface ThreadedMIDIPlayerConstructor {
  new(context:AudioContext,debugTiming?:boolean):ThreadedMIDIPlayer;
}
export function createThreadedMIDIPlayerClass(environment:ThreadedMIDIEnvironment):ThreadedMIDIPlayerConstructor;
