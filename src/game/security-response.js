import * as T from 'three';
import {segmentHit3D,obstacleBounds} from './collision.js';
import {weaponModel} from './gear.js';
import {disposeObjectResources} from './resources.js';
import {complicityFor} from './security-rules.js';
const guardAlert=m=>!!(m.policeAlert||m.targetDown&&(!m.covertDeath||m.bodyDiscovered));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class SecurityResponse{
 constructor(e){this.e=e;this.root=new T.Group();this.root.name='Accomplice indicators';e.scene.add(this.root);this.markers=[];this.guns=[];this.health=3+(e.mission.save.upgrades.vitals||0);const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d');c.strokeStyle='#ff4f4f';c.lineWidth=4;c.beginPath?.();c.arc?.(32,32,19,0,Math.PI*2);c.stroke?.();c.beginPath?.();c.arc?.(32,32,8,0,Math.PI*2);c.stroke?.();for(const [x,y,xx,yy]of[[32,4,32,20],[32,44,32,60],[4,32,20,32],[44,32,60,32]]){c.beginPath?.();c.moveTo?.(x,y);c.lineTo?.(xx,yy);c.stroke?.();}this.texture=new T.CanvasTexture(canvas);this.material=new T.SpriteMaterial({map:this.texture,transparent:true,depthWrite:false,depthTest:true});
 for(const n of e.npcs){n.complicity ||= complicityFor(n);if(n.complicity&&n.id!=='target'){const sprite=new T.Sprite(this.material);sprite.scale.set(.42,.42,1);this.root.add(sprite);this.markers.push({n,sprite});}if(n.role==='security'){if(Number(n.id.split('-').at(-1))%3===2){const seat=e.hospitals[n.floor].seats.find(s=>s.waiting&&!e.npcs.some(o=>o!==n&&o.floor===n.floor&&!o.dead&&dist(o.pos,s)<.8));if(seat){n.pos.set(seat.x,-.35,seat.z);n.seated=true;n.baselineY=-.35;n.activity='rest';n.visual.root.rotation.y=seat.rotation;n.stationary=true;}}const gun=weaponModel('pistol');gun.visible=false;n.visual.root.add(gun);this.guns.push({n,gun});}}
 }
 prepare(n){const e=this.e;if(n.role!=='security'||n.dead)return false;if(!guardAlert(e.mission))return n.stationary? (n.path=[],n.activity='rest',true):false;n.evacuating=false;if(n.seated)e.systems.stand(n,e.playerPos);n.activity=null;n.seated=false;n.pos.y=0;n.speed=2.65;
 if(n.floor!==e.floor){const lift=e.levels[n.floor].elevator;if(dist(n.pos,lift)<2.3){const p=e.systems.arrivalSpot(e.floor,n);if(p){n.floor=e.floor;n.pos.set(p.x,0,p.z);n.path=[];}}else if(e.mission.elapsed>=(n.nextGuardRoute||0)){e.routeNPC(n,lift);n.nextGuardRoute=e.mission.elapsed+1.5;}return true;}
 if(e.mission.elapsed>=(n.nextGuardRoute||0)){e.routeNPC(n,e.playerPos);n.nextGuardRoute=e.mission.elapsed+1.3;}return true;
 }
 update(dt){const e=this.e,now=e.mission.elapsed;this.root.visible=!!e.mission.targetDown;for(const {n,sprite}of this.markers){sprite.visible=!n.dead&&!n.evacuated&&n.floor===e.floor;sprite.position.set(n.pos.x,2.18,n.pos.z);}
 for(const {n,gun}of this.guns){const active=!n.dead&&n.floor===e.floor&&guardAlert(e.mission);gun.visible=active;if(!active)continue;n.visual.setAim?.(true);n.visual.poseActivity?.('examine',e.time);if(n.visual.hand){n.visual.root.updateMatrixWorld(true);n.visual.hand.getWorldPosition(this.grip??=new T.Vector3());gun.position.copy(n.visual.root.worldToLocal(this.grip));gun.position.z+=.05;}
 const d=dist(n.pos,e.playerPos),exposed=d<12&&d>1.5&&e.lineOfSight(n.pos,e.playerPos,n.floor)&&!e.hospitals[n.floor].colliders.some(c=>{const hit=segmentHit3D({x:n.pos.x,y:1.5,z:n.pos.z},{x:e.playerPos.x,y:e.crouched?1.02:1.5,z:e.playerPos.z},obstacleBounds(c));return hit!==null&&hit<.98;});if(!exposed){n.guardSeenAt=null;continue;}n.guardSeenAt??=now;if(now-n.guardSeenAt<2||now<(n.guardShotAt||0))continue;n.guardShotAt=now+3.5;e.audio.sound('shot');e.hooks.soundCaption?.('Security fires. Duck behind solid cover to break their sightline.');this.health--;e.notify(`Security hit · ${Math.max(0,this.health)} protection remaining`,'danger');if(this.health<=0){e.mission.finish(false,'Security stopped you. Use walls and furniture as cover while escaping.');e.finish();return;}}
 }
 dispose(){for(const {gun}of this.guns){gun.removeFromParent();disposeObjectResources(gun);}this.root.removeFromParent();this.root.clear();this.texture.dispose();this.material.dispose();this.guns=[];this.markers=[];this.e=null;}
}
