import {CoffeeSip} from './coffee-sip.js';
import {evidenceRoom,evidenceLabel} from './campaign-locations.js';
import {remainingWalkSeconds} from './appointments.js';
import {OfficeStatus} from './office-status.js';
import {coffeeLevel} from './population.js';
import * as THREE from 'three';
import {mesh,material,sign} from './assets.js';
import {footprint} from './collision.js';
import {tileAt,key} from './layout.js';
import {disposeObjectResources} from './resources.js';
const mustSteal=e=>e.mission.country?.id==='france'||!!e.mission.challenge?.scheduleRequired;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Deliberately fictional game items. No real substance, dose or preparation.
export class CovertAssignments{
  constructor(e){this.e=e;this.root=new THREE.Group();this.root.name='covert-assignment-props';e.scene.add(this.root);this.addedColliders=[];this.documentTaken=false;this.capsule=false;this.tampered=false;this.consumedAt=null;this.action=null;if(e.mission.type==='standard'){this.setup();e.systems.navigation=[];}}
  prop(floor,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);g.userData.floor=floor;this.root.add(g);return g;}
  obstacle(floor,x,z,w,d,h){const c=footprint(x,z,w,d,h,0,'covert-table');this.e.hospitals[floor].colliders.push(c);this.addedColliders.push({floor,c});}
  setup(){
    const e=this.e,m=e.mission,room=evidenceRoom(m.country);this.office=room;this.officeFloor=room.floor;this.warnings=0;this.officeOccupied=false;
    if(m.type==='standard'){
      const nav=e.systems.navigationFor(this.officeFloor);this.desk={x:room.center.x+.8,z:room.center.z+1};
      this.obstacle(this.officeFloor,this.desk.x,this.desk.z,.75,.58,1.03);this.documentStand=this.prop(this.officeFloor,this.desk.x,1.02,this.desk.z);mesh('box',material('#dce6e8'),[.75,.08,.58],[0,-.055,0],this.documentStand);mesh('box',material('#405b6a'),[.045,1,.045],[0,-.55,0],this.documentStand);this.document=this.prop(this.officeFloor,this.desk.x,1.02,this.desk.z);mesh('box',material('#f6efd9'),[.34,.012,.43],[0,0,0],this.document);for(let i=0;i<5;i++)mesh('box',material('#536776'),[.25,.003,.013],[0,.01,-.13+i*.055],this.document);
      const spot=nav.nearest({x:this.desk.x,z:this.desk.z-1});
      this.custodian=e.npcs.find(n=>n.floor===this.officeFloor&&n.room?.id===room.id&&!n.recruit&&n.role==='doctor'&&n.id!=='target');
      if(!this.custodian)this.custodian=e.spawnNPC({name:'Dr. Morgan Fell',gender:'male',skin:'#91654e',hair:'#2d211c'},'doctor',this.officeFloor,spot.point,room,'rota-custodian',{fixed:true});
      this.custodian.complicity='Management concealed patient records';this.custodian.pos.set(spot.point.x,0,spot.point.z);this.custodian.activity='rest';this.custodian.path=[];this.home={...spot.point};
      const bathroom=e.levels[this.officeFloor].rooms.find(r=>r.kind==='bathroom');this.breakGoal=nav.nearest(bathroom.center).point;this.custodianReturnSeconds=remainingWalkSeconds({pos:this.breakGoal,path:nav.smoothRoute(this.breakGoal,this.home),cursor:0,speed:this.custodian.speed},this.home);this.breakAt=10+m.random()*8;this.phase='working';
    }
    const target=e.npcs.find(n=>n.id==='target');this.target=target;if(!target)return;this.targetHome={x:target.pos.x,z:target.pos.z};
    if(!coffeeLevel(m.round))return;
    const floor=target.floor,work=e.hospitals[floor].workstations.find(w=>w.room===target.room.id);if(!work)return;
    const nav=e.systems.navigationFor(floor);this.coffeeGoal={...nav.nearest(work.stand).point};this.targetHome={...this.coffeeGoal};this.coffeeOffice=target.room;this.statusSign=new OfficeStatus(e.hospitals[floor].group,e.levels[floor].doors.find(d=>d.room===target.room.id),target.room);
    const bathroom=e.levels[floor].rooms.find(r=>r.kind==='bathroom');this.bathroomGoal={...nav.nearest({x:bathroom.center.x,z:bathroom.center.z}).point};this.returnWalkSeconds=remainingWalkSeconds({pos:this.bathroomGoal,path:nav.smoothRoute(this.bathroomGoal,this.coffeeGoal),cursor:0,speed:target.speed},this.coffeeGoal);
    this.cup=this.prop(floor,work.cup.x,.90,work.cup.z);this.cup.name='Target personal coffee on office desk';
    mesh('cylinder',material('#e5e8dd'),[.075,.14,.075],[0,.02,0],this.cup);mesh('cylinder',material('#392820'),[.064,.004,.064],[0,.093,0],this.cup);
    target.personalCoffeeCup=true;this.sip=new CoffeeSip(target.visual,this.cup,this.root,{x:work.cup.x,y:.90,z:work.cup.z});
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.042,.009,6,12),material('#e5e8dd'));handle.position.set(.083,.025,0);this.cup.add(handle);
    this.nextTargetBreak=25+m.random()*15;this.targetPhase='working';
    const pharmacy=e.levels[0].rooms.find(r=>r.kind==='pharmacy');this.supplyPoint={x:pharmacy.center.x-1.5,z:pharmacy.center.z+2.5};
    this.obstacle(0,this.supplyPoint.x,this.supplyPoint.z,.35,.24,1.17);this.supply=this.prop(0,this.supplyPoint.x,1.1,this.supplyPoint.z);mesh('box',material('#313f53'),[.35,.08,.24],[0,0,0],this.supply);mesh('sphere',material('#81b8c2'),[.04,.017,.018],[0,.055,0],this.supply);const tag=sign('KTD COMPOUND','FICTIONAL GAME ITEM',.75,.23);tag.position.set(0,.22,0);this.supply.add(tag);mesh('box',material('#506876'),[.04,1.08,.04],[0,-.58,0],this.supply);
  }
  insideOffice(n){const cell=tileAt(n.pos.x,n.pos.z);return n.floor===this.officeFloor&&this.e.levels[this.officeFloor].cells.get(key(cell.x,cell.z))?.room===this.office.id;}
  seen(point,floor,owner=null){const e=this.e;return e.npcs.some(n=>{if(n.dead||n.evacuated||n.lying||n.baby||n.blind||n.floor!==floor)return false;const d=distance(n.pos,point);if(d>8)return false;const dx=point.x-n.pos.x,dz=point.z-n.pos.z,yaw=n.visual.root.rotation.y;return (n===owner||d<1.5||(dx*Math.sin(yaw)+dz*Math.cos(yaw))/Math.max(d,.01)>.15)&&e.lineOfSight(n.pos,point,floor);});}
  targetOfficeClear(){if(!this.target||!this.coffeeOffice)return false;const cell=tileAt(this.target.pos.x,this.target.pos.z);return this.e.levels[this.target.floor].cells.get(key(cell.x,cell.z))?.room!==this.coffeeOffice.id;}
  interactions(){
    const e=this.e;if(e.mission.type!=='standard'||e.mission.targetDown)return [];
    const items=[];if(!this.documentTaken&&this.document&&e.floor===this.officeFloor)items.push({type:'covert-document',label:this.action?'Collecting document…':mustSteal(e)?'Take confidential staff rota':'Read staff directory',x:this.desk.x,z:this.desk.z});
    if(!this.capsule&&!this.tampered&&this.supply&&e.floor===0)items.push({type:'covert-capsule',label:'Collect fictional KTD compound',...this.supplyPoint});
    if(this.cup&&e.floor===this.target.floor&&!this.tampered)items.push({type:'covert-cup',label:!e.mission.identified?'Verify target badge before touching coffee':this.capsule?'Tamper with target’s coffee (fictional item)':'Target’s coffee · find the KTD compound in Pharmacy',x:this.cup.position.x,z:this.cup.position.z});
    return items;
  }
  restrictClue(type){if(this.e.mission.type!=='standard'||!this.document||this.documentTaken)return false;if(['directory','schedule','log'].includes(type)){if(!this.e.mission.recordsNotice){this.e.notify('Read the current hospital information notices first.');return true;}this.e.notify(`The rota is in ${evidenceLabel(this.e.mission.country)}. Wait for its custodian to leave, then collect it unseen.`,'clue');return true;}return false;}
  interact(item){const e=this.e;if(e.paused||e.mission.result||e.mission.targetDown)return false;const available=this.interactions().find(i=>i.type===item.type);if(!available||distance(e.playerPos,available)>2.5)return false;
    if(item.type==='covert-capsule'){this.capsule=true;this.supply.visible=false;e.notify('Fictional KTD compound collected · personal coffee is on the desk in the target’s office','clue');return true;}
    if(item.type==='covert-document'){
      if(this.documentTaken||this.action)return false;
      if(mustSteal(e)&&this.seen(e.playerPos,e.floor,this.custodian))return this.caught('You were caught taking confidential staff schedules.');
      this.action={until:e.mission.elapsed+2,from:e.playerPos.clone()};e.notify('Collecting the rota · stay still and out of sight');return true;
    }
    if(item.type==='covert-cup'){
      if(!e.mission.identified){e.notify('Confirm the assigned doctor’s badge first','warning');return false;}
      if(!this.capsule){e.notify('Collect the fictional KTD compound from Pharmacy first');return false;}
      if(!this.targetOfficeClear()){e.notify('Wait until the doctor leaves for the bathroom','warning');return false;}
      if(this.seen(e.playerPos,e.floor,this.target))return this.caught('A witness saw you tampering with the doctor’s coffee.');
      this.tampered=true;this.capsule=false;e.notify('Coffee prepared · leave unseen, then watch through the office window. Enter when the doctor becomes unresponsive','clue');return true;
    }return false;
  }
  caught(reason){const e=this.e;e.audio.sound('alarm');e.mission.finish(false,reason+' Security intercepted you.');e.finish();return false;}
  prepareNPC(n){const e=this.e,m=e.mission;if(m.targetDown||n.dead||n.reporting||n.evacuating)return false;
    if(n===this.custodian){if(n.injury&&n.id==='target')return false;if(this.documentTaken)return false;if(this.phase==='working'){n.activity='rest';n.path=[];}else if(this.phase==='away'){n.activity=this.backAt?'rest':null;if(!this.backAt&&n.cursor>=n.path.length&&n.wait<0)e.routeNPC(n,this.breakGoal);}else if(this.phase==='returning'){n.activity=null;if(n.cursor>=n.path.length&&n.wait<0)e.routeNPC(n,this.home);}return true;}
    if(n===this.target&&this.targetPhase&&this.targetPhase!=='working'){
      n.activity=['bathroom','drinking'].includes(this.targetPhase)?this.targetPhase==='drinking'?'drink':'rest':null;
      const goal=this.targetPhase==='outbound'?this.bathroomGoal:this.coffeeGoal;
      if(!n.activity&&n.cursor>=n.path.length&&n.wait<0)e.routeNPC(n,goal);return true;
    }return false;
  }
  update(){
    const e=this.e,m=e.mission,now=m.elapsed;if(this.office&&e.floor===this.officeFloor&&this.insideOffice({floor:e.floor,pos:e.playerPos}))m.locatedRecords=true;this.root.children.forEach(g=>g.visible=g.userData.floor===e.floor&&(g!==this.document||!this.documentTaken));if(this.supply)this.supply.visible=e.floor===0&&!this.capsule&&!this.tampered;
    if(m.type!=='standard'||m.result)return;
    if(m.targetDown){if(m.covertDeath&&!m.bodyDiscovered){const witness=e.npcs.find(n=>n!==this.target&&!n.dead&&!n.evacuated&&!n.lying&&!n.baby&&n.floor===this.target.floor&&distance(n.pos,this.target.pos)<7&&e.lineOfSight(n.pos,this.target.pos,n.floor));if(witness){m.bodyDiscovered=true;m.beginEscape();e.systems.startEvacuation();e.notify('Body discovered · alarm raised · escape before the police arrive','danger');e.hooks.emergency?.();}}return;}
    if(this.custodian&&!this.custodian.dead&&!this.documentTaken){const n=this.custodian;
      if(this.phase==='working'&&now>=this.breakAt){this.phase='away';e.systems.stand(n,this.breakGoal);n.clinicalPatient=null;n.nextRoute=0;e.routeNPC(n,this.breakGoal);if(m.recordsNotice)e.notify(`${this.office.name} custodian is leaving for a bathroom break · wait until the room is available`,'clue');}
      if(this.phase==='away'&&distance(n.pos,this.breakGoal)<.35){n.activity='rest';if(this.backAt==null&&m.recordsNotice)e.notify('Room available · collect the rota unseen.','clue');this.backAt??=now+Math.max(18,Math.min(28,m.challenge?.searchWindow||25));if(now>=this.backAt){this.phase='returning';n.activity=null;e.routeNPC(n,this.home);if(m.recordsNotice)e.notify(`Doctor returning · leave ${this.office.name}.`,'warning');}}
      if(this.phase==='returning'&&distance(n.pos,this.home)<.35){this.phase='working';n.activity='rest';n.path=[];this.breakAt=now+22;if(m.recordsNotice)e.notify(`${this.office.name} custodian returned · wait for the next bathroom break.`,'warning');this.backAt=null;}
    }
    const occupied=this.custodian&&!this.custodian.dead&&this.insideOffice(this.custodian)&&e.floor===this.officeFloor&&this.insideOffice({floor:e.floor,pos:e.playerPos})&&this.seen(e.playerPos,e.floor,this.custodian);
    if(occupied&&!this.officeOccupied&&!this.action&&!this.documentTaken&&mustSteal(e)){this.warnings++;if(this.warnings>2)return this.caught('After two warnings the custodian called the police.');e.life?.speak(this.custodian,this.warnings===1?'Excuse me. Please wait outside.':'You need to leave now, or I will call security.',true);e.notify(`Private records · leave the room. Warning ${this.warnings}/2.`,'warning');}
    this.officeOccupied=!!occupied;
    if(this.action){if(e.floor!==this.officeFloor||distance(e.playerPos,this.action.from)>.5){this.action=null;e.notify('Rota collection cancelled · stay beside the document');}else if(mustSteal(e)&&this.seen(e.playerPos,e.floor,this.custodian)){this.action=null;return this.caught('You were caught taking confidential staff schedules.');}else if(now>=this.action.until){this.action=null;this.documentTaken=true;this.document.visible=false;this.phase='complete';this.custodian.fixed=false;this.custodian.activity=null;this.custodian.path=[];this.custodian.wait=1;const clue=m.clue(m.challenge?.scheduleRequired?'schedule':'directory');if(clue)e.hooks.clue?.(clue);e.audio.sound('clue');e.notify('Confidential rota collected · department and room recorded','clue');}}
    const target=this.target;this.statusSign?.update(this.targetOfficeClear(),target?.dead);if(!target||target.dead||!this.cup)return;
    const appointment=e.life?.targetCase;
    if(this.targetOfficeClear())this.targetAwaySince??=now;else this.targetAwaySince=null;
    if(this.targetPhase==='working'&&now>=this.nextTargetBreak&&(!appointment||appointment.completed)){
      e.life?.speak(target,"Please have a seat. I'll be back in a few minutes.",true);target.activity=null;target.path=[];target.reaction=0;this.targetPhase='outbound';this.bathroomUntil=null;e.routeNPC(target,this.bathroomGoal);
    }
    if(this.targetPhase==='outbound'&&distance(target.pos,this.bathroomGoal)<.5){this.targetPhase='bathroom';this.bathroomUntil=now+14;target.activity='rest';target.path=[];}
    if(this.targetPhase==='bathroom'&&now>=this.bathroomUntil){this.targetPhase='returning';target.activity=null;e.routeNPC(target,this.coffeeGoal);}
    if(this.targetPhase==='returning'&&distance(target.pos,this.coffeeGoal)<.5){e.life?.speak(target,'Please come in.',true);this.targetPhase='drinking';this.lastCoffeeAt=now;this.drinkUntil=now+5;target.activity='drink';target.path=[];target.visual.root.rotation.y=Math.atan2(this.cup.position.x-target.pos.x,this.cup.position.z-target.pos.z);if(this.tampered)this.consumedAt=now;}
    if(this.targetPhase==='drinking'&&now>=this.drinkUntil){this.targetPhase='working';this.nextTargetBreak=now+30;target.activity='rest';target.path=[];}
    if(this.consumedAt!==null&&now>=this.consumedAt+7){if(e.eliminateCoffeeTarget(target)&&target.visual.head){const foam=mesh('sphere',material('#e3eadf'),[.026,.012,.014],[0,.015,.10],target.visual.head);foam.name='Fictional coffee effect foam';}}
  }

  syncCupGrip(){if(this.sip)this.sip.update(this.targetPhase==='drinking'&&!this.target.dead,this.e.time);}
  objective(){const m=this.e.mission;if(m.type!=='standard'||m.targetDown)return null;if(this.document&&!this.documentTaken)return !m.recordsNotice?'Read the hospital information board':!m.locatedRecords?`Locate ${evidenceLabel(m.country)}`:this.insideOffice(this.custodian)?this.phase==='away'?`Doctor leaving · wait outside ${this.office.name}`:`Wait for bathroom break · ${this.office.name}`:this.phase==='returning'?`Doctor returning · leave ${this.office.name}`:'Room available · collect the rota';return null;}
  returnEstimate(){if(!this.targetOfficeClear())return null;const now=this.e.mission.elapsed,walk=this.returnWalkSeconds||0;if(this.targetPhase==='outbound')return Math.ceil(remainingWalkSeconds(this.target,this.bathroomGoal)+14+walk);if(this.targetPhase==='bathroom')return Math.ceil(Math.max(0,(this.bathroomUntil||now)-now)+walk);return Math.ceil(remainingWalkSeconds(this.target,this.coffeeGoal));}
  hud(){if(this.e.mission.type!=='standard'||!this.e.mission.recordsNotice)return null;return {room:{name:this.office?.name,number:this.office?.number,floor:this.officeFloor,x:this.desk?.x,z:this.desk?.z},level:this.e.mission.round,label:this.e.mission.challenge?.label,documentRequired:!!this.document,stealthRequired:mustSteal(this.e),documentTaken:this.documentTaken,breakState:this.custodian&&this.insideOffice(this.custodian)?this.phase==='away'?'Doctor leaving':'Doctor in room':this.e.npcs.some(n=>n!==this.custodian&&!n.dead&&!n.evacuated&&!n.baby&&this.insideOffice(n))?'Visitor in room':this.phase==='returning'?'Doctor returning · room clear':'Room clear',window:this.phase==='away'&&this.backAt?Math.ceil(Math.max(0,this.backAt-this.e.mission.elapsed)+(this.custodianReturnSeconds||0)):this.phase==='returning'?Math.ceil(remainingWalkSeconds(this.custodian,this.home)):null,coffee:this.tampered?'prepared':this.capsule?'compound collected':'optional',targetBreak:this.targetOfficeClear()?'Office clear · doctor away':this.targetPhase,awaySeconds:this.targetAwaySince==null?null:Math.max(0,Math.floor(this.e.mission.elapsed-this.targetAwaySince)),returnSeconds:this.returnEstimate()};}
  dispose(){this.sip?.dispose();this.statusSign?.dispose();this.statusSign=null;for(const {floor,c} of this.addedColliders){const colliders=this.e.hospitals[floor].colliders,index=colliders.indexOf(c);if(index>=0)colliders.splice(index,1);}this.addedColliders=[];this.action=null;this.root.removeFromParent();disposeObjectResources(this.root,{textures:true});this.root.clear();this.e=null;}
}
