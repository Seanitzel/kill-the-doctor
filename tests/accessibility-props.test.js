import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {addBathroom,addOperatingSet,attachMobilityCane} from '../src/game/accessibility-props.js';
import {buildHospital} from '../src/game/hospital.js';
import {makeLayout,tileAt,findPath,world} from '../src/game/layout.js';
import {makeNavigation} from '../src/game/navigation.js';
import {circleOverlaps,blocksBody,obstacleBounds} from '../src/game/collision.js';

const materials=Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(k=>[k,new THREE.MeshBasicMaterial()]));
function canvas(fn){const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};try{return fn();}finally{globalThis.document=old;}}
const clear=(colliders,p,r=.3)=>!colliders.some(c=>blocksBody(c)&&circleOverlaps(p.x,p.z,r,obstacleBounds(c)));

test('Bathroom stalls and washbasins are solid while its entrance and central aisle stay clear',()=>{
  const handle=canvas(()=>addBathroom(new THREE.Group(),{x:-18,z:30,width:9,depth:9},materials));
  assert.equal(handle.anchors.toilets.length,2);assert.equal(handle.anchors.sinks.length,2);
  for(const p of [...handle.anchors.toilets,...handle.anchors.sinks,handle.anchors.entry])assert.ok(clear(handle.colliders,p),JSON.stringify(p));
  for(let z=26;z<=34;z+=.1)assert.ok(clear(handle.colliders,{x:-18,z}),z);
  for(const type of ['toilet','washbasin','cubicle-partition','cubicle-door']){
    const props=handle.colliders.filter(c=>c.type===type);assert.ok(props.length>0,type);
    for(const bounds of props)assert.equal(clear(handle.colliders,{x:(bounds.minX+bounds.maxX)/2,z:(bounds.minZ+bounds.maxZ)/2}),false);
  }
  handle.dispose();
});

test('The real ground-floor bathroom connects to its corridor without blocking the doorway',()=>{
  const floor=makeLayout(0),hospital=canvas(()=>buildHospital(floor,materials));
  assert.equal(hospital.bathrooms.length,1);const bathroom=hospital.bathrooms[0];
  const door=floor.doors.find(d=>d.room===bathroom.room.id);door.angle=door.openAngle;door.open=true;
  const nav=makeNavigation(floor,hospital.colliders);
  const path=findPath(nav,tileAt(door.x,door.z-1.5),tileAt(bathroom.room.center.x,bathroom.room.center.z));
  assert.ok(path.length>1);for(const cell of path)assert.ok(clear(hospital.colliders,world(cell.x,cell.z),.21));
  for(let z=door.z+.5;z<=bathroom.room.center.z+3;z+=.1)assert.ok(clear(hospital.colliders,{x:door.x,z},.28));
  hospital.disposeProps();
});

test('The basement set supplies a clothed-patient bed and clear clinician/rescue anchors',()=>{
  const handle=addOperatingSet(new THREE.Group(),{x:-3,z:-4.5},materials),a=handle.anchors;
  assert.equal(a.patient.y,1);assert.equal(a.patient.bedRotation,0);
  assert.ok(handle.colliders.some(c=>c.type==='bed'));assert.ok(handle.colliders.some(c=>c.type==='monitor'));
  assert.ok(handle.colliders.some(c=>c.type==='medical-trolley'));
  for(const p of [a.doctor,a.assistant,a.rescue,a.entry])assert.ok(clear(handle.colliders,p),JSON.stringify(p));
  assert.equal(clear(handle.colliders,{x:a.patient.x,z:a.patient.z-.85}),false);
  handle.dispose();
});

test('The compact basement has no phantom atrium furniture and its rescue approach is reachable',()=>{
  const floor=makeLayout(3),hospital=canvas(()=>buildHospital(floor,materials));
  assert.equal(hospital.operatingSets.length,1);assert.equal(hospital.pharmacies.length,0);
  assert.equal(hospital.colliders.some(c=>c.minZ>15),false);
  assert.equal(hospital.interactables.some(i=>i.type==='log'),false);
  for(const d of floor.doors){d.open=true;d.angle=d.openAngle;}
  const nav=makeNavigation(floor,hospital.colliders),goal=hospital.operatingSets[0].anchors.rescue;
  const path=findPath(nav,tileAt(floor.elevator.x,floor.elevator.z+.9),tileAt(goal.x,goal.z));
  assert.ok(path.length>1);for(const cell of path)assert.ok(clear(hospital.colliders,world(cell.x,cell.z),.21));
  hospital.disposeProps();
});

test('A mobility cane follows an animated hand in actor space and sweeps close to the floor',()=>{
  const actor=new THREE.Group(),hand=new THREE.Group();actor.position.set(3,0,5);actor.rotation.y=1.1;actor.add(hand);hand.position.set(.32,1.02,.1);
  const handle=attachMobilityCane({root:actor,hand},{},materials),p=new THREE.Vector3();
  handle.update(.2,1.2);assert.ok(handle.root.position.distanceTo(hand.position)<1e-6);
  handle.root.children[3].getWorldPosition(p);actor.worldToLocal(p);assert.ok(p.y>=.02&&p.y<.08);
  const oldTip=p.clone();hand.position.set(.25,1.15,.16);handle.update(1.3,1.2);
  assert.ok(handle.root.position.distanceTo(hand.position)<1e-6);
  handle.root.children[3].getWorldPosition(p);actor.worldToLocal(p);assert.ok(p.y>=.02&&p.y<.08);assert.ok(p.distanceTo(oldTip)>.1);
  assert.equal(handle.colliders.length,0);handle.dispose();assert.equal(actor.children.includes(handle.root),false);
});

test('Accessibility prop disposal preserves borrowed materials and shared primitive geometry',()=>{
  const handle=canvas(()=>addBathroom(new THREE.Group(),{},materials));let borrowed=0,shared=0,owned=0;
  for(const m of Object.values(materials))m.addEventListener('dispose',()=>borrowed++);
  const geometries=new Set();handle.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
  for(const g of geometries)g.addEventListener('dispose',()=>{if(g.userData.sharedPrimitive)shared++;else owned++;});
  handle.dispose();handle.dispose();assert.equal(borrowed,0);assert.equal(shared,0);assert.equal(owned,[...geometries].filter(g=>!g.userData.sharedPrimitive).length);
});
