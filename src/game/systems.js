import {complicityFor} from './security-rules.js';
import {updateEntrance} from './entrance.js';
import {EgressNavigation} from './egress.js';
import * as THREE from 'three';
import {tileAt,key} from './layout.js';
import {WITNESS_LINES} from './life-rules.js';
import {seesDrawnWeapon} from './loadout.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function securityAlert(m){if(m.type==='rescue'&&!m.policeAlert)return false;if(m.china&&!m.policeAlert)return false;return m.suspicion>80||m.state==='escape'&&(!m.china||!!m.policeAlert);}
export class MissionSystems{
  constructor(engine){this.e=engine;this.scan=0;this.magnet=null;this.evacuating=false;this.navigation=[];}
  navigationFor(floor){return this.navigation[floor]||(this.navigation[floor]=new EgressNavigation(this.e.levels[floor],this.e.hospitals[floor].colliders));}
  prepare(){for(let floor=0;floor<this.e.levels.length;floor++){const nav=this.navigationFor(floor);nav.fieldFor(floor?{x:0,z:-24}:{x:0,z:39});}}
  route(n,goal){const nav=this.navigationFor(n.floor),raw=nav.route(n.pos,goal);n.path=nav.smoothPath(n.pos,raw);n.cursor=0;n.wait=.7;}

