// Lucide icon geometry with a contrasting outline.
function iconCursor(shape, x, y, fallback){
 const outline=`<g fill="none" stroke="black" color="black" stroke-width="4">${shape}</g>`;
 const icon=`<g fill="none" stroke="white" color="white" stroke-width="2">${shape}</g>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-1 -1 26 26" stroke-linecap="round" stroke-linejoin="round">${outline}${icon}</svg>`;
 return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, ${fallback}`;
}
export const TONIC_CURSOR=iconCursor('<path d="m12 9-8.414 8.414A2 2 0 0 0 3 18.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 3.828 21h1.344a2 2 0 0 0 1.414-.586L15 12"/><path d="m18 9 .4.4a1 1 0 1 1-3 3l-3.8-3.8a1 1 0 1 1 3-3l.4.4 3.4-3.4a1 1 0 1 1 3 3z"/><path d="m2 22 .414-.414"/>',3,21,'pointer');
export const MODULATION_SNAP_CURSOR=iconCursor('<path d="M3 5v14"/><path d="M21 12H7"/><path d="m15 18 6-6-6-6"/>',22,12,'e-resize');
