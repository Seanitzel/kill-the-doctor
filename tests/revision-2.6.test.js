import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GameEngine} from '../src/game/engine.js';
import {Mission,defaultSave} from '../src/game/mission.js';
import {makeLayout,FLOORS} from '../src/game/layout.js';
import {buildHospital} from '../src/game/hospital.js';
import {makeNavigation} from '../src/game/navigation.js';
import {MissionSystems} from '../src/game/systems.js';
import {HospitalLife} from '../src/game/atmosphere.js';
import {HospitalIncidents} from '../src/game/incidents.js';
import {AntidoteStations} from '../src/game/antidotes.js';
import {TargetAppointment} from '../src/game/appointments.js';
import {RoomPrivacy} from '../src/game/room-privacy.js';
import {disposeObjectResources} from '../src/game/resources.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function withCanvas(fn){const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};try{return fn();}finally{globalThis.document=old;}}
function simulation(){
 const e=Object.create(GameEngine.prototype),levels=FLOORS.map((_,i)=>makeLayout(i)),mats=Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(k=>[k,new THREE.MeshBasicMaterial()]));
 const hospitals=withCanvas(()=>levels.map(l=>buildHospital(l,mats)));
 Object.assign(e,{mission:new Mission(defaultSave(),123),levels,hospitals,navLayouts:levels.map((l,i)=>makeNavigation(l,hospitals[i].colliders)),npcs:[],scene:new THREE.Scene(),effects:[],floor:0,playerPos:new THREE.Vector3(3,0,30),playerSpeed:0,player:{root:new THREE.Group()},keys:new Set(),captureTime:0,time:0,weaponDrawn:false,hooks:{},impairment:0,coughCooldown:999,muzzle:{intensity:0},blackout:0,nextBlackout:Infinity,nextPA:Infinity,shotCooldown:0,audio:{sound(){},gasp(){},speak(){},dialogue(){},announce(){},stopAmbient(){},setListener(){},ambientSample(){},playSample(){}},notify(){},say(){},emitHUD(){},finish(){e.finished=true;}});
 e.systems=new MissionSystems(e);e.incidents=new HospitalIncidents(e);return e;
}
function dispose(e){e.antidotes?.dispose();e.life?.dispose();for(const n of e.npcs)n.visual.dispose?.();for(const h of e.hospitals){disposeObjectResources(h.group,{textures:true});for(const w of h.wallMeshes)disposeObjectResources(w);}e.scene.clear();}
function step(e,count){for(let i=0;i<count;i++){e.mission.elapsed+=1/30;e.time+=1/30;e.updateNPCs(1/30);e.updateEnvironment(1/30);}}
function actor(e,pos,id='nurse'){const root=new THREE.Group();root.position.set(pos.x,0,pos.z);const n={id,name:id,role:'nurse',floor:0,pos:root.position,visual:{root,animate(){}},person:{gender:'female'},path:[],cursor:0,wait:0,speed:2.2,routine:0};e.npcs.push(n);return n;}

