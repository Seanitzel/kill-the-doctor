import {SeatMotion} from './seat-motion.js';
import {securityChair} from './security-chair.js';
import {footprint,segmentHit3D,obstacleBounds} from './collision.js';
import * as T from 'three';
import {weaponModel} from './gear.js';
import {disposeObjectResources} from './resources.js';
import {complicityFor} from './security-rules.js';
const guardAlert=m=>!!(m.policeAlert||m.suspicion>80||m.targetDown&&(!m.covertDeath||m.bodyDiscovered));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class SecurityResponse{
 constructor(e){
  this.e=e;this.root=new T.Group();this.root.name='Security and accomplice indicators';e.scene.add(this.root);this.markers=[];this.guns=[];
  this.stationRoot=new T.Group();this.stationRoot.name='Security folding chair station';e.scene.add(this.stationRoot);this.stationColliders=[];this.health=3+(e.mission.save.upgrades.vitals||0);
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d');c.strokeStyle='#ff4f4f';c.lineWidth=4;c.beginPath?.();c.arc?.(32,32,19,0,Math.PI*2);c.stroke?.();c.beginPath?.();c.arc?.(32,32,8,0,Math.PI*2);c.stroke?.();for(const[x,y,xx,yy]of[[32,4,32,20],[32,44,32,60],[4,32,20,32],[44,32,60,32]]){c.beginPath?.();c.moveTo?.(x,y);c.lineTo?.(xx,yy);c.stroke?.();}
  this.texture=new T.CanvasTexture(canvas);this.material=new T.SpriteMaterial({map:this.texture,transparent:true,depthWrite:false,depthTest:true});
  for(const n of e.npcs){n.complicity||=complicityFor(n);if((n.complicity||n.role==='security')&&n.id!=='target'){const sprite=new T.Sprite(this.material);sprite.scale.set(.42,.42,1);this.root.add(sprite);this.markers.push({n,sprite});}
   if(n.role!=='security')continue;
   if(n.outsideGuard)this.setupStation(n);
   else if(Number(n.id.split('-').at(-1))%3===2){const seat=e.hospitals[n.floor].seats.find(s=>s.waiting&&!e.npcs.some(o=>o!==n&&o.floor===n.floor&&!o.dead&&dist(o.pos,s)<.8));if(seat){n.pos.set(seat.x,-.35,seat.z);n.seated=true;n.baselineY=-.35;n.activity='rest';n.visual.root.rotation.y=seat.rotation;n.stationary=true;n.guardStanding={x:seat.x+Math.sin(seat.rotation)*.9,z:seat.z+Math.cos(seat.rotation)*.9};n.guardSeat=seat;}}
   const gun=weaponModel('pistol');gun.visible=false;n.visual.root.add(gun);const baton=new T.Mesh(new T.CylinderGeometry(.014,.018,.40,10),new T.MeshStandardMaterial({color:'#111820',roughness:.65}));baton.name='Security inspection baton';baton.visible=false;n.visual.root.add(baton);this.guns.push({n,gun,baton});
  }
 }
 setupStation(n){
  const e=this.e;if(e.canStand(-1.05,37.4,.3,0))n.pos.set(-1.05,0,37.4);const seat={x:n.pos.x,z:n.pos.z-.95,rotation:0,yOffset:-.19,security:true},chair=securityChair();chair.position.set(seat.x,0,seat.z);this.stationRoot.add(chair);
  const c=footprint(seat.x,seat.z,.59,.66,1.3,0,'security-chair');e.hospitals[0].colliders.push(c);this.stationColliders.push(c);e.systems.navigation[0]=null;
  n.guardStanding={x:n.pos.x,z:n.pos.z};n.guardSeat=seat;n.visual.root.rotation.y=0;n.idlePhase='stand';n.nextSeatChange=e.mission.elapsed+12+e.mission.random()*12;
 }
 updateSeat(n,dt){
  const e=this.e,alert=guardAlert(e.mission);if(!n.guardSeat)return;const yielding=n.emergencyYieldUntil>e.mission.elapsed;
  if(alert||yielding){if(n.seated&&!n.guardSeatMotion){n.guardSeatMotion=new SeatMotion(n.guardStanding,n.guardSeat);n.guardSeatMotion.amount=1;}n.guardSeatMotion?.stand();}
  else if(n.outsideGuard&&!n.guardSeatMotion&&e.mission.elapsed>=(n.nextSeatChange||0)){
   if(n.idlePhase==='patrol'){n.idlePhase='return';e.routeNPC(n,n.guardStanding);n.nextSeatChange=e.mission.elapsed+5;}
   else if(n.idlePhase==='return'&&dist(n.pos,n.guardStanding)>.45){e.routeNPC(n,n.guardStanding);n.nextSeatChange=e.mission.elapsed+3;}
   else if(n.seated){n.guardSeatMotion=new SeatMotion(n.guardStanding,n.guardSeat);n.guardSeatMotion.amount=1;n.guardSeatMotion.stand();n.idlePhase='stand';n.nextSeatChange=e.mission.elapsed+14;}
   else if(n.idlePhase==='stand'&&n.hasSat){n.idlePhase='patrol';n.hasSat=false;n.speed=1.25;const goal={x:n.guardStanding.x+.35,z:n.guardStanding.z+1.45};e.routeNPC(n,goal);n.nextSeatChange=e.mission.elapsed+8;}
   else{n.path=[];n.guardSeatMotion=new SeatMotion(n.guardStanding,n.guardSeat);n.idlePhase='sit';n.hasSat=true;n.nextSeatChange=e.mission.elapsed+22+e.mission.random()*14;}
  }
  if(n.guardSeatMotion){const motion=n.guardSeatMotion,p=motion.update(dt);n.pos.set(p.x,p.y,p.z);n.seatPose=p;n.seated=p.weight>.99;n.baselineY=p.y;n.visual.root.rotation.y=n.guardSeat.rotation;if(motion.done){n.seated=!!motion.target;n.guardSeatMotion=null;if(!n.seated){n.baselineY=0;n.seatPose=null;}}}
 }
 clearShot(n){const e=this.e;return n.floor===e.floor&&e.lineOfSight(n.pos,e.playerPos,n.floor)&&!e.hospitals[n.floor].colliders.some(c=>{const t=segmentHit3D({x:n.pos.x,y:1.5,z:n.pos.z},{x:e.playerPos.x,y:e.crouched?1.02:1.5,z:e.playerPos.z},obstacleBounds(c));return t!==null&&t<.98;});}
 pose(){const e=this.e;for(const{n,gun,baton}of this.guns){if(n.dead||n.floor!==e.floor||n.animationVisible===false)continue;const active=guardAlert(e.mission),checking=!active&&e.mission.elapsed<(n.guardInspectionUntil||0);baton.visible=checking;const holstered=n.visual.model?.getObjectByName('KTD security baton');if(holstered)holstered.visible=!checking;n.visual.setAim?.(false);if(active)n.visual.root.rotation.y=Math.atan2(e.playerPos.x-n.pos.x,e.playerPos.z-n.pos.z);n.visual.poseActivity?.(active?(this.restraining?.n===n?'guard-restrain':'guard-aim'):checking?'guard-aim':n.movementSpeed>.1?'rest':'guard',e.time);if(n.seatPose||n.seated)n.visual.poseSeated?.(n.seatPose?.weight??1,n.seatPose?.lean??0);if((active||checking)&&n.visual.hand){n.visual.root.updateMatrixWorld(true);n.visual.hand.getWorldPosition(this.grip??=new T.Vector3());gun.position.copy(n.visual.root.worldToLocal(this.grip));if(checking){baton.position.copy(gun.position);baton.position.y+=.15;baton.rotation.x=.5;}}}}
 prepare(n){
  const e=this.e;if(n.role!=='security'||n.dead)return false;
  if(!guardAlert(e.mission)&&n.emergencyYieldUntil>e.mission.elapsed){n.activity=n.guardSeatMotion||n.seated?'rest':null;return true;}
  if(!guardAlert(e.mission)){if(n.outsideGuard){n.activity=null;if(!['patrol','return'].includes(n.idlePhase)){n.path=[];n.activity='guard';n.visual.root.rotation.y=0;}return true;}return n.stationary?(n.path=[],n.activity='guard',true):false;}
  n.evacuating=false;if(n.guardSeat&&(n.seated||n.guardSeatMotion)){n.path=[];return true;}if(n.seated)e.systems.stand(n,e.playerPos);n.activity=null;n.seated=false;n.pos.y=0;n.speed=3.1;
  if(this.restraining?.n===n){n.path=[];return true;}
  if(n.floor!==e.floor){const lift=e.levels[n.floor].elevator;if(dist(n.pos,lift)<2.3){const p=e.systems.arrivalSpot(e.floor,n);if(p){n.floor=e.floor;n.pos.set(p.x,0,p.z);n.path=[];}}else if(e.mission.elapsed>=(n.nextGuardRoute||0)){e.routeNPC(n,lift);n.nextGuardRoute=e.mission.elapsed+1;}return true;}
  if(e.mission.elapsed>=(n.nextGuardRoute||0)){
   let goal=e.playerPos;
   if(!this.clearShot(n)){
    const candidates=[];for(const radius of[2.2,4])for(let i=0;i<8;i++){const angle=i*Math.PI/4,p={x:e.playerPos.x+Math.sin(angle)*radius,z:e.playerPos.z+Math.cos(angle)*radius};if(e.canStand(p.x,p.z,.25,n.floor)&&e.lineOfSight(p,e.playerPos,n.floor))candidates.push(p);}
    candidates.sort((a,b)=>dist(n.pos,a)-dist(n.pos,b));goal=candidates[n.guardFlank%Math.max(1,candidates.length)||0]||goal;n.guardFlank=(n.guardFlank||0)+1;
   }
   e.routeNPC(n,goal);n.nextGuardRoute=e.mission.elapsed+.85;
  }return true;
 }
 update(dt){
  const e=this.e,now=e.mission.elapsed;this.stationRoot.visible=e.floor===0;this.root.visible=!!e.mission.targetDown;
  for(const{n,sprite}of this.markers){sprite.visible=!n.dead&&!n.evacuated&&!n.accompliceHeld&&n.floor===e.floor;sprite.position.set(n.pos.x,n.hiding?(n.lying?.60:n.seated?1.4:2.05):2.18,n.pos.z);}
  if(this.restraining){const r=this.restraining;if(r.n.dead||r.n.floor!==e.floor||dist(r.n.pos,e.playerPos)>1.7){this.restraining=null;}else if(now-r.at>=.95){e.mission.finish(false,'Security restrained you before you could escape.');e.finish();return;}}
  for(const{n,gun}of this.guns){if(!n.dead)this.updateSeat(n,dt);const active=!n.dead&&n.floor===e.floor&&guardAlert(e.mission);gun.visible=active;if(!active)continue;
   const d=dist(n.pos,e.playerPos),clear=this.clearShot(n);
   if(d<1.35&&clear&&!this.restraining){this.restraining={n,at:now};n.path=[];e.notify('Security is restraining you!','danger');continue;}
   if(!clear||d>15){n.guardOccludedAt??=now;if(now-n.guardOccludedAt>1.5)n.guardSeenAt=null;continue;}
   n.guardOccludedAt=null;n.guardSeenAt??=now;if(d<1.35||now-n.guardSeenAt<1.1||now<(n.guardShotAt||0))continue;
   n.guardShotAt=now+2.8;e.audio.sound('shot');e.hooks.soundCaption?.('Security fires. Break their sightline behind solid cover.');this.health--;e.notify(`Security hit · ${Math.max(0,this.health)} protection remaining`,'danger');if(this.health<=0){e.mission.finish(false,'Security stopped you. Use walls and furniture as cover while escaping.');e.finish();return;}
  }
 }
 dispose(){this.stationRoot.removeFromParent();disposeObjectResources(this.stationRoot);for(const c of this.stationColliders){const a=this.e.hospitals[0].colliders,i=a.indexOf(c);if(i>=0)a.splice(i,1);}this.stationColliders=[];for(const{gun,baton}of this.guns){gun.removeFromParent();disposeObjectResources(gun);baton.removeFromParent();disposeObjectResources(baton);}this.root.removeFromParent();this.root.clear();this.texture.dispose();this.material.dispose();this.restraining=null;this.guns=[];this.markers=[];this.e=null;}
}
