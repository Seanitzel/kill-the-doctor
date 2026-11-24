import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createInterior} from '../src/game/hospital-interiors.js';
import {NIGERIAN_PAINTINGS,NIGERIAN_FAMILY_ART,nigerianGalleryPlan} from '../src/game/interior-decor.js';
import {wallHasWindow,WINDOW_HEAD} from '../src/game/wall-surfaces.js';
import {makeLayout} from '../src/game/layout.js';
import {buildHospital} from '../src/game/hospital.js';
import {disposeHospital} from '../src/game/hospital-disposal.js';
import {COUNTRIES} from '../src/game/international.js';
import {withCanvas} from './helpers/hospital-sim.js';

function hospital(id,floor){
 const country=COUNTRIES.find(c=>c.id===id);
 const pool=Object.fromEntries(['wall','stripe','blue','trim','chair','steel','wood','linen','floor','ceiling','light','white','dark','glass','monitor','green','black','red'].map(k=>[k,new T.MeshStandardMaterial()]));
 const style=withCanvas(()=>createInterior(pool,{playMode:'story',country}));
 const layout=makeLayout(floor,country.index,country.index>=5);
 const h=withCanvas(()=>buildHospital(layout,style.materials,country,style.profile));
 return {style,layout,h,dispose(){disposeHospital(h,style.materials);style.dispose();Object.values(pool).forEach(m=>m.dispose());}};
}

test('Nigerian artwork appears only on the two outermost corridor walls, alternates with artifacts, and never repeats between floors',()=>{
 const paintings=[];
 for(const floor of [0,1,2]){
  const a=hospital('nigeria',floor);
  try{
   const displays=a.h.group.userData.nigerianGallery;
   assert.equal(displays.length,20);
   for(const hallway of ['west-end','east-end']){
    const row=displays.filter(p=>p.hallway===hallway).sort((a,b)=>a.z-b.z);
    assert.deepEqual(row.map(p=>p.kind),Array.from({length:10},(_,i)=>i%2?'artifact':'painting'));
    assert.equal(new Set(row.map(p=>p.x)).size,1);
    assert.ok(row.every(p=>hallway==='west-end'?p.x<-28:p.x>25));
   }
   const plan=nigerianGalleryPlan(a.layout);
   assert.ok(plan.every(p=>p.face.wall.exterior&&p.face.wall.axis==='z'));
   paintings.push(...displays.filter(p=>p.kind==='painting').map(p=>p.artwork));
   assert.equal(a.h.group.children.filter(o=>o.name==='Nigerian daily-life painting').length,10);
   assert.equal(a.h.colliders.filter(c=>c.type==='decorative-vase').length,0);
  }finally{a.dispose();}
 }
 assert.equal(paintings.length,30);
 assert.equal(new Set(paintings).size,30);
 assert.deepEqual(new Set(paintings),new Set([...NIGERIAN_PAINTINGS,...NIGERIAN_FAMILY_ART.slice(2)].map(p=>p[1])));
 assert.deepEqual(nigerianGalleryPlan(makeLayout(3,1)),[]);
});

test('Romanian floral geometry cannot cover an office window opening on any public floor',()=>{
 for(const floor of [0,1,2,4,5]){
  const a=hospital('romania',floor);
  try{
   a.h.group.updateMatrixWorld(true);
   const floral=[];a.h.group.traverse(o=>{if(o.isMesh&&[a.style.materials.floral,a.style.materials.floralHeader].includes(o.material))floral.push(o);});
   const windows=a.h.group.userData.floralPanelBounds.filter(b=>b.window);
   assert.ok(windows.length>0);
   assert.equal(a.h.group.userData.floralPanelBounds.length,a.h.group.userData.floralPanels);
   for(const b of windows){
    assert.ok(b.bottom>WINDOW_HEAD);
    const normal=new T.Vector3(b.axis==='z'?b.side:0,0,b.axis==='x'?b.side:0);
    const rayAt=y=>new T.Raycaster(new T.Vector3(b.x,y,b.z).addScaledVector(normal,1),normal.clone().negate(),0,1.2).intersectObjects(floral);
    assert.equal(rayAt(1.87).length,0,'the actual batched floral mesh must leave glazing clear');
    assert.ok(rayAt(b.center).length>0,'the solid header retains its floral pattern');
   }
   assert.ok(a.layout.walls.some(wallHasWindow));
   assert.equal(a.style.materials.floralHeader.map.source,a.style.materials.floral.map.source,'header crop shares the same owned image');
  }finally{a.dispose();}
 }
});

test('Venezuela uses neutral mid-grey floor and ceiling finishes without changing cream walls or tile dimensions',()=>{
 const a=hospital('venezuela',0);
 try{
  const p=a.style.profile,m=a.style.materials;
  assert.equal(p.floor,'#797979');assert.equal(p.ceilingColor,'#929292');
  assert.equal(m.wall.color.getHexString(),'e9dec7');assert.equal(m.lowerWall.color.getHexString(),'d4c6ad');
  assert.equal(m.floor.map.userData.divisions,4);assert.equal(m.floor.bumpMap,m.floor.map);assert.ok(m.floor.bumpScale>=.01);assert.ok(m.floor.roughness>=.8);
  assert.notEqual(m.floor.map,m.ceiling.map);
 }finally{a.dispose();}
});
