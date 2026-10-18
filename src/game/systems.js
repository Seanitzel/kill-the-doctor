import {EgressNavigation} from './egress.js';
import * as THREE from 'three';
import {tileAt,key} from './layout.js';
import {WITNESS_LINES} from './life-rules.js';
import {seesDrawnWeapon} from './loadout.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class MissionSystems{
  constructor(engine){this.e=engine;this.scan=0;this.magnet=null;this.evacuating=false;this.navigation=[];}
  navigationFor(floor){return this.navigation[floor]||(this.navigation[floor]=new EgressNavigation(this.e.levels[floor],this.e.hospitals[floor].colliders));}
  prepare(){for(let floor=0;floor<this.e.levels.length;floor++){const nav=this.navigationFor(floor);nav.fieldFor(floor?{x:0,z:-24}:{x:0,z:33});}}
  route(n,goal){const nav=this.navigationFor(n.floor);n.path=nav.route(n.pos,goal);n.cursor=n.path.length>1&&nav.clear(n.pos,{x:(n.path[1].x-11)*3,z:(n.path[1].z-11)*3})?1:0;n.wait=.7;}
  stand(n,goal){
    const e=this.e,nav=this.navigationFor(n.floor);
    if(n.lying||n.seated||!e.canStand(n.pos.x,n.pos.z,.24,n.floor)||!nav.route(n.pos,goal).length){
      const node=nav.nearest(n.pos,nav.fieldFor(goal));if(node)n.pos.set(node.point.x,0,node.point.z);
    }
    n.visual.root.rotation.set(0,0,0);n.activity=null;n.seated=n.lying=false;n.baselineY=0;n.pos.y=0;n.hitOffset=null;n.reaction=0;n.path=[];n.cursor=0;
  }
  startEvacuation(){
    if(this.evacuating)return;this.evacuating=true;this.e.audio.sound('alarm');this.e.audio.nextBeep=(this.e.audio.ctx?.currentTime||0)+2.4;
    for(const level of this.e.levels)for(const door of level.doors){door.locked=false;door.open=true;}
    for(const n of this.e.npcs){if(n.dead||n.baby||n.rescuePatient||n.role==='police')continue;if(n.operationDoctor&&this.e.mission.type==='rescue'){n.reporting=null;n.path=[];n.activity='worried';continue;}if(n.recruit?.state==='recruited'){n.reporting=null;n.evacuating=false;n.activity=null;n.path=[];n.recruit.nextRoute=0;continue;}n.evacGoal=n.floor?{x:0,z:-24}:{x:0,z:33};this.stand(n,n.evacGoal);n.reporting=null;n.evacuating=true;n.reaction=.8;this.route(n,n.evacGoal);}
    this.e.hooks.soundCaption?.('The alarm sounds. Staff and ambulatory patients rush toward the exits. Newborns remain protected.');
  }
  witness(n,reason='weapon'){
    const e=this.e;if(n.operationDoctor&&e.mission.type==='rescue'){e.mission.beginEscape(65);this.startEvacuation();e.notify('Operating team alerted · stop the procedure and bring the patient out','danger');return;}
    const stations=[{x:0,z:-23},{x:18,z:0},{x:-3,z:25.5}].sort((a,b)=>distance(n.pos,a)-distance(n.pos,b));
    const goal=stations[0];this.stand(n,goal);n.reaction=.7;n.reporting={reason,started:e.mission.elapsed,deadline:e.mission.elapsed+8+Math.min(13,distance(n.pos,goal)/2.5),goal};
    this.route(n,goal);if(reason!=='privacy'){e.audio.gasp({x:n.pos.x,y:1.5,z:n.pos.z,floor:n.floor});e.audio.dialogue?.(WITNESS_LINES[reason]||WITNESS_LINES.weapon,n.person,.8,true,{x:n.pos.x,y:1.5,z:n.pos.z,floor:n.floor});}
    e.notify(reason==='privacy'?'Patient privacy ignored · staff are calling security':reason==='camera'?'Camera seen · security is reporting you':'Weapon seen · a witness is running to report you','danger');e.hooks.soundCaption?.(reason==='privacy'?`${n.name} heads to the security station to report the repeated intrusion.`:`${n.name} gasps and runs to report ${reason==='camera'?'the camera':'the weapon'}.`);
  }
  arrivalSpot(floor,actor){
    const e=this.e,base=e.levels[floor].elevator;
    for(const z of [3.6,4.2,4.8,5.4])for(const x of [0,-.6,.6,-1.2]){
      const point={x:base.x+x,z:base.z+z};
      if(e.canStand(point.x,point.z,.25,floor)&&!e.npcs.some(other=>other!==actor&&other.floor===floor&&!other.dead&&!other.evacuated&&!other.lying&&!other.baby&&distance(other.pos,point)<.62)&&!(e.floor===floor&&distance(e.playerPos,point)<.65))return point;
    }
    return null;
  }
  prepareNPC(n){
    const e=this.e,now=e.mission.elapsed;
    if(e.objectives?.prepareNPC(n)||e.visitors?.prepareNPC(n)||e.life?.prepareNPC?.(n))return true;
    if(e.incidents?.prepareNPC(n))return true;
    if(n.reporting&&(e.mission.type==='rescue'?e.mission.state!=='escape':!e.mission.targetDown)){
      const r=n.reporting;
      if(now>=r.deadline||now-r.started>1.5&&distance(n.pos,r.goal)<1.3){e.audio.sound('alarm');e.mission.finish(false,r.reason==='privacy'?'Staff reported the repeated intrusion. Security escorted you out of the hospital.':r.reason==='camera'?'Security reported your unauthorized photography before you escaped.':e.mission.type==='rescue'?'Your weapon was reported on a public floor before you reached the operating suite.':'Your weapon was reported before the primary target was eliminated. Police intercepted you.');e.finish();return true;}
      if(n.cursor>=n.path.length&&n.wait<0)this.route(n,r.goal);return true;
    }
    if(n.evacuating){
      if(distance(n.pos,n.evacGoal)<1.2){
        if(n.floor){const arrival=this.arrivalSpot(0,n);if(!arrival){n.wait=.3;return true;}n.floor=0;n.pos.set(arrival.x,0,arrival.z);n.visual.root.visible=e.floor===0;n.evacGoal={x:0,z:33};this.route(n,n.evacGoal);}
        else{n.evacuated=true;n.visual.root.visible=false;n.path=[];}
      }else if(n.cursor>=n.path.length&&n.wait<0)this.route(n,n.evacGoal);
      return true;
    }
    return false;
  }
  update(dt){
    const e=this.e;if((e.mission.targetDown||e.mission.type==='rescue'&&e.mission.state==='escape')&&!this.evacuating)this.startEvacuation();
    this.scan-=dt;
    if(e.mission.state!=='escape'&&!e.mission.targetDown&&e.weaponDrawn&&this.scan<=0){
      this.scan=.18;let reporting=e.npcs.filter(n=>n.reporting&&!n.dead).length;
      for(const n of e.npcs){
        if(reporting>=3||e.mission.state==='escape')break;if(n.dead||n.evacuated||n.baby||n.blind||n.rescuePatient||n.lying||n.reporting||n.recruit?.state==='recruited'||n.floor!==e.floor)continue;
        const visible=distance(n.pos,e.playerPos)<11&&e.lineOfSight(n.pos,e.playerPos);
        if(seesDrawnWeapon(n.pos,e.playerPos,n.visual.root.rotation.y,visible)){this.witness(n);reporting++;}
      }
    }
    const cell=e.levels[e.floor].cells.get(key(tileAt(e.playerPos.x,e.playerPos.z).x,tileAt(e.playerPos.x,e.playerPos.z).z));
    const room=e.levels[e.floor].rooms.find(r=>r.id===cell?.room);
    if(!this.magnet&&room?.kind==='imaging'&&e.mission.save.appearance?.jewelry){
      this.magnet={age:0,from:e.playerPos.clone(),to:new THREE.Vector3(room.center.x,0,room.center.z-1)};e.audio.sound('magnet');e.notify('MRI magnet · steel jewelry caught in the field','danger');e.hooks.soundCaption?.('A dramatized MRI magnetic hazard is pulling the character toward the scanner.');
    }
    if(this.magnet){const m=this.magnet;m.age+=dt;e.playerPos.lerpVectors(m.from,m.to,Math.min(1,m.age/.95));e.player.root.position.copy(e.playerPos);if(m.age>=.95){e.mission.finish(false,'Steel jewelry was pulled into the MRI magnet. Remove it in the character studio before entering Radiology.');e.finish();}}
  }
  reports(){return this.e.npcs.filter(n=>n.reporting&&!n.dead&&!n.evacuated).map(n=>({id:n.id,name:n.name,reason:n.reporting.reason,seconds:Math.max(0,Math.ceil(n.reporting.deadline-this.e.mission.elapsed))}));}
}
