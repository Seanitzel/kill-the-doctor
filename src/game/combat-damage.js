import * as T from 'three';
import {applyInjury,injuryLabel} from './injury.js';
import {bodyHit,aimAtRegion} from './hit-regions.js';
import {poseInjury} from './injury-pose.js';
import {segmentHit3D,obstacleBounds} from './collision.js';
export class CombatDamage {
 constructor(e){this.e=e;this.marks=new Set();e.playerInjury=null;}
 damage(actor,hit,player=false){
  const e=this.e,state=applyInjury(player?e.playerInjury:actor.injury,hit);if(player)e.playerInjury=state;else actor.injury=state;
  this.mark(player?e.player:actor.visual,hit);
  e.audio.patientPain?.(player?e.playerProfile:actor.person,{x:actor.pos.x,y:1.3,z:actor.pos.z,floor:player?e.floor:actor.floor},.55);
  return state;
 }
 mark(visual,hit){
  if(!hit.bone)return;const geometry=new T.SphereGeometry(.026,8,5),material=new T.MeshBasicMaterial({color:'#a64b51',transparent:true,opacity:.8}),mark=new T.Mesh(geometry,material);mark.name='Subtle injury impact';const scale=hit.bone.getWorldScale(new T.Vector3());mark.scale.set(1/scale.x,1/scale.y,.28/scale.z);hit.bone.updateWorldMatrix(true,false);mark.position.copy(hit.bone.worldToLocal(hit.point.clone()));const worldQ=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),hit.normal||new T.Vector3(0,0,1));mark.quaternion.copy(hit.bone.getWorldQuaternion(new T.Quaternion()).invert().multiply(worldQ));hit.bone.add(mark);this.marks.add(mark);
  const own=[...this.marks].filter(m=>m.userData.avatar===visual);mark.userData.avatar=visual;if(own.length>=3)this.release(own[0]);
 }
 release(mark){mark.removeFromParent();mark.geometry.dispose();mark.material.dispose();this.marks.delete(mark);}
 lockAim(){
  const e=this.e,r=e.mission.random(),part=r<.18?'chest':r<.25?'head':r<.60?'arm':r<.88?'leg':'hips',side=e.mission.random()<.5?'Left':'Right';
  return aimAtRegion(e.player,part,side);
 }
 hostileShot(actor,aim){
  const e=this.e;if(e.mission.result||actor.dead||actor.floor!==e.floor)return null;
  const origin=actor.visual.hand?.getWorldPosition(new T.Vector3())||actor.pos.clone().setY(1.4),target=(aim||this.lockAim()).clone();
  const spread=.035+(e.mission.save.upgrades.vitals||0)*.065;target.x+=(e.mission.random()-.5)*spread*2;target.y+=(e.mission.random()-.5)*spread*2;
  const ray=new T.Ray(origin,target.sub(origin).normalize()),hit=bodyHit(e.player,ray,35),end=hit?.point||ray.at(20,new T.Vector3());
  let blocked=false;for(const c of e.hospitals[e.floor].colliders){const t=segmentHit3D(origin,end,obstacleBounds(c));if(t!==null&&t<.99){end.copy(origin).lerp(end,t);blocked=true;break;}}
  const tracer=new T.Line(new T.BufferGeometry().setFromPoints([origin,end]),new T.LineBasicMaterial({color:'#f2ba93',transparent:true,opacity:.7}));e.scene.add(tracer);e.effects.push({mesh:tracer,life:.10});
  if(!hit||blocked){e.hooks.soundCaption?.('Shot missed. Keep moving and use solid cover.');return null;}
  const state=this.damage({pos:e.playerPos}, {...hit,normal:ray.direction.clone().negate()},true);
  if(state.dead){e.mission.finish(false,state.cause==='blood-loss'?'Three non-lethal gunshot wounds caused fatal blood loss.':`Fatal ${state.cause} shot.`);e.finish();}
  else{e.notify(`${injuryLabel(state)} · fight back or escape using cover`,'danger');e.emitHUD();}return state;
 }
 pose(){
  const e=this.e;if(!e.playerInjury&&!e.npcs.some(n=>n.injury))return;poseInjury(e.player,e.playerInjury,e.time,e.playerSpeed);
  for(const n of e.npcs)if(!n.dead&&n.injury&&n.animationVisible!==false&&n.floor===e.floor)poseInjury(n.visual,n.injury,e.time,n.movementSpeed);
  const grips=[{n:{visual:e.player},gun:e.weapon},...(e.securityResponse?.guns||[]),...(e.escapeThreats?.entries||[]).filter(a=>a.kind==='gun').map(a=>({n:a.n,gun:a.prop})),...e.npcs.filter(n=>n.recruit?.weapon).map(n=>({n,gun:n.recruit.weapon}))];
  for(const {n,gun}of grips)if(gun?.visible&&n.visual.hand){n.visual.root.updateWorldMatrix(true,true);gun.position.copy(n.visual.root.worldToLocal(n.visual.hand.getWorldPosition(new T.Vector3())));}
 }
 dispose(){for(const mark of [...this.marks])this.release(mark);this.e=null;}
}
