export interface SoundBank {url:string;name:string;bytes:number;sha256:string;}
export interface PlaybackClock {beat():number|null;position():number;/** AudioContext time of the score end, including pending rate changes. */endTime():number;/** Seconds from audible presentation time to the score end. */remaining():number;}
export interface SoundFontEngine {
 play(plan:any,mixers:AudioNode[],offset?:number,output?:AudioNode):number;
 createClock(plan:any,start:number,offset?:number):PlaybackClock;
 /** Positive absolute multiplier relative to the original playing plan; new play resets to1. Already queued events retain their timing (up to140ms). */
 setRate(rate:number):void;
 getRate():number;
 remaining():number;
 stop():void;
 /** True when stopping clears future MIDI messages inside the worklet. */
 canDiscardQueuedEvents?:boolean;
 [key:string]:any;
}
export interface SoundFontOptions {assetBase?:string;libraryUrl?:string;workletUrl?:string;additionalBanks?:SoundBank[];allowAuditionPrograms?:boolean;clearQueuedMidi?:boolean;environment?:typeof globalThis;importLibrary?:(url:string)=>Promise<unknown>;fetch?:typeof fetch;}
export interface SoundFontPlayback {prepare(context:AudioContext):Promise<SoundFontEngine>;stop():void;stopAudition():void;getContext():AudioContext|undefined;getPreparationState():{phase:string;pending:boolean;error:string|null};PlaybackEngine:new(context:AudioContext,synth:any)=>SoundFontEngine;presentationTime(context:AudioContext):number;soundingIntervals(plan:any,note:any):number[][];room:Readonly<{wet:number;seconds:number;decaySeconds:number;preDelay:number;seed:number}>;roomImpulse(context:AudioContext):AudioBuffer;masterGain:number;}
export function createSoundFontPlayback(options?:SoundFontOptions):SoundFontPlayback;
export function createTransport(options:{makePlan:(data:any,tempo:number)=>any;audio?:SoundFontPlayback;onState?:(state:string)=>void;onPosition?:(beat:number|null)=>void;onError?:(error:Error)=>void;keyboardTarget?:Document|false}):any;

export function bindTempoKeys(options:{target?:Document;adjustTempo:(delta:number,event:KeyboardEvent)=>unknown;enabled?:()=>boolean}):()=>void;
export function bindPlaybackKeys(options:{target?:Document;pause?:()=>void;toggle?:()=>void;enabled?:()=>boolean;allowInInputs?:boolean;preventScrollWhenIdle?:boolean}):{setActive(active:boolean):void;destroy():void};
