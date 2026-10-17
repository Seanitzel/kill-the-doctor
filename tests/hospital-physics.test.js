import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GameEngine} from '../src/game/engine.js';
import {buildHospital} from '../src/game/hospital.js';
import {makeLayout,tileAt,key} from '../src/game/layout.js';
import {obstacleBounds,segmentHit3D} from '../src/game/collision.js';

// Physics uses the actual hospital geometry; only unrendered sign canvases are stubbed.
const oldDocument=globalThis.document;
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const materials=Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(k=>[k,new THREE.MeshBasicMaterial()]));
const levels=[0,1,2].map(makeLayout),hospitals=levels.map(l=>buildHospital(l,materials));
globalThis.document=oldDocument;
function engine(floor=0){
  const e=Object.create(GameEngine.prototype);
  Object.assign(e,{levels,hospitals,floor,npcs:[],playerPos:new THREE.Vector3(),player:{root:new THREE.Group()},camera:new THREE.PerspectiveCamera(60,2.2,.08,90),flash:{position:new THREE.Vector3(),target:{position:new THREE.Vector3()}},rim:{position:new THREE.Vector3()},mission:{state:'investigate'},mobile:true,yaw:Math.PI,pitch:-.06,crouched:false,aiming:false});
  return e;
}
test('Waiting chairs, corridor benches, desks, beds and cafeteria tables are solid',()=>{
  const e=engine();
  for(const [x,z] of [[-6,29],[-6,31.3],[5.25,9],[-3.8,27.8],[3.5,4.5]])assert.equal(e.canStand(x,z),false,`${x},${z}`);
  for(const type of ['chair','desk','bed','table','cart','monitor']){
    const props=hospitals[0].colliders.filter(c=>c.type===type);assert.ok(props.length>0,type);
    for(const c of props)assert.equal(e.canStand((c.minX+c.maxX)/2,(c.minZ+c.maxZ)/2),false,type);
  }
  e.playerPos.set(-6,0,30);e.move(0,-2);assert.ok(e.playerPos.z>29.5);
});
test('Camera remains outside solid geometry during turns, aiming and crouching across all three floors',()=>{
  let checked=0;
  for(const floor of [0,1,2]){
    const e=engine(floor);
    for(let x=-27;x<=24;x+=1.5)for(let z=-24;z<=34;z+=1.5){
      if(!e.canStand(x,z))continue;
      e.playerPos.set(x,0,z);
      for(const mobile of [false,true])for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const crouched of [false,true]){
        e.mobile=mobile;e.yaw=yaw;e.crouched=crouched;e.aiming=checked%3===0;e.pitch=checked%2?.2:-.2;e.updateCamera(.1,true);
        for(const c of hospitals[floor].colliders){const b=obstacleBounds(c);assert.equal(segmentHit3D(e.camera.position,e.camera.position,b,.075),null,`floor ${floor}, player ${x},${z}, camera ${e.camera.position.toArray()}, ${b.type}`);}
        assert.ok(e.camera.position.y>.2&&e.camera.position.y<3.4);checked++;
      }
    }
  }
  assert.ok(checked>10000);
});
test('Every department and all three lift approaches remain physically reachable around furniture',()=>{
  for(const floor of [0,1,2]){
    const e=engine(floor);for(const d of levels[floor].doors){d.open=true;d.angle=d.openAngle;}
    const step=.5,start=[0,60],queue=[start],seen=new Set(['0,60']),rooms=new Set();let lift=false;
    for(let i=0;i<queue.length;i++){
      const [gx,gz]=queue[i],x=gx*step,z=gz*step,cell=tileAt(x,z);rooms.add(levels[floor].cells.get(key(cell.x,cell.z))?.room);
      if(Math.hypot(x-levels[floor].elevator.x,z-levels[floor].elevator.z-.9)<2.3)lift=true;
      for(const [dx,dz] of [[1,0],[-1,0],[0,1,2],[0,-1]]){
        const nx=gx+dx,nz=gz+dz,k=`${nx},${nz}`;
        if(seen.has(k)||!e.canStand(nx*step,nz*step))continue;
        // Half-step clearance prevents jumping diagonally past thin walls or door leaves.
        if(!e.canStand((gx+dx*.5)*step,(gz+dz*.5)*step))continue;
        seen.add(k);queue.push([nx,nz]);
      }
    }
    assert.ok(lift,`floor ${floor} lift`);
    for(const r of levels[floor].rooms)assert.ok(rooms.has(r.id),`floor ${floor}: ${r.name}`);
  }
});
test('Doors cannot swing into the player or trap them in the doorway',()=>{
  const e=engine(),d=levels[0].doors[0];d.angle=d.openAngle;e.playerPos.set(d.x,0,d.z);
  assert.equal(e.doorCanSwingTo(d,0),false);
  assert.equal(e.doorCanSwingTo(d,d.openAngle),true);
  e.playerPos.set(d.x,0,d.z+2);assert.equal(e.doorCanSwingTo(d,0),true);
  e.npcs=[{floor:0,pos:{x:d.x,z:d.z},dead:false}];assert.equal(e.doorCanSwingTo(d,0),false);
});
test('Every door swings into its own room, away from someone approaching from the hallway',()=>{
  for(const floor of [0,1,2])for(const d of levels[floor].doors){
    const e=engine(floor),room=levels[floor].rooms.find(r=>r.id===d.room),roomSide=Math.sign(room.center.z-d.z);
    assert.equal(-Math.sign(d.openAngle),roomSide);
    d.angle=0;e.playerPos.set(d.x,0,d.z-roomSide*.61);
    for(const fraction of [.05,.25,.5,.75,1])assert.ok(e.doorCanSwingTo(d,d.openAngle*fraction),d.id);
  }
});
test('Walking staff stop at the player and other people, while allowing a path around them',()=>{
  const e=engine(),n={floor:0,pos:{x:0,z:24}};e.npcs=[n];e.playerPos.set(0,0,25);
  assert.equal(e.npcCanMoveTo(n,0,24.6),false);
  assert.equal(e.npcCanMoveTo(n,.65,24.1),true);
  e.npcs.push({floor:0,pos:{x:.8,z:24},dead:false});
  assert.equal(e.npcCanMoveTo(n,.4,24),false);
  e.playerPos.set(0,0,24);assert.equal(e.npcCanMoveTo(n,0,24.1),true);
});
