import {OfficeStatus} from './office-status.js';
import {coffeeLevel} from './population.js';
import * as THREE from 'three';
import {mesh,material,sign} from './assets.js';
import {footprint} from './collision.js';
import {tileAt,key} from './layout.js';
import {disposeObjectResources} from './resources.js';
const mustSteal=e=>!!e.mission.challenge?.scheduleRequired;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Deliberately fictional game items. No real substance, dose or preparation.
export class CovertAssignments{
  constructor(e){this.e=e;this.root=new THREE.Group();this.root.name='covert-assignment-props';e.scene.add(this.root);this.addedColliders=[];this.documentTaken=false;this.capsule=false;this.tampered=false;this.consumedAt=null;this.action=null;if(e.mission.type==='standard'){this.setup();e.systems.navigation=[];}}
  prop(floor,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);g.userData.floor=floor;this.root.add(g);return g;}
  obstacle(floor,x,z,w,d,h){const c=footprint(x,z,w,d,h,0,'covert-table');this.e.hospitals[floor].colliders.push(c);this.addedColliders.push({floor,c});}
  setup(){
    const e=this.e,m=e.mission,room=e.levels[0].rooms.find(r=>r.kind==='office');this.office=room;
    if(m.type==='standard'){
      const nav=e.systems.navigationFor(0);this.desk={x:room.center.x+.8,z:room.center.z+1};
      this.obstacle(0,this.desk.x,this.desk.z,.75,.58,1.03);this.documentStand=this.prop(0,this.desk.x,1.02,this.desk.z);mesh('box',material('#dce6e8'),[.75,.08,.58],[0,-.055,0],this.documentStand);mesh('box',material('#405b6a'),[.045,1,.045],[0,-.55,0],this.documentStand);this.document=this.prop(0,this.desk.x,1.02,this.desk.z);mesh('box',material('#f6efd9'),[.34,.012,.43],[0,0,0],this.document);for(let i=0;i<5;i++)mesh('box',material('#536776'),[.25,.003,.013],[0,.01,-.13+i*.055],this.document);
      const spot=nav.nearest({x:this.desk.x,z:this.desk.z-1});
      this.custodian=e.npcs.find(n=>n.floor===0&&n.room?.id===room.id&&!n.recruit&&n.role==='doctor'&&n.id!=='target');
      if(!this.custodian)this.custodian=e.spawnNPC({name:'Dr. Morgan Fell',gender:'male',skin:'#91654e',hair:'#2d211c'},'doctor',0,spot.point,room,'rota-custodian',{fixed:true});
      this.custodian.pos.set(spot.point.x,0,spot.point.z);this.custodian.activity='rest';this.custodian.path=[];this.home={...spot.point};
      this.breakGoal=nav.nearest({x:-1.2,z:0},nav.fieldFor({x:0,z:0})).point;this.breakAt=32+m.random()*22;this.phase='working';
    }
    const target=e.npcs.find(n=>n.id==='target');this.target=target;if(!target)return;this.targetHome={x:target.pos.x,z:target.pos.z};
    if(!coffeeLevel(m.round))return;
    const floor=target.floor,work=e.hospitals[floor].workstations.find(w=>w.room===target.room.id);if(!work)return;
    const nav=e.systems.navigationFor(floor);this.coffeeGoal={...nav.nearest(work.stand).point};this.targetHome={...this.coffeeGoal};this.coffeeOffice=target.room;this.statusSign=new OfficeStatus(e.hospitals[floor].group,e.levels[floor].doors.find(d=>d.room===target.room.id),target.room);
    const bathroom=e.levels[floor].rooms.find(r=>r.kind==='bathroom');this.bathroomGoal={...nav.nearest({x:bathroom.center.x,z:bathroom.center.z}).point};
    this.cup=this.prop(floor,work.cup.x,.90,work.cup.z);this.cup.name='Target personal coffee on office desk';
    mesh('cylinder',material('#e5e8dd'),[.075,.14,.075],[0,.02,0],this.cup);mesh('cylinder',material('#392820'),[.064,.004,.064],[0,.093,0],this.cup);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.042,.009,6,12),material('#e5e8dd'));handle.position.set(.083,.025,0);this.cup.add(handle);
    this.nextTargetBreak=75+m.random()*30;this.targetPhase='working';
    const pharmacy=e.levels[0].rooms.find(r=>r.kind==='pharmacy');this.supplyPoint={x:pharmacy.center.x-1.5,z:pharmacy.center.z+2.5};
    this.obstacle(0,this.supplyPoint.x,this.supplyPoint.z,.35,.24,1.17);this.supply=this.prop(0,this.supplyPoint.x,1.1,this.supplyPoint.z);mesh('box',material('#313f53'),[.35,.08,.24],[0,0,0],this.supply);mesh('sphere',material('#81b8c2'),[.04,.017,.018],[0,.055,0],this.supply);const tag=sign('KTD COMPOUND','FICTIONAL GAME ITEM',.75,.23);tag.position.set(0,.22,0);this.supply.add(tag);mesh('box',material('#506876'),[.04,1.08,.04],[0,-.58,0],this.supply);
  }
  insideOffice(n){const cell=tileAt(n.pos.x,n.pos.z);return n.floor===0&&this.e.levels[0].cells.get(key(cell.x,cell.z))?.room===this.office.id;}
  seen(point,floor,owner=null){const e=this.e;return e.npcs.some(n=>{if(n.dead||n.evacuated||n.lying||n.baby||n.blind||n.floor!==floor)return false;const d=distance(n.pos,point);if(d>8)return false;const dx=point.x-n.pos.x,dz=point.z-n.pos.z,yaw=n.visual.root.rotation.y;return (n===owner||d<1.5||(dx*Math.sin(yaw)+dz*Math.cos(yaw))/Math.max(d,.01)>.15)&&e.lineOfSight(n.pos,point,floor);});}
  targetOfficeClear(){if(!this.target||!this.coffeeOffice)return false;const cell=tileAt(this.target.pos.x,this.target.pos.z);return this.e.levels[this.target.floor].cells.get(key(cell.x,cell.z))?.room!==this.coffeeOffice.id;}
  interactions(){
    const e=this.e;if(e.mission.type!=='standard'||e.mission.targetDown)return [];
    const items=[];if(!this.documentTaken&&this.document&&e.floor===0)items.push({type:'covert-document',label:this.action?'Collecting document…':mustSteal(e)?'Take confidential staff rota':'Read staff directory',x:this.desk.x,z:this.desk.z});
    if(!this.capsule&&!this.tampered&&this.supply&&e.floor===0)items.push({type:'covert-capsule',label:'Collect fictional KTD compound',...this.supplyPoint});
    if(this.cup&&e.floor===this.target.floor&&!this.tampered)items.push({type:'covert-cup',label:!e.mission.identified?'Verify target badge before touching coffee':this.capsule?'Tamper with target’s coffee (fictional item)':'Target’s coffee · find the KTD compound in Pharmacy',x:this.cup.position.x,z:this.cup.position.z});
    return items;
  }
  restrictClue(type){if(this.e.mission.type!=='standard'||!this.document||this.documentTaken)return false;if(['directory','schedule','log'].includes(type)){this.e.notify('The staff directory / rota is inside the Records office. Find the document there; later missions require waiting for the custodian’s coffee break.','clue');return true;}return false;}
  interact(item){const e=this.e;if(e.paused||e.mission.result||e.mission.targetDown)return false;const available=this.interactions().find(i=>i.type===item.type);if(!available||distance(e.playerPos,available)>2.5)return false;
    if(item.type==='covert-capsule'){this.capsule=true;this.supply.visible=false;e.notify('Fictional KTD compound collected · personal coffee is on the desk in the target’s office','clue');return true;}
    if(item.type==='covert-document'){
      if(this.documentTaken||this.action)return false;
      if(mustSteal(e)&&(this.insideOffice(this.custodian)||this.seen(e.playerPos,e.floor,this.custodian)))return this.caught('You were caught taking confidential staff schedules.');
      this.action={until:e.mission.elapsed+2,from:e.playerPos.clone()};e.notify('Collecting the rota · stay still and out of sight');return true;
    }
    if(item.type==='covert-cup'){
      if(!e.mission.identified){e.notify('Confirm the assigned doctor’s badge first','warning');return false;}
      if(!this.capsule){e.notify('Collect the fictional KTD compound from Pharmacy first');return false;}
      if(!this.targetOfficeClear()){e.notify('Wait until the doctor leaves for the bathroom','warning');return false;}
      if(this.seen(e.playerPos,e.floor,this.target))return this.caught('A witness saw you tampering with the doctor’s coffee.');
      this.tampered=true;this.capsule=false;e.notify('Coffee prepared · leave the office unseen before the doctor returns','clue');return true;
    }return false;
  }
  caught(reason){const e=this.e;e.audio.sound('alarm');e.mission.finish(false,reason+' Security intercepted you.');e.finish();return false;}
  prepareNPC(n){const e=this.e,m=e.mission;if(m.targetDown||n.dead||n.reporting||n.evacuating)return false;
    if(n===this.custodian){if(this.phase==='working'){n.activity='rest';n.path=[];}else if(this.phase==='away'){n.activity=this.backAt?'drink':null;if(!this.backAt&&n.cursor>=n.path.length&&n.wait<0)e.routeNPC(n,this.breakGoal);}else if(this.phase==='returning'){n.activity=null;if(n.cursor>=n.path.length&&n.wait<0)e.routeNPC(n,this.home);}return true;}
    if(n===this.target&&this.targetPhase&&this.targetPhase!=='working'){
      n.activity=['bathroom','drinking'].includes(this.targetPhase)?this.targetPhase==='drinking'?'drink':'rest':null;
      const goal=this.targetPhase==='outbound'?this.bathroomGoal:this.coffeeGoal;
      if(!n.activity&&n.cursor>=n.path.length&&n.wait<0)e.routeNPC(n,goal);return true;
    }return false;
  }
  update(){
    const e=this.e,m=e.mission,now=m.elapsed;if(this.office&&e.floor===0&&this.insideOffice({floor:0,pos:e.playerPos}))m.locatedRecords=true;this.root.children.forEach(g=>g.visible=g.userData.floor===e.floor&&(g!==this.document||!this.documentTaken));if(this.supply)this.supply.visible=e.floor===0&&!this.capsule&&!this.tampered;
    if(m.type!=='standard'||m.result)return;
    if(m.targetDown){if(m.covertDeath&&!m.bodyDiscovered){const witness=e.npcs.find(n=>n!==this.target&&!n.dead&&!n.evacuated&&!n.lying&&!n.baby&&n.floor===this.target.floor&&distance(n.pos,this.target.pos)<7&&e.lineOfSight(n.pos,this.target.pos,n.floor));if(witness){m.bodyDiscovered=true;m.beginEscape();e.systems.startEvacuation();e.notify('Body discovered · alarm raised · escape before the police arrive','danger');e.hooks.emergency?.();}}return;}
    if(this.custodian&&!this.custodian.dead){const n=this.custodian;
      if(this.phase==='working'&&now>=this.breakAt){this.phase='away';n.activity=null;n.path=[];n.cursor=0;e.routeNPC(n,this.breakGoal);e.notify('Records custodian is leaving for coffee · watch for an opening','clue');}
      if(this.phase==='away'&&distance(n.pos,this.breakGoal)<.35){n.activity='drink';this.backAt??=now+(m.challenge?.searchWindow||30);if(now>=this.backAt){this.phase='returning';n.activity=null;e.routeNPC(n,this.home);}}
      if(this.phase==='returning'&&distance(n.pos,this.home)<.35){this.phase='working';n.activity='rest';n.path=[];this.breakAt=now+45;this.backAt=null;}
    }
    if(this.action){if(e.floor!==0||distance(e.playerPos,this.action.from)>.5){this.action=null;e.notify('Rota collection cancelled · stay beside the document');}else if(mustSteal(e)&&(this.insideOffice(this.custodian)||this.seen(e.playerPos,e.floor,this.custodian))){this.action=null;return this.caught('You were caught taking confidential staff schedules.');}else if(now>=this.action.until){this.action=null;this.documentTaken=true;this.document.visible=false;const clue=m.clue(m.challenge?.scheduleRequired?'schedule':'directory');if(clue)e.hooks.clue?.(clue);e.audio.sound('clue');e.notify('Confidential rota collected · department and room recorded','clue');}}
    const target=this.target;this.statusSign?.update(this.targetOfficeClear(),target?.dead);if(!target||target.dead||!this.cup)return;
    const appointment=e.life?.targetCase;
    if(this.targetOfficeClear())this.targetAwaySince??=now;else this.targetAwaySince=null;
    if(this.targetPhase==='working'&&now>=this.nextTargetBreak&&(!appointment||appointment.completed)){
      target.activity=null;target.path=[];target.reaction=0;this.targetPhase='outbound';e.routeNPC(target,this.bathroomGoal);
    }
    if(this.targetPhase==='outbound'&&distance(target.pos,this.bathroomGoal)<.5){this.targetPhase='bathroom';this.bathroomUntil=now+24;target.activity='rest';target.path=[];}
    if(this.targetPhase==='bathroom'&&now>=this.bathroomUntil){this.targetPhase='returning';target.activity=null;e.routeNPC(target,this.coffeeGoal);}
    if(this.targetPhase==='returning'&&distance(target.pos,this.coffeeGoal)<.5){this.targetPhase='drinking';this.lastCoffeeAt=now;this.drinkUntil=now+5;target.activity='drink';target.path=[];target.visual.root.rotation.y=Math.atan2(this.cup.position.x-target.pos.x,this.cup.position.z-target.pos.z);if(this.tampered)this.consumedAt=now;}
    if(this.targetPhase==='drinking'&&now>=this.drinkUntil){this.targetPhase='working';this.nextTargetBreak=now+75;target.activity='rest';target.path=[];}
    if(this.consumedAt!==null&&now>=this.consumedAt+7){if(e.eliminateCoffeeTarget(target)&&target.visual.head){const foam=mesh('sphere',material('#e3eadf'),[.026,.012,.014],[0,.015,.10],target.visual.head);foam.name='Fictional coffee effect foam';}}
  }

  objective(){const m=this.e.mission;if(m.type!=='standard'||m.targetDown)return null;if(this.document&&!this.documentTaken)return !m.recordsNotice?'Read the hospital information board':!m.locatedRecords?`Locate Records office · room ${this.office.number} · ground floor`:'Find the staff directory / rota inside Records';return null;}
  hud(){if(this.e.mission.type!=='standard')return null;return {level:this.e.mission.round,label:this.e.mission.challenge?.label,documentRequired:!!this.document,stealthRequired:mustSteal(this.e),documentTaken:this.documentTaken,breakState:this.phase==='working'?'Wait for coffee break':this.phase==='returning'?'Doctor returning':this.custodian&&this.insideOffice(this.custodian)?'Doctor leaving':'Room clear',window:this.backAt?Math.max(0,Math.ceil(this.backAt-this.e.mission.elapsed)):null,coffee:this.tampered?'prepared':this.capsule?'compound collected':'optional',targetBreak:this.targetOfficeClear()?'Office clear · doctor away':this.targetPhase,awaySeconds:this.targetAwaySince==null?null:Math.max(0,Math.floor(this.e.mission.elapsed-this.targetAwaySince)),returnSeconds:this.bathroomUntil&&this.targetOfficeClear()?Math.max(0,Math.ceil(this.bathroomUntil-this.e.mission.elapsed+distance(this.target.pos,this.coffeeGoal)/Math.max(.5,this.target.speed||1.3))):null};}
  dispose(){this.statusSign?.dispose();this.statusSign=null;for(const {floor,c} of this.addedColliders){const colliders=this.e.hospitals[floor].colliders,index=colliders.indexOf(c);if(index>=0)colliders.splice(index,1);}this.addedColliders=[];this.action=null;this.root.removeFromParent();disposeObjectResources(this.root,{textures:true});this.root.clear();this.e=null;}
}
