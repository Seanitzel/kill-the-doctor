import {VENDING_LOCATION,vendingBounds} from './furniture-placement.js';
import * as THREE from 'three';
import {Batcher,mesh,material,sign} from './assets.js';
import {disposeObjectResources} from './resources.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const SODA_COST=5;
export function buySoda(save,inventory){if(save.coins<SODA_COST)return false;save.coins-=SODA_COST;inventory.sodas++;return true;}
export function sodaFactor(random=Math.random){return random()<3/5?2:.5;}
export class HospitalExtras{
  constructor(e){this.e=e;this.root=new THREE.Group();this.root.name='international-hospital-extras';e.scene.add(this.root);this.colliders=[];this.sodas=0;this.potion=false;this.lure=null;this.items=[];this.setup();e.systems.navigation=[];}
  prop(name,floor,x,y,z){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);g.userData.floor=floor;this.root.add(g);return g;}
  setup(){
    const e=this.e,m=e.mission,c=m.country;if(c){
      const plaque=this.prop('Country hospital identity',0,10.39,2.4,31.5);const label=sign(c.hospital.toUpperCase(),`${c.city.toUpperCase()} / ${c.name.toUpperCase()} · FICTIONAL HOSPITAL`,3.9,.7,{background:c.accent,color:'#f3f7f7'});plaque.add(label);plaque.rotation.y=-Math.PI/2;
      const countrySign=this.prop('Arrival country signage',0,-10.39,2.50,29.5);countrySign.add(sign(c.name.toUpperCase(),`NIGHT SHIFT / ${c.hospital.toUpperCase()}`,2.2,.44,{background:'#19303d',color:'#cfe7ec'}));countrySign.rotation.y=Math.PI/2;
    }
    for(const level of e.levels.filter(l=>l.floor<3)){
      const g=this.prop('Mystery Soda vending machine',level.floor,VENDING_LOCATION.x,0,VENDING_LOCATION.z);g.rotation.y=-Math.PI/2;
      const b=new Batcher(g),shell=material('#213e50'),glass=material('#88b6c6',{metalness:.35,roughness:.25}),trim=material(c?.accent||'#729bac'),cans=['#88ada9','#a39abc','#d8b784','#638eaa'].map(color=>material(color));
      b.box(shell,0,1.02,0,1.1,2,.7);b.box(glass,-.12,1.22,.365,.69,1.25,.025);
      for(let row=0;row<4;row++){b.box(trim,-.12,.72+row*.29,.25,.70,.025,.30);for(let col=0;col<4;col++)b.cylinder(cans[col],-.38+col*.17,.82+row*.29,.39,.052,.18,.052);}
      b.box(material('#101d27'),-.1,.34,.37,.70,.40,.04);b.box(trim,.42,1.15,.38,.15,.31,.04);b.finish();
      const label=sign('MYSTERY SODA','5 COINS · 60% SLOW / 40% FAST',.98,.25,{background:'#19303c',color:'#e2e9dd'});label.position.set(0,1.87,.37);g.add(label);
      const collider=vendingBounds();e.hospitals[level.floor].colliders.push(collider);this.colliders.push({floor:level.floor,collider});
      const bottle=new THREE.Group();bottle.name='Dispensed Mystery Soda bottle';bottle.visible=false;bottle.position.set(-.1,1.45,.43);g.add(bottle);const bottleGeometry=new THREE.LatheGeometry([[0,-.12],[.05,-.12],[.055,-.10],[.055,.10],[.027,.14],[.027,.20],[0,.20]].map(([x,y])=>new THREE.Vector2(x,y)),12);const colors=[];for(let v=0;v<bottleGeometry.attributes.position.count;v++){const y=bottleGeometry.attributes.position.getY(v),color=new THREE.Color(y>.17?'#353a56':Math.abs(y)<.07?'#d8e4d9':'#89b7b1');colors.push(color.r,color.g,color.b);}bottleGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));bottle.add(new THREE.Mesh(bottleGeometry,material('#ffffff',{vertexColors:true,roughness:.28})));
      this.items.push({type:'extra-vending',floor:level.floor,x:7.65,z:29.5,label:'Mystery Soda · buy for 5 coins',bottle});
    }
    // One service key opens both entrances to each locked laboratory.
    const lockedFloors=[];for(const level of e.levels)for(const room of level.rooms.filter(r=>r.kind==='lab')){
      const locked=m.type==='standard'&&(m.round>=5||m.random()<.35);if(locked)lockedFloors.push(level.floor);
      for(const door of level.doors.filter(d=>d.room===room.id)){door.open=false;door.angle=0;door.pivot&&(door.pivot.rotation.y=0);door.locked=locked;door.keyId=locked?'laboratory':null;}
    }
    if(lockedFloors.length){const room=e.levels[0].rooms.find(r=>r.kind==='office'),g=this.prop('Laboratory service key',0,room.center.x-.8,1.16,room.center.z+1.4);
      const metal=material('#bca568',{metalness:.7,roughness:.35});mesh('cylinder',material('#344e60'),[.20,1.10,.20],[0,-.61,0],g);const ring=new THREE.Mesh(new THREE.TorusGeometry(.07,.013,6,12),metal);ring.rotation.x=Math.PI/2;g.add(ring);mesh('box',metal,[.035,.02,.16],[0,0,.12],g);mesh('box',metal,[.08,.02,.025],[.02,0,.18],g);
      const tag=sign('LAB / RESEARCH','SERVICE KEY',.65,.22);tag.position.set(0,.23,0);g.add(tag);this.keyProp=g;this.items.push({type:'extra-key',floor:0,x:g.position.x,z:g.position.z,label:'Collect laboratory & research key'});
    }
    if(m.type==='standard'&&m.round>=5){const room=e.levels[0].rooms.find(r=>r.kind==='lab'),g=this.prop('Fictional laboratory potion',0,room.center.x+.3,1.15,room.center.z-.6);
      mesh('cylinder',material('#626e81'),[.20,1.10,.20],[0,-.6,0],g);mesh('cylinder',material('#b2a1df',{roughness:.25}),[.055,.20,.055],[0,.07,0],g);mesh('cylinder',material('#d8e4eb'),[.06,.04,.06],[0,.18,0],g);
      const label=sign('KTD / DREAM VIAL','FICTIONAL DIVERSION ITEM',.9,.24);label.position.set(0,.4,0);g.add(label);this.potionProp=g;this.items.push({type:'extra-potion',floor:0,x:g.position.x,z:g.position.z,label:'Take fictional Dream Vial'});
    }
  }
  interactions(){const e=this.e,m=e.mission;if(m.result||m.state==='escape')return [];const out=this.items.filter(i=>i.floor===e.floor&&!(i.type==='extra-vending'&&this.dispense?.item===i)&&(i.type!=='extra-key'||!m.keys.includes('laboratory'))&&(i.type!=='extra-potion'||!this.potion&&!this.lure));
    if(this.dispense?.ready&&this.dispense.item.floor===e.floor)out.unshift({type:'extra-soda',floor:e.floor,x:7.9,z:29.5,label:'Pick up Mystery Soda from collection slot'});
    const n=e.incidents?.contact;if(this.potion&&n&&!n.dead&&['escort','recruited'].includes(n.recruit.state)&&n.floor===e.floor)out.push({type:'extra-diversion',floor:e.floor,x:n.pos.x,z:n.pos.z,label:'Offer Dream Vial · only outside target office'});
    if(this.lure?.phase==='collapsed'&&e.floor===m.target.floor)out.push({type:'extra-help',floor:e.floor,door:this.lure.door,...this.lure.callPoint,label:'Call the target doctor for help'});
    return out;
  }
  interact(item){const e=this.e,m=e.mission;if(e.paused||m.result)return false;const valid=this.interactions().find(i=>i.type===item.type&&i.floor===e.floor&&distance(e.playerPos,i)<2.5);if(!valid)return false;
    if(item.type==='extra-vending'){if(this.dispense){e.notify('Collect the dispensed bottle before buying another.');return false;}if(!buySoda(m.save,this)){e.notify('Mystery Soda costs 5 coins. Earn coins by finishing assignments.');return false;}this.sodas--;this.dispense={item:valid,at:m.elapsed,ready:false};valid.bottle.visible=true;valid.bottle.position.y=1.45;e.hooks.persist?.();e.audio.sound('vending');e.notify('Mystery Soda purchased · wait for the bottle to drop into the collection slot.','clue');e.emitHUD();return true;}
    if(item.type==='extra-soda'){if(!this.dispense?.ready)return false;this.sodas++;this.dispense.item.bottle.visible=false;this.dispense=null;e.audio.sound('bottle-pickup');e.notify(`Mystery Soda collected · ${this.sodas} in bag. Drink during an appointment wait.`,'clue');e.emitHUD();return true;}
    if(item.type==='extra-key'){m.collectKey('laboratory');this.keyProp.visible=false;e.notify('Laboratory service key collected · unlock Laboratory or Research','clue');return true;}
    if(item.type==='extra-potion'){this.potion=true;this.potionProp.visible=false;e.notify('Dream Vial collected · invite your contact, then lead them outside the target’s room','clue');return true;}
    if(item.type==='extra-diversion')return this.offerPotion();
    if(item.type==='extra-help'){this.lure.phase='responding';this.lure.calledAt=m.elapsed;this.lure.target.activity=null;this.lure.target.path=[];this.lure.target.reaction=0;this.lure.target.wait=0;this.lure.target.speed=2.5;e.routeNPC(this.lure.target,this.lure.doctorGoal);e.notify('Help requested · the doctor is coming out to assist','clue');return true;}return false;
  }
  drink(){const e=this.e,a=e.life?.targetCase?.appointment;if(e.paused||!this.sodas||!a||a.startedAt===null||a.completed||e.mission.targetDown){e.notify('Save your soda until the target’s appointment is underway.');return false;}
    const factor=sodaFactor(()=>e.mission.random());if(!a.changeRemaining(e.mission.elapsed,factor))return false;this.sodas--;this.drinkUntil=e.mission.elapsed+1.7;
    if(!this.can&&e.player.hand){this.can=new THREE.Group();this.can.name='Player Mystery Soda can';e.player.hand.add(this.can);mesh('cylinder',material('#8f8ab4'),[.036,.12,.036],[0,0,.03],this.can);mesh('cylinder',material('#c1cbd0',{metalness:.7}),[.034,.005,.034],[0,.061,.03],this.can);}
    e.notify(factor===2?'Mystery Soda · bad luck. Remaining appointment time doubled.':'Mystery Soda · lucky break. Remaining appointment time halved.',factor===2?'warning':'clue');e.audio.sound('clue');e.emitHUD();return true;
  }
  offerPotion(){const e=this.e,m=e.mission,n=e.incidents?.contact,target=e.npcs.find(n=>n.id==='target'),a=e.life?.targetCase;
    if(!this.potion||!n||!target||target.dead||!m.identified||!a||a.completed){e.notify('Verify the target and find an ongoing appointment first.');return false;}
    const doors=e.levels[target.floor].doors.filter(d=>d.room===target.room.id),door=doors.find(d=>e.floor===target.floor&&distance(e.playerPos,d)<3.2&&distance(n.pos,d)<3.2);
    if(!door){e.notify('Lead your contact immediately outside the target’s office.');return false;}
    if(e.incidents.roomAt(e.playerPos,e.floor)?.id===target.room.id){e.notify('Step outside the office before offering the vial.');return false;}
    this.potion=false;n.recruit.state='diversion';n.activity='rest';n.path=[];n.cursor=0;n.reaction=0;n.lying=true;n.baselineY=.2;n.pos.y=.2;n.visual.root.rotation.x=-Math.PI/2;
    const nav=e.systems.navigationFor(e.floor),goal=nav.nearest({x:n.pos.x+.9,z:n.pos.z+.4},nav.fieldFor(n.pos)).point;
    this.lure={phase:'collapsed',contact:n,target,door,callPoint:{x:door.x,z:door.z},doctorGoal:{...goal},floor:e.floor,startedAt:m.elapsed};
    e.notify('The contact collapses · use the office door prompt to call for help. This is a fictional diversion.','warning');return true;
  }
  prepareNPC(n){const e=this.e,l=this.lure;if(!l||n.dead||n.reporting)return false;
    if(n===l.contact&&n.lying){n.activity='rest';n.path=[];return true;}
    if(n===l.responder&&!l.recovered){n.evacuating=false;if(distance(n.pos,l.responderGoal)<.65){n.path=[];n.activity='cpr';l.responderArrived=true;}else{n.activity=null;if(n.cursor>=n.path.length&&n.wait<0)e.routeNPC(n,l.responderGoal);}return true;}
    if(e.mission.targetDown)return false;
    if(n!==l.target||l.phase==='collapsed')return false;
    if(l.phase==='responding'){n.activity=null;if(distance(n.pos,l.doctorGoal)<.65){l.phase='cpr';l.cprAt=e.mission.elapsed;n.path=[];n.activity='cpr';e.life.targetCase.appointment.interrupt(e.mission.elapsed);e.life.updateAppointment(null);e.notify('The doctor is assisting your contact · the appointment is interrupted','clue');}else if(n.cursor>=n.path.length&&n.wait<0)e.routeNPC(n,l.doctorGoal);}
    else if(l.phase==='cpr'){n.path=[];n.activity='cpr';n.visual.root.rotation.y=Math.atan2(l.contact.pos.x-n.pos.x,l.contact.pos.z-n.pos.z);}
    return true;
  }
  update(){const e=this.e;if(this.dispense){const d=this.dispense,age=e.mission.elapsed-d.at,t=Math.min(1,age/.85);d.item.bottle.position.y=1.45-1.11*t*t;if(age>=.85&&!d.ready){d.ready=true;e.audio.sound('bottle-drop');e.notify('Bottle ready · use the collection slot to pick it up.','clue');e.emitHUD();}}for(const g of this.root.children)g.visible=g.userData.floor===e.floor&&g!==this.keyProp&&g!==this.potionProp;if(this.keyProp)this.keyProp.visible=e.floor===0&&!e.mission.keys.includes('laboratory');if(this.potionProp)this.potionProp.visible=e.floor===0&&!this.potion&&!this.lure;
    if(this.can){this.can.visible=e.mission.elapsed<(this.drinkUntil||0);if(this.can.visible&&e.playerSpeed<.2)e.player.poseActivity?.('drink',e.time);}
    const l=this.lure;if(l&&l.calledAt!==undefined&&!l.recovered){
      if(e.mission.elapsed-l.calledAt>12&&!l.responder){const candidate=e.npcs.filter(n=>n!==l.target&&n.floor===l.floor&&!n.dead&&!n.evacuated&&['doctor','nurse'].includes(n.role)).sort((a,b)=>distance(a.pos,l.contact.pos)-distance(b.pos,l.contact.pos))[0];if(candidate){l.responder=candidate;candidate.emergencyResponder=true;candidate.reporting=null;candidate.evacuating=false;candidate.reaction=0;candidate.activity=null;candidate.path=[];candidate.speed=2.6;const nav=e.systems.navigationFor(l.floor);l.responderGoal={...nav.nearest({x:l.contact.pos.x-.8,z:l.contact.pos.z-.3},nav.fieldFor(l.contact.pos)).point};e.routeNPC(candidate,l.responderGoal);}}
      if(l.target.dead&&l.responderArrived)l.responder.visual.poseActivity?.('cpr',e.time);
      else if(l.phase==='cpr'&&!l.target.dead)l.target.visual.poseActivity?.('cpr',e.time);
      if(e.mission.elapsed-l.calledAt>35&&l.responderArrived){l.recovered=true;l.phase='recovered';l.contact.lying=false;l.contact.baselineY=0;l.contact.pos.y=0;l.contact.visual.root.rotation.x=0;l.contact.recruit.state='dismissed';l.contact.activity='rest';l.target.activity='rest';l.responder.activity='rest';l.responder.emergencyResponder=false;
        if(e.mission.targetDown)for(const actor of [l.contact,l.responder]){actor.evacGoal=actor.floor?{x:0,z:-24}:{x:0,z:39};e.systems.stand(actor,actor.evacGoal);actor.evacuating=true;e.systems.route(actor,actor.evacGoal);}e.notify('Emergency staff take over. Your contact is recovering.');}
    }
  }
  hud(){return {sodas:this.sodas,potion:this.potion,lure:this.lure?.phase||null};}
  dispose(){for(const {floor,collider} of this.colliders){const list=this.e.hospitals[floor].colliders,i=list.indexOf(collider);if(i>=0)list.splice(i,1);}this.can?.removeFromParent();disposeObjectResources(this.can);this.root.removeFromParent();disposeObjectResources(this.root,{textures:true});this.root.clear();this.e=null;this.items=[];this.colliders=[];this.lure=null;}
}
