const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Commit to one passing side until clear. Changing side each blocked frame is
// what made patients orbit the player and flick between walking and idle.
export function crowdStep(engine,n,goal,step,dt){
 if(step>.12){const count=Math.ceil(step/.12);let moved=false;for(let i=0;i<count;i++)moved=crowdStep(engine,n,goal,step/count,dt/count)||moved;return moved;}
 const dx=goal.x-n.pos.x,dz=goal.z-n.pos.z,dist=Math.hypot(dx,dz);if(dist<.001)return false;
 const vx=dx/dist,vz=dz/dist,amount=Math.min(dist,step),now=engine.mission.elapsed;
 // A person near the route is not necessarily in the way. Take the clear
 // direct step first; premature side waypoints made people orbit seats/goals.
 const x=n.pos.x+vx*amount,z=n.pos.z+vz*amount;
 if(engine.npcCanMoveTo(n,x,z)){n.pos.x=x;n.pos.z=z;n.crowdBlocked=0;if(n.passing&&(n.passing.blocker.x-n.pos.x)*vx+(n.passing.blocker.z-n.pos.z)*vz<-.2)n.passing=null;return true;}
 const people=(engine.crowdIndex?.nearby(n.pos,n.floor)||engine.npcs).filter(o=>o!==n&&o.floor===n.floor&&!o.dead&&!o.evacuated&&!o.lying&&!o.baby).map(o=>o.pos);if(n.floor===engine.floor)people.push(engine.playerPos);
 const blocker=people.filter(p=>{const px=p.x-n.pos.x,pz=p.z-n.pos.z;return px*vx+pz*vz>-.1&&px*vx+pz*vz<1.15&&Math.abs(px*vz-pz*vx)<.68;}).sort((a,b)=>distance(a,n.pos)-distance(b,n.pos))[0];
 if(!blocker)return false;if(now<(n.yieldUntil||0))return false;
 if(n.passing&&now>n.passing.until){n.passing=null;n.yieldUntil=now+.45;return false;}
 if(!n.passing){const side=[-1,1].find(side=>engine.canStand(n.pos.x-vz*.68*side,n.pos.z+vx*.68*side,.25,n.floor));if(!side)return false;n.passing={side,blocker:{x:blocker.x,z:blocker.z},until:now+3};}
 // A short lateral step opens a safe tangent, without a backwards loop around
 // a fixed waypoint. Keep one passing side until this body is behind us.
 const px=n.pos.x-vz*amount*n.passing.side,pz=n.pos.z+vx*amount*n.passing.side;
 if(!engine.npcCanMoveTo(n,px,pz)){n.crowdBlocked=(n.crowdBlocked||0)+dt;return false;}
 n.pos.x=px;n.pos.z=pz;n.crowdBlocked=0;return true;
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
 if(step>.12){const count=Math.ceil(step/.12);let moved=false;for(let i=0;i<count;i++)moved=evacuationStep(engine,n,goal,step/count,dt/count)||moved;return moved;}

 const dx=goal.x-n.pos.x,dz=goal.z-n.pos.z,length=Math.hypot(dx,dz);if(length<.001)return false;
 const vx=dx/length,vz=dz/length,move=(x,z)=>{if(!engine.npcCanMoveTo(n,x,z))return false;n.pos.x=x;n.pos.z=z;return true;};
 if(move(n.pos.x+vx*step,n.pos.z+vz*step)){n.queueTime=0;return true;}
 n.queueTime=(n.queueTime||0)+dt;
 const blocker=(engine.crowdIndex?.nearby(n.pos,n.floor)||engine.npcs).filter(o=>o!==n&&o.floor===n.floor&&!o.dead&&!o.evacuated&&!o.lying&&!o.baby&&distance(o.pos,n.pos)<.85).sort((a,b)=>distance(a.pos,n.pos)-distance(b.pos,n.pos))[0];
 // A person directly ahead keeps their place. Overtaking a same-direction
 // queue caused the previous crowd to fan out and block the entire corridor.
 if(blocker){const ahead=(blocker.pos.x-n.pos.x)*vx+(blocker.pos.z-n.pos.z)*vz;if(ahead>.17&&n.queueTime<1.5)return false;if(ahead<.17&&n.id.localeCompare(blocker.id)>0&&n.queueTime<2)return false;}
 const turns=[.55,-.55,1.05,-1.05];
 for(const angle of turns){const x=(vx*Math.cos(angle)-vz*Math.sin(angle))*step,z=(vz*Math.cos(angle)+vx*Math.sin(angle))*step;if(move(n.pos.x+x,n.pos.z+z))return true;}
 return false;
}
