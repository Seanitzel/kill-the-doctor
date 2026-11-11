// Shared physical bounds for movement, doors, camera clearance, and shot occlusion.
export const STRUCTURE_CLEARANCE=.48;
export function footprint(x,z,width,depth,height=1.2,rotation=0,type='furniture'){
  const c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));
  const halfX=(c*width+s*depth)/2,halfZ=(s*width+c*depth)/2;
  return {minX:x-halfX,maxX:x+halfX,minZ:z-halfZ,maxZ:z+halfZ,minY:0,maxY:height,type};
}
// A door owns one mutable broad-phase box. Weak ownership lets retired floors
// disappear, while repeated crowd/camera checks reuse the same six numbers.
const doorBounds=new WeakMap();
export function obstacleBounds(c){
  if(!c.object?.pivot)return c;
  const d=c.object,angle=d.angle??(d.open?(d.openAngle??-Math.PI/2):0),pivot=d.pivot.position;
  let cached=doorBounds.get(d);if(!cached){cached={angle:NaN,x:NaN,z:NaN,bounds:{minX:0,maxX:0,minZ:0,maxZ:0,minY:0,maxY:2.6,type:'door'}};doorBounds.set(d,cached);}
  if(cached.angle!==angle||cached.x!==pivot.x||cached.z!==pivot.z){const co=Math.cos(angle),si=Math.sin(angle),x=pivot.x+co*.86,z=pivot.z-si*.86,halfX=(Math.abs(co)*1.72+Math.abs(si)*.1)/2,halfZ=(Math.abs(si)*1.72+Math.abs(co)*.1)/2,b=cached.bounds;b.minX=x-halfX;b.maxX=x+halfX;b.minZ=z-halfZ;b.maxZ=z+halfZ;cached.angle=angle;cached.x=pivot.x;cached.z=pivot.z;}
  return cached.bounds;
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
// Slab tests are in the crowd/pathfinding hot loop. Keep every call scalar:
// constructing axis arrays here allocated gigabytes during a short session.
export function segmentHit3D(from,to,c,pad=0){
  let near=0,far=1,a,b;const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
  if(Math.abs(dx)<1e-9){if(from.x<c.minX-pad||from.x>c.maxX+pad)return null;}
  else{a=(c.minX-pad-from.x)/dx;b=(c.maxX+pad-from.x)/dx;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;}
  if(Math.abs(dy)<1e-9){if(from.y<(c.minY??0)-pad||from.y>(c.maxY??3.6)+pad)return null;}
  else{a=((c.minY??0)-pad-from.y)/dy;b=((c.maxY??3.6)+pad-from.y)/dy;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;}
  if(Math.abs(dz)<1e-9){if(from.z<c.minZ-pad||from.z>c.maxZ+pad)return null;}
  else{a=(c.minZ-pad-from.z)/dz;b=(c.maxZ+pad-from.z)/dz;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;}
  return near>=0&&near<=1?near:null;
}
export function segmentHit2D(from,to,c){
  let near=0,far=1,a,b;const dx=to.x-from.x,dz=to.z-from.z;
  if(Math.abs(dx)<1e-9){if(from.x<c.minX||from.x>c.maxX)return null;}
  else{a=(c.minX-from.x)/dx;b=(c.maxX-from.x)/dx;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;}
  if(Math.abs(dz)<1e-9){if(from.z<c.minZ||from.z>c.maxZ)return null;}
  else{a=(c.minZ-from.z)/dz;b=(c.maxZ-from.z)/dz;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;}
  return near>=0&&near<=1?near:null;
}
export function cameraFraction(anchor,desired,obstacles,radius=.2){
  let result=1;const length=Math.hypot(desired.x-anchor.x,desired.y-anchor.y,desired.z-anchor.z);
  for(const c of obstacles){const hit=c.object?.pivot?segmentDoor3D(anchor,desired,c.object,radius):segmentHit3D(anchor,desired,c,radius);if(hit!==null)result=Math.min(result,Math.max(0,hit-.04/Math.max(length,.01)));}
  return result;
}

// Exact circle vs oriented door leaf, used while checking the swept arc.
export function circleOverlapsDoor(x,z,r,door,angle=door.angle){const p=door.pivot.position,c=Math.cos(angle),s=Math.sin(angle),dx=x-p.x,dz=z-p.z,lx=dx*c-dz*s,lz=dx*s+dz*c,nx=Math.max(0,Math.min(1.72,lx)),nz=Math.max(-.04,Math.min(.04,lz));return (lx-nx)**2+(lz-nz)**2<r*r-1e-8;}
function rectanglePenetration(x,z,r,minX,maxX,minZ,maxZ){if(x<=minX-r||x>=maxX+r||z<=minZ-r||z>=maxZ+r)return 0;const dx=x-Math.max(minX,Math.min(maxX,x)),dz=z-Math.max(minZ,Math.min(maxZ,z)),squared=dx*dx+dz*dz;if(squared>=r*r)return 0;if(squared>0)return r-Math.sqrt(squared);return r+Math.min(x-minX,maxX-x,z-minZ,maxZ-z);}
export function bodyPenetration(x,z,r,c){if(c.object?.pivot){const d=c.object,p=d.pivot.position,a=d.angle??0,dx=x-p.x,dz=z-p.z,co=Math.cos(a),si=Math.sin(a);return rectanglePenetration(dx*co-dz*si,dx*si+dz*co,r,0,1.72,-.05,.05);}return rectanglePenetration(x,z,r,c.minX,c.maxX,c.minZ,c.maxZ);}

const doorRayFrom={x:0,y:0,z:0},doorRayTo={x:0,y:0,z:0};
const doorRayBounds={minX:0,maxX:1.72,minY:0,maxY:2.6,minZ:-.05,maxZ:.05};
// Camera rays must test the actual rotated leaf. Its world AABB includes empty
// triangles and can incorrectly place a valid standing player inside a wall.
export function segmentDoor3D(from,to,door,pad=0){
 const p=door.pivot.position,a=door.angle??0,c=Math.cos(a),s=Math.sin(a);
 let dx=from.x-p.x,dz=from.z-p.z;doorRayFrom.x=dx*c-dz*s;doorRayFrom.y=from.y;doorRayFrom.z=dx*s+dz*c;
 dx=to.x-p.x;dz=to.z-p.z;doorRayTo.x=dx*c-dz*s;doorRayTo.y=to.y;doorRayTo.z=dx*s+dz*c;
 return segmentHit3D(doorRayFrom,doorRayTo,doorRayBounds,pad);
}
