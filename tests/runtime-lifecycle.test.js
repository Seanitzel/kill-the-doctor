import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {disposeObjectResources} from '../src/game/resources.js';
import {TimerScope} from '../src/game/lifetime.js';
import {createCableGeometry,updateCableGeometry} from '../src/game/dynamic-cable.js';
import {GameEngine} from '../src/game/engine.js';

test('Scene cleanup deduplicates resources, releases instance buffers and keeps shared primitives',()=>{
  const root=new THREE.Group(),shared=new THREE.BoxGeometry(),owned=new THREE.BoxGeometry(),map=new THREE.Texture(),mat=new THREE.MeshStandardMaterial({map,emissiveMap:map});shared.userData.sharedPrimitive=true;
  root.add(new THREE.Mesh(shared,mat),new THREE.Mesh(owned,mat),new THREE.Mesh(owned,mat));
  const instances=new THREE.InstancedMesh(shared,mat,2);root.add(instances);
  const calls={shared:0,owned:0,map:0,material:0,instances:0};
  for(const [object,key] of [[shared,'shared'],[owned,'owned'],[map,'map'],[mat,'material'],[instances,'instances']])object.addEventListener('dispose',()=>calls[key]++);
  disposeObjectResources(root,{textures:true});assert.deepEqual(calls,{shared:0,owned:1,map:1,material:1,instances:1});
});
test('Feedback timers replace stale messages and cannot run after teardown',()=>{
  let id=0;const pending=new Map(),clock={setTimeout(fn){pending.set(++id,fn);return id;},clearTimeout(id){pending.delete(id);}},scope=new TimerScope(clock);let calls=0;
  scope.after('caption',50,()=>calls++);scope.after('caption',50,()=>calls+=10);assert.equal(pending.size,1);
  [...pending.values()][0]();assert.equal(calls,10);scope.after('shot',50,()=>calls++);const late=[...pending.values()].at(-1);
  scope.dispose();late();scope.after('new',1,()=>calls++);assert.equal(calls,10);assert.equal(scope.timers.size,0);
});
test('Clinical cables update in place without replacing geometry or attribute arrays',()=>{
  const geometry=createCableGeometry(),positions=geometry.attributes.position.array,normals=geometry.attributes.normal.array;
  for(let i=0;i<1000;i++)updateCableGeometry(geometry,new THREE.Vector3(Math.sin(i),1.4,0),new THREE.Vector3(2,1.1,Math.cos(i)));
  assert.equal(geometry.attributes.position.array,positions);assert.equal(geometry.attributes.normal.array,normals);
  assert.ok([...positions,...normals].every(Number.isFinite));
  for(let i=0;i<normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...normals.slice(i,i+3))-1)<1e-5);
  assert.ok(geometry.boundingSphere.radius>0);geometry.dispose();
});
test('A canceled or disposed startup cannot create a new mission after loading',async()=>{
  for(const disposed of [false,true]){
    let release;const engine=Object.create(GameEngine.prototype);Object.assign(engine,{assetsPromise:new Promise(resolve=>release=resolve),startGeneration:0,pauseRevision:0,disposed:false});
    const start=engine.start({});engine.startGeneration++;engine.disposed=disposed;release();assert.equal(await start,false);
  }
});
test('Hidden tabs stop animation and audio; resuming resets the clock and leaves the mission paused',()=>{
  const previous=globalThis.document;let hidden=true,loop='old',audioPaused=false,paused=0,reset=0,clock=0;
  globalThis.document={get hidden(){return hidden;}};
  try{
    const engine=Object.create(GameEngine.prototype);Object.assign(engine,{renderer:{setAnimationLoop(value){loop=value;}},audio:{pause(value){audioPaused=value;}},keys:new Set(['KeyW']),mission:{},hooks:{pause(){paused++;}},resetTouch(){reset++;},pause(value){this.paused=value;},clock:{getDelta(){clock++;}},performance:{},frame(){}});
    engine.handleVisibility();assert.equal(loop,null);assert.equal(audioPaused,true);assert.equal(engine.paused,true);assert.equal(paused,1);assert.equal(engine.keys.size,0);assert.equal(reset,1);
    hidden=false;engine.handleVisibility();assert.equal(loop,engine.frame);assert.equal(engine.paused,true);assert.equal(clock,1);assert.equal(engine.lastFrameAt,-Infinity);
  }finally{globalThis.document=previous;}
});
test('Camera obstacle cache retains static bounds and refreshes moving doors',()=>{
  const engine=Object.create(GameEngine.prototype),wall={minX:1,maxX:2,minZ:1,maxZ:2},door={pivot:new THREE.Group(),angle:0,width:1,depth:.1};
  door.pivot.position.set(2,0,3);Object.assign(engine,{floor:0,hospitals:[{colliders:[wall,{object:door}]}]});
  const bounds=engine.cameraObstacles(),old={...bounds[1]};door.angle=1;assert.equal(engine.cameraObstacles(),bounds);assert.equal(bounds[0],wall);assert.notDeepEqual(bounds[1],old);
});

test('Mobile rendering caps high-refresh screens and reduces menu/paused work without losing elapsed simulation time',()=>{
  const previousDocument=globalThis.document,previousPerformance=globalThis.performance;
  let now=0;globalThis.document={hidden:false};globalThis.performance={now:()=>now};
  try{
    for(const mode of ['mobile','menu','paused']){
      let rendered=0,simulated=0,lastClock=0;
      const engine=Object.create(GameEngine.prototype);Object.assign(engine,{mobile:true,lastFrameAt:-Infinity,time:0,menuTime:0,hudClock:0,performance:{frames:0,last:0},paused:mode==='paused',mission:mode==='menu'?null:{tick(dt){simulated+=dt;}},touchInput:{},effects:[],camera:new THREE.PerspectiveCamera(),clock:{getDelta(){const delta=(now-lastClock)/1000;lastClock=now;return delta;}},renderer:{render(){rendered++;}},syncViewport(){},updatePlayer(){},updateNPCs(){},updateEnvironment(){},updateCamera(){},updateLights(){},emitHUD(){}});
      for(let frame=0;frame<=240;frame++){now=frame*1000/120;engine.frame();}
      const expected=mode==='mobile'?121:mode==='menu'?61:31;assert.ok(Math.abs(rendered-expected)<=1,`${mode}: ${rendered} renders`);
      if(mode==='mobile')assert.ok(Math.abs(simulated-2)<.03,`simulation time ${simulated}`);
      now=0;
    }
  }finally{globalThis.document=previousDocument;globalThis.performance=previousPerformance;}
});
