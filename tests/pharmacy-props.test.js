import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildHospital} from '../src/game/hospital.js';
import {addInfusion} from '../src/game/care-props.js';
import {makeLayout,findPath,tileAt,world} from '../src/game/layout.js';
import {makeNavigation} from '../src/game/navigation.js';
import {blocksBody,circleOverlaps,obstacleBounds} from '../src/game/collision.js';

const oldDocument=globalThis.document;
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const materials=Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(k=>[k,new THREE.MeshBasicMaterial()]));
const layouts=[0,1,2].map(makeLayout),hospitals=layouts.map(layout=>buildHospital(layout,materials));
globalThis.document=oldDocument;
const clear=(hospital,point,radius=.3)=>!hospital.colliders.some(c=>blocksBody(c)&&circleOverlaps(point.x,point.z,radius,obstacleBounds(c)));

test('The pharmacy has a service counter, stocked shelving and clear human anchors',()=>{
  const hospital=hospitals[0],pharmacy=hospital.pharmacy;
  assert.equal(pharmacy.room.kind,'pharmacy');assert.equal(pharmacy.floor,0);
  assert.equal(hospital.pharmacies.length,1);
  assert.equal(hospital.colliders.filter(c=>c.type==='pharmacy-counter').length,1);
  assert.equal(hospital.colliders.filter(c=>c.type==='pharmacy-shelf').length,8);
  assert.ok(pharmacy.stock.boxes>=100&&pharmacy.stock.bottles>=30);
  assert.equal(pharmacy.stock.shelfBays,8);
  assert.equal(clear(hospital,pharmacy.counter),false);
  assert.ok(pharmacy.clerk.z<pharmacy.counter.z);
  assert.equal(pharmacy.clerk.yaw,0);assert.equal(pharmacy.queue.length,3);
  for(const anchor of [pharmacy.clerk,...pharmacy.queue,pharmacy.exit])assert.ok(clear(hospital,anchor),JSON.stringify(anchor));
  for(const anchor of pharmacy.queue){assert.ok(anchor.z>pharmacy.counter.z);assert.equal(anchor.yaw,Math.PI);}
  assert.equal(hospitals[1].pharmacy,null);assert.equal(hospitals[2].pharmacy,null);
});

test('Pharmacist and customer routes reach both room doors around the solid counter',()=>{
  const layout=layouts[0],hospital=hospitals[0],pharmacy=hospital.pharmacy;
  for(const door of layout.doors){door.open=true;door.angle=door.openAngle;door.pivot.rotation.y=door.angle;}
  const navigation=makeNavigation(layout,hospital.colliders);
  for(const anchor of [pharmacy.clerk,...pharmacy.queue]){
    assert.ok(clear(hospital,anchor));
    for(const door of layout.doors.filter(d=>d.room===pharmacy.room.id)){
      const outside={x:door.x,z:door.z+Math.sign(door.z-pharmacy.room.center.z)*1.5};
      const path=findPath(navigation,tileAt(anchor.x,anchor.z),tileAt(outside.x,outside.z));
      assert.ok(path.length>1,JSON.stringify({anchor,door:door.id}));
      for(const cell of path)assert.ok(clear(hospital,world(cell.x,cell.z),.21));
    }
  }
  // The side aisles are traversable rather than decorative gaps in the mesh.
  for(const x of [12,18])for(let z=-15;z<=-11;z+=.2)assert.ok(clear(hospital,{x,z},.28),`${x},${z}`);
});

test('Infusion stands expose real bags, tubes and matching collision bounds',()=>{
  const parent=new THREE.Group();
  const stand=addInfusion(parent,{x:3,z:5,rotation:Math.PI/2,endpoint:{x:.8,y:.9,z:.1}},materials);
  assert.equal(stand.root.parent,parent);assert.equal(stand.root.name,'bedside-infusion');
  assert.equal(stand.root.rotation.y,Math.PI/2);assert.equal(stand.collider.type,'infusion');
  assert.ok(circleOverlaps(3,5,.2,stand.collider));assert.equal(circleOverlaps(4,5,.2,stand.collider),false);
  assert.equal(stand.tube.name,'infusion-tube');assert.equal(stand.tube.geometry.type,'TubeGeometry');
  assert.ok(stand.statics.some(m=>m.material===materials.glass));
  assert.ok(stand.statics.some(m=>m.material===materials.green));
  stand.root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(stand.root);
  assert.ok(bounds.max.y>2.17&&bounds.max.y<2.3);assert.ok(bounds.min.y>=0);
  stand.dispose();assert.equal(parent.children.length,0);
});

test('Infusion disposal releases owned resources once and preserves the borrowed pool',()=>{
  const stand=addInfusion(new THREE.Group(),{},materials);
  const geometries=new Set(),instances=stand.statics.slice();let owned=0,shared=0,borrowed=0,instanceBuffers=0;
  stand.root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);});
  for(const geometry of geometries)geometry.addEventListener('dispose',()=>{if(geometry.userData.sharedPrimitive)shared++;else owned++;});
  for(const mat of Object.values(materials))mat.addEventListener('dispose',()=>borrowed++);
  for(const instance of instances)instance.addEventListener('dispose',()=>instanceBuffers++);
  stand.dispose();stand.dispose();
  assert.equal(owned,2);assert.equal(shared,0);assert.equal(borrowed,0);assert.equal(instanceBuffers,instances.length);
});
