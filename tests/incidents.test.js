import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HospitalIncidents,contactRound,contactIdentity,SHOT_MEMORY_SECONDS} from '../src/game/incidents.js';
import {GameEngine} from '../src/game/engine.js';
import {MissionSystems} from '../src/game/systems.js';
import {Mission,defaultSave} from '../src/game/mission.js';
import {makeLayout} from '../src/game/layout.js';
import {EgressNavigation} from '../src/game/egress.js';
const person=(id,floor,x,z)=>{const root=new THREE.Group();root.position.set(x,0,z);return {id,name:id,role:'nurse',floor,pos:root.position,person:{gender:'female'},visual:{root},reaction:0,path:[],cursor:0,wait:0};};
function fixture(){const e={floor:0,playerPos:new THREE.Vector3(0,0,8),levels:[makeLayout(0)],mission:new Mission(defaultSave(),123),npcs:[],lineOfSight:()=>true,hooks:{},audio:{dialogue(){}},life:{speak(){}},notify(){}};e.incidents=new HospitalIncidents(e);return e;}

test('A contact appears in exactly three of every ten rounds and keeps the same identity on retries',()=>{
  for(let block=0;block<100;block++){let count=0;for(let i=1;i<=10;i++)count+=Number(contactRound(block*10+i));assert.equal(count,3);}
  assert.deepEqual(contactIdentity(8,37),contactIdentity(8,37));
  const identities=Array.from({length:60},(_,i)=>contactIdentity(i+1,37));assert.ok(new Set(identities.map(p=>p.name)).size>=8);assert.equal(new Set(identities.map(p=>p.gender)).size,2);assert.ok(new Set(identities.map(p=>p.skin)).size>=4);
});
test('An unseen same-floor gunshot creates 120 seconds of uncertainty, not an identity report',()=>{
  const e=fixture(),n=person('unseen',0,0,12),otherFloor=person('upstairs',1,0,12);e.npcs=[n,otherFloor];e.mission.elapsed=10;
  e.incidents.hearShot({x:0,z:0},0);assert.equal(n.noiseConcern.until,130);assert.equal(otherFloor.noiseConcern,undefined);assert.equal(SHOT_MEMORY_SECONDS,120);
  let spoken=0;e.life.speak=()=>spoken++;e.mission.elapsed=80;e.incidents.update(.4);assert.equal(n.worriedUntil,130);assert.equal(spoken,1);assert.equal(n.reporting,undefined);assert.equal(e.mission.suspicion,0);
  e.incidents.update(.4);assert.equal(spoken,1);e.mission.elapsed=130;e.incidents.update(.4);assert.equal(n.noiseConcern,null);assert.equal(spoken,1);
});
test('Suppressors reduce hearing distance and seen shots do not create confused sound memories',()=>{
  const e=fixture(),near=person('near',0,0,12),far=person('far',0,0,20),seen=person('seen',0,0,6);seen.visual.root.rotation.y=Math.PI;e.npcs=[near,far,seen];e.mission.save.upgrades.suppressor=1;e.incidents.hearShot({x:0,z:0},0);
  assert.ok(near.noiseConcern);assert.equal(far.noiseConcern,undefined);assert.equal(seen.noiseConcern,undefined);
});
test('The contact must be escorted to an empty side room before accepting the offer',()=>{
  const e=fixture(),room=e.levels[0].rooms.find(r=>r.kind==='bathroom'),n=person('contact',0,0,10);n.recruit={state:'panicked'};e.npcs=[n];e.incidents.contact=n;
  assert.equal(e.incidents.choose('recruit'),false);assert.equal(e.incidents.choose('escort'),true);assert.equal(e.incidents.choose('recruit'),false);
  e.playerPos.set(room.center.x,0,room.center.z);n.pos.set(room.center.x+1,0,room.center.z);const stranger=person('stranger',0,room.center.x-1,room.center.z);e.npcs.push(stranger);assert.equal(e.incidents.privateTogether(n),false);
  stranger.evacuated=true;assert.equal(e.incidents.privateTogether(n),true);assert.equal(e.incidents.choose('recruit'),true);assert.equal(n.recruit.state,'recruited');assert.equal(n.recruit.weapon.visible,false);
  n.recruit.weapon.traverse(o=>o.material?.dispose());
});
test('Dismissal never arms the visitor and an accepted contact is excluded from normal evacuation',()=>{
  const e=fixture(),n=person('contact',0,0,10);n.recruit={state:'panicked'};e.npcs=[n];e.incidents.contact=n;assert.equal(e.incidents.choose('dismiss'),true);assert.equal(n.recruit.weapon,undefined);
  n.recruit={state:'recruited'};e.audio.sound=()=>{};e.levels[0].doors=[];e.systems=new MissionSystems(e);e.systems.startEvacuation();assert.equal(n.evacuating,false);assert.equal(n.recruit.nextRoute,0);
});
test('An autonomous contact cannot shoot before the primary target, harm patients or fire through walls',()=>{
  const e=Object.create(GameEngine.prototype),save=defaultSave();Object.assign(e,{mission:new Mission(save,123),scene:new THREE.Scene(),effects:[],audio:{sound(){}},emitHUD(){},lineOfSight:()=>true});
  const ally=person('contact',0,0,0),staff=person('staff',0,0,5),patient=person('patient',0,0,5);patient.role='patient';
  assert.equal(e.allyShot(ally,staff),false);e.mission.eliminate({id:'target',role:'doctor'});assert.equal(e.allyShot(ally,patient),false);assert.equal(patient.dead,undefined);
  e.lineOfSight=()=>false;assert.equal(e.allyShot(ally,staff),false);e.lineOfSight=()=>true;assert.equal(e.allyShot(ally,staff),true);assert.equal(staff.dead,true);assert.equal(e.mission.staffKills,2);assert.equal(e.allyShot(ally,staff),false);
  e.clearEffects();assert.equal(e.effects.length,0);
});
test('Transient contact routes follow obstacles without growing the shared flow-field cache',()=>{
  const layout=makeLayout(0),wall={minX:-1,maxX:1,minZ:10,maxZ:12,minY:0,maxY:3},nav=new EgressNavigation(layout,[wall]);
  for(let i=0;i<30;i++){const path=nav.routeTransient({x:0,z:30},{x:-3,z:3+i*.6});assert.ok(path.length>0);}
  assert.equal(nav.fields.size,0);
});

