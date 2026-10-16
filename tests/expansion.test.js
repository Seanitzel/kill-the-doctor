import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as THREE from 'three';
import {Mission,defaultSave,purchase,readSave,SAVE_KEY} from '../src/game/mission.js';
import {CHARACTERS,profileFor,selectCharacter,unlockCharacter,weaponInfo,maskProtects,seesDrawnWeapon,STAFF_BONUS} from '../src/game/loadout.js';
import {STORIES,STORY_SOURCES,STORY_CROPS,takeStory} from '../src/game/stories.js';
import {FLOORS,makeLayout,world} from '../src/game/layout.js';
import {GameEngine} from '../src/game/engine.js';
import {MissionSystems} from '../src/game/systems.js';
import {HospitalLife} from '../src/game/atmosphere.js';
import {buildHospital} from '../src/game/hospital.js';
import {makeNavigation} from '../src/game/navigation.js';

test('All client stories rotate without repeats and persist across sessions',()=>{
  const save=defaultSave(),ids=Array.from({length:STORIES.length},()=>takeStory(save,()=>.5).id);
  assert.equal(new Set(ids).size,STORIES.length);const last=ids.at(-1);
  const restored=readSave({getItem:k=>k===SAVE_KEY?JSON.stringify(save):null});
  assert.notEqual(takeStory(restored,()=>.5).id,last);
  for(const story of STORIES){
    assert.ok([3,4].includes(story.panels.length));assert.ok(!story.source||STORY_SOURCES.some(s=>s.id===story.source));
    const path=new URL(`../public/stories/${story.artId||story.id}.png`,import.meta.url);assert.ok(existsSync(path));
    const bytes=readFileSync(path);assert.equal(bytes.readUInt32BE(16),1024);assert.equal(bytes.readUInt32BE(20),1536);
    const cuts=STORY_CROPS[story.artId||story.id];assert.equal(cuts[0],0);assert.equal(cuts[3],1536);assert.ok(cuts[1]>400&&cuts[2]>900);
  }
});
test('Three profiles remain free, legacy paid identities retain their look and coins',()=>{
  const save=readSave({getItem:()=>JSON.stringify({character:'female',coins:400,upgrades:{shoes:2}})});
  assert.equal(save.character,'female');assert.equal(save.unlockedCharacters.length,3);assert.equal(profileFor(save).gender,'female');
  assert.equal(selectCharacter(save,'river'),false);assert.equal(unlockCharacter(save,'river'),false);assert.equal(save.coins,400);
  for(const c of CHARACTERS){assert.equal(selectCharacter(save,c.id),true);assert.equal(profileFor(save).name,c.name);assert.equal(profileFor(save).gender,c.gender);}
  save.appearance.name='  Night visitor  ';assert.equal(profileFor(save).name,'Night visitor');
  const legacy=readSave({getItem:()=>JSON.stringify({character:'iman',coins:220,appearance:{hair:'#2c2628'}})});assert.equal(legacy.character,'custom');assert.equal(profileFor(legacy).name,'Iman');assert.equal(profileFor(legacy).gender,'female');assert.equal(legacy.coins,220);
});
test('Mask and rifle purchases equip, preserve coins and survive save reload',()=>{
  const save=defaultSave();save.coins=500;
  assert.equal(maskProtects(save),false);assert.equal(purchase(save,'mask'),true);assert.equal(maskProtects(save),true);
  assert.equal(purchase(save,'sniper'),true);assert.equal(save.coins,0);assert.equal(save.loadout.weapon,'sniper');
  const restored=readSave({getItem:()=>JSON.stringify(save)});assert.deepEqual(restored,save);
  assert.equal(weaponInfo(restored).range,80);assert.ok(weaponInfo(restored).fov<weaponInfo(restored,'pistol').fov);
  assert.equal(purchase(save,'mask'),false);save.loadout.mask=false;assert.equal(maskProtects(save),false);
  const locked=defaultSave();locked.loadout.weapon='sniper';assert.equal(weaponInfo(locked).id,'pistol');
});
test('Weapon changes retain separate magazines; switching while reloading cannot duplicate ammunition',()=>{
  const e=Object.create(GameEngine.prototype),save=defaultSave();save.upgrades.sniper=1;
  Object.assign(e,{mission:new Mission(save,1),player:{root:new THREE.Group()},weaponSlots:{},weaponKind:'pistol',ammo:3,reserve:21,reloading:0});
  e.setWeapon('sniper');assert.equal(e.ammo,4);e.ammo=1;e.reserve=10;e.setWeapon('pistol');assert.equal(e.ammo,3);assert.equal(e.reserve,21);
  e.reloading=1;e.setWeapon('sniper');assert.equal(e.weaponKind,'pistol');e.reloading=0;e.setWeapon('sniper');assert.equal(e.ammo,1);assert.equal(e.reserve,10);
  e.reloading=1;save.loadout.weapon='pistol';e.emitHUD=()=>{};e.refreshLoadout();assert.equal(e.weaponKind,'pistol');assert.equal(e.reloading,0);assert.equal(e.ammo,3);
});
test('Only the assigned doctor starts evacuation; staff bonuses bank once after escape',()=>{
  const save=defaultSave(),m=new Mission(save,110);assert.ok(m.target.name.startsWith('Dr.'));
  assert.equal(m.eliminate({id:'other',role:'nurse'}),false);assert.equal(m.staffKills,0);
  m.eliminate({id:'target',role:'doctor'});m.eliminate({id:'extra1',role:'doctor'});m.eliminate({id:'extra2',role:'nurse'});m.eliminate({id:'police',role:'police'});
  assert.equal(m.staffKills,3);assert.equal(save.coins,0);const result=m.escape();
  assert.equal(result.breakdown.find(r=>r.label==='Additional staff').coins,STAFF_BONUS*2);const coins=save.coins;m.escape();assert.equal(save.coins,coins);
  const failed=new Mission(defaultSave(),110);failed.eliminate({id:'target',role:'doctor'});failed.eliminate({id:'extra',role:'nurse'});assert.equal(failed.finish(false,'caught').coins,0);
});
test('Assignments cover three floors and remain doctor-only',()=>{
  const floors=new Set();for(let i=1;i<=80;i++){const save=defaultSave();save.attempts=i;const m=new Mission(save,i);floors.add(m.target.floor);assert.match(m.target.name,/^Dr\./);}
  assert.equal(FLOORS.length,3);assert.deepEqual([...floors].sort(),[0,1,2]);
});
test('Witnesses need proximity, facing and a clear view of the weapon',()=>{
  assert.equal(seesDrawnWeapon({x:0,z:0},{x:0,z:6},0,true),true);
  assert.equal(seesDrawnWeapon({x:0,z:0},{x:0,z:-6},0,true),false);
  assert.equal(seesDrawnWeapon({x:0,z:0},{x:0,z:-1},0,true),true);
  assert.equal(seesDrawnWeapon({x:0,z:0},{x:0,z:6},0,false),false);
  assert.equal(seesDrawnWeapon({x:0,z:0},{x:0,z:12},0,true),false);
});

