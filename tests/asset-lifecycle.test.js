import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {makePlayer,makeHuman,renderPortrait,disposePortraitRenderer,disposeCharacterAssets,downsizeCharacterTextures,avatarDisposer} from '../src/game/assets.js';
import {disposeAppearanceCache} from '../src/game/appearance.js';

function fakeDocument(){
  return {createElement(){const canvas={width:0,height:0,lastImage:null};canvas.getContext=()=>({drawImage(image,...args){canvas.lastImage={image,args};},getImageData(){const data=new Uint8ClampedArray(canvas.width*canvas.height*4);for(let i=0;i<data.length;i+=4)data.set([110,90,65,255],i);return{data};},putImageData(image){canvas.output=image;},createImageData(width,height){return{data:new Uint8ClampedArray(width*height*4)};},fillRect(){},beginPath(){},arc(){},fill(){}});canvas.toDataURL=()=>`data:image/png;base64,${canvas.output?.data[0]??0}`;return canvas;}};
}
function withDocument(work){const before=globalThis.document;globalThis.document=fakeDocument();try{return work();}finally{if(before===undefined)delete globalThis.document;else globalThis.document=before;}}
function basicAssets(name='Wolf3D_Outfit_Top',size=1024){const scene=new THREE.Group(),geometry=new THREE.BoxGeometry(1,2,.3),material=new THREE.MeshStandardMaterial(),image={width:size,height:size,closed:0,close(){this.closed++;}};material.name=name;material.map=new THREE.Texture(image);scene.add(new THREE.Mesh(geometry,material));return{male:scene,female:null,animations:{},sources:{},clipCache:{},clothCache:new Map(),appearanceCache:new Map(),clothTextureLimit:256};}
function fakeRenderer(){const viewport=new THREE.Vector4(5,7,800,450),scissor=new THREE.Vector4(1,2,3,4);return{target:{name:'game target'},viewport,scissor,scissorTest:true,xr:{enabled:true},activeSkeletons:0,createdSkeletons:0,portraitTargets:new Set(),getRenderTarget(){return this.target;},getViewport(out){return out.copy(this.viewport);},getScissor(out){return out.copy(this.scissor);},getScissorTest(){return this.scissorTest;},setRenderTarget(target){this.target=target;if(target?.isWebGLRenderTarget)this.portraitTargets.add(target);},setViewport(...args){this.viewport.copy(args.length===1?args[0]:new THREE.Vector4(...args));},setScissor(value){this.scissor.copy(value);},setScissorTest(value){this.scissorTest=value;},clear(){},render(scene){this.lastScene=scene;scene.traverse(object=>{if(object.skeleton&&!object.skeleton.boneTexture){object.skeleton.computeBoneTexture();this.activeSkeletons++;this.createdSkeletons++;object.skeleton.boneTexture.addEventListener('dispose',()=>this.activeSkeletons--);}});if(this.fail)throw Error('render interrupted');},readRenderTargetPixels(target,x,y,width,height,pixels){for(let row=0;row<height;row++)pixels.fill(row,row*width*4,(row+1)*width*4);}};}
async function realModel(name){
  const bytes=fs.readFileSync(new URL(`../public/models/${name}.glb`,import.meta.url)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));delete json.images;delete json.textures;
  for(const material of json.materials){delete material.normalTexture;delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture;}
  let encoded=JSON.stringify(json);while(encoded.length%4)encoded+=' ';
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+encoded.length+bytes.length-20-length,8);header.writeUInt32LE(encoded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const packed=Buffer.concat([header,Buffer.from(encoded),bytes.subarray(20+length)]);
  return(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength),'')).scene;
}

test('avatar disposal is idempotent and keeps shared primitive geometry alive',()=>{
  const a=makeHuman({gender:'male'}),b=makeHuman({gender:'female'});let geometryDisposals=0,materialDisposals=0;const unique=new Set();a.root.traverse(o=>{if(o.isMesh){assert.equal(o.geometry.userData.sharedPrimitive,true);o.geometry.addEventListener('dispose',()=>geometryDisposals++);unique.add(o.material);}});for(const material of unique)material.addEventListener('dispose',()=>materialDisposals++);
  a.dispose();a.dispose();let stops=0,uncaches=0;const cleanup=avatarDisposer(new THREE.Group(),{model:a.root,mixer:{stopAllAction(){stops++;},uncacheRoot(model){assert.equal(model,a.root);uncaches++;}}});cleanup();cleanup();assert.equal(stops,1);assert.equal(uncaches,1);assert.equal(geometryDisposals,0);assert.equal(materialDisposals,unique.size);assert.ok(b.root.children.length);b.dispose();
});

