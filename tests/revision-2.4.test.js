import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GameEngine} from '../src/game/engine.js';
import {defaultSave,readSave,writeSave} from '../src/game/mission.js';
import {defaultAppearance,normalizeAppearance} from '../src/game/loadout.js';
import {key,tileAt} from '../src/game/layout.js';
import {obstacleBounds,circleOverlaps} from '../src/game/collision.js';
import {dialogueRegion} from '../src/game/audio.js';

test('American regional voices are stable across text and visual customization with explicit overrides',()=>{
  const regions=new Set();for(const name of ['Nurse Iris Lowe','Nurse Felix Shaw','Nurse Nora Ellis','Dr. Elias Voss','Waiting patient A','Waiting patient B']){const region=dialogueRegion({name});regions.add(region);assert.equal(dialogueRegion({name,skin:'#271c18',gender:'female'}),region);assert.equal(dialogueRegion({name,skin:'#f3ddca',gender:'male'}),region);}
  assert.deepEqual(regions,new Set(['standard','southern']));assert.equal(dialogueRegion({name:'Nurse Iris Lowe',voiceRegion:'southern'}),'southern');assert.equal(dialogueRegion({voiceRegion:'standard'}),'standard');
});

test('Torch originates at the avatar chest and follows its heading rather than the camera shoulder',()=>{
  const e=Object.create(GameEngine.prototype);Object.assign(e,{player:{root:new THREE.Group()},playerPos:new THREE.Vector3(4,0,7),flash:{position:new THREE.Vector3(),target:{position:new THREE.Vector3()}},pitch:-.06,lightDirection:new THREE.Vector3(),aiming:false});
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    e.player.root.rotation.y=yaw;e.updateTorch();const direction=e.flash.target.position.clone().sub(e.flash.position).normalize();
    assert.ok(direction.dot(new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)))>.99);
    assert.ok(Math.abs(e.flash.position.y-1.55)<1e-8);assert.ok(e.flash.position.distanceTo(new THREE.Vector3(4,1.55,7))<.25);
  }
  e.crouched=true;e.updateTorch();assert.equal(e.flash.position.y,1.2);
  e.aiming=true;e.aimRay=()=>new THREE.Ray(new THREE.Vector3(1,2,3),new THREE.Vector3(0,0,-1));e.updateTorch();assert.deepEqual(e.flash.target.position.toArray(),[1,2,-12]);
});

test('Scene and torch brightness migrate, clamp and persist independently of light upgrades',()=>{
  const save=defaultSave();save.settings.brightness=1.4;save.settings.flashlightBrightness=2.1;let encoded;writeSave({setItem:(key,value)=>encoded=value},save);
  const restored=readSave({getItem:()=>encoded});assert.equal(restored.settings.brightness,1.4);assert.equal(restored.settings.flashlightBrightness,2.1);
  const legacy=readSave({getItem:()=>JSON.stringify({settings:{volume:.5}})});assert.equal(legacy.settings.brightness,1);assert.equal(legacy.settings.flashlightBrightness,1);
  const invalid=readSave({getItem:()=>JSON.stringify({settings:{brightness:100,flashlightBrightness:-2}})});assert.equal(invalid.settings.brightness,1.75);assert.equal(invalid.settings.flashlightBrightness,.5);
});

test('Door movement reserves the measured walking hand envelope and cannot sweep through a person',()=>{
  const e=Object.create(GameEngine.prototype),door={angle:0,openAngle:-Math.PI/2,pivot:{position:{x:0,z:0}}};
  Object.assign(e,{floor:0,playerPos:new THREE.Vector3(10,0,10),npcs:[{floor:0,pos:new THREE.Vector3(.9,0,.38)}]});
  assert.equal(circleOverlaps(.9,.38,.22,obstacleBounds({object:door})),false,'Old foot circle missed a hand close to the door');
  assert.equal(e.doorCanSwingTo(door,0),false);
  e.npcs[0].pos.set(1.1,0,1.1);assert.equal(e.doorCanSwingTo(door,-Math.PI/2),false,'Intermediate swing angles also respect clearance');
  e.npcs[0].pos.set(3,0,3);assert.equal(e.doorCanSwingTo(door,-Math.PI/2),true);
  const position={x:.9,z:.38},cell=tileAt(position.x,position.z);e.levels=[{cells:new Map([[key(cell.x,cell.z),cell]])}];e.hospitals=[{colliders:[{object:door}]}];
  assert.equal(e.canStand(position.x,position.z,.22),false);assert.equal(e.nearStructure({x:.9,z:.9},0),true);
});

test('Sunglasses save separately, preserve old glasses, and prevent stacked eyewear',()=>{
  assert.equal(defaultAppearance().sunglasses,false);assert.equal(normalizeAppearance({glasses:true}).glasses,true);
  const value=normalizeAppearance({glasses:true,sunglasses:true,cap:true});assert.equal(value.sunglasses,true);assert.equal(value.glasses,false);assert.equal(value.cap,true);
  const save=defaultSave();save.appearance=value;const restored=readSave({getItem:()=>JSON.stringify(save)});assert.equal(restored.appearance.sunglasses,true);
});
