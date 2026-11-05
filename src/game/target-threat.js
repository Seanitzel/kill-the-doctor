const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// A short recognition window lets a truly immediate shot land before speech.
// Deadlines use mission time, so pause and menus do not burn the escape window.
export class TargetThreat{
 constructor(e){this.e=e;this.seenAt=null;this.reactAt=null;this.deadline=null;}
 target(){return this.e.npcs.find(n=>n.id==='target'&&!n.dead);}
 visible(n){const e=this.e,d=distance(n.pos,e.playerPos);if(d<.12)return true;const dx=e.playerPos.x-n.pos.x,dz=e.playerPos.z-n.pos.z,yaw=n.visual.root.rotation.y;return n.floor===e.floor&&d<13&&(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d>.18&&e.lineOfSight(n.pos,e.playerPos,n.floor);}
 hearShot(){const e=this.e,n=this.target();if(n&&e.mission.type==='standard'&&!e.mission.targetDown&&n.floor===e.floor&&distance(n.pos,e.playerPos)<28){this.reactAt=e.mission.elapsed;}}
 react(n){const e=this.e,now=e.mission.elapsed;if(this.deadline!==null)return;this.deadline=now+15;n.reporting=null;n.reaction=.45;n.activity=null;n.path=[];n.speed=4.4;n.targetFlee=true;n.clinicalPatient=null;n.voiceVersion=(n.voiceVersion||0)+1;if(e.life?.queue)e.life.queue=e.life.queue.filter(line=>line.actor!==n);e.audio.gasp?.({x:n.pos.x,y:1.5,z:n.pos.z,floor:n.floor});e.audio.evacuationScream?.(n.person,{x:n.pos.x,y:1.5,z:n.pos.z,floor:n.floor});e.notify('The target saw your weapon · stop them before they escape (15 seconds).','danger');this.nextRoute=0;}
 prepare(n){if(!n.targetFlee||n.dead||this.e.mission.targetDown)return false;const e=this.e;n.activity=null;if(e.mission.elapsed>=(this.nextRoute||0)){const goal=n.floor?e.levels[n.floor].elevator:{x:0,z:39};e.routeNPC(n,goal);this.nextRoute=e.mission.elapsed+1.2;}return true;}
 update(){const e=this.e,m=e.mission,n=this.target();if(m.type!=='standard'||m.targetDown||m.result||!n)return;
  if(this.deadline!==null){if(m.elapsed>=this.deadline){m.finish(false,'The target escaped and reported the armed attack.');e.finish();}return;}
  if(this.visible(n)&&e.weaponDrawn){this.seenAt??=m.elapsed;this.reactAt??=this.seenAt+.28;}else if(this.reactAt!==null&&this.seenAt!==null){this.seenAt=null;this.reactAt=null;}
  if(this.reactAt!==null&&m.elapsed>=this.reactAt)this.react(n);
 }
}
