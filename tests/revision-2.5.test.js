import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RoomPrivacy} from '../src/game/room-privacy.js';
import {TorchGesture} from '../src/mobile/torch-gesture.js';
import {GameEngine} from '../src/game/engine.js';
import {Mission,defaultSave,readSave,writeSave} from '../src/game/mission.js';
import {saveCustomSlot,loadCustomSlot,clearCustomSlot,selectHairstyle,selectCharacter} from '../src/game/loadout.js';
import {MissionSystems} from '../src/game/systems.js';
import {HospitalIncidents} from '../src/game/incidents.js';
import {makeLayout} from '../src/game/layout.js';
import {PATIENT_PAGE_LINES,ROOM_WARNING_LINES} from '../src/game/dialogue-v25.js';
import {ALL_DIALOGUE_LINES} from '../src/game/life-rules.js';

test('A light tap toggles, a captured drag changes brightness, and cancellation cannot become a tap',()=>{
  const g=new TorchGesture();assert.equal(g.start(1,300,1),true);assert.equal(g.start(2,100),false);assert.equal(g.move(2,100),null);assert.equal(g.move(1,297),null);assert.equal(g.end(1),false);
  g.start(1,300,1);assert.equal(g.move(1,250),2);assert.equal(g.move(1,100),2.5);assert.equal(g.move(1,400),.5);assert.equal(g.move(1,300),1);assert.equal(g.end(1),true);assert.equal(g.end(1),null);
  g.start(3,300);g.move(3,280);g.reset();assert.equal(g.end(3),null);
});
test('Brightness dragging enables the torch and persists once at the gesture boundary',()=>{
  const e=Object.create(GameEngine.prototype);let persisted=0;Object.assign(e,{settings:{flashlightBrightness:1},hooks:{persist:()=>persisted++},emitHUD(){}});
  for(let i=0;i<30;i++)e.setTorchBrightness(1+i*.1,false);assert.equal(persisted,0);assert.equal(e.settings.flashlightBrightness,2.5);assert.equal(e.flashlight,true);e.commitTorchBrightness();assert.equal(persisted,1);assert.equal(e.setTorchBrightness(NaN),false);
});
test('Three independent custom looks survive reload and loading restores the full character',()=>{
  const save=defaultSave();selectCharacter(save,'custom');save.appearance.name='Camille';save.appearance.gender='female';save.appearance.skin='#271c18';save.appearance.cap=true;save.appearance.tattoos='botanical';
  assert.equal(saveCustomSlot(save,0),true);save.appearance.name='Morgan';save.appearance.gender='male';save.appearance.cap=false;save.appearance.sunglasses=true;saveCustomSlot(save,1);saveCustomSlot(save,2);assert.equal(saveCustomSlot(save,3),false);
  let data;writeSave({setItem:(_,value)=>data=value},save);const restored=readSave({getItem:()=>data});selectCharacter(restored,'male');assert.equal(loadCustomSlot(restored,0),true);assert.equal(restored.character,'custom');assert.equal(restored.appearance.name,'Camille');assert.equal(restored.appearance.gender,'female');assert.equal(restored.appearance.skin,'#271c18');assert.equal(restored.appearance.cap,true);assert.equal(restored.appearance.tattoos,'botanical');
  restored.appearance.name='Edited';assert.equal(restored.customSlots[0].name,'Camille');loadCustomSlot(restored,1);assert.equal(restored.appearance.sunglasses,true);assert.equal(restored.appearance.cap,false);clearCustomSlot(restored,2);assert.equal(loadCustomSlot(restored,2),false);assert.equal(restored.customSlots.length,3);
  const corrupted=readSave({getItem:()=>JSON.stringify({customSlots:[null,42,{skin:'oops',name:'X'.repeat(200)},{}]})});assert.equal(corrupted.customSlots.length,3);assert.equal(corrupted.customSlots[1],null);assert.equal(corrupted.customSlots[2].name.length,24);
});
test('Selecting a hairstyle reveals it by removing the cap without changing accessories',()=>{const save=defaultSave();save.appearance.cap=true;save.appearance.glasses=true;selectHairstyle(save);assert.equal(save.appearance.cap,false);assert.equal(save.appearance.glasses,true);});
test('Patient privacy escalates once, departure cancels the timer, and a third warning reports after two requests',()=>{
  const privacy=new RoomPrivacy();assert.equal(privacy.enter('room',0),'request');assert.equal(privacy.enter('room',1),null);assert.equal(privacy.update('room',29.99),null);assert.equal(privacy.update('room',30),'warning');assert.equal(privacy.update('room',31),null);privacy.leave();assert.equal(privacy.update('room',30),null);assert.equal(privacy.enter('room',32),'security');assert.equal(privacy.update('room',50),null);
  assert.equal(privacy.enter('different',60),'request');assert.equal(privacy.update('different',90),'warning');assert.equal(privacy.update('different',120),'security');assert.equal(privacy.update('different',121),null);privacy.dispose();assert.equal(privacy.rooms.size,0);assert.equal(privacy.active,null);
});
test('A privacy reporter uses the existing physical security route and the correct failure reason',()=>{
  const mission=new Mission(defaultSave(),123),n={pos:new THREE.Vector3(0,0,0),floor:0,name:'Nurse Riley',person:{gender:'female'},path:[],cursor:0};let gasp=0,finished=0;
  const e={mission,npcs:[n],audio:{gasp:()=>gasp++,sound(){},dialogue(){}},notify(){},hooks:{},finish:()=>finished++};const systems=new MissionSystems(e);systems.stand=()=>{};systems.route=(actor,goal)=>{actor.path=[goal];};systems.witness(n,'privacy');assert.equal(n.reporting.reason,'privacy');assert.equal(gasp,0);assert.ok(n.path.length);mission.elapsed=n.reporting.deadline+.01;systems.prepareNPC(n);assert.equal(mission.result.success,false);assert.match(mission.result.reason,/Security escorted/);assert.equal(finished,1);
});
test('Jamie requires an empty bathroom; Maintenance and occupied bathrooms do not qualify',()=>{
  const layout=makeLayout(0),bath=layout.rooms.find(r=>r.kind==='bathroom'),utility=layout.rooms.find(r=>r.kind==='utility');const n={floor:0,pos:new THREE.Vector3(),recruit:{state:'escort'}};const e={floor:0,levels:[layout],playerPos:new THREE.Vector3(),npcs:[n]};const incidents=new HospitalIncidents(e);
  for(const room of [utility,bath]){e.playerPos.set(room.center.x,0,room.center.z);n.pos.copy(e.playerPos);assert.equal(incidents.privateTogether(n),room===bath);}
  e.npcs.push({floor:0,pos:n.pos.clone()});assert.equal(incidents.privateTogether(n),false);e.npcs[1].evacuated=true;assert.equal(incidents.privateTogether(n),true);
});
test('Patient pages and privacy warnings have finite bundled voice keys',()=>{for(const line of [...PATIENT_PAGE_LINES,...Object.values(ROOM_WARNING_LINES)])assert.ok(ALL_DIALOGUE_LINES.includes(line));assert.equal(new Set(PATIENT_PAGE_LINES).size,4);});

