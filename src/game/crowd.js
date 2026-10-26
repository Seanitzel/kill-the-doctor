const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Commit to one passing side until clear. Changing side each blocked frame is
// what made patients orbit the player and flick between walking and idle.
export function crowdStep(engine,n,goal,step,dt){
  const dx=goal.x-n.pos.x,dz=goal.z-n.pos.z,dist=Math.hypot(dx,dz);if(dist<.001)return false;
  const vx=dx/dist,vz=dz/dist,now=engine.mission.elapsed;
  const others=engine.npcs.filter(o=>o!==n&&o.floor===n.floor&&!o.dead&&!o.evacuated&&!o.lying&&!o.baby).map(o=>o.pos);
  if(n.floor===engine.floor)others.push(engine.playerPos);
  const blocker=others.filter(p=>{const x=p.x-n.pos.x,z=p.z-n.pos.z;return x*vx+z*vz>-.12&&x*vx+z*vz<1.25&&Math.abs(x*vz-z*vx)<.66;}).sort((a,b)=>distance(a,n.pos)-distance(b,n.pos))[0];
  if(!blocker&&(!n.passing||distance(n.pos,n.passing.blocker)>1.5))n.passing=null;
  if(blocker&&!n.passing){
    const candidates=[-1,1].map(side=>{const x=blocker.x-vz*.92*side,z=blocker.z+vx*.92*side;return {side,x,z};}).filter(p=>engine.canStand(p.x,p.z,.25,n.floor));
    if(candidates.length)n.passing={...candidates[0],blocker:{x:blocker.x,z:blocker.z},until:now+3};
  }
  let target=goal;
  if(n.passing){if(now>n.passing.until){n.passing=null;n.yieldUntil=now+.7;return false;}if(distance(n.pos,n.passing)<.18)n.passing=null;else target=n.passing;}
  if(now<(n.yieldUntil||0))return false;
  const tx=target.x-n.pos.x,tz=target.z-n.pos.z,length=Math.hypot(tx,tz),amount=Math.min(length,step),x=n.pos.x+tx/Math.max(.001,length)*amount,z=n.pos.z+tz/Math.max(.001,length)*amount;
  if(!engine.npcCanMoveTo(n,x,z)){n.crowdBlocked=(n.crowdBlocked||0)+dt;if(n.crowdBlocked>.6){n.yieldUntil=now+.55;n.crowdBlocked=0;}return false;}
  n.pos.x=x;n.pos.z=z;n.crowdBlocked=0;return true;
}

// A doorway is a narrow shared resource. A short lease lets one body clear
// the threshold before the next enters; queued bodies use their idle pose.
export function queueAtDoor(engine,n,door){
 const now=engine.mission.elapsed,range=distance(n.pos,door);let lease=door.traffic;
 if(lease&&((engine.npcs&&!engine.npcs.includes(lease.owner))||lease.owner.dead||lease.owner.evacuated||lease.owner.floor!==n.floor||!lease.owner.path?.length||now>lease.until||distance(lease.owner.pos,door)>3.4))door.traffic=lease=null;
 if(range>2.7)return false;
 if(!lease){door.traffic=lease={owner:n,until:now+4,progress:{x:n.pos.x,z:n.pos.z}};}
 if(lease.owner===n){if(distance(n.pos,lease.progress)>.15){lease.until=now+3;lease.progress={x:n.pos.x,z:n.pos.z};}return false;}
 return range<2.15;
}

export function evacuationStep(engine,n,goal,step,dt){
 const dx=goal.x-n.pos.x,dz=goal.z-n.pos.z,length=Math.hypot(dx,dz);if(length<.001)return false;
 const vx=dx/length,vz=dz/length,move=(x,z)=>{if(!engine.npcCanMoveTo(n,x,z))return false;n.pos.x=x;n.pos.z=z;return true;};
 if(move(n.pos.x+vx*step,n.pos.z+vz*step)){n.queueTime=0;return true;}
 n.queueTime=(n.queueTime||0)+dt;
 const blocker=engine.npcs.filter(o=>o!==n&&o.floor===n.floor&&!o.dead&&!o.evacuated&&!o.lying&&!o.baby&&distance(o.pos,n.pos)<.85).sort((a,b)=>distance(a.pos,n.pos)-distance(b.pos,n.pos))[0];
 // A person directly ahead keeps their place. Overtaking a same-direction
 // queue caused the previous crowd to fan out and block the entire corridor.
 if(blocker){const ahead=(blocker.pos.x-n.pos.x)*vx+(blocker.pos.z-n.pos.z)*vz;if(ahead>.17&&n.queueTime<1.5)return false;if(ahead<.17&&n.id.localeCompare(blocker.id)>0&&n.queueTime<2)return false;}
 for(const angle of[.55,-.55,1.05,-1.05,1.57,-1.57]){const x=(vx*Math.cos(angle)-vz*Math.sin(angle))*step,z=(vz*Math.cos(angle)+vx*Math.sin(angle))*step;if(move(n.pos.x+x,n.pos.z+z))return true;}
 return false;
}
