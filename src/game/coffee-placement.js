import {footprint,obstacleBounds,blocksBody,circleOverlaps} from './collision.js';
import {overlaps,doorClearance} from './furniture-placement.js';
export function coffeePlacement(room,{colliders=[],doors=[]}={}){
 const minX=(room.x-11)*3-1.5,maxX=minX+room.w*3,minZ=(room.z-11)*3-1.5,maxZ=minZ+room.h*3;
 const project=(x,z,rotation,a,c)=>({x:x+Math.cos(rotation)*a+Math.sin(rotation)*c,z:z-Math.sin(rotation)*a+Math.cos(rotation)*c});
 const candidates=[];
 // Prefer the window wall opposite the entrance, then the other perimeter bays.
 for(const [z,rotation]of[[maxZ-.6,Math.PI],[minZ+.6,0]])for(let x=minX+1.8;x<=maxX-1.8;x+=.6)candidates.push({x,z,rotation});
 for(const [x,rotation]of[[minX+.6,Math.PI/2],[maxX-.6,-Math.PI/2]])for(let z=minZ+2;z<=maxZ-2;z+=.6)candidates.push({x,z,rotation});
 const solids=colliders.filter(c=>blocksBody(c)).map(obstacleBounds);
 for(const candidate of candidates){const{x,z,rotation}=candidate,point=project(x,z,rotation,.45,.95),bin=project(x,z,rotation,1.3,.9),counter=footprint(x,z,2.8,.8,1.75,rotation),rubbish=footprint(bin.x,bin.z,.52,.52,.68);
  const inside=p=>p.minX>minX+.1&&p.maxX<maxX-.1&&p.minZ>minZ+.1&&p.maxZ<maxZ-.1;
  if(!inside(counter)||!inside(rubbish)||doors.some(d=>overlaps(counter,doorClearance(d),.12)||overlaps(rubbish,doorClearance(d),.12)))continue;
  if(solids.some(c=>overlaps(counter,c,.06)||overlaps(rubbish,c,.06)||circleOverlaps(point.x,point.z,.34,c)))continue;
  return{...candidate,point,bin,bounds:{x,z,w:counter.maxX-counter.minX,d:counter.maxZ-counter.minZ,h:1.75}};
 }
 throw new Error('No clear cafeteria counter bay is available.');
}
