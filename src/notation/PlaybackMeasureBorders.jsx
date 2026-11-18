import React, {forwardRef} from 'react';

// Rawl AnalysisGrid paints each edge just outside the score body.
export const PlaybackMeasureBorders = forwardRef(function PlaybackMeasureBorders({
 left,width,top=true,bottom=true,hidden=false,
},ref){
 return <div aria-hidden="true" className="rawln-playback-measure" hidden={hidden} ref={ref} style={{
  position:'absolute',left,width,top:-1,bottom:-1,pointerEvents:'none',zIndex:4,
  borderTop:top?'1px solid #444':undefined,
  borderBottom:bottom?'1px solid #444':undefined,
 }}/>;
});
