import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {makePlayer,disposeCharacterAssets,locomotionForSpeed} from '../src/game/assets.js';
import {buildLift,liftWallPlacement} from '../src/game/hospital.js';
import {makeLayout} from '../src/game/layout.js';

async function realModel(name){
  const bytes=fs.readFileSync(new URL(`../public/models/${name}.glb`,import.meta.url)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));delete json.images;delete json.textures;
  for(const material of json.materials){delete material.normalTexture;delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture;}
  let encoded=JSON.stringify(json);while(encoded.length%4)encoded+=' ';
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+encoded.length+bytes.length-20-length,8);header.writeUInt32LE(encoded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const packed=Buffer.concat([header,Buffer.from(encoded),bytes.subarray(20+length)]);
  return(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength),'')).scene;
}
function animationAssets(){const sources={},animations={};for(const name of ['Idle','Walk','Run']){const bytes=fs.readFileSync(new URL(`../public/models/${name.toLowerCase()}.fbx`,import.meta.url));sources[name]=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');animations[name]=sources[name].animations[0];}return{sources,animations,clipCache:{},clothCache:new Map(),appearanceCache:new Map()};}
test('locomotion tolerates speed noise, changes to walking at a real slowdown and idles on a stop',()=>{
  let state='Walk';for(const speed of [3.65,3.75,3.69,3.8]){state=locomotionForSpeed(speed,state);assert.equal(state,'Walk');}
  state=locomotionForSpeed(4.3,state);assert.equal(state,'Run');for(const speed of [3.8,3.6,3.65,3.75])assert.equal(locomotionForSpeed(speed,state),'Run');
  assert.equal(locomotionForSpeed(2.8*1.24,state),'Walk','Even fully upgraded walking after exhaustion cannot retain Run');assert.equal(locomotionForSpeed(3.3,state),'Walk');assert.equal(locomotionForSpeed(0,state),'Idle');assert.equal(locomotionForSpeed(NaN,state),'Idle');
});
test('real running clips retarget to both rigs with grounded, moving feet and stop cleanly',async()=>{
  for(const [file,gender]of [['adrian','male'],['alex','female']]){
    const assets={...animationAssets(),[gender]:await realModel(file)},avatar=makePlayer(assets,gender,{gender}),feet=['LeftFoot','RightFoot'].map(name=>avatar.model.getObjectByName(name)),samples=[];
    try{
      avatar.animate(0,0,.35);
      for(let frame=0;frame<96;frame++){const state=avatar.animate(frame/24,4.3,1/24);assert.equal(state.animation,'Run');avatar.root.updateMatrixWorld(true);if(frame>=12)samples.push(...feet.map(foot=>foot.getWorldPosition(new THREE.Vector3())));}
      const box=new THREE.Box3().setFromPoints(samples),size=box.getSize(new THREE.Vector3());assert.ok(box.min.y>-.12&&box.min.y<.25&&box.max.y<.95,`${gender} foot-joint range ${box.min.y}..${box.max.y}`);assert.ok(size.y>.08&&size.z>.3,`${gender} moving stride ${size.toArray()}`);
      assert.equal(avatar.animate(4,2.8*1.24,.3).animation,'Walk');assert.equal(avatar.animate(4.3,0,.3).animation,'Idle');const actions=avatar.mixer._actions;assert.ok(actions.find(action=>action.getClip().name==='Idle').getEffectiveWeight()>.99);assert.ok(actions.find(action=>action.getClip().name==='Run').getEffectiveWeight()<.01);
    }finally{avatar.dispose();disposeCharacterAssets(assets);}
  }
});
test('distress activities use distinct animated poses on real rigs, temple taps reach the head, and restricted poses keep the walking arms',async()=>{
  for(const [file,gender]of [['adrian','male'],['alex','female']]){
    const assets={...animationAssets(),[gender]:await realModel(file)},avatar=makePlayer(assets,gender,{gender}),poses=new Map();
    try{for(const activity of ['panic','tremble','laugh','selftalk','scream','headTap']){
      avatar.animate(0,0,.4);avatar.poseActivity(activity,.7);avatar.root.updateMatrixWorld(true);const pose=[];
      avatar.model.traverse(object=>{if(object.isBone){pose.push(...object.quaternion.toArray());assert.ok(object.quaternion.toArray().every(Number.isFinite));}});poses.set(activity,pose);
      if(activity==='headTap'){const hand=avatar.hand.getWorldPosition(new THREE.Vector3()),head=avatar.head.getWorldPosition(new THREE.Vector3());assert.ok(hand.distanceTo(head)<.15,`${gender} tap ${hand.distanceTo(head)}`);assert.ok(hand.y>head.y);}
    }
    assert.notDeepEqual(poses.get('laugh'),poses.get('selftalk'));assert.notDeepEqual(poses.get('panic'),poses.get('tremble'));
    for(const activity of poses.keys()){
      avatar.animate(0,2.5,.4);const arms=['RightArm','RightForeArm','LeftArm','LeftForeArm'].map(name=>avatar.model.getObjectByName(name)),before=arms.map(b=>b.quaternion.toArray());avatar.poseActivity(activity,.8,{restricted:true});arms.forEach((bone,i)=>assert.deepEqual(bone.quaternion.toArray(),before[i]));
    }}finally{avatar.dispose();disposeCharacterAssets(assets);}
  }
});
test('all four lift portals align with their corridor wall and open into recessed cabins with two doors and a low call button',()=>{
  const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
  const mats=Object.fromEntries(['dark','steel','light'].map(key=>[key,new THREE.MeshStandardMaterial()]));
  try{for(let floor=0;floor<4;floor++){
    const layout=makeLayout(floor),placement=liftWallPlacement(layout),lift=buildLift(layout,mats),bounds=new THREE.Box3().setFromObject(lift);
    assert.ok(layout.cells.has('11,2'));assert.ok(layout.walls.some(w=>w.axis==='x'&&w.z===placement.wallZ-3&&w.x===layout.elevator.x));assert.equal(placement.wallZ,layout.elevator.z-1.5);
    assert.ok(bounds.min.z>=placement.wallZ-2.8);assert.ok(bounds.max.z<placement.wallZ+.32);assert.ok(bounds.max.y<3.4);
    for(const name of ['Lift left sliding door','Lift right sliding door']){const door=lift.getObjectByName(name),box=new THREE.Box3().setFromObject(door);assert.ok(box.min.y<.04&&box.max.y<2.7);assert.ok(box.min.z-placement.wallZ<.18);assert.equal(door.geometry.userData.sharedPrimitive,true);}
    assert.equal(lift.getObjectByName('Lift call button').position.y,1.24);assert.ok(lift.getObjectByName('Large floor number left of elevator').position.x<layout.elevator.x);
    lift.traverse(object=>{if(object.isMesh&&!object.geometry.userData.sharedPrimitive){object.geometry.dispose();object.material.map?.dispose();object.material.dispose();}});
  }}finally{for(const mat of Object.values(mats))mat.dispose();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
