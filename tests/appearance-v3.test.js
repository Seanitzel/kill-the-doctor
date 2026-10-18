import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {STRUCTURE_CLEARANCE} from '../src/game/collision.js';
import {makePlayer,makeHuman,disposeCharacterAssets} from '../src/game/assets.js';
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
      assert.ok(avatar.model.getObjectByName('KTD suit tie'));assert.ok(avatar.model.getObjectByName('KTD sport cap'));assert.ok(avatar.model.getObjectByName('KTD wristwatch'));assert.equal(avatar.model.getObjectByName('KTD crossbody purse').parent.name,'Hips');assert.ok(avatar.model.getObjectByName('KTD botanical neck tattoo'));
      if(gender==='female')assert.ok(avatar.model.getObjectByName('KTD optical frames'));
      const owned=new Set();let disposed=0,extraTriangles=0;avatar.model.traverse(object=>{if(object.userData.appearanceOwned||object.userData.appearanceGeometryOwned){owned.add(object.geometry);object.geometry.addEventListener('dispose',()=>disposed++);if(object.userData.appearanceOwned)extraTriangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;}if(object.isMesh)for(const value of object.geometry.attributes.position.array)assert.ok(Number.isFinite(value));});assert.ok(extraTriangles<12000,`${hairstyle} geometry budget ${extraTriangles}`);
      avatar.poseActivity('worried',.5);avatar.poseActivity('panic',.8);avatar.root.updateMatrixWorld(true);const posed=new THREE.Box3().setFromObject(avatar.root);assert.ok(Number.isFinite(posed.max.z));avatar.dispose();avatar.dispose();assert.equal(disposed,owned.size);
      for(const [geometry,values] of originals)assert.deepEqual(Array.from(geometry.attributes.position.array),values);
    }
    disposeCharacterAssets(assets);
  }
});
function worldPoints(mesh){mesh.updateWorldMatrix(true,false);const points=[];for(let i=0;i<mesh.geometry.attributes.position.count;i++){const point=new THREE.Vector3();mesh.getVertexPosition(i,point);points.push(point.applyMatrix4(mesh.matrixWorld));}return points;}
function rigAssets(model,gender){return{[gender]:model,animations:{},sources:{},clipCache:{},clothCache:new Map(),appearanceCache:new Map()};}
test('glasses sit at the measured eye height and just in front of each real rig',async()=>{
  for(const [file,gender] of [['adrian','male'],['alex','female']]){const assets=rigAssets(await realModel(file),gender),avatar=makePlayer(assets,gender,{glasses:true});avatar.root.updateMatrixWorld(true);const eyePoints=[];avatar.model.traverse(object=>{if(object.material?.name==='Wolf3D_Eye')eyePoints.push(...worldPoints(object));});const eyes=new THREE.Box3().setFromPoints(eyePoints),lenses=avatar.model.getObjectByName('KTD optical lenses'),lensBox=new THREE.Box3().setFromObject(lenses);assert.ok(Math.abs(lensBox.getCenter(new THREE.Vector3()).y-eyes.getCenter(new THREE.Vector3()).y)<.004);assert.ok(lensBox.min.z-eyes.max.z>.004&&lensBox.min.z-eyes.max.z<.025);assert.equal(lenses.parent.name,'Head');const original=avatar.model.getObjectByName('Wolf3D_Glasses');if(original)assert.equal(original.visible,false);avatar.dispose();disposeCharacterAssets(assets);}
});
test('tattoos use actual skinned surface triangles, contain visible alpha artwork and release their maps exactly once',async()=>{
  for(const [file,gender] of [['adrian','male'],['alex','female']]){const assets=rigAssets(await realModel(file),gender),avatar=makePlayer(assets,gender,{tattoos:'botanical'});avatar.root.updateMatrixWorld(true);const decal=avatar.model.getObjectByName('KTD botanical neck tattoo');assert.ok(decal?.isSkinnedMesh);let skin;avatar.model.traverse(object=>{if(object.material?.name==='Wolf3D_Skin')skin=object;});assert.equal(decal.skeleton,skin.skeleton);assert.ok(decal.geometry.index.count>0);assert.deepEqual(Array.from(decal.geometry.attributes.position.array),Array.from(skin.geometry.attributes.position.array));const source=worldPoints(skin),actual=worldPoints(decal);for(const index of decal.geometry.index.array)assert.ok(actual[index].distanceTo(source[index])<1e-7);
    const texture=decal.material.map;assert.equal(texture.image.width,128);const alpha=Array.from(texture.image.data).filter((_,i)=>i%4===3),coverage=alpha.filter(value=>value>20).length/alpha.length;assert.ok(coverage>.02&&coverage<.4);let disposals=0;texture.addEventListener('dispose',()=>disposals++);avatar.dispose();avatar.dispose();assert.equal(disposals,1);disposeCharacterAssets(assets);}
});
test('straight and loose curled silhouettes are continuous drapes distinct from the round Afro; pony front leaves clear forehead',async()=>{
  for(const [file,gender] of [['adrian','male'],['alex','female']]){const assets=rigAssets(await realModel(file),gender),bounds={};let straight,curls;for(const hairstyle of ['straight','curls-short','curls-long','afro','ponytail-front']){const avatar=makePlayer(assets,gender,{hairstyle});avatar.root.updateMatrixWorld(true);if(hairstyle==='ponytail-front'){const scalp=avatar.model.getObjectByName('KTD swept ponytail base hair');assert.ok(scalp);const original=[];avatar.model.traverse(object=>{if(object.material?.name==='Wolf3D_Hair')original.push(object);});assert.ok(original.every(mesh=>mesh.visible===false));const eyes=[];avatar.model.traverse(object=>{if(object.material?.name==='Wolf3D_Eye')eyes.push(...worldPoints(object));});const eyeBox=new THREE.Box3().setFromPoints(eyes),front=worldPoints(scalp).filter(point=>Math.abs(point.x)<.025&&point.z>eyeBox.max.z);assert.ok(front.length);assert.ok(Math.min(...front.map(point=>point.y))>eyeBox.max.y+.018);}else{const hair=avatar.model.getObjectByName(`KTD ${hairstyle} hair`);bounds[hairstyle]=new THREE.Box3().setFromObject(hair);if(hairstyle==='straight')straight=Array.from(hair.geometry.attributes.position.array);if(hairstyle==='curls-long')curls=Array.from(hair.geometry.attributes.position.array);}avatar.dispose();}assert.ok(bounds['curls-short'].min.y-bounds['curls-long'].min.y>.12);assert.ok(bounds.afro.max.y-bounds.straight.max.y>.035);assert.equal(straight.length,curls.length);assert.notDeepEqual(straight,curls);disposeCharacterAssets(assets);}
});
test('hair hi-lights follow hair color in the studio and eye color ends the palette list; cap stays a compatible boolean',()=>{
  const component=fs.readFileSync(new URL('../src/CharacterStudio.vue',import.meta.url),'utf8');const palette=component.match(/const palettes=\[(.*?)\];/s)[1];assert.ok(palette.indexOf("id:'hair'")<palette.indexOf("id:'eyes'"));assert.ok(palette.trim().endsWith("colors:EYE_COLORS}"));assert.match(component,/v-if="row.id==='hair'"[^]*?HAIR HI-LIGHTS/);assert.match(component,/{id:'cap',name:'Cap'}/);assert.match(palette,/id:'skin'[^}]+},\{id:'eyes'/);assert.doesNotMatch(component,/Baseball cap/);const save=defaultSave();save.appearance.cap=true;assert.equal(readSave(storageFor(save)).appearance.cap,true);
});
test('side-part ponytail descends from a rear tie behind the head and its strand texture has bounded ownership',async()=>{
  const assets=rigAssets(await realModel('alex'),'female');let fiber;
  for(let revision=0;revision<8;revision++){const avatar=makePlayer(assets,'female',{hairstyle:'ponytail-front'});avatar.root.updateMatrixWorld(true);const tail=avatar.model.getObjectByName('KTD tied ponytail'),points=worldPoints(tail),centers=[];for(let segment=0;segment<=28;segment++){const center=new THREE.Vector3();for(let ring=0;ring<16;ring++)center.add(points[segment*17+ring]);centers.push(center.multiplyScalar(1/16));}for(let i=1;i<centers.length;i++)assert.ok(centers[i].y<centers[i-1].y-.0005);assert.ok(Math.abs(centers[0].x)<.005);let skin;avatar.model.traverse(object=>{if(object.material?.name==='Wolf3D_Skin')skin=object;});const headBox=new THREE.Box3().setFromPoints(worldPoints(skin));assert.ok(centers.every(center=>center.z<headBox.min.z-.005));const texture=tail.material.bumpMap;assert.ok(texture?.isDataTexture);assert.ok(tail.geometry.attributes.uv);if(fiber)assert.equal(texture,fiber);fiber=texture;avatar.dispose();assert.equal(assets.appearanceCache.size,1);assert.equal([...assets.appearanceCache.values()][0].users,0);}
  let disposed=0;fiber.addEventListener('dispose',()=>disposed++);disposeCharacterAssets(assets);assert.equal(disposed,1);
});
test('black sport caps and black sunglasses fit both rigs independently of clothing color without stacked eyewear',async()=>{
  for(const [file,gender] of [['adrian','male'],['alex','female']]){const assets=rigAssets(await realModel(file),gender);for(const accent of ['#df789d','#3f657b']){const avatar=makePlayer(assets,gender,{accent,cap:true,glasses:true,sunglasses:true});avatar.root.updateMatrixWorld(true);const cap=avatar.model.getObjectByName('KTD sport cap'),frames=avatar.model.getObjectByName('KTD sunglasses frames'),lenses=avatar.model.getObjectByName('KTD sunglasses lenses');assert.ok(cap&&frames&&lenses);assert.equal(cap.material.color.getHexString(),'0b0f15');assert.equal(lenses.material.color.getHexString(),'080c13');assert.equal(lenses.material.transparent,false);assert.equal(lenses.parent.name,'Head');assert.equal(avatar.model.getObjectByName('KTD optical frames'),undefined);assert.ok(new THREE.Box3().setFromObject(cap).max.z<.4);avatar.dispose();}const optical=makePlayer(assets,gender,{glasses:true,sunglasses:false});assert.ok(optical.model.getObjectByName('KTD optical frames'));assert.equal(optical.model.getObjectByName('KTD sunglasses frames'),undefined);optical.dispose();disposeCharacterAssets(assets);}
});
test('nurses have matching light blue scrub fabric and a named chest badge that follows the actual torso bone',async()=>{
  const previous=globalThis.document,labels=[];globalThis.document={createElement(){const canvas={width:0,height:0};canvas.getContext=()=>({drawImage(){},getImageData(){const data=new Uint8ClampedArray(canvas.width*canvas.height*4);data.fill(255);return{data};},putImageData(image){canvas.pixels=image.data;},fillRect(){},fillText(text){labels.push(text);},beginPath(){},arc(){},fill(){}});return canvas;}};
  try{for(const [file,gender,name]of [['adrian','male','Nurse Owen Finch'],['alex','female','Nurse Amara Reed']]){const model=await realModel(file),assets=rigAssets(model,gender);model.traverse(mesh=>{if(mesh.material?.name.includes('Outfit_Top')||mesh.material?.name.includes('Outfit_Bottom'))mesh.material.map=new THREE.Texture({width:8,height:8});});const avatar=makePlayer(assets,gender,{gender,name,accent:'#803e49'},'nurse');avatar.root.updateMatrixWorld(true);let top,bottom;avatar.model.traverse(mesh=>{if(mesh.material?.name==='Wolf3D_Outfit_Top')top=mesh;if(mesh.material?.name==='Wolf3D_Outfit_Bottom')bottom=mesh;});assert.equal(top.material.map,null);assert.equal(bottom.material.map,null);assert.equal(top.material.color.getHexString(),'8bbbd8');assert.equal(bottom.material.color.getHexString(),'8bbbd8');assert.ok(top.userData.scrubUniform);const badge=avatar.model.getObjectByName('KTD nurse name badge');assert.equal(badge.parent.name,'Spine2');assert.equal(badge.userData.staffName,name);assert.equal(badge.userData.staffRole,'NURSE');assert.ok(labels.includes(name.replace(/^Nurse /,'')));assert.ok(labels.includes('NURSE'));assert.equal(avatar.root.children.length,1);const bounds=new THREE.Box3().setFromObject(badge);assert.ok(bounds.getSize(new THREE.Vector3()).x<.13);assert.ok(bounds.max.z<.23);let disposed=0;badge.material.map.addEventListener('dispose',()=>disposed++);avatar.dispose();avatar.dispose();assert.equal(disposed,1);disposeCharacterAssets(assets);}}
  finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('fallback nurse uniforms and name badges retain their own disposable resources',()=>{
  const nurse=makeHuman({name:'Nurse Amara Reed',gender:'female',accent:'#803e49'},'nurse'),badge=nurse.body.getObjectByName('KTD nurse name badge');assert.ok(badge);assert.equal(badge.userData.staffName,'Nurse Amara Reed');assert.equal(nurse.body.children[0].material.color.getHexString(),'9bcce6');let disposed=0;badge.material.map.addEventListener('dispose',()=>disposed++);nurse.dispose();nurse.dispose();assert.equal(disposed,1);
});
test('nurse-to-civilian previews leave source bones unchanged and never place a staff badge on protagonists',async()=>{
  for(const [file,gender] of [['adrian','male'],['alex','female']]){const source=await realModel(file),assets=rigAssets(source,gender),nurse=makePlayer(assets,gender,{name:'Nurse Amara Reed'},'nurse');assert.ok(nurse.model.getObjectByName('KTD nurse name badge'));nurse.dispose();let sourceBadge=false;source.traverse(object=>{if(/badge/i.test(object.name))sourceBadge=true;});assert.equal(sourceBadge,false);
    const civilian=makePlayer(assets,gender,{name:'Your character',cap:true,sunglasses:true},'civilian');assert.deepEqual(civilian.root.children,[civilian.model]);let civilianBadge=false;civilian.model.traverse(object=>{if(/badge/i.test(object.name))civilianBadge=true;});assert.equal(civilianBadge,false);civilian.dispose();disposeCharacterAssets(assets);
  }
});

test('Actual idle and walking hands stay within the shared wall and door clearance after spawn prewarming',async()=>{
  const sources={},animations={};for(const name of ['Idle','Walk']){const bytes=fs.readFileSync(new URL(`../public/models/${name.toLowerCase()}.fbx`,import.meta.url));sources[name]=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');animations[name]=sources[name].animations[0];}
  for(const [file,gender] of [['adrian','male'],['alex','female']]){
    const assets={...rigAssets(await realModel(file),gender),sources,animations},avatar=makePlayer(assets,gender,{gender},'civilian'),meshes=[];avatar.model.traverse(object=>{if(object.isSkinnedMesh)meshes.push(object);});
    try{
      avatar.animate(0,0,.35);let maximum=0;const point=new THREE.Vector3();
      for(const speed of [0,2.5])for(let frame=0;frame<72;frame++){
        avatar.animate(frame/24,speed,1/24);avatar.root.updateMatrixWorld(true);
        for(const mesh of meshes)for(let index=0;index<mesh.geometry.attributes.position.count;index++){
          mesh.getVertexPosition(index,point);point.applyMatrix4(mesh.matrixWorld);if(point.y<.75||point.y>1.65)continue;
          maximum=Math.max(maximum,Math.hypot(point.x,point.z));
        }
      }
      for(const activity of ['chat','panic','worried','examine','reaction']){avatar.animate(0,0,.35);for(let frame=0;frame<24;frame++){
        avatar.animate(frame/24,0,1/24);avatar.poseActivity(activity,frame/24,{reaction:activity==='reaction'?1:0,restricted:true});avatar.root.updateMatrixWorld(true);
        for(const mesh of meshes)for(let index=0;index<mesh.geometry.attributes.position.count;index++){mesh.getVertexPosition(index,point);point.applyMatrix4(mesh.matrixWorld);if(point.y>=.75&&point.y<=1.65)maximum=Math.max(maximum,Math.hypot(point.x,point.z));}
      }}
      assert.ok(maximum<STRUCTURE_CLEARANCE,`${gender} animated arm envelope ${maximum} exceeds structural clearance ${STRUCTURE_CLEARANCE}`);
    }finally{avatar.dispose();disposeCharacterAssets(assets);}
  }
});
