export interface SoundBank {url:string;name:string;bytes:number;sha256:string;}
export interface SoundFontOptions {assetBase?:string;libraryUrl?:string;workletUrl?:string;additionalBanks?:SoundBank[];allowAuditionPrograms?:boolean;environment?:typeof globalThis;importLibrary?:(url:string)=>Promise<unknown>;fetch?:typeof fetch;}
export interface SoundFontPlayback {prepare(context:AudioContext):Promise<any>;stop():void;stopAudition():void;getContext():AudioContext|undefined;getPreparationState():{phase:string;pending:boolean;error:string|null};PlaybackEngine:new(context:AudioContext,synth:any)=>any;presentationTime(context:AudioContext):number;soundingIntervals(plan:any,note:any):number[][];room:Readonly<{wet:number;seconds:number;decaySeconds:number;preDelay:number;seed:number}>;roomImpulse(context:AudioContext):AudioBuffer;masterGain:number;}
export function createSoundFontPlayback(options?:SoundFontOptions):SoundFontPlayback;
export function createTransport(options:{makePlan:(data:any,tempo:number)=>any;audio?:SoundFontPlayback;onState?:(state:string)=>void;onPosition?:(beat:number|null)=>void;onError?:(error:Error)=>void}):any;

export function bindTempoKeys(options:{target?:Document;adjustTempo:(delta:number,event:KeyboardEvent)=>unknown;enabled?:()=>boolean}):()=>void;