test('Upper-floor antidotes cure once per cabinet, preserve clean doses, protect briefly and fully detach on reset',()=>{
 const e=simulation();try{
 const counts=e.hospitals.map(h=>h.colliders.length);e.antidotes=withCanvas(()=>new AntidoteStations(e));assert.deepEqual(e.antidotes.hud(),[]);assert.equal(e.antidotes.stations.length,1);
 for(const floor of e.antidotes.stations.map(s=>s.interaction.floor)){e.floor=floor;e.antidotes.update();const item=e.antidotes.interactions()[0];e.playerPos.set(item.x,0,item.z);assert.equal(e.antidotes.use(item),false);assert.equal(item.station.available,true);
 e.impairment=60;e.impairmentTotal=60;e.exposureSource='patient';assert.equal(e.antidotes.use(item),true);assert.equal(e.impairment,0);assert.equal(e.impairmentTotal,0);assert.equal(e.exposureSource,null);assert.equal(item.station.available,false);assert.equal(e.antidotes.use(item),false);
 e.triggerCough({contamination:30,name:'sick'});assert.equal(e.impairment,0);e.mission.elapsed+=8.01;e.triggerCough({contamination:30,name:'sick'});assert.equal(e.impairment,30);e.impairment=0;}
 const roots=e.antidotes.stations.map(s=>s.root);e.antidotes.dispose();assert.deepEqual(e.hospitals.map(h=>h.colliders.length),counts);assert.ok(roots.every(r=>r.parent===null&&r.children.length===0));
 e.antidotes=withCanvas(()=>new AntidoteStations(e));assert.ok(e.antidotes.stations.every(s=>s.available));
 }finally{dispose(e);}
});
test('A target consultation lasts 3–5 game minutes; first warning waits a full 30 seconds and finishing releases privacy',()=>{
 for(const sample of [0,.01,.5,.99,1]){const a=new TargetAppointment(()=>sample);assert.ok(a.duration>=180&&a.duration<=300);assert.equal(a.update(999),false);a.start(40);assert.equal(a.start(50),false);assert.equal(a.update(40+a.duration-.001),false);assert.equal(a.update(40+a.duration),true);assert.equal(a.update(999),false);assert.equal(a.remaining(999),0);}
 const p=new RoomPrivacy();assert.equal(p.enter('target',5,{warningDelay:30,reportDelay:40}),'request');assert.equal(p.update('target',34.999),null);assert.equal(p.update('target',35),'warning');assert.equal(p.update('target',44.999),null);assert.equal(p.update('target',45),'security');p.release('target');assert.equal(p.update('target',99),null);assert.equal(p.enter('target',100,{warningDelay:30,reportDelay:40}),'request');
});
test('The assigned clinical doctor examines a real patient and waiting outside ends the examination with a physical departure',()=>{
 const e=simulation();try{
 const room=e.levels[0].rooms.find(r=>r.kind==='clinic');e.mission.target={...e.mission.target,floor:0,room};e.spawnNPCs();e.life=new HospitalLife(e);const item=e.life.targetCase;assert.ok(item);assert.equal(item.doctor.id,'target');assert.equal(item.doctor.clinicalPatient,item.patient);assert.equal(item.doctor.activity,'examine');
 e.playerPos.set(room.center.x,0,room.center.z+3);e.mission.elapsed=10;e.life.updateAppointment(room);e.life.reactToEntry(room);assert.equal(e.life.appointmentHUD().warningSeconds,30);assert.equal(e.life.privacy.update(`0:${room.id}`,39.999),null);assert.equal(e.life.privacy.update(`0:${room.id}`,40),'warning');
 e.life.privacy.leave();e.playerPos.set(0,0,22);e.mission.elapsed=item.appointment.endsAt-.001;e.life.updateAppointment(null);assert.equal(item.completed,undefined);
 e.mission.elapsed=item.appointment.endsAt;e.life.updateAppointment(null);assert.equal(item.completed,true);assert.equal(item.doctor.clinicalPatient,null);assert.equal(item.doctor.activity,'rest');assert.equal(e.life.privacyWitness(room),null);assert.equal(e.life.privacy.rooms.size,0);assert.equal(item.patient.lying,false);assert.ok(item.patient.path.length>0);
 // Keep the departure isolated from unrelated wandering crowds; the actual bed, infusion and door remain solid.
 e.npcs=[item.doctor,item.patient];e.systems.prepare();step(e,1500);assert.ok(distance(item.patient.pos,{x:0,z:18})<1.5,item.patient.pos.toArray().join(','));assert.equal(item.patient.appointmentDeparture,null);assert.equal(item.doctor.reporting,undefined);assert.equal(e.mission.result,null);
 // The 30-second grace does not make the primary target invulnerable.
 assert.equal(e.mission.eliminate({id:'target',role:'doctor'}),true);assert.equal(e.mission.targetDown,true);
 }finally{dispose(e);}
});
test('A walking nurse opens a closed door and leaves the room instead of walking against its leaf',()=>{
 const e=simulation();try{
 const room=e.levels[0].rooms.find(r=>r.kind==='clinic'),nav=e.systems.navigationFor(0),door=e.levels[0].doors.find(d=>d.room===room.id&&!d.id.endsWith('-back'));
 const axis=door.axis==='z'?'x':'z',side=Math.sign(room.center[axis]-door[axis]),start={x:door.x,z:door.z},goal={...start};start[axis]+=side*2.4;goal[axis]-=side*2.4;
 const n=actor(e,nav.nearest(start).point);e.playerPos.set(0,0,30);e.systems.prepareNPC=()=>false;n.wait=100;e.routeNPC(n,goal);door.open=false;door.angle=0;door.pivot.rotation.y=0;let stoppedForDoor=false;
 for(let i=0;i<1500&&distance(n.pos,goal)>1;i++){step(e,1);if(door.open&&Math.abs(door.angle-door.openAngle)>.025&&n.movementSpeed<.01)stoppedForDoor=true;assert.ok(e.canStand(n.pos.x,n.pos.z,.22,0));}
 assert.ok(distance(n.pos,goal)<1,n.pos.toArray().join(','));assert.ok(door.open);assert.ok(stoppedForDoor,'wait rather than running in place while door swings');assert.equal(nav.fields.size,0,'moving routes do not retain a new flow field per destination');
 }finally{dispose(e);}
});
test('Following keeps a stable gap through movement, stops and turns, then enters the bathroom across a closed door',()=>{
 const e=simulation();try{
 e.incidents.arrivalAt=.01;e.mission.elapsed=.01;e.incidents.arrive();const n=e.incidents.contact;e.incidents.choose('escort');e.playerPos.set(0,0,27);n.pos.set(0,0,30);let peak=0;
 for(let i=0;i<600;i++){if(i<180){e.playerSpeed=2.5;e.playerPos.z-=2.5/30;}else if(i<300)e.playerSpeed=0;else if(i<480){e.playerSpeed=2.5;e.playerPos.z+=2.5/30;}else e.playerSpeed=0;e.incidents.update(1/30);step(e,1);peak=Math.max(peak,n.movementSpeed||0);assert.ok(e.canStand(n.pos.x,n.pos.z,.22,n.floor));if(i>220&&i<300)assert.ok(n.movementSpeed<.01,`stationary follower jitter at ${i}`);}
 assert.ok(distance(n.pos,e.playerPos)<2.6);assert.ok(peak<=6.01);assert.equal(n.activity,'rest');assert.ok(e.incidents.trail.length<=96);
 const bath=e.levels[0].rooms.find(r=>r.kind==='bathroom');e.playerPos.set(bath.center.x,0,bath.center.z);e.playerSpeed=0;
 for(let i=0;i<1200&&!e.incidents.privateTogether(n);i++){e.incidents.update(1/30);step(e,1);}assert.ok(e.incidents.privateTogether(n));assert.equal(e.systems.navigationFor(0).fields.size,0);
 }finally{dispose(e);}
});
test('An escort laughs occasionally using a recorded spatial cue without adding permanent timers',()=>{
 const e=simulation();try{e.incidents.arrivalAt=.01;e.mission.elapsed=.01;e.incidents.arrive();const n=e.incidents.contact;n.recruit.phase='running';e.incidents.choose('escort');assert.equal(n.recruit.phase,'calm');let laughs=0;e.audio.laugh=(person,pos,gain,id)=>{assert.equal(person.gender,n.person.gender);assert.equal(pos.floor,0);assert.equal(id,n.id);assert.ok(gain<.6);laughs++;};e.playerPos.copy(n.pos).add(new THREE.Vector3(0,0,2));e.incidents.update(.1);const next=n.recruit.nextLaugh;e.mission.elapsed=next-.01;e.incidents.update(.1);assert.equal(laughs,0);e.mission.elapsed=next;e.incidents.update(.1);assert.equal(laughs,1);e.incidents.update(.1);assert.equal(laughs,1);assert.ok(n.recruit.nextLaugh>=next+25);e.incidents.dispose();assert.equal(e.incidents.trail.length,0);}finally{dispose(e);}
});
