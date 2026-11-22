import test from 'node:test';
import assert from 'node:assert/strict';
import {hospitalSim,disposeSim,advanceSim} from './helpers/hospital-sim.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function scene(fn){const e=hospitalSim();try{e.playerPos.set(0,0,30);e.objectives.china.breakAt=Infinity;fn(e,e.objectives.china);}finally{disposeSim(e);}}
function shut(o){for(const d of o.doors){d.open=false;d.angle=0;d.pivot.rotation.y=0;d.manualClosed=true;}}
function outside(n,o,d,range=.7){n.floor=o.officeFloor;n.pos.set(d.x,0,d.z-Math.sign(o.office.center.z-d.z)*range);}

test('both seated visitors stand and walk to the actual doorway before opening it',()=>scene((e,o)=>{
 advanceSim(e,5);assert.ok(o.patients.entries.every(v=>v.n.seated));shut(o);o.patients.begin(e.mission.elapsed);
 const openings=[],hook=o.patients.beforeOpen.bind(o.patients);
 o.patients.beforeOpen=(n,d)=>{const closed=!d.open,result=hook(n,d);if(closed&&result!==false)openings.push({n,range:distance(n.pos,d),seated:n.seated,motion:!!o.patients.entries.find(v=>v.n===n)?.motion});return result;};
 let closedAgain=false,sawStanding=false;
 for(let i=0;i<700;i++){
  advanceSim(e,.05);const [a,b]=o.patients.entries;
  if(a.phase==='standing'){sawStanding=true;assert.equal(a.door.open,false);}
  if(!closedAgain&&a.visited&&a.phase==='ready'){shut(o);closedAgain=true;}
  if(b.visited&&b.phase==='ready')break;
 }
 assert.ok(sawStanding);assert.ok(closedAgain);assert.equal(openings.length,2);
 for(const [i,v] of o.patients.entries.entries()){
  assert.equal(openings[i].n,v.n);assert.ok(openings[i].range<=1.35);assert.equal(openings[i].seated,false);assert.equal(openings[i].motion,false);
  assert.ok(v.enteredAt>v.openedAt);assert.ok(v.visited&&v.n.seated);
 }
 assert.ok(o.patients.entries[1].enteredAt>o.patients.entries[0].enteredAt+4);assert.equal(e.mission.result,null);
}));

test('a closed door cannot be reopened from either side during either protected window',()=>scene((e,o)=>{
 e.mission.elapsed=100;o.collapseDoctor(100);shut(o);
 const n=o.patients.entries[0].n;n.seated=false;o.patients.entries[0].motion=null;
 for(const stage of ['close','lock']){
  if(stage==='lock'){e.playerPos.set(o.home.x,0,o.home.z);e.mission.elapsed=104.8;o.updateSeal();assert.equal(o.seal.closedAt,104.8);}
  for(const now of stage==='close'?[100,102.5,104.799]:[104.8,105,109.799]){
   e.mission.elapsed=now;o.updateSeal();assert.equal(o.seal.failed,null);
   for(const d of o.doors)for(const inside of [false,true]){
    outside(n,o,d,inside?-.7:.7);e.doorOnRoute=()=>d;
    assert.equal(o.patients.canUseDoor(n,d),false);assert.equal(e.waitForDoor(n,.05),true);assert.equal(d.open,false);assert.equal(d.manualClosed,true);
   }
  }
 }
 assert.equal(o.patients.discoveryAt,null);assert.equal(e.mission.result,null);
}));

for(const stage of ['close','lock'])for(const index of [0,1])test(`${stage} expiry: ${index?'male':'female'} visitor leaves the seat, reaches the door, then opens and enters`,()=>scene((e,o)=>{
 advanceSim(e,5);const v=o.patients.entries[index];o.patients.entries[1-index].n.dead=true;
 e.mission.elapsed=100;o.collapseDoctor(100);shut(o);
 if(stage==='lock'){e.playerPos.set(o.home.x,0,o.home.z);e.mission.elapsed=104.5;o.updateSeal();}
 const deadline=stage==='close'?105:109.5;e.mission.elapsed=deadline-.001;o.updateSeal();assert.equal(o.patients.discoveryAt,null);
 e.mission.elapsed=deadline;o.updateSeal();assert.equal(o.seal.failed,stage);assert.equal(v.phase,'standing');assert.equal(v.door.open,false);assert.equal(v.door.manualClosed,true);
 // Expiry schedules a visit; it does not operate a remote door or lock.
 assert.equal(o.patients.beforeOpen(v.n,v.door),false);assert.equal(v.door.manualClosed,true);
 const hook=o.patients.beforeOpen.bind(o.patients);let opening;
 o.patients.beforeOpen=(n,d)=>{const closed=!d.open,result=hook(n,d);if(closed&&d===v.door&&result!==false)opening={range:distance(n.pos,d),motion:!!v.motion,phase:v.phase,at:e.mission.elapsed};return result;};
 // Keep the player near the closed door: after expiry the actual approaching
 // patient, rather than the old remote flag change, must release manual close.
 e.playerPos.set(v.door.x,0,v.door.z+Math.sign(o.office.center.z-v.door.z)*2.35);
 advanceSim(e,18);
 assert.ok(opening);assert.ok(opening.range<=1.35);assert.equal(opening.motion,false);assert.equal(opening.phase,'discovering');assert.ok(opening.at>deadline+.85);
 assert.equal(v.phase,'discovered');assert.equal(o.roomOf(v.n.pos),o.office.id);assert.equal(e.mission.result?.success,false);assert.match(e.mission.result.reason,/visiting patient discovered the unconscious doctor/);
}));

test('closing near five seconds grants a full new lock window and successful locking prevents discovery thereafter',()=>scene((e,o)=>{
 advanceSim(e,5);e.mission.elapsed=100;o.collapseDoctor(100);e.playerPos.set(o.home.x,0,o.home.z);shut(o);
 e.mission.elapsed=104.95;o.updateSeal();assert.equal(o.seal.closedAt,104.95);
 e.mission.elapsed=109.949;o.updateSeal();assert.equal(o.seal.failed,null);assert.equal(o.patients.discoveryAt,null);
 o.officeKey=true;o.handleDoor(o.doors[0]);assert.equal(o.seal.stage,'secured');advanceSim(e,12);
 assert.ok(o.doors.every(d=>d.locked&&!d.open));assert.equal(o.patients.discoveryAt,null);assert.equal(e.mission.result,null);
}));
