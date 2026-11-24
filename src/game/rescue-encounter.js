import * as T from 'three';
import {mesh,material} from './assets.js';
import {weaponModel} from './gear.js';
import {disposeObjectResources} from './resources.js';
import {segmentHit3D,obstacleBounds} from './collision.js';
import {GasMist,syringeModel,gasExposure,incapacitate,holdEnemyProp} from './enemy-effects.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class RescueEncounter{
 constructor(e,patient){
  this.e=e;this.patient=patient;this.started=false;this.ready=false;this.root=new T.Group();this.root.name='Rescue confrontation';e.scene.add(this.root);
  const doctors=e.npcs.filter(n=>n.operationDoctor),story=e.mission.playMode==='story',first=Math.floor(e.mission.random()*doctors.length),both=!story&&e.mission.random()<.35,variant=story?0:Math.floor(e.mission.random()*3);
  this.entries=doctors.map((n,i)=>{const resists=story||both||i===first||e.mission.difficulty==='hard';n.rescueResisting=resists;n.rescueSurrendered=!resists;return{n,index:i,resists,kind:['gun','injection','gas'][(i+variant)%3],phase:'waiting',tactic:i%2?'hide':'engage',escapeAt:Infinity};});
  this.coverPoints=this.findCover();
 }
 findCover(){if(!this.e.systems)return[];const e=this.e,nav=e.systems.navigationFor(3),out=[];for(const c of e.hospitals[3].colliders){const b=obstacleBounds(c);if((b.maxY||0)<.65)continue;for(const p of [{x:b.minX-.7,z:b.minZ-.7},{x:b.maxX+.7,z:b.maxZ+.7}]){const node=nav.nearest(p).point;if(dist(node,p)<1.1&&e.canStand(node.x,node.z,.3,3)&&!out.some(o=>dist(o,node)<2))out.push(node);}}return out;}
 speak(n,text){this.e.life?.speak(n,text,true);}
 fail(reason){if(!this.e.mission.result){this.e.mission.finish(false,reason);this.e.finish();}}
 begin(){if(this.started)return;const e=this.e,m=e.mission;this.started=true;this.at=m.elapsed;this.speak({id:'rescue-detective',name:e.playerProfile?.name||'Detective',person:e.playerProfile,pos:e.playerPos,floor:3,visual:e.player},'Raise your hands! You’re under arrest!');for(const d of e.levels[3].doors)d.locked=false;
  for(const a of this.entries){const n=a.n;n.rescueResisting=a.resists;n.rescueSurrendered=!a.resists;n.activity=null;n.path=[];n.reporting=null;n.wait=0;if(a.resists){a.phase=a.index%2?'hiding':'relocating';a.attackAt=m.elapsed+2+a.index*.6;a.relocateAt=m.elapsed+5+a.index;n.speed=3.5;this.arm(a);this.chooseCover(a);if(a.index===this.entries.length-1)a.escapeAt=m.elapsed+35+a.index*3;this.speak(n,'You are not taking me anywhere.');}else{a.phase='surrendered';n.activity='surrender';this.speak(n,'Please, don’t shoot. I surrender.');}}
 }
 arm(a){if(a.kind==='gun')a.prop=weaponModel('pistol');else if(a.kind==='injection')a.prop=syringeModel();else{a.prop=new T.Group();mesh('cylinder',material('#52636c'),[.035,.14,.035],[0,0,0],a.prop);mesh('box',material('#afc1c8'),[.03,.025,.035],[0,.08,.02],a.prop);a.mist=new GasMist(this.root);}a.n.visual.root.add(a.prop);}
 chooseCover(a){const e=this.e,n=a.n,available=this.coverPoints.filter(p=>dist(p,n.pos)>2.5&&dist(p,e.playerPos)>3).sort((x,y)=>{const blocked=p=>!this.clear({x:p.x,y:1.2,z:p.z},{x:e.playerPos.x,y:1.2,z:e.playerPos.z});return Number(blocked(y))-Number(blocked(x))||dist(x,n.pos)-dist(y,n.pos);});const goal=available[a.index%Math.min(4,available.length)]||e.systems.navigationFor(3).nearest(e.levels[3].rooms[(a.index+1)%e.levels[3].rooms.length].center).point;a.goal={...goal};a.coverGoal={...goal};a.nextPeek=e.mission.elapsed+2.5;e.routeNPC(n,goal);a.routeAt=e.mission.elapsed+1;a.phase=a.index%2?'hiding':'relocating';}
 clear(from,to){return !this.e.hospitals[3].colliders.some(c=>{const t=segmentHit3D(from,to,obstacleBounds(c));return t!==null&&t<.98;});}
 visible(a){return a.n.floor===this.e.floor&&this.clear({x:a.n.pos.x,y:1.4,z:a.n.pos.z},{x:this.e.playerPos.x,y:this.e.crouched?.9:1.4,z:this.e.playerPos.z});}
 spray(a){a.mist||=new GasMist(this.root);a.gas={at:this.e.mission.elapsed,from:a.n.pos.clone(),to:this.e.playerPos.clone(),applied:false};this.e.audio.sound('gas');this.e.notify('Gas spray · move sideways or get behind solid cover.','danger');}
 cuff(a){if(a.phase!=='surrendered'||!this.ready||this.e.floor!==3||dist(a.n.pos,this.e.playerPos)>1.8)return false;a.phase='cuffed';a.n.rescueCuffed=true;a.n.activity='restrained';a.cuffs=[];for(const side of ['Right','Left']){const hand=a.n.visual.model?.getObjectByName(side+'Hand');if(hand){const ring=new T.Mesh(new T.TorusGeometry(.037,.008,6,12),material('#b2bec3',{metalness:.8}));ring.rotation.y=Math.PI/2;hand.add(ring);a.cuffs.push(ring);}}this.e.audio.sound('interact');this.e.notify('Doctor secured · escort them with the patient.','clue');return true;}
 canRelease(){return this.ready&&this.entries.every(a=>a.resists?a.n.dead:a.phase==='cuffed');}
 interactions(){return this.entries.filter(a=>this.ready&&a.phase==='surrendered'&&a.n.floor===this.e.floor).map(a=>({type:'rescue-cuff',id:a.n.id,label:'Handcuff surrendered doctor',x:a.n.pos.x,z:a.n.pos.z}));}
 interact(item){const a=this.entries.find(a=>a.n.id===item.id);return a?this.cuff(a):false;}
 follow(n){const e=this.e;if(!e.mission.patientReleased)return;n.speed=2.5;n.activity=null;const apart=n.floor!==e.floor,lift=e.hospitals[n.floor].lift,goal=apart?{x:lift.x,z:lift.faceZ-1.25}:{x:e.playerPos.x+.75,z:e.playerPos.z+.6};if(apart&&dist(n.pos,goal)<1){const arrival=e.systems.arrivalSpot(e.floor,n);if(arrival){n.floor=e.floor;n.pos.set(arrival.x,0,arrival.z);n.nextFollow=0;}}else if(dist(n.pos,goal)>1.5&&e.mission.elapsed>=(n.nextFollow||0)){e.routeNPC(n,goal);n.nextFollow=e.mission.elapsed+.8;}else if(dist(n.pos,goal)<1.5)n.path=[];}
 prepare(n){const a=this.entries.find(a=>a.n===n);if(!a||n.dead||!this.started)return false;const e=this.e,now=e.mission.elapsed;if(a.phase==='cuffed'){this.follow(n);return true;}if(a.phase==='surrendered'){n.path=[];n.activity='surrender';return true;}n.activity=null;n.reaction=0;
  if(a.phase==='escaping'){const lift=e.hospitals[3].lift;lift.open=true;lift.closeTimer=2;if(now>=(a.routeAt||0)){e.routeNPC(n,{x:lift.x,z:lift.faceZ-1.25});a.routeAt=now+.8;}return true;}
  if(a.injectAt!=null){n.path=[];return true;}
  if(a.phase==='peeking'){if(now>=a.peekUntil){a.goal={...a.coverGoal};a.phase='relocating';a.nextPeek=now+3;e.routeNPC(n,a.goal);}else if(dist(n.pos,a.goal)<.4)n.path=[];return true;}
  if(a.phase==='cover'&&now>=a.nextPeek&&e.floor===3){
   const nav=e.systems.navigationFor(3),cover=a.coverGoal,candidates=[[1.4,0],[-1.4,0],[0,1.4],[0,-1.4],[2.4,0],[-2.4,0]].map(([x,z])=>nav.nearest({x:cover.x+x,z:cover.z+z}).point).filter(p=>dist(p,cover)>.6&&dist(p,cover)<3.5&&this.clear({x:p.x,y:1.4,z:p.z},{x:e.playerPos.x,y:e.crouched?.9:1.4,z:e.playerPos.z}));
   const point=candidates.sort((p,q)=>dist(p,cover)-dist(q,cover))[0];a.nextPeek=now+4;if(point){a.goal={...point};a.phase='peeking';a.peekUntil=now+2.4;a.attackAt=Math.min(a.attackAt,now+.8);e.routeNPC(n,point);return true;}
  }
  const close=dist(n.pos,e.playerPos)<8&&this.visible(a);
  if(a.kind==='injection'&&close){if(now>=(a.routeAt||0)){e.routeNPC(n,e.playerPos);a.routeAt=now+.45;}a.phase='attacking';}
  else if(a.goal&&dist(n.pos,a.goal)<.65){n.path=[];a.phase=a.tactic==='engage'||close?'cover':'hiding';}
  else if(now>=(a.routeAt||0)&&a.goal){e.routeNPC(n,a.goal);a.routeAt=now+1.2;}
  return true;
 }
 update(dt){const e=this.e,m=e.mission;if(m.result)return;if(!this.started&&e.floor===3)this.begin();if(!this.started)return;const now=m.elapsed,lift=e.hospitals[3].lift;
  for(const a of this.entries){const n=a.n;if(n.dead){if(a.prop)a.prop.visible=false;a.mist?.hide();continue;}if(!a.resists)continue;
   if(e.floor===3&&a.phase==='escaping'&&dist(n.pos,{x:lift.x,z:lift.faceZ-1.25})<.7){this.fail('A resisting doctor reached the elevator and escaped.');return;}
   if(now>=a.escapeAt&&a.phase!=='escaping'){a.phase='escaping';a.routeAt=0;n.speed=4.1;n.path=[];e.notify('A resisting doctor is heading for the elevator.','danger');}
   if(a.phase!=='escaping'&&n.injury?.wounds.length!==a.wounds){a.wounds=n.injury?.wounds.length;if(a.wounds){this.chooseCover(a);a.relocateAt=now+4;}}
   if(a.phase!=='escaping'&&now>=a.relocateAt){this.chooseCover(a);a.relocateAt=now+7+a.index;}
   if(a.gas){const age=now-a.gas.at;a.mist?.update(a.gas.from,a.gas.to,age);if(!a.gas.applied&&age>.2&&dist(e.playerPos,a.gas.from)<5&&dist(e.playerPos,a.gas.to)<1.3&&this.visible(a)){gasExposure(e);a.gas.applied=true;}if(age>2.5){a.gas=null;a.mist?.hide();}}
   if(e.floor!==3||a.phase==='escaping')continue;const d=dist(n.pos,e.playerPos),visible=this.visible(a);
   if(a.injectAt!=null){if(!visible||d>1.05){a.injectAt=null;a.attackAt=now+2;}else if(now-a.injectAt>=.7){incapacitate(e,'The resisting doctor’s injection rendered you unconscious.');return;}continue;}
   if(now<a.attackAt||!visible)continue;
   if(a.kind==='gun'&&d<18){e.audio.sound('shot',{basement:true});e.combat?.hostileShot(n);a.attackAt=now+2.4;if(m.result)return;}
   else if(a.kind==='injection'&&d<.9){a.injectAt=now;n.path=[];e.notify('Syringe raised · back away or break line of sight.','danger');}
   else if(a.kind==='gas'&&!a.gas&&d<5){this.spray(a);a.attackAt=now+6;}
  }
  this.ready=this.entries.filter(a=>a.resists).every(a=>a.n.dead);m.rescueEncounterReady=this.ready;if(this.ready&&!this.announced){this.announced=true;e.notify(this.entries.some(a=>!a.resists)?'Threats stopped · handcuff surrendered doctors and release the patient.':'Threats stopped · release the patient and escort them outside.','clue');}
 }
 pose(){const e=this.e;for(const a of this.entries){const n=a.n;if(n.dead||n.floor!==e.floor)continue;if(a.phase==='surrendered')n.visual.poseActivity?.('surrender',e.time);else if(a.phase==='cuffed')n.visual.poseActivity?.('restrained',e.time);else if(this.started){const crouching=['cover','hiding'].includes(a.phase);n.visual.poseCrouch?.(crouching?.8:0);n.visual.setAim?.(a.kind==='gun'&&this.visible(a));if(a.kind==='gun'&&this.visible(a)&&(!n.path?.length||n.cursor>=n.path.length))n.visual.root.rotation.y=Math.atan2(e.playerPos.x-n.pos.x,e.playerPos.z-n.pos.z);if(a.injectAt!=null)n.visual.poseInjection?.(e.playerPos.clone().setY(1.45),Math.min(1,(e.mission.elapsed-a.injectAt)/.7));if(a.prop)a.prop.visible=true;holdEnemyProp(e,a);}}}
 detaineesPresent(){return this.entries.filter(a=>!a.resists).every(a=>a.phase==='cuffed'&&a.n.floor===0&&dist(a.n.pos,this.e.levels[0].exit)<5.5);}
 dispose(){for(const a of this.entries){if(a.prop){a.prop.removeFromParent();disposeObjectResources(a.prop);}a.mist?.dispose();for(const cuff of a.cuffs||[]){cuff.removeFromParent();disposeObjectResources(cuff);}}this.root.removeFromParent();disposeObjectResources(this.root);this.entries=[];this.e=null;}
}