const oldDocument=globalThis.document;
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const mats=Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(k=>[k,new THREE.MeshBasicMaterial()]));
const levels=FLOORS.map((_,i)=>makeLayout(i)),hospitals=levels.map(l=>buildHospital(l,mats));
globalThis.document=oldDocument;
const navLayouts=levels.map((l,i)=>makeNavigation(l,hospitals[i].colliders));
function actor(id,floor,x,z){const root=new THREE.Group();root.position.set(x,0,z);return {id,name:id,role:'nurse',floor,pos:root.position,visual:{root,animate(){}},person:{},path:[],cursor:0,wait:0,activity:'chat',speed:1,routine:0};}
function simulation(){
  const e=Object.create(GameEngine.prototype),save=defaultSave();
  Object.assign(e,{mission:new Mission(save,123),levels,hospitals,navLayouts,npcs:[],floor:0,playerPos:new THREE.Vector3(3,0,30),player:{root:new THREE.Group()},keys:new Set(),captureTime:0,time:0,weaponDrawn:false,hooks:{},audio:{sound(){},gasp(){},speak(){}},notify(){},finish(){e.finished=true;}});
  e.systems=new MissionSystems(e);return e;
}
test('Drawing in view causes one audible gasp and a report; walls and holstering prevent detection',()=>{
  const e=simulation(),n=actor('witness',0,0,24);e.npcs=[n];e.playerPos.set(0,0,27);let gasps=0;e.audio.gasp=()=>gasps++;
  e.systems.update(.2);assert.equal(gasps,0);e.weaponDrawn=true;e.systems.update(.2);assert.equal(gasps,1);assert.ok(n.reporting);e.systems.update(.2);assert.equal(gasps,1);
  e.mission.elapsed=n.reporting.deadline+.01;e.systems.prepareNPC(n);assert.equal(e.mission.result.success,false);assert.equal(e.finished,true);
  const blocked=simulation();blocked.npcs=[actor('other',0,0,24)];blocked.playerPos.set(0,0,27);blocked.weaponDrawn=true;blocked.lineOfSight=()=>false;blocked.systems.update(.2);assert.equal(blocked.npcs[0].reporting,undefined);
});
test('Primary target interrupts pending reports and starts one immediate alarm across all floors',()=>{
  const e=simulation(),n=actor('reporter',1,0,0);e.npcs=[n];n.reporting={deadline:0};let alarms=0;e.audio.sound=kind=>{if(kind==='alarm')alarms++;};
  e.mission.eliminate({id:'target',role:'doctor'});e.systems.update(.1);assert.equal(alarms,1);assert.equal(n.reporting,null);assert.equal(n.evacuating,true);
  e.systems.update(.1);assert.equal(alarms,1);assert.equal(e.mission.result,null);assert.ok(levels.every(l=>l.doors.every(d=>d.open)));
});
test('An adult in every department has an evacuation path to its floor exit',()=>{
  const e=simulation();
  for(const layout of levels)for(const room of layout.rooms){const n=actor(room.id,layout.floor,room.center.x,room.center.z);n.seated=true;e.npcs.push(n);}
  e.systems.startEvacuation();
  for(const n of e.npcs){assert.ok(n.path.length>0,n.id);assert.equal(n.activity,null);assert.equal(n.seated,false);assert.equal(n.lying,false);const dest=world(n.path.at(-1).x,n.path.at(-1).z);assert.ok(Math.hypot(dest.x-n.evacGoal.x,dest.z-n.evacGoal.z)<1.2,n.id);}
});
test('Evacuees physically reach lifts and ground exit without passing through furniture',()=>{
  const e=simulation();e.playerPos.set(6,0,33);
  // One adult per floor exercises real movement, doors, floor transfer and exit removal.
  e.npcs=[actor('ground',0,0,0),actor('first',1,0,-18),actor('second',2,0,-18)];e.systems.startEvacuation();
  for(const l of levels)for(const d of l.doors){d.angle=d.openAngle;d.pivot.rotation.y=d.angle;}
  for(let frame=0;frame<3600&&!e.npcs.every(n=>n.evacuated);frame++){e.mission.elapsed+=1/30;e.time+=1/30;e.updateNPCs(1/30);for(const n of e.npcs)assert.ok(e.canStand(n.pos.x,n.pos.z,.21,n.floor),n.id);}
  assert.ok(e.npcs.every(n=>n.evacuated),JSON.stringify(e.npcs.map(n=>({id:n.id,floor:n.floor,pos:n.pos.toArray(),cursor:n.cursor,path:n.path.length}))));
});
test('The full hospital crowd can evacuate while protected newborns remain in the nursery',()=>{
  const e=simulation();e.scene=new THREE.Scene();e.playerPos.set(6,0,33);e.spawnNPCs();e.life=new HospitalLife(e);
  const target=e.npcs.find(n=>n.id==='target');target.dead=true;e.mission.eliminate({id:'target',role:'doctor'});e.systems.startEvacuation();
  for(const l of levels)for(const d of l.doors){d.angle=0;d.pivot.rotation.y=0;}
  Object.assign(e,{muzzle:{intensity:0},blackout:0,impairment:0,coughCooldown:999,nextBlackout:Infinity,nextPA:Infinity,shotCooldown:0});
  const adults=e.npcs.filter(n=>!n.dead&&!n.baby);
  for(let frame=0;frame<3600&&!adults.every(n=>n.evacuated);frame++){e.mission.elapsed+=1/30;e.time+=1/30;e.updateNPCs(1/30);e.updateEnvironment(1/30);if(frame%30===0)for(const n of adults.filter(n=>!n.evacuated))assert.ok(e.canStand(n.pos.x,n.pos.z,.21,n.floor),`crowd collision: ${n.id}`);}
  const remaining=adults.filter(n=>!n.evacuated).map(n=>({id:n.id,floor:n.floor,pos:n.pos.toArray(),cursor:n.cursor,path:n.path.length}));
  assert.ok(adults.every(n=>n.evacuated),JSON.stringify(remaining));assert.ok(e.npcs.filter(n=>n.baby).every(n=>!n.dead&&!n.evacuated));
});
function shootingEngine(){
  const e=simulation();Object.assign(e,{scene:new THREE.Scene(),effects:[],paused:false,aiming:true,ammo:6,reserve:30,shotCooldown:0,reloading:0,weaponKind:'pistol',muzzle:{intensity:0,position:new THREE.Vector3()},say(){},emitHUD(){}});return e;
}
test('Actual shooting keeps early staff alive, sounds the alarm for the primary and awards later staff',()=>{
  const e=shootingEngine(),staff=actor('staff',0,0,18),target=actor('target',0,0,12);target.role='doctor';
  e.playerPos.set(0,0,24);e.npcs=[staff,target];const ray=new THREE.Ray(new THREE.Vector3(0,1.2,24),new THREE.Vector3(0,0,-1));let alarms=0;e.audio.sound=kind=>{if(kind==='alarm')alarms++;};
  e.shoot({touch:true,aimRay:ray});assert.equal(e.lastShot.hitId,'staff');assert.equal(!!staff.dead,false);assert.equal(e.mission.staffKills,0);
  staff.pos.x=3;e.shotCooldown=0;e.shoot({touch:true,aimRay:ray});assert.equal(target.dead,true);assert.equal(e.mission.targetDown,true);assert.equal(alarms,1);assert.equal(staff.evacuating,true);
  staff.pos.set(0,0,18);e.shotCooldown=0;e.shoot({touch:true,aimRay:ray});assert.equal(staff.dead,true);assert.equal(e.mission.staffKills,2);assert.equal(e.mission.save.coins,0);
  const result=e.mission.escape();assert.equal(result.breakdown.find(r=>r.label==='Additional staff').coins,25);
});
test('The scoped rifle can hit across the hospital concourse beyond pistol range',()=>{
  const e=shootingEngine(),target=actor('target',0,0,30);target.role='doctor';e.npcs=[target];e.playerPos.set(0,0,-21);
  const ray=new THREE.Ray(new THREE.Vector3(0,1.2,-24),new THREE.Vector3(0,0,1));
  e.shoot({touch:true,aimRay:ray});assert.equal(e.lastShot.hitId,null);assert.equal(!!target.dead,false);
  e.mission.save.upgrades.sniper=1;e.weaponKind='sniper';e.ammo=4;e.shotCooldown=0;e.shoot({touch:true,aimRay:ray});assert.equal(e.lastShot.hitId,'target');assert.equal(target.dead,true);
});
test('MRI jewelry causes the dramatic hazard only inside Radiology; no jewelry is safe',()=>{
  const e=simulation(),room=levels[0].rooms.find(r=>r.kind==='imaging');e.mission.save.appearance.jewelry=true;e.systems.update(.1);assert.equal(e.systems.magnet,null);
  e.playerPos.set(room.center.x,0,room.center.z);e.mission.save.appearance.jewelry=false;e.systems.update(.1);assert.equal(e.systems.magnet,null);
  e.mission.save.appearance.jewelry=true;e.systems.update(.1);assert.ok(e.systems.magnet);assert.equal(e.mission.result,null);e.systems.update(1);assert.equal(e.mission.result.success,false);assert.match(e.mission.result.reason,/MRI/);
});
test('A cough warning is queued before gas can appear and a bought mask blocks infection',()=>{
  const e=simulation(),patient=actor('sick',0,0,0);patient.contamination=30;let warnings=0;e.audio.patientWarning=()=>warnings++;
  const life=Object.create(HospitalLife.prototype);life.engine=e;life.pendingCoughs=[];life.clouds=[];
  assert.equal(life.beginCough(patient),true);assert.equal(warnings,1);assert.equal(life.clouds.length,0);assert.equal(life.pendingCoughs[0].ready,.85);assert.equal(life.beginCough(patient),false);
  e.impairment=0;e.coughCooldown=0;e.mission.save.upgrades.mask=1;e.mission.save.loadout.mask=true;e.triggerCough(patient);assert.equal(e.impairment,0);
  e.mission.save.loadout.mask=false;e.hooks.soundCaption=()=>{};e.triggerCough(patient);assert.equal(e.impairment,30);
});