test('clothing cache retains active wearers, caps idle entries and uses 256px canvases',()=>withDocument(()=>{
  const assets=basicAssets(),source=assets.male.children[0],avatars=[];let generatedDisposals=0,sourceDisposals=0;source.material.map.addEventListener('dispose',()=>sourceDisposals++);
  for(let i=0;i<40;i++){const avatar=makePlayer(assets,'male',{accent:`#${(i+1).toString(16).padStart(6,'0')}`});avatars.push(avatar);const entry=[...assets.clothCache.values()].at(-1);assert.equal(entry.texture.image.width,256);entry.texture.addEventListener('dispose',()=>generatedDisposals++);}
  assert.equal(assets.clothCache.size,40);assert.equal(generatedDisposals,0);
  for(const avatar of avatars)avatar.dispose();assert.equal(assets.clothCache.size,32);assert.equal(generatedDisposals,8);assert.equal(sourceDisposals,0);
  disposeCharacterAssets(assets);disposeCharacterAssets(assets);assert.equal(generatedDisposals,40);assert.equal(sourceDisposals,1);assert.equal(assets.clothCache.size,0);
}));

test('iris texture cache is asset scoped and never clears active wearers',()=>withDocument(()=>{
  const a=basicAssets('Wolf3D_Eye',128),b=basicAssets('Wolf3D_Eye',128),va=makePlayer(a,'male',{eyes:'#537b60'}),vb=makePlayer(b,'male',{eyes:'#537b60'});assert.equal(a.appearanceCache.size,1);assert.equal(b.appearanceCache.size,1);
  let disposedA=0,disposedB=0;[...a.appearanceCache.values()][0].texture.addEventListener('dispose',()=>disposedA++);[...b.appearanceCache.values()][0].texture.addEventListener('dispose',()=>disposedB++);
  disposeAppearanceCache(a.appearanceCache);assert.equal(disposedA,0);va.dispose();disposeCharacterAssets(a);assert.equal(disposedA,1);assert.equal(disposedB,0);vb.dispose();disposeCharacterAssets(b);assert.equal(disposedB,1);
}));

test('mobile texture downsize replaces all shared image uses before closing the source bitmap',()=>withDocument(()=>{
  const assets=basicAssets(),material=assets.male.children[0].material,source=material.map,image=source.image;material.normalMap=source.clone();let disposed=0;source.addEventListener('dispose',()=>disposed++);material.normalMap.addEventListener('dispose',()=>disposed++);
  const oldSource=source.source;downsizeCharacterTextures(assets,512);
  assert.equal(material.map.image.width,512);assert.equal(material.normalMap.image.width,512);assert.notEqual(material.map.source,oldSource);assert.equal(image.closed,1);assert.equal(disposed,2);assert.equal(source.image,image);
  downsizeCharacterTextures(assets,512);assert.equal(disposed,2);assert.equal(image.closed,1);disposeCharacterAssets(assets);
}));

test('real GLB avatars dispose every cloned skeleton and preserve template geometry/maps',async()=>{
  for(const name of ['adrian','alex']){const model=await realModel(name),assets={male:model,animations:{},sources:{},clipCache:{},clothCache:new Map(),appearanceCache:new Map()},originals=new Map();model.traverse(o=>{if(o.isMesh)originals.set(o.geometry,Array.from(o.geometry.attributes.position.array));});
    const avatar=makePlayer(assets,'male',{outfit:'tactical',hairstyle:'ponytail'}),renderer=fakeRenderer();renderer.render(avatar.root);const created=renderer.createdSkeletons;assert.equal(created,name==='adrian'?10:8);assert.equal(renderer.activeSkeletons,created);
    const matrices=new Set();avatar.model.traverse(o=>{if(o.skeleton)matrices.add(JSON.stringify(o.skeleton.boneInverses.map(m=>m.elements)));});assert.equal(matrices.size,created);
    avatar.dispose();avatar.dispose();assert.equal(renderer.activeSkeletons,0);for(const [geometry,values] of originals)assert.deepEqual(Array.from(geometry.attributes.position.array),values);disposeCharacterAssets(assets);
  }
});

test('repeated portraits reuse one target, restore renderer state and release all skeleton textures on success and failure',async()=>{
  const model=await realModel('adrian');withDocument(()=>{const assets={male:model,animations:{},sources:{},clipCache:{},clothCache:new Map(),appearanceCache:new Map()},renderer=fakeRenderer(),previous=renderer.target;let target;
    for(let i=0;i<20;i++){assert.match(renderPortrait(renderer,assets,{gender:'male'},'civilian'),/^data:image\/png;base64,255$/);assert.equal(renderer.target,previous);assert.deepEqual(renderer.viewport.toArray(),[5,7,800,450]);assert.deepEqual(renderer.scissor.toArray(),[1,2,3,4]);assert.equal(renderer.scissorTest,true);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.activeSkeletons,0);}
    assert.equal(renderer.portraitTargets.size,1);const originalSet=renderer.setRenderTarget;renderer.setRenderTarget=function(value){if(value?.isWebGLRenderTarget)target=value;originalSet.call(this,value);};renderer.fail=true;assert.throws(()=>renderPortrait(renderer,assets,{gender:'male'},'civilian'),/interrupted/);assert.equal(renderer.activeSkeletons,0);assert.equal(renderer.target,previous);let disposed=0;target.addEventListener('dispose',()=>disposed++);disposePortraitRenderer(renderer);disposePortraitRenderer(renderer);assert.equal(disposed,1);disposeCharacterAssets(assets);
  });
});
