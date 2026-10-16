import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {advanceSprint,animationFootfalls} from '../src/game/movement.js';
import {recolorIrisPixels} from '../src/game/appearance.js';
import {prepareAssignment,markIntroSeen} from '../src/game/assignment.js';
import {Mission,defaultSave,readSave} from '../src/game/mission.js';
import {GameEngine} from '../src/game/engine.js';

test('Exhaustion holds a steady walk while sprint stays held, then permits a recovered sprint',()=>{
  const e=Object.create(GameEngine.prototype),speeds=[];
  Object.assign(e,{keys:new Set(['KeyW','ShiftLeft']),touchInput:{forward:0,strafe:0,sprint:false,crouch:false},yaw:0,time:0,stamina:1,maxStamina:100,impairment:0,aiming:false,playerPos:new THREE.Vector3(),player:{root:new THREE.Group(),animate:(time,speed)=>speeds.push(speed)},weapon:new THREE.Group(),mission:{save:defaultSave(),targetDown:false,state:'investigate'},visited:new Set(),floor:0,audio:{update(){}},proximity:()=>0});
  e.move=(dx,dz)=>{e.playerPos.x+=dx;e.playerPos.z+=dz;};
  for(let i=0;i<600;i++){e.time+=1/60;e.updatePlayer(1/60);}
  assert.ok(speeds.slice(8).every(speed=>Math.abs(speed-2.8)<1e-6),'No alternating walk/run frames after depletion');
  assert.equal(e.stamina,100);assert.equal(e.sprintExhausted,true);
  e.keys.delete('ShiftLeft');e.updatePlayer(1/60);e.keys.add('ShiftLeft');e.updatePlayer(1/60);
  assert.ok(speeds.at(-1)>5);assert.equal(e.sprintExhausted,false);
});
test('Touch sprint turns off on exhaustion and requires a recovery reserve',()=>{
  let state={stamina:.1,maxStamina:175};
  state=advanceSprint(state,{dt:1/60,requested:true,moving:true});assert.equal(state.sprintExhausted,true);
  for(let i=0;i<100;i++)state=advanceSprint({...state,maxStamina:175},{dt:1/60,requested:false,moving:true});
  assert.equal(state.sprintExhausted,true);
  for(let i=0;i<40;i++)state=advanceSprint({...state,maxStamina:175},{dt:1/60,requested:false,moving:true});
  assert.equal(state.sprintExhausted,false);
});
test('One case and target persist through failures, reloads and retries; success unlocks a new case',()=>{
  let save=defaultSave();const first=prepareAssignment(save,()=>.3,1234);markIntroSeen(save);
  const original=new Mission(save,first.seed,first.attempt);original.finish(false,'Retry');
  save=readSave({getItem:()=>JSON.stringify(save)});const retry=prepareAssignment(save,()=>.8,9876);
  assert.equal(retry.story.id,first.story.id);assert.equal(retry.seed,1234);assert.equal(retry.introSeen,true);assert.equal(save.storySeen.length,1);
  const retried=new Mission(save,retry.seed,retry.attempt);assert.deepEqual(retried.target,original.target);
  retried.targetDown=true;retried.escape();const next=prepareAssignment(save,()=>.3,5555);
  assert.equal(next.round,2);assert.notEqual(next.story.id,first.story.id);assert.equal(next.introSeen,false);assert.equal(next.seed,5555);
});
test('Going back before entering retains the case and its unviewed introduction',()=>{
  const save=defaultSave(),first=prepareAssignment(save,()=>.1,1),again=prepareAssignment(save,()=>.9,2);
  assert.equal(first.story.id,again.story.id);assert.equal(again.introSeen,false);assert.equal(save.storySeen.length,1);
});
test('Footsteps follow half-cycles of the active animation, including loop boundaries and slow walking',()=>{
  assert.equal(animationFootfalls(.49,.02,1,1),1);
  assert.equal(animationFootfalls(.99,.02,1,1),1);
  assert.equal(animationFootfalls(.2,.02,1,1),0);
  assert.equal(animationFootfalls(.48,.02,.5,1),0);
  assert.equal(animationFootfalls(.48,.02,2,1),1);
  assert.equal(animationFootfalls(0,1,0,1),0);
});
test('New appearance fields migrate safely and persist across reload',()=>{
  const save=defaultSave();save.appearance.eyes='#537b60';save.appearance.hairstyle='ponytail';save.appearance.outfit='tactical';
  assert.deepEqual(readSave({getItem:()=>JSON.stringify(save)}),save);
  const repaired=readSave({getItem:()=>JSON.stringify({appearance:{eyes:'bad',hairstyle:'bad',outfit:'bad'}})});
  assert.equal(repaired.appearance.outfit,'casual');assert.equal(repaired.appearance.hairstyle,'original');assert.equal(repaired.appearance.eyes,defaultSave().appearance.eyes);
});
test('Eye color changes the iris while retaining the white sclera, dark pupil and catchlight',()=>{
  const n=100,data=new Uint8ClampedArray(n*n*4);for(let i=0;i<data.length;i+=4)data.set([100,70,40,255],i);
  const pixel=(x,y)=>(y*n+x)*4;
  data.set([240,240,240,255],pixel(2,2));data.set([8,8,8,255],pixel(50,50));data.set([250,250,250,255],pixel(62,50));
  recolorIrisPixels(data,n,n,'#537b60');
  assert.deepEqual(Array.from(data.slice(pixel(2,2),pixel(2,2)+4)),[240,240,240,255]);
  assert.deepEqual(Array.from(data.slice(pixel(50,50),pixel(50,50)+4)),[8,8,8,255]);
  assert.deepEqual(Array.from(data.slice(pixel(62,50),pixel(62,50)+4)),[250,250,250,255]);
  assert.ok(data[pixel(65,50)+1]>data[pixel(65,50)],'Iris takes the selected green hue');
});
