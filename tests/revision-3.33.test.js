import test from 'node:test';
import assert from 'node:assert/strict';
import {hospitalSim,disposeSim} from './helpers/hospital-sim.js';
import {tileAt} from '../src/game/layout.js';

function office(fn){const e=hospitalSim();try{fn(e,e.objectives.china);}finally{disposeSim(e);}}
function openDoors(o){for(const d of o.doors){d.open=true;d.angle=d.openAngle;d.pivot.rotation.y=d.angle;d.pivot.updateMatrixWorld(true);}}
function atDoor(e,o,n,d,inside){const side=Math.sign(o.office.center.z-d.z);n.floor=o.officeFloor;n.pos.set(d.x,0,d.z+side*(inside?.05:-.15));return {x:d.x,z:d.z+side*.05};}

test('the China HUD records the spoon immediately after the real pickup interaction',()=>office((e,o)=>{
 assert.equal(o.hud().hasSpoon,false);e.floor=0;e.playerPos.set(o.spoonPoint.x,0,o.spoonPoint.z);
 assert.equal(o.interact({type:'china-spoon'}),true);assert.equal(o.hud().hasSpoon,true);assert.equal(o.spoonProp.visible,false);
}));

test('every open office entrance blocks both scheduled and unrelated visitors throughout the first five seconds',()=>office((e,o)=>{
 e.playerPos.set(0,0,30);e.mission.elapsed=100;o.collapseDoctor(100);openDoors(o);
 const outsider=e.spawnNPC({name:'Passing patient'},'patient',o.officeFloor,{x:0,z:30},null,'passing-after-collapse');
 for(const now of [100,102.5,104.999]){
  e.mission.elapsed=now;o.updateSeal();assert.equal(o.seal.failed,null);assert.equal(o.patients.discoveryAt,null);
  for(const n of [o.patients.entries[0].n,o.patients.entries[1].n,outsider])for(const d of o.doors){
   const p=atDoor(e,o,n,d,false);assert.equal(o.patients.beforeOpen(n,d),false);assert.equal(e.npcCanMoveTo(n,p.x,p.z),false);
  }
 }
 assert.equal(e.mission.result,null);
}));

test('closing near the first deadline grants a fresh full five seconds; only the selected discovery patient may enter after expiry',()=>office((e,o)=>{
 e.playerPos.set(0,0,30);e.mission.elapsed=100;o.collapseDoctor(100);openDoors(o);
 const d=o.doors[0],side=Math.sign(o.office.center.z-d.z);e.playerPos.set(d.x,0,d.z+side*2);for(const door of o.doors){door.open=false;door.angle=0;door.pivot.rotation.y=0;}
 e.mission.elapsed=104.5;o.updateSeal();assert.equal(o.seal.closedAt,104.5);assert.equal(o.seal.stage,'lock');
 const outsider=e.spawnNPC({name:'Passing patient'},'patient',o.officeFloor,{x:0,z:30},null,'passing-lock-stage');
 for(const now of [105,107,109.499]){
  e.mission.elapsed=now;o.updateSeal();assert.equal(o.seal.failed,null);assert.equal(o.patients.discoveryAt,null);
  for(const n of [o.patients.entries[0].n,o.patients.entries[1].n,outsider])for(const door of o.doors){atDoor(e,o,n,door,false);assert.equal(o.patients.beforeOpen(n,door),false);}
 }
 e.mission.elapsed=109.5;o.updateSeal();assert.equal(o.seal.failed,'lock');assert.equal(o.patients.discoveryAt,109.5);assert.equal(e.mission.result,null);
 const v=o.patients.entries.find(v=>v.phase==='discovering'||v.nextPhase==='discovering');assert.ok(v);assert.equal(o.patients.canUseDoor(v.n,v.door),true);assert.equal(o.patients.beforeOpen(outsider,d),false);
}));

test('a missed close or lock deadline fails only after the selected patient physically crosses into the office',()=>{
 for(const stage of ['close','lock'])office((e,o)=>{
  e.playerPos.set(0,0,30);e.mission.elapsed=100;o.collapseDoctor(100);openDoors(o);
  o.patients.discover();assert.equal(o.patients.discoveryAt,null);
  if(stage==='lock'){e.playerPos.set(o.home.x,0,o.home.z);for(const d of o.doors){d.open=false;d.angle=0;}e.mission.elapsed=104.5;o.updateSeal();}
  const deadline=stage==='close'?105:109.5;e.mission.elapsed=deadline-.001;o.updateSeal();assert.equal(o.patients.discoveryAt,null);
  e.mission.elapsed=deadline;o.updateSeal();const v=o.patients.entries.find(v=>v.phase==='discovering'||v.nextPhase==='discovering');assert.ok(v);
  v.phase='discovering';atDoor(e,o,v.n,v.door,false);o.afterNPCMovement();assert.equal(e.mission.result,null);
  atDoor(e,o,v.n,v.door,true);o.afterNPCMovement();assert.equal(e.mission.result.success,false);assert.match(e.mission.result.reason,/visiting patient discovered the unconscious doctor/);assert.equal(o.discoveryVisible,true);
 });
});

test('the route-edge door shortcut cannot open an office door during either protected window',()=>office((e,o)=>{
 e.playerPos.set(0,0,30);e.mission.elapsed=100;o.collapseDoctor(100);
 const d=o.doors[1],side=Math.sign(o.office.center.z-d.z),n=e.spawnNPC({name:'Shortcut patient'},'patient',o.officeFloor,{x:d.x,z:d.z-side*.35},null,'shortcut-patient');
 e.npcs=[o.doctor,n];n.path=[tileAt(n.pos.x,n.pos.z),tileAt(d.x,d.z+side)];n.cursor=1;n.activity=null;n.wait=0;e.systems.prepareNPC=()=>true;e.waitForDoor=()=>false;
 for(const stage of ['close','lock']){if(stage==='lock'){o.seal.closedAt=101;e.mission.elapsed=102;}d.open=false;d.angle=0;e.updateNPCs(.05);assert.equal(d.open,false);assert.notEqual(o.roomOf(n.pos),o.office.id);}
}));

test('privacy is glossy smoked glass with opacity, while retaining its one-way sight boundary',()=>office((e,o)=>{
 const glass=o.glassPrivacy;assert.equal(glass.material.transparent,true);assert.ok(glass.material.opacity>=.85&&glass.material.opacity<1);assert.ok(glass.material.roughness<.2);assert.equal(glass.material.depthWrite,false);
 glass.set(true);const w=glass.boundaries[0],axis=w.axis==='z'?'x':'z',outside={x:w.x,z:w.z},inside={...outside};outside[axis]+=w.outward;inside[axis]-=w.outward;
 assert.equal(glass.blocksSight(outside,inside,o.officeFloor),true);assert.equal(glass.blocksSight(inside,outside,o.officeFloor),false);
}));
