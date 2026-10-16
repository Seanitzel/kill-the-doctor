import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LookGesture,cameraZoom} from '../src/mobile/look-gesture.js';
import {GameEngine} from '../src/game/engine.js';

test('Two fingers on the look surface zoom without rotating, then resume looking without a jump',()=>{
  const looks=[],zooms=[],gesture=new LookGesture({look:(...p)=>looks.push(p),zoom:r=>zooms.push(r)});
  gesture.start(1,100,100);gesture.move(1,105,101);assert.deepEqual(looks,[[5,1]]);
  gesture.start(2,205,101);gesture.move(2,225,101);assert.equal(zooms.length,1);assert.ok(zooms[0]>1);assert.equal(looks.length,1);
  assert.equal(gesture.start(3,300,200),false);gesture.end(1);gesture.move(2,230,104);assert.deepEqual(looks.at(-1),[5,3]);gesture.reset();assert.equal(gesture.points.size,0);
});
test('A movement thumb is not tracked by the look gesture, pinch ratios are bounded and pause blocks zoom',()=>{
  const gesture=new LookGesture({look(){},zoom(){throw Error('Not a pinch');}});gesture.start(9,100,100);gesture.move(7,300,100);gesture.move(9,110,100);
  assert.equal(cameraZoom(1,100),1.8);assert.equal(cameraZoom(1,.001),.65);assert.equal(cameraZoom(1,NaN),1);
  const e=Object.create(GameEngine.prototype);e.cameraZoom=1;e.paused=true;e.zoomTouch(1.2);assert.equal(e.cameraZoom,1);e.paused=false;e.zoomTouch(1.2);assert.equal(e.cameraZoom,1.2);
});
test('Zoom keeps camera collision protection and changes the rendered camera projection',()=>{
  const e=Object.create(GameEngine.prototype);Object.assign(e,{mobile:true,cameraZoom:1,camera:new THREE.PerspectiveCamera(60,956/390,.08,90),playerPos:new THREE.Vector3(0,0,0),player:{root:new THREE.Group()},flash:{position:new THREE.Vector3(),target:{position:new THREE.Vector3()}},rim:{position:new THREE.Vector3()},yaw:0,pitch:-.06,floor:0,hospitals:[{colliders:[{minX:-5,maxX:5,minZ:-3,maxZ:-2.8,minY:0,maxY:3.6}]}]});
  e.updateCamera(.2,true);const original=e.camera.fov;e.cameraZoom=1.8;e.updateCamera(.2,true);assert.ok(e.camera.fov<original);assert.ok(e.camera.position.z>-2.6);assert.ok(e.camera.position.y>0&&e.camera.position.y<3.4);
});

test('Camera proximity and scope preserve hidden accessory choices',()=>{
  const e=Object.create(GameEngine.prototype),root=new THREE.Group(),glasses=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());glasses.visible=false;root.add(glasses);
  Object.assign(e,{mobile:true,camera:new THREE.PerspectiveCamera(60,2,.08,90),playerPos:new THREE.Vector3(),player:{root},flash:{position:new THREE.Vector3(),target:{position:new THREE.Vector3()}},rim:{position:new THREE.Vector3()},yaw:0,pitch:0,floor:0,hospitals:[{colliders:[]}]});
  e.updateCamera(.2,true);assert.equal(root.visible,true);assert.equal(glasses.visible,false);e.aiming=true;e.weaponKind='sniper';e.updateCamera(.2,true);assert.equal(root.visible,false);assert.equal(glasses.visible,false);e.aiming=false;e.updateCamera(.2,true);assert.equal(root.visible,true);assert.equal(glasses.visible,false);glasses.geometry.dispose();glasses.material.dispose();
});
