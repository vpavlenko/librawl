export type VoiceHover = number | number[] | null;
export function voiceHoverContains(hover: VoiceHover,index:number):boolean {
  return Array.isArray(hover) ? hover.includes(index) : hover === index;
}
