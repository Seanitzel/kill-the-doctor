import {seesDrawnWeapon} from './loadout.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class OperatingTeamEscape{
 constructor(e){this.e=e;this.active=false;}
 panic(){const e=this.e;if(this.active||!e.mission.china||e.floor!==3||e.mission.result)return;this.active=true;this.at=e.mission.elapsed;const lift=e.hospitals[3].lift;this.goal={x:lift.x,z:lift.faceZ-1.25};
  for(const n of e.npcs.filter(n=>n.operationDoctor&&!n.dead&&!n.injury?.dead)){e.systems.stand(n,this.goal);n.operatingFlee=true;n.speed=4.2;n.reporting=null;n.nextOperatingRoute=0;n.voiceVersion=(n.voiceVersion||0)+1;e.life?.speak(n,"Please don't do this. Please let me go!",true);e.audio.gasp?.({x:n.pos.x,y:1.5,z:n.pos.z,floor:3});}
 }
 prepare(n){if(!n.operatingFlee||n.dead)return false;const e=this.e;n.activity=null;n.reporting=null;if(n.escapeLiftAt!=null){n.path=[];return true;}if(e.mission.elapsed>=(n.nextOperatingRoute||0)){const lift=e.hospitals[3].lift;if(!lift.departingDoctor){lift.open=true;lift.closeTimer=2;}e.routeNPC(n,this.goal);n.nextOperatingRoute=e.mission.elapsed+.8;}return true;}
 update(){const e=this.e,m=e.mission;if(m.result||!m.china)return;
  if(!this.active&&e.floor===3&&e.weaponDrawn&&e.npcs.some(n=>n.operationDoctor&&!n.dead&&!n.injury?.dead&&seesDrawnWeapon(n.pos,e.playerPos,n.visual.root.rotation.y,e.lineOfSight(n.pos,e.playerPos,3),15)))this.panic();
  if(!this.active)return;const lift=e.hospitals[3].lift;if(!e.npcs.some(n=>n.operatingFlee&&!n.dead&&n.escapeLiftAt!=null))delete lift.departingDoctor;
  for(const n of e.npcs.filter(n=>n.operatingFlee&&!n.dead)){
   if(n.escapeLiftAt==null&&distance(n.pos,this.goal)<.45&&lift.amount>.8){n.escapeLiftAt=m.elapsed;n.path=[];}
   if(n.escapeLiftAt!=null){lift.open=m.elapsed-n.escapeLiftAt<.65;lift.closeTimer=0;lift.departingDoctor=true;if(!lift.open&&lift.amount<.025){m.finish(false,'An operating doctor escaped upstairs when the lift doors closed.');e.finish();return;}}
  }
 }
}
