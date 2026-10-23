import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {JoinedWalls} from '../src/game/joined-walls.js';import {buildHospital} from '../src/game/hospital.js';import {makeLayout} from '../src/game/layout.js';import {COUNTRIES} from '../src/game/international.js';import {setLiftOpening} from '../src/game/lift-doors.js';import {vendingBounds,overlaps,doorClearance} from '../src/game/furniture-placement.js';import {disposeHospital} from '../src/game/hospital-disposal.js';import {HospitalIncidents} from '../src/game/incidents.js';
const names=['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'];
const materials=()=>Object.fromEntries(names.map(k=>[k,new T.MeshBasicMaterial()]));
function canvas(fn){const previous=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};try{return fn();}finally{globalThis.document=previous;}}

test('wall union has one continuous L-shaped skin with no overlapping corner caps or top faces',()=>{
 const walls=new JoinedWalls(),m=new T.MeshBasicMaterial(),g=new T.Group();walls.box(m,0,1,0,4,2,.2);walls.box(m,1.9,1,2,.2,2,4);const meshes=walls.finish(g),geometry=meshes[0].geometry,p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index;
 assert.equal(meshes.length,1);assert.equal(g.userData.wallSurfaceStats.quads,10);let topArea=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(let i=0;i<index.count;i+=3){const ia=index.getX(i),ib=index.getX(i+1),ic=index.getX(i+2);if(n.getY(ia)<.9)continue;a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);topArea+=b.sub(a).cross(c.sub(a)).length()/2;}
 assert.ok(Math.abs(topArea-1.58)<1e-6,`union top area ${topArea}`);assert.equal(walls.boxes.length,0);geometry.dispose();m.dispose();
});

test('all 20 countries and every floor keep chairs clear of solids, vending machines and the full door swing',()=>{
 const m=materials();try{for(const country of COUNTRIES)for(let floor=0;floor<4;floor++){const layout=makeLayout(floor,country.index),h=canvas(()=>buildHospital(layout,m,country));try{
 const chairs=h.colliders.filter(c=>c.type==='chair');for(const chair of chairs){if(floor<3)assert.equal(overlaps(chair,vendingBounds()),false,`${country.id}/${floor}: vending chair`);
 for(const c of h.colliders){if(c===chair||c.object||c.minY>=1.18||c.maxY<=0)continue;assert.equal(overlaps(chair,c),false,`${country.id}/${floor}: chair overlaps ${c.type}`);}
 for(const door of layout.doors)assert.equal(overlaps(chair,doorClearance(door)),false,`${country.id}/${floor}: door approach or swing obstructed`);}
 const cafe=layout.rooms.find(r=>r.kind==='cafe');if(cafe)assert.equal(h.seats.filter(s=>s.room===cafe.id).length,12,`${country.id}/${floor}: cafeteria keeps all dining chairs`);
 assert.ok(h.group.userData.wallSurfaceStats.drawCalls<=6);assert.ok(h.group.userData.wallSurfaceStats.quads<h.group.userData.wallSurfaceStats.modules*6);
 }finally{disposeHospital(h,m);}}}finally{Object.values(m).forEach(v=>v.dispose());}
});

test('opening lift leaves remain inside the original portal and collider widths match the visible leaves on every floor',()=>{
 const m=materials();try{for(let floor=0;floor<4;floor++){const h=canvas(()=>buildHospital(makeLayout(floor),m)),lift=h.lift;try{const header=h.group.getObjectByName('Lift door header'),size=header.scale.clone(),position=header.position.clone();
 for(let step=0;step<=100;step++){setLiftOpening(lift,step/100);h.group.updateMatrixWorld(true);for(const leaf of lift.leaves){const b=leaf.userData.bodyBounds,width=leaf.scale.x;assert.ok(b.minX>=lift.x-1.240001&&b.maxX<=lift.x+1.240001);assert.ok(Math.abs(b.maxX-b.minX-width)<1e-8);assert.equal(leaf.visible,step<100);if(leaf.visible){const actual=new T.Box3().setFromObject(leaf);assert.ok(Math.abs(actual.min.x-b.minX)<1e-6);assert.ok(Math.abs(actual.max.x-b.maxX)<1e-6);}}}
 assert.deepEqual(header.scale,size);assert.deepEqual(header.position,position);setLiftOpening(lift,0);assert.ok(lift.leaves.every(l=>l.visible&&l.scale.x===1.24));
 }finally{disposeHospital(h,m);}}}finally{Object.values(m).forEach(v=>v.dispose());}
});

test('country relief panels touch the actual atrium walls instead of floating near the directory',()=>{
 const m=materials();try{for(const country of COUNTRIES){const layout=makeLayout(0,country.index),h=canvas(()=>buildHospital(layout,m,country));try{let count=0;const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),rotation=new T.Quaternion();
 for(const mesh of h.statics.filter(o=>o.isInstancedMesh))for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);if(Math.abs(scale.x-.06)>1e-5||Math.abs(scale.y-.75)>1e-5||Math.abs(scale.z-.30)>1e-5)continue;count++;const wall=layout.walls.find(w=>w.axis==='z'&&Math.abs(w.x-position.x)<.15&&Math.abs(w.z-position.z)<=1.5);assert.ok(wall);assert.ok(Math.abs(wall.x-position.x)<=.09+.03+.001);}
 assert.equal(count,4);
 }finally{disposeHospital(h,m);}}}finally{Object.values(m).forEach(v=>v.dispose());}
});

test('contact laughter caption is unsettling rather than a short nervous laugh',()=>{
 let caption;const e={floor:0,playerPos:{x:0,z:0},mission:{elapsed:10,random:()=>.5},audio:{laugh(){}},hooks:{soundCaption:t=>caption=t}},n={name:'Jamie Cole',id:'jamie',floor:0,pos:{x:1,z:0},person:{gender:'male'},recruit:{}};const incidents=new HospitalIncidents(e);assert.equal(incidents.playLaugh(n),true);assert.match(caption,/unsettling laugh/);assert.doesNotMatch(caption,/nervous/i);
});
