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
