import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {culturalAttire} from '../src/game/cultural-attire.js';
import {makePlayer,disposeCharacterAssets} from '../src/game/assets.js';
import {realModel} from './helpers/real-rig.js';
import {createInterior,INTERIORS} from '../src/game/hospital-interiors.js';
import {entranceFaces,nigerianGalleryPlan,NIGERIAN_FAMILY_ART} from '../src/game/interior-decor.js';
import {farHallGlass} from '../src/game/wall-surfaces.js';
import {buildHospital} from '../src/game/hospital.js';
import {disposeHospital} from '../src/game/hospital-disposal.js';
import {makeLayout} from '../src/game/layout.js';
import {COUNTRIES} from '../src/game/international.js';
import {withCanvas} from './helpers/hospital-sim.js';
import {addEveningWeather,updateEveningWeather} from '../src/game/evening-weather.js';
import {disposeObjectResources} from '../src/game/resources.js';

test('Cultural outfits vary across the Nigerian and Indian patient cast and never replace staff or bed clothing',()=>{
 for(const country of ['nigeria','india'])for(const gender of ['male','female']){
  const mission={playMode:'story',country:{id:country},seed:123},person={gender},outfits=Array.from({length:40},(_,i)=>culturalAttire(mission,person,'patient',String(i)));
  assert.ok(outfits.filter(Boolean).length>8&&outfits.filter(Boolean).length<38);assert.equal(new Set(outfits.filter(Boolean).map(o=>o.style)).size,1);
  for(const role of ['nurse','doctor','security'])assert.equal(culturalAttire(mission,person,role,'x'),null);
  for(const options of [{lying:true},{visual:{}}])assert.equal(culturalAttire(mission,person,'patient','x',options),null);
  assert.equal(culturalAttire({...mission,playMode:'freeplay'},person,'patient','x'),null);assert.equal(culturalAttire({...mission,terror:true},person,'patient','x'),null);
 }
});
test('Cultural garments deform with the actual male and female rigs and release all owned resources once',async()=>{
 for(const [file,gender]of [['adrian','male'],['alex','female']]){
  const assets={[gender]:await realModel(file),animations:{},sources:{},clipCache:{},clothCache:new Map(),appearanceCache:new Map()};
  try{for(const country of ['nigeria','india']){
   const style=country==='nigeria'?(gender==='female'?'gele-wrapper':'embroidered-shirt'):(gender==='female'?'sari':'kurta');
   const v=makePlayer(assets,gender,{gender,skin:'#754b33',culturalAttire:{country,style,variant:2}},'patient');
   const pieces=[];v.model.traverse(o=>{if(o.isMesh&&o.userData.culturalAttire)pieces.push(o);});assert.ok(pieces.length>=10);assert.equal(v.model.userData.culturalAttire.style,style);
   const garment=pieces.find(o=>o.isSkinnedMesh&&/blouse|long shirt|kurta/.test(o.name)),before=garment.getVertexPosition(110,new T.Vector3()).clone();
   v.model.getObjectByName('Spine2').rotation.x+=.3;v.model.getObjectByName('LeftUpLeg').rotation.x=.8;v.model.getObjectByName('LeftLeg').rotation.x=-.5;v.root.updateMatrixWorld(true);v.model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
   assert.ok(garment.getVertexPosition(110,new T.Vector3()).distanceTo(before)>.002);
   for(const o of pieces){assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));if(o.isSkinnedMesh){const w=o.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);}}
   const geoms=new Map(pieces.map(o=>[o.geometry,0])),mats=new Map(pieces.map(o=>[o.material,0]));for(const g of geoms.keys())g.addEventListener('dispose',()=>geoms.set(g,geoms.get(g)+1));for(const m of mats.keys())m.addEventListener('dispose',()=>mats.set(m,mats.get(m)+1));v.dispose();assert.ok([...geoms.values(),...mats.values()].every(n=>n===1));
  }}finally{disposeCharacterAssets(assets);}
 }
});
test('Marked entrance art has two actual solid wall faces and denser Nigerian galleries retain unique paintings',()=>{
 const country=COUNTRIES.find(c=>c.id==='nigeria'),all=[];
 for(const floor of [0,1,2]){const layout=makeLayout(floor,country.index),plan=nigerianGalleryPlan(layout);assert.equal(plan.length,20);for(const side of ['west-end','east-end'])assert.deepEqual(plan.filter(p=>p.hallway===side).map(p=>p.kind),Array.from({length:10},(_,i)=>i%2?'artifact':'painting'));all.push(...plan.filter(p=>p.painting).map(p=>p.painting[1]));if(floor===0){const faces=entranceFaces(layout);assert.equal(faces.length,2);assert.deepEqual(faces.map(f=>f.wall.x),[-6,3]);}}
 all.push(...NIGERIAN_FAMILY_ART.slice(0,2).map(p=>p[1]));assert.equal(all.length,32);assert.equal(new Set(all).size,32);
});
test('America glass is limited to far exterior hallways, while India retains its original brown finishes',()=>{
 const c=COUNTRIES.find(c=>c.id==='america'),layout=makeLayout(0,c.index,true),glass=layout.walls.filter(w=>farHallGlass(layout,w));assert.ok(glass.length>10);assert.ok(glass.every(w=>w.exterior&&w.axis==='z'));assert.deepEqual([...new Set(glass.map(w=>w.x))].sort((a,b)=>a-b),[-28.5,25.5]);assert.ok(layout.walls.filter(w=>!w.exterior).every(w=>!farHallGlass(layout,w)));
 assert.equal(INTERIORS.india.wall,'#d7c4aa');assert.equal(INTERIORS.india.lower,'#986949');assert.equal(INTERIORS.india.ceilingColor,undefined);
});
test('Paintings do not emit light during blackouts',()=>{
 const pool=Object.fromEntries(['wall','stripe','blue','trim','chair','steel','wood','linen','floor','ceiling','light'].map(k=>[k,new T.MeshStandardMaterial()]));
 for(const id of ['nigeria','india']){const style=withCanvas(()=>createInterior(pool,{playMode:'story',country:{id}}));try{for(const [key,m]of Object.entries(style.materials))if(key.startsWith('art')){assert.equal(m.emissive.getHex(),0);assert.equal(m.emissiveMap,null);}}finally{style.dispose();}}
 Object.values(pool).forEach(m=>m.dispose());
});
test('Russia and England share continuous snow relief instead of box banks, and French thunder uses mission time',()=>{
 for(const country of ['russia','england']){const root=new T.Group(),w=addEveningWeather(root,country,{story:true});assert.equal(w.banks.length,0);assert.ok(w.snowSurface);disposeObjectResources(root);}
 const root=new T.Group(),w=addEveningWeather(root,'france',{story:true});let thunder=0;const audio={weather:(kind,outside,hit)=>{if(hit)thunder++;}};
 updateEveningWeather(root,true,999,audio,{visible:true,age:0});assert.equal(thunder,0);updateEveningWeather(root,true,1034.1,audio,{visible:true,age:35.1});assert.equal(thunder,1);assert.ok(w.flash.intensity>20);updateEveningWeather(root,true,2000,audio,{visible:true,age:35.1});assert.equal(thunder,1);updateEveningWeather(root,true,2001,audio,{visible:true,age:0});assert.equal(w.nextThunder,35);assert.equal(w.flash.intensity,0);disposeObjectResources(root);
});

