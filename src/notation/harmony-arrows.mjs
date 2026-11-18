// Caplin packages/music/harmonic-notation.js, source commit 444e2f4.
// A negative bow direction serves annotations above the score.
const arrowStyle=Object.freeze({headLength:8.5,headHalfWidth:2.3});
// All resolution arrows share a shallow, balanced bow and a solid symmetric
// head. Coordinates are CSS-sized SVG units, independent of chord spacing.
export function arrowCurve(from,to,direction=1){
 const span=Math.abs(to[0]-from[0]),sign=Math.sign(to[0]-from[0])||1;
 const run=Math.min(span*.32,17),depth=direction*Math.min(12,Math.max(5,span*.17));
 return [...from,from[0]+sign*run,from[1]+depth,to[0]-sign*run,to[1]+depth,...to];
}
// Sweep the filled head along the actual curve, with equal tapered wings.
// The shaft ends well inside that fill; its round cap never reaches the tip.
export function arrowGeometry(coords,routed=false){
 const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),segments=[];
 if(!routed)segments.push(Array.from({length:4},(_,i)=>coords.slice(i*2,i*2+2)));
 else{
  const points=coords,addLine=(a,b)=>segments.push([a,mix(a,b,1/3),mix(a,b,2/3),b]);let current=points[0];
  for(let i=1;i<points.length-1;i++){
   const a=points[i-1],b=points[i],c=points[i+1],incoming=Math.hypot(b[0]-a[0],b[1]-a[1]),outgoing=Math.hypot(c[0]-b[0],c[1]-b[1]),radius=Math.min(1.5,incoming/3,outgoing/3);
   if(!radius)continue;
   const enter=mix(b,a,radius/incoming),leave=mix(b,c,radius/outgoing);
   addLine(current,enter);segments.push([enter,mix(enter,b,2/3),mix(leave,b,2/3),leave]);current=leave;
  }
  addLine(current,points.at(-1));
 }
 const point=(c,t)=>{const u=1-t;return [0,1].map(i=>u*u*u*c[0][i]+3*u*u*t*c[1][i]+3*u*t*t*c[2][i]+t*t*t*c[3][i]);};
 const tangent=(c,t)=>{const u=1-t;return [0,1].map(i=>3*u*u*(c[1][i]-c[0][i])+6*u*t*(c[2][i]-c[1][i])+3*t*t*(c[3][i]-c[2][i]));};
 const table=[];let length=0,previous=segments[0][0];
 segments.forEach((c,index)=>{for(let step=0;step<=64;step++){const t=step/64,p=point(c,t);length+=Math.hypot(p[0]-previous[0],p[1]-previous[1]);table.push({length,index,t});previous=p;}});
 const at=distance=>{
  const end=table.findIndex(p=>p.length>=distance),b=table[end<0?table.length-1:end],a=table[Math.max(0,end-1)];
  const t=a.index===b.index&&b.length>a.length?a.t+(b.t-a.t)*(distance-a.length)/(b.length-a.length):b.t;
  return {index:b.index,t,point:point(segments[b.index],t),tangent:tangent(segments[b.index],t)};
 };
 const headLength=Math.min(arrowStyle.headLength,length*.55),halfWidth=Math.min(arrowStyle.headHalfWidth,headLength*.32),left=[],right=[];
 for(let step=0;step<=24;step++){
  const fraction=step/24,p=at(length-headLength+fraction*headLength),size=Math.hypot(...p.tangent)||1,w=halfWidth*(1-fraction),nx=-p.tangent[1]/size,ny=p.tangent[0]/size;
  left.push([p.point[0]+nx*w,p.point[1]+ny*w]);right.push([p.point[0]-nx*w,p.point[1]-ny*w]);
 }
 const end=at(length-headLength*.45),c=segments[end.index],a=mix(c[0],c[1],end.t),b=mix(c[1],c[2],end.t),d=mix(c[2],c[3],end.t),e=mix(a,b,end.t),f=mix(b,d,end.t);
 const shaft=[...segments.slice(0,end.index),[c[0],a,e,mix(e,f,end.t)]],command=c=>` C${c.slice(1).flat().join(' ')}`,headPoints=[...left,...right.reverse().slice(1)];
 return {shaftPath:`M${shaft[0][0].join(' ')}${shaft.map(command).join('')}`,headPath:`M${headPoints.map(p=>p.join(' ')).join(' L')} Z`,headPoints,tip:segments.at(-1)[3],tangent:tangent(segments.at(-1),1),shaftEnd:end.point,headLength};
}
