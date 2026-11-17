/** Shared gesture policy; the host owns note identity, audio, and disabled state. */
export function createShiftHoverAudition({audition,isEnabled=()=>true,keyForNote=note=>note?.id??note}={}){
 let visiting=null,played=false;
 const leave=()=>{visiting=null;played=false;};
 return {
  enter(note,event,time){
   if(!note||!event||event.type==='mousemove'||event.type==='pointermove')return false;
   const key=keyForNote(note);
   if(visiting!==key){visiting=key;played=false;}
   if(played||!event.shiftKey||typeof audition!=='function'||!isEnabled(note,event,time))return false;
   played=true;
   audition(note,event,time);
   return true;
  },
  leave,
  reset:leave,
 };
}
