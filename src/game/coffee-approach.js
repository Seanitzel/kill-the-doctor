import {mixingYaw} from './office-mixing.js';

// Solve the character's stance when USE is pressed, rather than asking the
// player to find an animation-dependent, centimetre-wide interaction spot.
export function findCoffeeStance(e,mixing,cup,inside){
 const root=e.player.root,position=root.position.clone(),rotation=root.rotation.clone(),from={x:e.playerPos.x,z:e.playerPos.z};
 const clear=(x,z)=>inside({x,z})&&e.canStand(x,z,.3,e.floor)&&!e.npcs.some(n=>n.floor===e.floor&&!n.dead&&!n.evacuated&&!n.lying&&!n.baby&&Math.hypot(x-n.pos.x,z-n.pos.z)<.56);
 const reachable=p=>{root.position.set(p.x,0,p.z);root.rotation.y=mixingYaw(p,cup);root.updateMatrixWorld(true);return !e.player.model||mixing.validateReach().reachable;};
 try{
  e.player.animate?.(e.time,0,0);
  if((!e.player.model||Math.hypot(from.x-cup.x,from.z-cup.z)<=.46)&&clear(from.x,from.z)&&reachable(from))return {...from};
  const candidates=[];
  for(const radius of [.44,.4,.48])for(let i=0;i<32;i++){const a=i*Math.PI/16,p={x:cup.x+Math.sin(a)*radius,z:cup.z+Math.cos(a)*radius};p.distance=Math.hypot(p.x-from.x,p.z-from.z);p.score=p.distance+Math.abs(radius-.44)*3;if(p.distance<=1.35&&clear(p.x,p.z))candidates.push(p);}
  // Keep some reach in reserve for the idle animation, rather than choosing
  // an almost straight arm that only reaches during one sampled frame.
  candidates.sort((a,b)=>a.score-b.score);
  for(const p of candidates){const steps=Math.ceil(p.distance/.08);let safe=true;for(let i=1;i<=steps;i++)if(!clear(from.x+(p.x-from.x)*i/steps,from.z+(p.z-from.z)*i/steps)){safe=false;break;}if(safe&&reachable(p))return {x:p.x,z:p.z};}
  return null;
 }finally{root.position.copy(position);root.rotation.copy(rotation);root.updateMatrixWorld(true);e.player.animate?.(e.time,0,0);}
}