  rerouteCrowd(n){const e=this.e,goal=n.evacGoal||n.reporting?.goal;if(!goal)return false;const people=e.npcs.filter(o=>o!==n&&o.floor===n.floor&&!o.dead&&!o.evacuated&&!o.lying&&!o.baby).map(o=>o.pos);if(e.floor===n.floor)people.push(e.playerPos);const path=this.navigationFor(n.floor).routeAvoiding(n.pos,goal,people);if(!path.length)return false;n.path=path;n.cursor=0;n.wait=.2;n.passing=null;return true;}
  stand(n,goal){
    const e=this.e,nav=this.navigationFor(n.floor);
    if(n.lying||n.seated||e.npcs.some(o=>o!==n&&o.floor===n.floor&&!o.dead&&!o.evacuated&&!o.lying&&!o.baby&&distance(o.pos,n.pos)<.49)||!e.canStand(n.pos.x,n.pos.z,.24,n.floor)||!nav.route(n.pos,goal).length){
      const field=nav.fieldFor(goal),node=[...nav.nodes.values()].filter(node=>field.has(node)).sort((a,b)=>distance(a.point,n.pos)-distance(b.point,n.pos)).find(node=>e.canStand(node.point.x,node.point.z,.25,n.floor)&&!e.npcs.some(o=>o!==n&&o.floor===n.floor&&!o.dead&&!o.evacuated&&!o.lying&&!o.baby&&distance(o.pos,node.point)<.62))||nav.nearest(n.pos,field);if(node)n.pos.set(node.point.x,0,node.point.z);
    }
    n.visual.root.rotation.set(0,0,0);n.activity=null;n.seated=n.lying=false;n.baselineY=0;n.pos.y=0;n.hitOffset=null;n.reaction=0;n.path=[];n.cursor=0;
  }
  startEvacuation(){
    if(this.e.mission.type==='rescue'||this.evacuating||this.e.mission.china&&!this.e.mission.policeAlert)return;this.evacuating=true;if(this.e.life){if(this.e.life.queue)this.e.life.queue.length=0;if(this.e.life.dialogues)this.e.life.dialogues.length=0;this.e.life.privacy?.leave();}this.e.audio.cancelVoices?.();this.alarmAt=this.e.mission.elapsed;this.alarmAnnounced=true;this.e.audio.sound('alarm');this.escapePhase=this.e.mission.type==='standard'?'security':'evacuating';this.waitingAccomplices=this.e.npcs.filter(n=>this.e.mission.type==='standard'&&!n.dead&&n.id!=='target'&&!!(n.complicity||complicityFor(n)));for(const n of this.waitingAccomplices){n.complicity||=complicityFor(n);n.accompliceHeld=false;}this.e.notify(this.e.mission.type==='standard'?(this.e.mission.playMode==='story'&&this.e.mission.round>=5?'Stop the hidden offenders before leaving. Defeat security to unlock accomplice tracking; other marked staff are optional.':'Escape is open. Defeat security to unlock optional accomplice tracking.'):'The alarm is active. Stay together and reach the main entrance.','danger');for(const entrance of this.e.hospitals?.[0]?.entrances||[]){entrance.open=true;updateEntrance(entrance,true,2);}this.e.nextBlackout=Math.min(this.e.nextBlackout??Infinity,this.e.mission.elapsed+8+this.e.mission.random()*8);this.e.audio.nextBeep=(this.e.audio.ctx?.currentTime||0)+2.4;
    for(const level of this.e.levels)for(const door of level.doors){door.locked=false;door.open=true;}
    for(const n of this.e.npcs){if(n.dead||n.baby||n.rescuePatient||n.accompliceHeld||['police','security'].includes(n.role)||n===this.e.extras?.lure?.contact&&n.lying||n.emergencyResponder)continue;if(n.recruit?.state==='recruited'){n.reporting=null;n.evacuating=false;n.activity=null;n.path=[];n.recruit.nextRoute=0;continue;}n.sneezeUntil=0;if(n.tissue)n.tissue.visible=false;n.evacLane=((this.e.npcs.indexOf(n)*7)%6)*.48+.15;n.evacGoal=n.floor?{x:0,z:-24}:{x:0,z:39};n.evacPending=true;n.activity=null;n.path=[];n.reporting=null;n.evacuating=true;n.evacSpeed=n.blind?1.25:2.8+this.e.mission.random()*2;n.reaction=.15+this.e.mission.random()*1.4;n.evacHesitateAt=this.e.mission.elapsed+5+this.e.mission.random()*9;}
    const nearby=this.e.npcs.filter(n=>n.floor===this.e.floor&&!n.dead&&!n.baby).slice(0,3);for(const [i,n]of nearby.entries())this.e.audio.evacuationScream?.(n.person,{x:n.pos.x,y:1.5,z:n.pos.z,floor:n.floor},i*.7);
    this.e.hooks.soundCaption?.('People scream. Staff and ambulatory patients rush toward the exits. Security responds immediately. Newborns remain protected.');
  }
  witness(n,reason='weapon'){
    const e=this.e;if(e.mission.china&&n.operationDoctor){e.objectives?.china?.panicDoctors();return;}if(e.mission.type==='rescue'&&e.floor===3){e.objectives.rescue?.begin();return;}
    const stations=[{x:0,z:-23},{x:18,z:0},{x:-3,z:25.5}].sort((a,b)=>distance(n.pos,a)-distance(n.pos,b));
    const goal=stations[0];this.stand(n,goal);n.reaction=.7;n.reporting={reason,started:e.mission.elapsed,deadline:e.mission.elapsed+(e.mission.challenge?.reportSeconds||8)+Math.min(13,distance(n.pos,goal)/2.5),goal};
    this.route(n,goal);if(reason!=='privacy'){e.audio.gasp({x:n.pos.x,y:1.5,z:n.pos.z,floor:n.floor});e.audio.dialogue?.(WITNESS_LINES[reason]||WITNESS_LINES.weapon,n.person,.8,true,{x:n.pos.x,y:1.5,z:n.pos.z,floor:n.floor});}
    e.notify(reason==='privacy'?'Patient privacy ignored · staff are calling security':reason==='camera'?'Camera seen · security is reporting you':'Weapon seen · a witness is calling the police','danger');e.hooks.soundCaption?.(reason==='privacy'?`${n.name} heads to the security station to report the repeated intrusion.`:`${n.name} gasps and runs to report ${reason==='camera'?'the camera':'the weapon'}.`);
  }
  arrivalSpot(floor,actor){
    const e=this.e,lift=e.hospitals?.[floor]?.lift,base=e.levels[floor].elevator;
    const candidates=lift?[-1.2,-1.9].flatMap(z=>[0,-.55,.55].map(x=>({x:lift.x+x,z:lift.faceZ+z}))):[{x:base.x,z:base.z+3.6}];
    for(const point of candidates){
      // Arrivals wait behind a closed cabin. Never materialize in an open,
      // visible lift or in the concourse beside it.
      if(lift&&e.floor===floor&&lift.amount>.05&&distance(e.playerPos,point)<25&&e.lineOfSight(e.playerPos,point,floor))continue;
      if(e.canStand(point.x,point.z,.25,floor)&&!e.npcs.some(n=>n!==actor&&n.floor===floor&&!n.dead&&!n.evacuated&&!n.lying&&!n.baby&&distance(n.pos,point)<.62)&&!(e.floor===floor&&distance(e.playerPos,point)<.65)){if(lift){lift.open=true;lift.closeTimer=3;}return point;}
    }return null;
  }

