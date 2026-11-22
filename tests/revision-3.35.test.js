import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {hospitalSim,disposeSim} from './helpers/hospital-sim.js';
import {realModel} from './helpers/real-rig.js';
import {makePlayer,disposeCharacterAssets} from '../src/game/assets.js';
import {findCoffeeStance} from '../src/game/coffee-approach.js';

function away(e,o){e.npcs=[o.doctor];o.doctor.pos.set(0,0,30);o.phase='bathroom';o.returnAt=Infinity;o.hasSpoon=true;}
async function real(gender,fn){
 const sources={};for(const [name,file] of [['Idle','idle'],['Walk','walk']]){const b=fs.readFileSync(new URL(`../public/models/${file}.fbx`,import.meta.url));sources[name]=new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
 const assets={[gender]:await realModel(gender==='male'?'adrian':'alex'),sources,animations:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,v.animations[0]])),clipCache:{},clothCache:new Map(),appearanceCache:new Map()},e=hospitalSim(),o=e.objectives.china,v=makePlayer(assets,gender,{gender});e.player=v;e.playerPos=v.root.position;e.scene.add(v.root);away(e,o);
 try{fn(e,o,v);}finally{v.dispose();disposeCharacterAssets(assets);disposeSim(e);}
}

for(const gender of ['male','female'])test(`${gender}: USE accepts normal clear desk approaches, walks without clipping, then keeps the spoon in the cup`,async()=>real(gender,(e,o,v)=>{
 for(const phase of [0,1.1,3.2])for(const [dx,dz] of [[0,-.45],[-.3,-.55],[0,-.75],[.6,-.8],[-.8,-.9],[0,-1.5]]){
  o.poisonAction=null;o.mixingApproach=null;o.case.mixedSeconds=0;v.root.position.set(o.cupPoint.x+dx,0,o.cupPoint.z+dz);e.time=phase;v.root.rotation.set(0,phase===0?0:phase===1.1?Math.PI:-2.5,0);v.animate(phase,0,.1);
  const from=e.playerPos.clone(),boneLengths=[v.model.getObjectByName('RightForeArm').position.length(),v.hand.position.length()];
  assert.ok(e.canStand(from.x,from.z,.3,e.floor));assert.equal(o.interact({type:'china-poison'}),true,`${dx},${dz}: ${e.message}`);assert.ok(e.playerPos.distanceTo(from)<1e-7,'USE must not teleport');
  if(o.mixingApproach)assert.equal(o.poisonAction,null,'Do not count mixing while approaching');
  for(let i=0;i<30&&o.mixingApproach;i++){
   const old=e.playerPos.clone();o.moveToMixingPosition(.05);const speed=e.playerPos.distanceTo(old)/.05;v.animate(e.time,speed,.05);e.time+=.05;
   assert.ok(e.playerPos.distanceTo(old)<=.090001);assert.ok(e.canStand(e.playerPos.x,e.playerPos.z,.3,e.floor));o.updateMixingApproach();
  }
  assert.ok(o.poisonAction,`${gender} never started from ${dx},${dz}: ${e.message}`);assert.equal(o.case.mixedSeconds,0);
  for(let i=0;i<24;i++){e.time+=.1;v.animate(e.time,0,.1);assert.equal(o.mixing.update(true),true);assert.ok(o.mixing.lastError<.02);const bowl=o.mixing.root.getObjectByName('Coffee spoon bowl').getWorldPosition(new T.Vector3());o.coffeeCup.worldToLocal(bowl);assert.ok(Math.hypot(bowl.x,bowl.z)<=.0251);}
  assert.deepEqual([v.model.getObjectByName('RightForeArm').position.length(),v.hand.position.length()],boneLengths);assert.equal(o.interact({type:'china-poison'}),true);assert.equal(o.poisonAction,null);
 }
}));