test('Actors can leave a conservative navigation margin beside carts without crossing solid geometry',()=>{
  const layout=makeLayout(0),cart={minX:-1.475,maxX:-.725,minZ:-15.45,maxZ:-14.55,minY:0,maxY:1.04},nav=new EgressNavigation(layout,[cart]);
  const start={x:-1.70,z:-15.0},route=nav.route(start,{x:0,z:33});assert.ok(route.length>0);
  const first={x:(route[0].x-11)*3,z:(route[0].z-11)*3};assert.equal(nav.clearDeparture(start,first),true);
  assert.equal(nav.clearDeparture(start,{x:-1,z:-15}),false);
});

test('The contact physically follows into a private room and waits for the primary before autonomous action',async()=>{
  const {buildHospital}=await import('../src/game/hospital.js'),{makeNavigation}=await import('../src/game/navigation.js'),{disposeObjectResources}=await import('../src/game/resources.js');
  const previousDocument=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
  let hospitals;const levels=[0,1,2].map(makeLayout),materials=Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(name=>[name,new THREE.MeshBasicMaterial()]));
  try{hospitals=levels.map(layout=>buildHospital(layout,materials));}finally{globalThis.document=previousDocument;}
  const e=Object.create(GameEngine.prototype),save=defaultSave(),room=levels[0].rooms.find(r=>r.kind==='bathroom');
  Object.assign(e,{mission:new Mission(save,123),levels,hospitals,navLayouts:levels.map((level,i)=>makeNavigation(level,hospitals[i].colliders)),scene:new THREE.Scene(),effects:[],npcs:[],floor:0,playerPos:new THREE.Vector3(room.center.x,0,room.center.z),player:{root:new THREE.Group()},keys:new Set(),captureTime:0,time:0,hooks:{},muzzle:{intensity:0},blackout:0,impairment:0,coughCooldown:999,nextBlackout:Infinity,nextPA:Infinity,shotCooldown:0,audio:{sound(){},speak(){},gasp(){}},notify(){},say(){},emitHUD(){},finish(){}});
  e.systems=new MissionSystems(e);e.incidents=new HospitalIncidents(e);e.incidents.setup();e.mission.elapsed=e.incidents.arrivalAt;e.incidents.arrive();const contact=e.incidents.contact;assert.ok(contact);assert.equal(e.incidents.choose('escort'),true);
  for(let frame=0;frame<1200&&!e.incidents.privateTogether(contact);frame++){e.time+=1/30;e.mission.elapsed+=1/30;e.updateNPCs(1/30);e.updateEnvironment(1/30);assert.equal(e.canStand(contact.pos.x,contact.pos.z,.21,contact.floor),true);}
  assert.equal(e.incidents.privateTogether(contact),true);assert.equal(e.incidents.choose('recruit'),true);
  const staff=person('staff',0,room.center.x,room.center.z-3);staff.role='doctor';staff.speed=0;staff.visual.animate=()=>{};e.npcs.push(staff);
  for(let i=0;i<30;i++){e.time+=1/30;e.mission.elapsed+=1/30;e.updateNPCs(1/30);}assert.equal(staff.dead,undefined);assert.equal(contact.recruit.weapon.visible,false);
  e.mission.eliminate({id:'target',role:'doctor'});e.systems.startEvacuation();for(let i=0;i<180&&!staff.dead;i++){e.time+=1/30;e.mission.elapsed+=1/30;e.updateNPCs(1/30);e.updateEnvironment(1/30);}
  assert.equal(staff.dead,true);assert.equal(contact.recruit.weapon.visible,true);assert.equal(e.mission.staffKills,2);e.clearEffects();for(const n of e.npcs)n.visual.dispose?.();for(const h of hospitals){disposeObjectResources(h.group,{textures:true});for(const wall of h.wallMeshes)disposeObjectResources(wall);}
});

test('Successive rare contacts have distinct names and recruitment speech replaces the previous line',()=>{
  const rounds=Array.from({length:100},(_,i)=>i+1).filter(contactRound),names=rounds.map(round=>contactIdentity(round,77).name);for(let i=1;i<names.length;i++)assert.notEqual(names[i],names[i-1]);
  const e=fixture();let canceled=0,spoken=0;e.audio.cancelVoices=()=>canceled++;e.audio.dialogue=()=>spoken++;e.incidents.contact=person('contact',0,0,8);e.incidents.speakRecruit('First line');e.incidents.speakRecruit('Next line','player');assert.equal(canceled,2);assert.equal(spoken,2);
});
