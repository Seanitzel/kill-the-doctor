import test from 'node:test';import assert from 'node:assert/strict';import*as T from'three';
import{bathroomMirror,mirrorRenderSize}from'../src/game/mirrors.js';import{buildHospital}from'../src/game/hospital.js';import{makeLayout,findPath,tileAt}from'../src/game/layout.js';import{COUNTRIES}from'../src/game/international.js';import{disposeHospital}from'../src/game/hospital-disposal.js';import{addBathroom}from'../src/game/accessibility-props.js';import{circleOverlaps,blocksBody}from'../src/game/collision.js';
const makeMaterials=()=>Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(k=>[k,new T.MeshBasicMaterial()]));
function canvas(fn){const previous=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};try{return fn();}finally{globalThis.document=previous;}}

test('sharp mirrors allocate on demand, preserve viewport aspect, bound pixels, avoid recursion and release resources once',()=>{
 for(const coarse of[true,false])for(const[w,h]of[[2560,1440],[1179,2556],[1440,800],[393,852]]){const size=mirrorRenderSize(w,h,coarse);assert.ok(size.width<= (coarse?1024:1536));assert.ok(size.height<=(coarse?1024:1536));assert.ok(Math.abs(size.width/size.height-w/h)<.002);}
 const previous=Object.getOwnPropertyDescriptor(globalThis,'performance');let now=0;Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
 const mirror=bathroomMirror(),target=mirror.getRenderTarget(),scene=new T.Scene(),camera=new T.PerspectiveCamera(60,16/9,.1,100);let rendered=0,current=null;
 const renderer={getDrawingBufferSize:v=>v.set(2560,1440),xr:{enabled:false},shadowMap:{autoUpdate:true},autoClear:true,getRenderTarget:()=>current,setRenderTarget:v=>current=v,state:{buffers:{depth:{setMask(){}}}},render(){rendered++;mirror.onBeforeRender(renderer,scene,mirror.camera);}};
 try{scene.add(mirror);scene.updateMatrixWorld(true);assert.deepEqual([target.width,target.height],[64,64]);camera.position.z=-2;camera.updateMatrixWorld();mirror.onBeforeRender(renderer,scene,camera);assert.equal(rendered,0);
 camera.position.z=2;camera.lookAt(0,0,0);camera.updateMatrixWorld();mirror.onBeforeRender(renderer,scene,camera);assert.equal(rendered,1);assert.deepEqual([target.width,target.height],[1536,864]);assert.equal(current,null);assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(mirror.visible,true);
 now=20;mirror.onBeforeRender(renderer,scene,camera);assert.equal(rendered,1);now=34;mirror.onBeforeRender(renderer,scene,camera);assert.equal(rendered,2);camera.position.z=12;camera.updateMatrixWorld();now=100;mirror.onBeforeRender(renderer,scene,camera);assert.equal(rendered,2);
 let targets=0,geometries=0,materials=0;target.addEventListener('dispose',()=>targets++);mirror.geometry.addEventListener('dispose',()=>geometries++);mirror.material.addEventListener('dispose',()=>materials++);mirror.dispose();mirror.dispose();assert.deepEqual([targets,geometries,materials],[1,1,1]);mirror.onBeforeRender(renderer,scene,camera);assert.equal(rendered,2);
 }finally{mirror.dispose();Object.defineProperty(globalThis,'performance',previous);}
});

test('all country layouts guide toward the toilet and exit, with one clear automatic-door header and no wash-hands sign',()=>{
 const m=makeMaterials();try{for(const country of COUNTRIES)for(let floor=0;floor<4;floor++){const layout=makeLayout(floor,country.index),h=canvas(()=>buildHospital(layout,m,country));try{
 const signs=h.group.children.filter(o=>o.name==='Corridor exit direction'),header=h.group.getObjectByName('Automatic entrance and exit header');assert.equal(signs.length,floor===0?2:0);assert.equal(!!header,floor===0);
 if(header){assert.equal(h.group.children.filter(o=>o.position.z>32&&o.position.y>2.8&&o.geometry?.type==='PlaneGeometry').length,1);assert.ok(header.position.y-header.geometry.parameters.height/2>2.92);for(const sign of signs){const arrow=new T.Vector3(sign.userData.direction==='left'?-1:1,0,0).applyQuaternion(sign.quaternion),delta=new T.Vector3(sign.userData.toward.x-sign.position.x,0,sign.userData.toward.z-sign.position.z);assert.ok(arrow.dot(delta)>20);assert.ok(findPath(layout,tileAt(sign.position.x,sign.position.z),tileAt(0,24)).length>0);}}
 if(floor<3){const way=h.group.getObjectByName('Hanging toilet wayfinding'),front=way.getObjectByName('Toilet male and female pictograms'),back=way.getObjectByName('Toilet pictograms reverse face'),bath=layout.rooms.find(r=>r.kind==='bathroom');assert.deepEqual(front.userData.symbols,['male','female','accessible']);assert.equal(front.userData.direction,'left');assert.equal(back.userData.direction,'right');assert.ok(way.position.x>bath.center.x+5);assert.ok(h.group.getObjectByName('Bathroom projecting plaque'));assert.equal(h.group.getObjectByName('Bathroom hygiene sign'),undefined);}
 }finally{disposeHospital(h,m);}}}finally{Object.values(m).forEach(v=>v.dispose());}
});

test('the wall-mounted hand dryer has physical bounds and leaves bathroom circulation and sink positions clear',()=>{
 const m=makeMaterials();try{const h=canvas(()=>addBathroom(new T.Group(),{},m));try{const dryer=h.root.getObjectByName('Automatic hand dryer'),bounds=h.colliders.find(c=>c.type==='hand-dryer');assert.ok(dryer&&bounds);assert.ok(dryer.position.x>4);assert.ok(bounds.minY>.9&&bounds.maxY<1.7);assert.equal(bounds.minZ,-.3);assert.equal(bounds.maxZ,.3);
 for(const p of[h.anchors.center,h.anchors.entry,...h.anchors.sinks,...h.anchors.toilets])assert.equal(h.colliders.some(c=>blocksBody(c)&&circleOverlaps(p.x,p.z,.3,c)),false);
 }finally{h.dispose();}}finally{Object.values(m).forEach(v=>v.dispose());}
});
