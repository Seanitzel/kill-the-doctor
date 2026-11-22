import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {HospitalLife} from '../src/game/atmosphere.js';
import {privacyRoomAt} from '../src/game/room-privacy.js';
import {COUNTRIES} from '../src/game/international.js';
import {makeLayout} from '../src/game/layout.js';
import {hospitalSim,disposeSim,withCanvas} from './helpers/hospital-sim.js';

function consultation(fn){
 const e=hospitalSim('france');let life;
 try{
  for(const name of ['stopAmbient','ambient','ambientSample','setListener'])e.audio[name]=()=>{};
  e.camera=new T.PerspectiveCamera();life=withCanvas(()=>new HospitalLife(e));e.life=life;
  const room=e.levels[0].rooms.find(r=>r.kind==='clinic'),actor=e.npcs.find(n=>n.id==='target');
  e.floor=0;actor.floor=0;actor.pos.set(room.center.x,0,room.center.z);e.playerPos.copy(actor.pos).add(new T.Vector3(0,0,1));
  life.cases=[];life.groups=[];life.newbornSource=null;life.nextAmbient=life.nextFlicker=Infinity;e.npcs=[actor];
  fn(e,life,room,actor);
 }finally{life?.dispose();e.life=null;disposeSim(e);}
}

test('a clinician absence cannot consume an undelivered second warning or retain an old security deadline',()=>consultation((e,life,room,actor)=>{
 let present=true;life.privacyWitness=()=>present?actor:null;
 e.mission.elapsed=100;life.update(.05);assert.equal(life.history.length,1);
 present=false;e.mission.elapsed=105;life.update(.05);assert.equal(life.privacy.active,null);
 present=true;e.mission.elapsed=109;life.update(.05);assert.equal(life.history.length,2);assert.equal(life.privacy.rooms.get(`0:${room.id}`).warnings,1);
 e.mission.elapsed=110;life.update(.05);assert.equal(e.mission.result,null);
 e.mission.elapsed=114;life.update(.05);assert.equal(life.privacy.rooms.get(`0:${room.id}`).warnings,2);assert.equal(life.history.length,3);
 e.mission.elapsed=118.999;life.update(.05);assert.equal(e.mission.result,null);
 e.mission.elapsed=119;life.update(.05);assert.equal(e.mission.result.success,false);
}));

test('either open consultation doorway cancels warnings when the character crosses its physical threshold',()=>{
 for(const warningTime of [104.999,109.999])consultation((e,life,room,actor)=>{
  life.privacyWitness=r=>r?.id===room.id?actor:null;
  e.mission.elapsed=100;life.update(.05);if(warningTime>105){e.mission.elapsed=105;life.update(.05);}
  const doors=e.levels[0].doors.filter(d=>d.room===room.id);
  for(const door of doors){door.open=true;door.angle=door.openAngle;}
  const door=doors[warningTime>105?1:0],side=Math.sign(room.center.z-door.z);
  e.playerPos.set(door.x,0,door.z+side*.15);e.mission.elapsed=warningTime;life.update(.05);
  assert.equal(life.privacy.active,null);e.mission.elapsed=120;life.update(.05);assert.equal(e.mission.result,null);
 });
});

test('privacy thresholds match open doorways on every country floor and do not excuse standing against a closed door or wall',()=>{
 for(const country of COUNTRIES)for(const floor of [0,1,2,3,4,5]){
  const layout=makeLayout(floor,country.index);
  for(const d of layout.doors){
   const room=layout.rooms.find(r=>r.id===d.room),side=Math.sign(room.center.z-d.z),point={x:d.x,z:d.z+side*.15};
   d.angle=0;assert.equal(privacyRoomAt(layout,point)?.id,room.id);
   d.angle=Math.PI/2;assert.equal(privacyRoomAt(layout,point),null);
   assert.equal(privacyRoomAt(layout,{x:d.x,z:d.z+side*.31})?.id,room.id);
   assert.equal(privacyRoomAt(layout,{x:d.x,z:d.z-side*.01}),null);
   assert.equal(privacyRoomAt(layout,{x:d.x+.7,z:point.z})?.id,room.id);
  }
 }
});

test('the replacement clinician delivers a fresh first warning; ambient dialogue cannot overwrite either privacy warning',()=>consultation((e,life,room,actor)=>{
 let witness=actor;life.privacyWitness=()=>witness;
 e.mission.elapsed=100;life.update(.05);const first=life.history.at(-1).text;
 life.speak(actor,'The weather is nice.');assert.equal(life.history.at(-1).text,first);
 witness=e.spawnNPC({gender:'female'},'doctor',0,room.center,room,'replacement');e.mission.elapsed=104;life.update(.05);
 assert.equal(life.history.at(-1).speaker,witness.name);assert.equal(life.privacy.rooms.get(`0:${room.id}`).enteredAt,104);
 e.mission.elapsed=108.999;life.update(.05);assert.equal(life.privacy.rooms.get(`0:${room.id}`).warnings,1);
 e.mission.elapsed=109.08;life.update(.05);assert.equal(life.privacy.rooms.get(`0:${room.id}`).warnings,2);
 const second=life.history.at(-1).text;life.speak(witness,'How are you today?');assert.equal(life.history.at(-1).text,second);assert.equal(e.message,second);
 e.mission.elapsed=114.079;life.update(.05);assert.equal(e.mission.result,null);
 e.mission.elapsed=114.08;life.update(.05);assert.equal(e.mission.result.success,false);
}));

test('China office departures through either door cancel both warning stages and re-entry gets a fresh five seconds',()=>{
 for(const index of [0,1])for(const stage of [1,2]){
  const e=hospitalSim();try{
   const o=e.objectives.china;e.npcs=[o.doctor];o.breakAt=999;e.playerPos.copy(o.doctor.pos);e.mission.elapsed=100;o.updateDoctor(.05);
   if(stage===2){e.mission.elapsed=105;o.updateDoctor(.05);}
   const door=o.doors[index],side=Math.sign(o.office.center.z-door.z);door.open=true;door.angle=door.openAngle;
   e.playerPos.set(door.x,0,door.z+side*.15);e.mission.elapsed=stage===1?104.999:109.999;o.updateDoctor(.05);assert.equal(o.officePrivacy.active,null);
   e.playerPos.z=door.z-side*.5;e.mission.elapsed=120;o.updateDoctor(.05);assert.equal(e.mission.result,null);
   e.playerPos.copy(o.doctor.pos);e.mission.elapsed=121;o.updateDoctor(.05);assert.equal(o.officePrivacy.rooms.get(o.office.id).enteredAt,121);
   e.mission.elapsed=125.999;o.updateDoctor(.05);assert.equal(e.mission.result,null);assert.equal(o.officePrivacy.rooms.get(o.office.id).warnings,1);
  }finally{disposeSim(e);}
 }
});

test('holding a consultation warning preserves the clinician’s patient-care activity for departure',()=>consultation((e,life,room,actor)=>{
 actor.activity='examine';life.privacyWitness=r=>r?.id===room.id?actor:null;
 life.update(.05);assert.equal(life.prepareNPC(actor),true);assert.equal(actor.activity,'examine');assert.ok(actor.reaction>0);
 e.playerPos.set(0,0,30);life.update(.05);assert.equal(life.privacy.active,null);assert.equal(actor.activity,'examine');
}));