test('American glass retains the existing collider envelope and the actual far side sight lines use glass',()=>{
 const country=COUNTRIES.find(c=>c.id==='america'),pool=Object.fromEntries(['wall','stripe','blue','trim','chair','steel','wood','linen','floor','ceiling','light','white','dark','glass','monitor','green','black','red'].map(k=>[k,new T.MeshStandardMaterial()]));
 const style=withCanvas(()=>createInterior(pool,{playMode:'story',country})),a=withCanvas(()=>buildHospital(makeLayout(0,country.index,true),style.materials,country,style.profile)),b=withCanvas(()=>buildHospital(makeLayout(0,country.index,true),pool,country,null,{story:false}));
 try{const walls=h=>h.colliders.filter(c=>['wall','header'].includes(c.type)).map(c=>[c.type,c.minX,c.maxX,c.minZ,c.maxZ,c.minY,c.maxY]);assert.deepEqual(walls(a),walls(b));a.group.updateMatrixWorld(true);for(const [x,dir]of [[-27,-1],[24,1]]){const hits=new T.Raycaster(new T.Vector3(x,2.2,6),new T.Vector3(dir,0,0),0,2).intersectObject(a.group,true).filter(h=>h.object.material===style.materials.hallGlass);assert.ok(hits.length>0);}}
 finally{disposeHospital(a,style.materials);disposeHospital(b,pool);style.dispose();Object.values(pool).forEach(m=>m.dispose());}
});