test('the stance search restores player transforms and never crosses a blocked path to a reachable-looking endpoint',()=>{
 const e=hospitalSim(),o=e.objectives.china;try{away(e,o);e.playerPos.set(o.cupPoint.x,0,o.cupPoint.z-1);e.player.root.rotation.y=1.2;e.player.model={};e.player.mixingReach=()=>({error:Math.hypot(e.playerPos.x-o.cupPoint.x,e.playerPos.z-o.cupPoint.z)>.55?1:0});const from=e.playerPos.clone(),q=e.player.root.quaternion.clone(),stand=e.canStand.bind(e);
  e.canStand=(x,z,...args)=>!(z>o.cupPoint.z-.8&&z<o.cupPoint.z-.6)&&stand(x,z,...args);
  assert.equal(findCoffeeStance(e,o.mixing,o.cupPoint,p=>o.roomOf(p)===o.office.id),null);assert.ok(e.playerPos.distanceTo(from)<1e-7);assert.ok(e.player.root.quaternion.angleTo(q)<1e-7);
 }finally{disposeSim(e);}
});

test('USE cancels a pending approach immediately, before any mixing or visitor clock starts',()=>{
 const e=hospitalSim(),o=e.objectives.china;try{away(e,o);e.playerPos.set(o.cupPoint.x,0,o.cupPoint.z-1);e.player.model={};e.player.mixingReach=()=>({error:0});
  // A stub only reaches the cup from a normal stance, just like the real rigs.
  e.player.mixingReach=()=>({error:Math.hypot(e.playerPos.x-o.cupPoint.x,e.playerPos.z-o.cupPoint.z)>.55?1:0});
  assert.equal(o.interact({type:'china-poison'}),true);assert.ok(o.mixingApproach);assert.equal(o.patients.started,null);assert.equal(o.case.mixedSeconds,0);
  e.interact();assert.equal(o.mixingApproach,null);assert.equal(o.poisonAction,null);assert.equal(o.patients.started,null);
 }finally{disposeSim(e);}
});

test('a newly blocked approach cancels without clipping or starting mixing, and can be retried',()=>{
 const e=hospitalSim(),o=e.objectives.china;try{away(e,o);e.playerPos.set(o.cupPoint.x,0,o.cupPoint.z-1);e.player.model={};e.player.mixingReach=()=>({error:Math.hypot(e.playerPos.x-o.cupPoint.x,e.playerPos.z-o.cupPoint.z)>.55?1:0});
  assert.ok(o.interact({type:'china-poison'}));const from=e.playerPos.clone(),move=e.move;e.move=()=>{};for(let i=0;i<12;i++)o.moveToMixingPosition(.05);assert.equal(o.mixingApproach,null);assert.equal(o.poisonAction,null);assert.equal(o.patients.started,null);assert.ok(e.playerPos.distanceTo(from)<1e-7);
  e.move=move;assert.ok(o.interact({type:'china-poison'}));for(let i=0;i<20&&o.mixingApproach;i++){o.moveToMixingPosition(.05);o.updateMixingApproach();}assert.ok(o.poisonAction);
 }finally{disposeSim(e);}
});

test('coffee approach preserves spoon, doctor absence, office boundary and witness requirements',()=>{
 const e=hospitalSim(),o=e.objectives.china;try{away(e,o);e.playerPos.set(o.cupPoint.x,0,o.cupPoint.z-.75);o.hasSpoon=false;assert.equal(o.interact({type:'china-poison'}),false);assert.match(e.message,/spoon/);o.hasSpoon=true;o.doctor.pos.set(o.home.x,0,o.home.z);assert.equal(o.interact({type:'china-poison'}),false);assert.match(e.message,/doctor has fully left/);o.doctor.pos.set(0,0,30);o.mixingWitness=()=>o.doctor;assert.equal(o.interact({type:'china-poison'}),false);assert.equal(o.poisonAction,null);
 }finally{disposeSim(e);}
});