  prepareNPC(n){
    const e=this.e,now=e.mission.elapsed;this.updateEscape();
    if(n.evacPending){if(this.evacWorkAt!==e.time){this.evacWorkAt=e.time;this.evacBudget=2;}if(this.evacBudget<=0)return true;this.evacBudget--;n.evacPending=false;this.stand(n,n.evacGoal);this.route(n,n.evacGoal);return true;}
    if(n.accompliceHeld){n.path=[];n.activity='rest';n.reporting=null;return true;}
    if(n.evacuating&&now>=(n.evacHesitateAt??Infinity)){n.reaction=.2+e.mission.random()*.6;n.evacHesitateAt=now+12+e.mission.random()*15;this.rerouteCrowd(n);}
    if(e.extras?.prepareNPC(n)||e.covert?.prepareNPC(n)||e.objectives?.prepareNPC(n)||e.visitors?.prepareNPC(n)||e.life?.prepareNPC?.(n))return true;
    if(e.incidents?.prepareNPC(n))return true;
    if(n.reporting&&(e.mission.china||(e.mission.type==='rescue'?e.mission.state!=='escape':!e.mission.targetDown))){
      const r=n.reporting;
      if(now>=r.deadline||now-r.started>1.5&&distance(n.pos,r.goal)<1.3){if(r.reason==='weapon'&&(e.mission.type==='standard'||e.mission.china)){n.reporting=null;n.activity='worried';n.path=[];e.mission.policeAlert=true;e.mission.beginEscape(70);if(e.mission.china)this.startEvacuation();e.notify(e.mission.china?'Police called · your cover is blown. Escape before they arrive.':'Police called · finish the primary objective and escape before they arrive','danger');e.emitHUD();return true;}e.audio.sound('alarm');e.mission.finish(false,r.reason==='privacy'?'Staff reported the repeated intrusion. Security escorted you out of the hospital.':r.reason==='camera'?'Security reported your unauthorized photography before you escaped.':e.mission.type==='rescue'?'Your weapon was reported on a public floor before you reached the operating suite.':'Your weapon was reported before the primary target was eliminated. Police intercepted you.');e.finish();return true;}
      if(n.cursor>=n.path.length&&n.wait<0)this.route(n,r.goal);return true;
    }
    if(n.evacuating){
      if(distance(n.pos,n.evacGoal)<1.2){
        if(n.floor){const arrival=this.arrivalSpot(0,n);if(!arrival){n.wait=.3;return true;}n.floor=0;n.pos.set(arrival.x,0,arrival.z);n.visual.root.visible=e.floor===0;n.evacGoal={x:0,z:39};this.route(n,n.evacGoal);}
        else{n.evacuated=true;n.evacuating=false;n.visual.root.visible=false;n.path=[];n.movementSpeed=0;n.activity='rest';n.reporting=null;n.passing=null;}
      }else if(n.cursor>=n.path.length&&n.wait<0)this.route(n,n.evacGoal);
      return true;
    }
    return false;
  }
  update(dt){
    const e=this.e;if((e.mission.targetDown&&!e.mission.china&&(!e.mission.covertDeath||e.mission.bodyDiscovered))&&!this.evacuating)this.startEvacuation();
    this.updateEscape();this.scan-=dt;
    if((e.mission.state!=='escape'&&!e.mission.targetDown||e.mission.china&&!e.mission.policeAlert)&&!(e.mission.type==='rescue'&&e.floor===3)&&e.weaponDrawn&&this.scan<=0){
      this.scan=.18;let reporting=e.npcs.filter(n=>n.reporting&&!n.dead).length;
      for(const n of e.npcs){
        if(reporting>=3||e.mission.state==='escape'&&(!e.mission.china||e.mission.policeAlert))break;if(n.id==='target'||n.dead||n.evacuated||n.baby||n.blind||n.rescuePatient||n.lying||n.reporting||n.recruit?.state==='recruited'||n.floor!==e.floor)continue;
        const visible=distance(n.pos,e.playerPos)<(e.mission.challenge?.witnessRange||11)&&e.lineOfSight(n.pos,e.playerPos);
        if(seesDrawnWeapon(n.pos,e.playerPos,n.visual.root.rotation.y,visible,e.mission.challenge?.witnessRange||11)){if(e.mission.type==='standard'&&!e.mission.targetDown&&!e.mission.legitimateDraw){e.mission.finish(false,'A witness saw your weapon before a legitimate target confrontation.');e.finish();return;}this.witness(n);reporting++;}
      }
    }
    const cell=e.levels[e.floor].cells.get(key(tileAt(e.playerPos.x,e.playerPos.z).x,tileAt(e.playerPos.x,e.playerPos.z).z));
    const room=e.levels[e.floor].rooms.find(r=>r.id===cell?.room);
    if(!this.magnet&&room?.kind==='imaging'&&(e.mission.weaponRequired||e.mission.save.appearance?.necklace||e.mission.save.appearance?.earrings||e.mission.save.appearance?.jewelry)){
      this.magnet={age:0,from:e.playerPos.clone(),to:new THREE.Vector3(room.center.x,0,room.center.z-1),weapon:e.mission.weaponRequired};e.audio.sound('magnet');e.audio.evacuationScream?.(e.playerProfile,{x:e.playerPos.x,y:1.5,z:e.playerPos.z,floor:e.floor});
    }
    if(this.magnet){const m=this.magnet;m.age+=dt;const old=e.playerPos.clone(),direction=m.to.clone().sub(e.playerPos).setY(0).normalize(),step=Math.min(e.playerPos.distanceTo(m.to),(.5+m.age*4)*dt);e.move(direction.x*step,direction.z*step);e.player.root.position.copy(e.playerPos);e.player.root.rotation.y=Math.atan2(direction.x,direction.z);e.player.animate?.(e.time,e.playerPos.distanceTo(old)/Math.max(dt,.001),dt);e.player.poseCrouch?.(.25);e.player.poseActivity?.('magnet-pull',e.time);if(m.age>=1.8){e.mission.finish(false,m.weapon?'You entered Radiology carrying a gun. The MRI magnetic field pulled the weapon and you toward the scanner.':'You entered Radiology wearing metal jewellery and were pulled toward the MRI scanner.');e.finish();}}
  }
  alarmActive(){const m=this.e.mission;if(m.type==='rescue')return false;return m.state==='escape'&&(m.type==='standard'?this.evacuating&&!!this.alarmAnnounced:!m.china||!!m.policeAlert);}
  escapeObjective(){if(!this.evacuating||this.e.mission.type!=='standard')return null;const m=this.e.mission,required=[...(m.requiredHiddenIds||[])].filter(id=>!m.eliminatedIds.has(id)).length;if(required)return `Find and stop ${required} hidden accomplice${required===1?'':'s'} · ${this.escapePhase==='security'?'defeat security to unlock tracking':'room locations marked on map'}`;return this.escapePhase==='security'?'Escape now, or defeat security to unlock optional accomplice tracking':'Required targets clear · escape before lockdown';}

  updateEscape(){const e=this.e,m=e.mission;if(!this.evacuating)return;if(this.escapePhase==='security'&&!e.npcs.some(n=>n.role==='security'&&!n.dead&&!n.evacuated)){this.escapePhase='accomplices';e.notify('Security stopped · live red map dots reveal accomplices. Hidden threats show their room only. Escape remains your objective.','clue');}}
  reports(){return this.e.npcs.filter(n=>n.reporting&&!n.dead&&!n.evacuated).map(n=>({id:n.id,name:n.name,reason:n.reporting.reason,seconds:Math.max(0,Math.ceil(n.reporting.deadline-this.e.mission.elapsed))}));}
}
