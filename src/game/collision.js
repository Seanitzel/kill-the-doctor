// Shared physical bounds for movement, doors, camera clearance, and shot occlusion.
export function footprint(x,z,width,depth,height=1.2,rotation=0,type='furniture'){
  const c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));
  const halfX=(c*width+s*depth)/2,halfZ=(s*width+c*depth)/2;
  return {minX:x-halfX,maxX:x+halfX,minZ:z-halfZ,maxZ:z+halfZ,minY:0,maxY:height,type};
}
export function obstacleBounds(c){
  if(!c.object?.pivot)return c;
  const d=c.object,angle=d.angle??(d.open?(d.openAngle??-Math.PI/2):0),pivot=d.pivot.position;
  // The leaf swings around its actual hinge; an open leaf is still solid.
  return footprint(pivot.x+Math.cos(angle)*.86,pivot.z-Math.sin(angle)*.86,1.72,.1,2.6,angle,'door');
}
export function circleOverlaps(x,z,r,c){
  const nx=Math.max(c.minX,Math.min(c.maxX,x)),nz=Math.max(c.minZ,Math.min(c.maxZ,z));
  return (x-nx)**2+(z-nz)**2 < r*r-1e-8;
}
export function blocksBody(c,height=1.85){return (c.minY??0)<height&&(c.maxY??3.6)>0;}
export function interactionScore(player,yaw,target,range=2.45){
  const dx=target.x-player.x,dz=target.z-player.z,d=Math.hypot(dx,dz);
  if(d>range)return Infinity;
  const facing=d<.01?1:(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d;
  if(d>1.15&&facing<-.2)return Infinity;
  return d+(1-facing)*.9;
}
export function segmentHit3D(from,to,c,pad=0){
  let near=0,far=1;
  for(const [axis,min,max] of [['x',c.minX,c.maxX],['y',c.minY??0,c.maxY??3.6],['z',c.minZ,c.maxZ]]){
    const origin=from[axis],delta=to[axis]-origin,lo=min-pad,hi=max+pad;
    if(Math.abs(delta)<1e-9){if(origin<lo||origin>hi)return null;continue;}
    const a=(lo-origin)/delta,b=(hi-origin)/delta;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    if(near>far)return null;
  }
  return near>=0&&near<=1?near:null;
}
export function cameraFraction(anchor,desired,obstacles,radius=.2){
  let result=1;const length=Math.hypot(desired.x-anchor.x,desired.y-anchor.y,desired.z-anchor.z);
  for(const c of obstacles){const hit=segmentHit3D(anchor,desired,c,radius);if(hit!==null)result=Math.min(result,Math.max(0,hit-.04/Math.max(length,.01)));}
  return result;
}