test('Evidence reward is awarded once across repeated completion and debrief calls',async()=>{
  const {evidenceEnding}=await import('../src/game/evidence-ending.js');const save=defaultSave(),mission=new Mission(save,123);mission.type='evidence';for(const id of ['ledger','consent','theatre'])mission.photograph(id);
  const result=mission.escape();assert.equal(result.coins,460);for(let i=0;i<10;i++){mission.escape();mission.finish(true,'again');evidenceEnding({gender:i%2?'female':'male'},result.coins);}
  assert.equal(save.coins,460);assert.equal(save.completed,1);assert.equal(save.attempts,1);const ending=evidenceEnding({gender:'female'},460);assert.equal(ending.panels.length,3);assert.match(ending.panels[1][1],/all three images/);assert.match(ending.panels[2][1],/460 coins/);assert.ok(ending.visuals.every(v=>v.artId==='evidence-ending-female-v25'));
});

test('NPC animation uses actual displacement when blocked or finishing a tiny path segment',()=>{
  for(const [distance,blocked,expected] of [[1,true,0],[.001,false,.02],[1,false,4.3]]){
    const e=Object.create(GameEngine.prototype),root=new THREE.Group();root.position.z=-distance;let animatedSpeed;
    const n={id:'visitor',role:'patient',floor:0,pos:root.position,visual:{root,animate:(_,speed)=>animatedSpeed=speed},speed:4.3,path:[{x:11,z:11}],cursor:0,wait:0};
    Object.assign(e,{mission:new Mission(defaultSave(),123),navLayouts:[{doorEdges:new Map()}],levels:[{doors:[]}],floor:0,playerPos:new THREE.Vector3(0,0,10),npcs:[n],time:0,keys:new Set(),captureTime:0,systems:{prepareNPC:()=>true},nearStructure:()=>false,npcCanMoveTo:()=>!blocked});
    e.updateNPCs(.05);assert.ok(Math.abs(animatedSpeed-expected)<1e-6,`${blocked?'blocked':'moving'} measured speed ${animatedSpeed}`);assert.equal(n.movementSpeed,animatedSpeed);
  }
});
