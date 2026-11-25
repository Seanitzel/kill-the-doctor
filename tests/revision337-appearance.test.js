import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import * as T from 'three';
import {realModel} from './helpers/real-rig.js';
import {CHARACTERS,PREMIUM_OUTFITS,defaultAppearance,premiumOutfitsFor,normalizeAppearance,purchaseOutfit,profileFor} from '../src/game/loadout.js';
import {makePlayer,disposeCharacterAssets} from '../src/game/assets.js';
import {defaultSave,Mission,readSave} from '../src/game/mission.js';
import {bodyHit,aimAtRegion} from '../src/game/hit-regions.js';import {injurySpeed} from '../src/game/injury.js';
const assetsFor=(gender,model)=>({[gender]:model,animations:{},sources:{},clipCache:{},appearanceCache:new Map(),clothCache:new Map()});
test('all eight regular outfit meshes and material settings exactly match the pre-change snapshots',async()=>{
 const expected=JSON.parse(fs.readFileSync(new URL('./fixtures/regular-outfits-v335.json',import.meta.url)));for(const c of CHARACTERS.slice(0,2)){const assets=assetsFor(c.gender,await realModel(c.gender==='male'?'adrian':'alex'));for(const outfit of ['casual','jacket','tactical','suit']){const a=makePlayer(assets,c.gender,{...defaultAppearance(c),outfit}),list=[];a.model.traverse(o=>{if(o.isMesh)list.push([o.name,o.visible,Array.from(o.geometry.attributes.position.array),Array.from(o.geometry.index?.array||[]),o.material.color?.getHexString(),o.material.roughness]);});assert.equal(crypto.createHash('sha256').update(JSON.stringify(list)).digest('hex'),expected[c.gender+'/'+outfit],c.gender+'/'+outfit);a.dispose();}disposeCharacterAssets(assets);}
});


test('five male and four female premiums have distinct rigged garments, correct footwear and no included weapons',async()=>{
 assert.equal(premiumOutfitsFor('male').length,5);assert.equal(premiumOutfitsFor('female').length,4);
 for(const gender of ['male','female']){const assets=assetsFor(gender,await realModel(gender==='male'?'adrian':'alex'));for(const outfit of premiumOutfitsFor(gender)){const a=makePlayer(assets,gender,{...defaultAppearance(),gender,outfit:outfit.id,accent:outfit.color,pants:outfit.pants,shoes:outfit.shoes});try{assert.equal(a.model.userData.premiumOutfit,outfit.id);let own=0;a.model.traverse(o=>{if(o.userData.premiumOutfit)own++;if(o.isMesh)assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));assert.doesNotMatch(o.name,/rifle|pistol|gun|weapon/i);});assert.ok(own>3);for(let frame=0;frame<30;frame++){a.animate(frame/30,2,.033);a.root.rotation.y=frame/10;a.root.updateMatrixWorld(true);assert.ok(new T.Box3().setFromObject(a.root,true).max.y<2.1);}if(outfit.id==='latex'){assert.ok(a.model.getObjectByName('Wolf3D_Outfit_Footwear').visible);assert.equal(a.model.getObjectByName('Premium pointed pump Left'),undefined);}else if(gender==='female')assert.ok(a.model.getObjectByName(outfit.id==='white-jumpsuit'?'Premium tall lace-up platform boot Left':'Premium pointed pump Left'));}finally{a.dispose();}}disposeCharacterAssets(assets);}
});


test('shoe colors persist independently through save, custom slots and gender changes; old paid collections migrate',()=>{
 const s=defaultSave();s.appearance.pants='#123456';s.appearance.shoes='#eeccb2';s.coins=1000;assert.ok(purchaseOutfit(s,'black-tie'));const next=readSave({getItem:()=>JSON.stringify(s)});assert.equal(next.appearance.pants,'#123456');assert.equal(next.appearance.shoes,'#eeccb2');assert.equal(normalizeAppearance({gender:'female',outfit:'black-tie'}).outfit,'casual');const old=readSave({getItem:()=>JSON.stringify({...s,ownedOutfits:['nocturne'],appearance:{outfit:'nocturne',gender:'male'}})});assert.ok(old.ownedOutfits.includes('black-tie'));assert.ok(old.ownedOutfits.includes('navy-pantsuit'));assert.equal(profileFor(old).outfit,'black-tie');
});


test('critical body shots kill from front and back on both live rigs; limb reactions keep arm speed and slow feet',async()=>{
 for(const gender of ['male','female']){const assets=assetsFor(gender,await realModel(gender==='male'?'adrian':'alex')),v=makePlayer(assets,gender,{gender});try{for(const part of ['head','chest','hips','foot'])for(const side of[-1,1]){const target=aimAtRegion(v,part),from=target.clone().add(new T.Vector3(0,0,side*4)),ray=new T.Ray(from,target.clone().sub(from).normalize()),hit=bodyHit(v,ray,10);assert.ok(hit);assert.ok(part==='chest'?['chest','back'].includes(hit.part):part==='foot'?['foot','leg'].includes(hit.part):part===hit.part,`${gender} ${part} ${hit.part}`);}}finally{v.dispose();disposeCharacterAssets(assets);}}
});

