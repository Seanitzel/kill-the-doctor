import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';import{FBXLoader}from'three/addons/loaders/FBXLoader.js';
import {realModel} from './helpers/real-rig.js';import{makePlayer,disposeCharacterAssets}from'../src/game/assets.js';import{HospitalIncidents}from'../src/game/incidents.js';import{makeLayout}from'../src/game/layout.js';import{buildHospital}from'../src/game/hospital.js';import{COUNTRIES}from'../src/game/international.js';import{disposeHospital}from'../src/game/hospital-disposal.js';

test('the spare pistol is handed over once, only after acceptance and while together in private',()=>{
 const layout=makeLayout(0),room=layout.rooms.find(r=>r.kind==='bathroom'),root=new T.Group(),n={id:'contact',name:'Jamie Cole',floor:0,pos:new T.Vector3(room.center.x,0,room.center.z),recruit:{state:'escort'},visual:{root},path:[],cursor:0};let sound=0,opened;
 const e={floor:0,playerPos:n.pos.clone(),levels:[layout],npcs:[n],mission:{random:()=>.8,elapsed:0},hooks:{contact:v=>opened=v},audio:{sound:()=>sound++},notify(){}};const incidents=new HospitalIncidents(e);incidents.contact=n;
 assert.equal(incidents.choose('handover'),false);assert.equal(incidents.choose('recruit'),true);assert.equal(n.recruit.state,'accepted');assert.equal(n.recruit.weapon,undefined);assert.equal(incidents.hud().label,'Hand over your spare pistol');assert.equal(incidents.prompt(n),'Hand over spare pistol');incidents.interact(n);assert.equal(opened.stage,'accepted');
 e.playerPos.set(0,0,30);assert.equal(incidents.choose('handover'),false);assert.equal(n.recruit.weapon,undefined);
 e.playerPos.copy(n.pos);const other={id:'other',floor:0,pos:n.pos.clone()};e.npcs.push(other);assert.equal(incidents.choose('handover'),false);e.npcs.pop();assert.equal(incidents.choose('handover'),true);const weapon=n.recruit.weapon;
 assert.equal(n.recruit.state,'recruited');assert.equal(weapon.visible,false);assert.equal(weapon.parent,root);assert.equal(sound,1);assert.equal(incidents.choose('handover'),false);assert.equal(n.recruit.weapon,weapon);assert.equal(root.children.length,1);weapon.traverse(o=>o.material?.dispose());
});

test('separate quantized meshes preserve hand surfaces across bind spaces when a bare template is unavailable',async()=>{
 const animations={},sources={};for(const name of ['Idle','Walk','Run']){const bytes=fs.readFileSync(new URL(`../public/models/${name.toLowerCase()}.fbx`,import.meta.url));sources[name]=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');animations[name]=sources[name].animations[0];}
 for(const [file,gender]of[['alex','female']]){
 const assets={[gender]:await realModel(file),animations,sources,clipCache:{},clothCache:new Map(),appearanceCache:new Map()};
 for(const role of ['doctor','nurse','patient']){const avatar=makePlayer(assets,gender,{gender,skin:'#835033'},role),parts={Left:[],Right:[]};
 avatar.model.traverse(mesh=>{if(!mesh.isSkinnedMesh||!/Wolf3D_Body|Wolf3D_Outfit_Top/.test(mesh.material?.name||''))return;
 const geometry=mesh.userData.originalTopGeometry||mesh.geometry,skin=geometry.attributes.skinIndex,weight=geometry.attributes.skinWeight;
 const hand={Left:[],Right:[]};for(let i=0;i<skin.count;i++){hand.Left[i]=hand.Right[i]=0;for(let j=0;j<4;j++){const name=mesh.skeleton.bones[skin.getComponent(i,j)].name,w=weight.getComponent(i,j);if(name.startsWith('LeftHand'))hand.Left[i]+=w;if(name.startsWith('RightHand'))hand.Right[i]+=w;}}
 // Remaining body indices omit extracted faces. Use the unmodified template.
 let template;assets[gender].traverse(o=>{if(o.isSkinnedMesh&&o.name===mesh.name)template=o;});const indices=template.geometry.index?.array||Array.from({length:skin.count},(_,i)=>i),selected={Left:[],Right:[]};
 for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2],side=hand.Left[a]+hand.Left[b]+hand.Left[c]>.15?'Left':hand.Right[a]+hand.Right[b]+hand.Right[c]>.15?'Right':null;if(side)selected[side].push(a,b,c);}
 for(const side of ['Left','Right'])if(selected[side].length)parts[side].push({mesh,geometry,indices:selected[side]});
 });
 try{avatar.root.rotation.y=.7;avatar.root.position.set(3,0,-2);let maximumError=0;
 for(const [speed,activity]of[[0,null],[2.5,null],[5.4,null],[0,'chat'],[0,'examine'],[0,'panic'],[0,'headTap'],[0,'reaction']])for(let frame=0;frame<8;frame++){
 avatar.animate(frame/12,speed,1/12,{running:speed>4});if(activity)avatar.poseActivity(activity,frame/12,{reaction:activity==='reaction'?1:0});avatar.root.updateMatrixWorld(true);
 for(const side of ['Left','Right']){const hand=avatar.model.getObjectByName('KTD complete hand '+side);assert.equal(hand.geometry.attributes.skinIndex.array.constructor,Uint16Array);let cursor=0;
 for(const {mesh,geometry,indices}of parts[side]){const current=mesh.geometry;mesh.geometry=geometry;try{for(const index of indices){const expected=mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld),actual=hand.getVertexPosition(hand.geometry.index?hand.geometry.index.getX(cursor++):cursor++,new T.Vector3()).applyMatrix4(hand.matrixWorld);maximumError=Math.max(maximumError,expected.distanceTo(actual));}}finally{mesh.geometry=current;}}
 assert.equal(cursor,hand.geometry.index?.count||hand.geometry.attributes.position.count);}
 }
 assert.ok(maximumError<.00001,`${gender}/${role} hand distortion ${maximumError}m`);
 const owned=[];avatar.model.traverse(o=>{if(o.userData.appearanceOwned||o.userData.appearanceGeometryOwned)owned.push(o.geometry);});const counts=new Map();for(const g of new Set(owned)){counts.set(g,0);g.addEventListener('dispose',()=>counts.set(g,counts.get(g)+1));}avatar.dispose();avatar.dispose();assert.ok([...counts.values()].every(n=>n===1));
 }finally{avatar.dispose();}}
 disposeCharacterAssets(assets);
 }
});

