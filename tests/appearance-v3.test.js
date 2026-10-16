import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {makePlayer,disposeCharacterAssets} from '../src/game/assets.js';
import {CHARACTERS,SKIN_COLORS,HAIR_COLORS,HAIRSTYLE_CHOICES,defaultAppearance,normalizeAppearance,profileFor,selectCharacter} from '../src/game/loadout.js';
import {defaultSave,readSave,SAVE_KEY} from '../src/game/mission.js';
async function realModel(name){
  const bytes=fs.readFileSync(new URL(`../public/models/${name}.glb`,import.meta.url)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));delete json.images;delete json.textures;
  for(const material of json.materials){delete material.normalTexture;delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture;}
  let encoded=JSON.stringify(json);while(encoded.length%4)encoded+=' ';
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+encoded.length+bytes.length-20-length,8);header.writeUInt32LE(encoded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const packed=Buffer.concat([header,Buffer.from(encoded),bytes.subarray(20+length)]);
  return(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength),'')).scene;
}

const storageFor=value=>({getItem:key=>key===SAVE_KEY?JSON.stringify(value):null});
test('only Adrian, Alex and the customizable avatar are selectable, with inclusive skin and hair palettes',()=>{
  assert.deepEqual(CHARACTERS.map(character=>character.id),['male','female','custom']);const save=defaultSave();assert.equal(selectCharacter(save,'river'),false);assert.equal(selectCharacter(save,'custom'),true);assert.equal(save.coins,0);
  assert.ok(SKIN_COLORS.includes('#271c18'));assert.ok(HAIR_COLORS.includes('#df789d'));assert.equal(HAIRSTYLE_CHOICES.length,11);
});
test('legacy paid and free identities migrate to custom without losing progression or their appearance',()=>{
  for(const [id,gender,name] of [['river','male','River'],['iman','female','Iman'],['noah','male','Noah'],['samira','female','Samira']]){
    const old={...defaultSave(),coins:781,completed:4,attempts:9,character:id,unlockedCharacters:['male','female',id],appearance:{hair:'#afaba4',accent:'#803e49',skin:'#3e281f',jewelry:true},upgrades:{mask:1,sniper:1},activeAssignment:{round:5,storyId:'trial-without-consent',seed:42,attempt:9,introSeen:true}};
    const save=readSave(storageFor(old));assert.equal(save.character,'custom');assert.equal(profileFor(save).gender,gender);assert.equal(profileFor(save).name,name);assert.equal(save.appearance.skin,'#3e281f');assert.equal(save.appearance.jewelry,true);assert.equal(save.coins,781);assert.equal(save.completed,4);assert.equal(save.upgrades.sniper,1);assert.equal(save.activeAssignment.seed,42);
  }
});
test('custom looks survive preset switching and all new options survive save reload',()=>{
  const save=defaultSave();selectCharacter(save,'custom');Object.assign(save.appearance,{name:'Mika',gender:'female',hairstyle:'curls-long',outfit:'suit',hair:'#df789d',highlights:'#ece3d2',tattoos:'botanical',glasses:true,cap:true,watch:true,purse:true});
  selectCharacter(save,'male');assert.equal(profileFor(save).gender,'male');selectCharacter(save,'custom');assert.equal(profileFor(save).gender,'female');assert.equal(save.appearance.name,'Mika');
  const loaded=readSave(storageFor(save));for(const key of ['gender','hairstyle','outfit','highlights','tattoos','glasses','cap','watch','purse'])assert.equal(loaded.appearance[key],save.appearance[key]);
  assert.equal(normalizeAppearance(null).hairstyle,'original');assert.equal(normalizeAppearance({hairstyle:'broken',highlights:'bad',watch:'yes'}).watch,false);
});
test('every hair silhouette, suit and accessory stays fitted on both real animated rigs and cleans up owned resources',async()=>{
  for(const [file,gender] of [['adrian','male'],['alex','female']]){
    const source=await realModel(file),assets={[gender]:source,animations:{},sources:{},clipCache:{},clothCache:new Map(),appearanceCache:new Map()},originals=new Map();source.traverse(object=>{if(object.isMesh)originals.set(object.geometry,Array.from(object.geometry.attributes.position.array));});
    for(const {id:hairstyle} of HAIRSTYLE_CHOICES){const profile={...defaultAppearance(CHARACTERS.find(c=>c.gender===gender)),gender,hairstyle,outfit:'suit',hair:'#df789d',highlights:'#ece3d2',tattoos:'botanical',glasses:true,cap:true,watch:true,purse:true,refined:true};
      const avatar=makePlayer(assets,gender,profile);avatar.root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(avatar.root);assert.ok(box.min.y>-.04&&box.max.y<2.06,`${gender}/${hairstyle} height ${box.min.y}..${box.max.y}`);assert.ok(box.min.z>-.4&&box.max.z<.4);
      assert.ok(avatar.model.getObjectByName('KTD suit tie'));assert.ok(avatar.model.getObjectByName('KTD baseball cap'));assert.ok(avatar.model.getObjectByName('KTD wristwatch'));assert.equal(avatar.model.getObjectByName('KTD crossbody purse').parent.name,'Hips');assert.ok(avatar.model.getObjectByName('KTD botanical neck tattoo'));
      if(gender==='female')assert.ok(avatar.model.getObjectByName('KTD optical frames'));
      const owned=new Set();let disposed=0,extraTriangles=0;avatar.model.traverse(object=>{if(object.userData.appearanceOwned||object.userData.appearanceGeometryOwned){owned.add(object.geometry);object.geometry.addEventListener('dispose',()=>disposed++);if(object.userData.appearanceOwned)extraTriangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;}if(object.isMesh)for(const value of object.geometry.attributes.position.array)assert.ok(Number.isFinite(value));});assert.ok(extraTriangles<12000,`${hairstyle} geometry budget ${extraTriangles}`);
      avatar.poseActivity('worried',.5);avatar.poseActivity('panic',.8);avatar.root.updateMatrixWorld(true);const posed=new THREE.Box3().setFromObject(avatar.root);assert.ok(Number.isFinite(posed.max.z));avatar.dispose();avatar.dispose();assert.equal(disposed,owned.size);
      for(const [geometry,values] of originals)assert.deepEqual(Array.from(geometry.attributes.position.array),values);
    }
    disposeCharacterAssets(assets);
  }
});
