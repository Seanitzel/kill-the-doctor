import {freestyleFixture} from './helpers/freestyle.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Mission,defaultSave,readSave} from '../src/game/mission.js';
import {prepareAssignment,selectAssignmentType,markIntroSeen} from '../src/game/assignment.js';
import {scheduledType,assignmentType} from '../src/game/assignment-types.js';
import {AssignmentObjectives} from '../src/game/objectives.js';
import {HospitalVisitors} from '../src/game/visitors.js';
import {HospitalIncidents} from '../src/game/incidents.js';
import {GameEngine} from '../src/game/engine.js';
import {makeLayout,FLOORS} from '../src/game/layout.js';
import {buildHospital} from '../src/game/hospital.js';
import {makeNavigation} from '../src/game/navigation.js';
import {MissionSystems} from '../src/game/systems.js';
import {disposeObjectResources} from '../src/game/resources.js';
function saveFor(type){const save=freestyleFixture(defaultSave());selectAssignmentType(save,type);prepareAssignment(save,()=>.5,123);return save;}
test('Special mission selection produces a complete stable assignment and campaign rotation advances',()=>{
  const save=saveFor('rescue'),a=prepareAssignment(save);assert.equal(a.type,'rescue');assert.equal(a.seed,123);assert.equal(a.story.id,'special-rescue');markIntroSeen(save);save.attempts++;assert.equal(prepareAssignment(save).seed,123);
  const restored=readSave({getItem:()=>JSON.stringify(save)});assert.equal(prepareAssignment(restored).type,'rescue');assert.equal(prepareAssignment(restored).introSeen,false);
  save.completed=1;assert.equal(assignmentType(save),'standard');save.completed=2;delete save.activeAssignment;assert.equal(scheduledType(3),'evidence');save.completed=4;assert.equal(scheduledType(5),'rescue');assert.equal(selectAssignmentType(save,'bogus'),false);
});
test('Evidence assignments require three distinct photographs, no casualties and a final escape',()=>{
  const m=new Mission(saveFor('evidence'),123);assert.equal(m.escape(),undefined);assert.equal(m.collectKey('x'),false);assert.equal(m.collectKey('basement'),true);assert.equal(m.collectKey('basement'),false);
  for(const id of ['ledger','consent'])assert.equal(m.photograph(id),true);assert.equal(m.escape(),undefined);assert.equal(m.photograph('ledger'),false);assert.equal(m.photograph('theatre'),true);assert.equal(m.state,'escape');assert.equal(m.targetDown,false);const r=m.escape();assert.equal(r.success,true);assert.equal(r.photos,3);assert.equal(r.coins,460);const bank=m.save.coins;m.escape();assert.equal(m.save.coins,bank);
  const bad=new Mission(saveFor('evidence'),1);bad.eliminate({id:'guard',role:'security'});assert.equal(bad.result.success,false);assert.equal(bad.result.coins,0);
});
test('Rescue targets are only the two operating doctors, and victory requires the released patient nearby',()=>{
  const m=new Mission(saveFor('rescue'),123);assert.equal(m.eliminate({id:'staff',role:'nurse'}),false);assert.equal(m.staffKills,0);assert.equal(m.releasePatient(),false);
  m.eliminate({id:'operation-doctor-0',role:'doctor'});assert.equal(m.state,'escape');assert.equal(m.targetDown,false);const timer=m.timer;m.tick(2);m.eliminate({id:'operation-doctor-1',role:'doctor'});assert.equal(m.timer,timer-2);assert.equal(m.targetDown,true);assert.equal(m.escape(true),undefined);assert.equal(m.releasePatient(),true);assert.equal(m.escape(),undefined);assert.equal(m.escape(true).rescued,true);assert.equal(m.save.coins,560);
  const bad=new Mission(saveFor('rescue'),1);bad.eliminate({id:'rescue-patient',role:'patient'});assert.equal(bad.result.success,false);
});
function worldFixture(type='rescue'){
  const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
  const levels=FLOORS.map((_,i)=>makeLayout(i)),materials=Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(k=>[k,new THREE.MeshBasicMaterial()]));let hospitals;
  try{hospitals=levels.map(l=>buildHospital(l,materials));}finally{globalThis.document=old;}
  const e=Object.create(GameEngine.prototype);Object.assign(e,{mission:new Mission(saveFor(type),123),levels,hospitals,navLayouts:levels.map((l,i)=>makeNavigation(l,hospitals[i].colliders)),scene:new THREE.Scene(),npcs:[],floor:0,playerPos:new THREE.Vector3(0,0,30),player:{root:new THREE.Group()},keys:new Set(),captureTime:0,time:0,hooks:{},muzzle:{intensity:0},effects:[],blackout:0,impairment:0,coughCooldown:999,nextBlackout:Infinity,nextPA:Infinity,shotCooldown:0,audio:{sound(){},gasp(){},speak(){}},notify(){},say(){},emitHUD(){},finish(){}});e.systems=new MissionSystems(e);e.objectives=new AssignmentObjectives(e);e.systems.prepare();return e;
}
function dispose(e){e.objectives?.dispose();e.visitors?.dispose();for(const n of e.npcs)n.visual.dispose?.();for(const h of e.hospitals){h.disposeProps?.();disposeObjectResources(h.group,{textures:true});for(const w of h.wallMeshes)disposeObjectResources(w);}}
test('Basement lift and theatre door require separate keys; camera-only input never draws a firearm',()=>{
  const e=worldFixture();try{assert.equal(e.travelToFloor(3),false);e.mission.collectKey('basement');assert.equal(e.levels[3].doors[0].locked,true);e.levels[3].doors[0].locked=false;
    const r=new Mission(saveFor('evidence'),123);e.mission=r;e.paused=false;e.setAiming(true);assert.equal(!!e.weaponDrawn,false);e.toggleWeapon();assert.equal(!!e.weaponDrawn,false);
    let photos=0;e.objectives.takePhoto=()=>photos++;e.shoot({touch:true,aimRay:new THREE.Ray()});assert.equal(photos,1);assert.equal(e.mission.staffKills,0);
  }finally{dispose(e);}
});
test('Evidence photos need the subject in frame, correct floor, range and an unobstructed view',()=>{
  const e=worldFixture('evidence');try{const s=e.objectives.photoSites[0];e.floor=0;e.playerPos.set(s.x,0,s.z+4);e.lineOfSight=()=>true;
    const ray=new THREE.Ray(new THREE.Vector3(s.x,s.y,s.z+4),new THREE.Vector3(0,0,-1));assert.equal(e.objectives.takePhoto(new THREE.Ray(ray.origin,new THREE.Vector3(1,0,0))),false);e.lineOfSight=()=>false;assert.equal(e.objectives.takePhoto(ray),false);e.lineOfSight=()=>true;assert.equal(e.objectives.takePhoto(ray),true);assert.deepEqual(e.mission.photos,['ledger']);assert.equal(e.objectives.takePhoto(ray),false);
    const guard=e.spawnNPC({gender:'male'},'security',0,{x:s.x,z:s.z+6},null,'guard',{fixed:true});guard.visual.root.rotation.y=Math.PI;s.id='consent';assert.equal(e.objectives.takePhoto(ray),false);assert.equal(guard.reporting.reason,'camera');
  }finally{dispose(e);}
});
test('Quiet key theft requires crouching behind a nurse and no seeing witnesses',()=>{
  const e=worldFixture();try{const n=e.spawnNPC({gender:'female'},'nurse',0,{x:0,z:12},null,'carrier',{fixed:true});n.keyCarrier=true;n.visual.root.rotation.y=0;e.playerPos.set(0,0,10.5);e.crouched=true;e.lineOfSight=()=>true;assert.equal(e.objectives.steal(n),true);assert.ok(e.mission.keys.includes('theatre'));
    e.mission=new Mission(saveFor('rescue'),123);e.crouched=false;assert.equal(e.objectives.steal(n),false);assert.equal(e.mission.result.success,false);
  }finally{dispose(e);}
});
test('The rescued patient walks around solid operating furniture, uses the lift and follows to the main exit',()=>{
  const e=worldFixture();try{e.floor=3;for(const n of e.npcs.filter(n=>n.operationDoctor)){e.mission.eliminate(n);n.dead=true;}e.systems.startEvacuation();assert.equal(e.objectives.release(),true);const n=e.objectives.patient;e.playerPos.set(0,0,-20);
    function advance(until,max=1800){for(let i=0;i<max&&!until();i++){e.time+=1/30;e.mission.elapsed+=1/30;e.updateNPCs(1/30);e.updateEnvironment(1/30);assert.equal(e.canStand(n.pos.x,n.pos.z,.21,n.floor),true);}}
    advance(()=>Math.hypot(n.pos.x,n.pos.z+20)<2.2);assert.ok(Math.hypot(n.pos.x,n.pos.z+20)<2.2,JSON.stringify(n.pos));e.floor=0;e.playerPos.set(0,0,-20);advance(()=>n.floor===0);assert.equal(n.floor,0);e.playerPos.set(e.levels[0].exit.x,0,e.levels[0].exit.z);advance(()=>e.objectives.patientPresent());assert.equal(e.objectives.patientPresent(),true);assert.equal(e.mission.escape(true).success,true);
  }finally{dispose(e);}
});
test('Two cane visitors stay solid, carry finite grounded canes and cannot visually report a weapon',()=>{
  const e=worldFixture('standard');try{e.visitors=new HospitalVisitors(e);assert.equal(e.visitors.people.length,2);e.weaponDrawn=true;
    for(const n of e.visitors.people){e.floor=n.floor;e.playerPos.copy(n.pos).add(new THREE.Vector3(0,0,2));n.visual.root.rotation.y=0;e.systems.update(.3);assert.equal(n.reporting,undefined);n.caneHandle.update(1,1);n.caneHandle.root.traverse(o=>assert.ok(o.position.toArray().every(Number.isFinite)));}
  }finally{dispose(e);}
});
test('Eligible distressed visitor is absent at mission start and arrives only after the delay',()=>{
  const e=worldFixture('standard');try{e.incidents=new HospitalIncidents(e);e.incidents.setup();assert.equal(e.incidents.contact,null);assert.ok(e.incidents.arrivalAt>=65);e.mission.elapsed=64;assert.equal(e.incidents.arrive(),false);e.mission.elapsed=e.incidents.arrivalAt;assert.equal(e.incidents.arrive(),true);const n=e.incidents.contact;e.incidents.prepareNPC(n);assert.equal(n.recruit.phase,'running');e.mission.elapsed=n.recruit.burstUntil+.01;e.incidents.prepareNPC(n);assert.equal(n.recruit.phase,'calm');assert.equal(n.activity,'rest');assert.equal(n.path.length,0);assert.equal(e.incidents.arrive(),false);e.incidents.dispose();
  }finally{dispose(e);}
});

test('Operating doctors raise the rescue alarm instead of triggering the ordinary pre-target witness failure',()=>{const e=worldFixture();try{const doctor=e.npcs.find(n=>n.operationDoctor);e.systems.witness(doctor);assert.equal(e.mission.state,'escape');assert.equal(e.mission.result,null);assert.equal(doctor.reporting,null);assert.equal(doctor.evacuating,undefined);assert.equal(doctor.activity,'worried');assert.equal(e.objectives.patient.lying,true);}finally{dispose(e);}});