test('all country hospitals keep room names clear of trim, omit bathroom numbers and have one two-sided suspended toilet sign',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};const materials=Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(k=>[k,new T.MeshBasicMaterial()]));
 try{for(const country of COUNTRIES)for(let floor=0;floor<4;floor++){const layout=makeLayout(floor,country.index),h=buildHospital(layout,materials,country);try{
 const labels=h.group.children.filter(o=>o.name==='Department door label');assert.equal(labels.length,layout.doors.length);for(const label of labels)assert.ok(label.position.y-label.geometry.parameters.height/2>2.67);
 const bath=layout.rooms.find(r=>r.kind==='bathroom'),hanging=h.group.getObjectByName('Hanging toilet wayfinding');if(bath){assert.equal(bath.number,null);assert.equal(labels.find(s=>s.userData.room===bath.id).userData.title,'BATHROOM');assert.ok(hanging);const front=hanging.getObjectByName('Toilet male and female pictograms'),back=hanging.getObjectByName('Toilet pictograms reverse face');assert.ok(front&&back);assert.equal(back.material,front.material);assert.equal(front.material.map.image.width,512);assert.equal(back.rotation.y,Math.PI);const hygiene=h.group.getObjectByName('Bathroom hygiene sign');assert.equal(hygiene.rotation.y,-Math.PI/2);assert.ok(hygiene.position.x>4);assert.ok(Math.abs(hygiene.position.z)<.01);
 let disposals=0;front.material.map.addEventListener('dispose',()=>disposals++);disposeHospital(h,materials);assert.equal(disposals,1);
 }else assert.equal(hanging,undefined);
 if(floor<3)assert.equal(h.group.userData.architecture.ribs,0);
 }finally{if(h.group.children.length)disposeHospital(h,materials);}}}finally{globalThis.document=previous;Object.values(materials).forEach(m=>m.dispose());}
});

test('production avatars use compact bare hands fitted to both skeletons, without outfit cuffs or distorted fingers',async()=>{
 const assets={male:await realModel('adrian'),female:await realModel('alex'),animations:{},sources:{},clipCache:{},clothCache:new Map(),appearanceCache:new Map()};
 for(const name of ['Idle','Walk','Run']){const bytes=fs.readFileSync(new URL(`../public/models/${name.toLowerCase()}.fbx`,import.meta.url));assets.sources[name]=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');assets.animations[name]=assets.sources[name].animations[0];}
 try{for(const gender of ['male','female'])for(const role of ['doctor','nurse','patient','civilian']){const v=makePlayer(assets,gender,{gender,skin:'#835033'},role);try{
 for(const side of ['Left','Right']){const hand=v.model.getObjectByName('KTD complete hand '+side);assert.equal(hand.userData.bareHand,true);assert.ok(hand.geometry.index);assert.ok(hand.geometry.attributes.position.count<650);assert.ok(hand.geometry.attributes.position.count>100);const weights=hand.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-6);}
 let maximum=0;const p=new T.Vector3(),q=new T.Vector3();
 for(const [speed,activity]of[[0,null],[2.5,null],[5.4,null],[0,'chat'],[0,'examine'],[0,'headTap']])for(let frame=0;frame<10;frame++){
 v.animate(frame/15,speed,1/15,{running:speed>4});if(activity)v.poseActivity(activity,frame/15);v.root.updateMatrixWorld(true);
 for(const side of ['Left','Right']){const hand=v.model.getObjectByName('KTD complete hand '+side),pairs=[[side+'ForeArm',side+'Hand']];
 for(const finger of ['Thumb','Index','Middle','Ring','Pinky']){pairs.push([side+'Hand',side+'Hand'+finger+'1']);for(let i=1;i<4;i++)pairs.push([side+'Hand'+finger+i,side+'Hand'+finger+(i+1)]);}
 const segments=pairs.map(([a,b])=>new T.Line3(v.model.getObjectByName(a).getWorldPosition(new T.Vector3()),v.model.getObjectByName(b).getWorldPosition(new T.Vector3())));
 for(let i=0;i<hand.geometry.attributes.position.count;i++){hand.getVertexPosition(i,p).applyMatrix4(hand.matrixWorld);const distance=Math.min(...segments.map(s=>s.closestPointToPoint(p,true,q).distanceTo(p)));maximum=Math.max(maximum,distance);}
 }
 }
 assert.ok(maximum<.075,`${gender}/${role} surface ${maximum}m from hand skeleton`);
 const hands=['Left','Right'].map(side=>v.model.getObjectByName('KTD complete hand '+side));let disposed=0;for(const h of hands)h.geometry.addEventListener('dispose',()=>disposed++);v.dispose();v.dispose();assert.equal(disposed,2);
 }finally{v.dispose();}}}finally{disposeCharacterAssets(assets);}
});
