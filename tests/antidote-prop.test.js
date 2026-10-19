import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeLayout,findPath,tileAt} from '../src/game/layout.js';
import {buildAntidoteCabinet} from '../src/game/antidote-prop.js';
import {disposeObjectResources} from '../src/game/resources.js';

test('upper-floor antidote cabinets mount on a solid hall wall clear of glass, doors and the lift approach',()=>{
  const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
  const materials=Object.fromEntries(['white','steel','glass'].map(key=>[key,new THREE.MeshStandardMaterial()]));
  try{
    assert.equal(buildAntidoteCabinet(makeLayout(3),materials),null);
    for(const floor of [0,1,2]){
      const layout=makeLayout(floor),snapshot=JSON.stringify(layout.walls),cabinet=buildAntidoteCabinet(layout,materials),{root,interaction,collider}=cabinet;root.updateMatrixWorld(true);
      assert.equal(JSON.stringify(layout.walls),snapshot);assert.deepEqual(root.userData.wallAnchor,{x:1.5,z:-15});assert.equal(root.position.z,-15.92);assert.equal(root.position.x,1.41);
      const wall=layout.walls.find(w=>w.x===1.5&&w.z===-15&&w.axis==='z');assert.ok(!wall.door&&Math.round(wall.x+wall.z)%4!==0);
      const bounds=new THREE.Box3().setFromObject(root);assert.ok(bounds.min.x>1.10&&bounds.max.x<=1.411);assert.ok(bounds.min.y>1.09&&bounds.max.y<2.16);assert.ok(bounds.min.z>=wall.z-1.5+.05&&bounds.max.z<=wall.z+1.5-.05);
      assert.ok(collider.minX<=bounds.min.x&&collider.maxX>=bounds.max.x);assert.ok(collider.minZ<=bounds.min.z&&collider.maxZ>=bounds.max.z);assert.ok(collider.minY<=bounds.min.y&&collider.maxY>=bounds.max.y);
      assert.equal(interaction.label,'Use contamination antidote');assert.equal(interaction.floor,floor);assert.ok(interaction.x+.48<collider.minX);assert.ok(root.position.distanceTo(new THREE.Vector3(layout.elevator.x,0,layout.elevator.z))>7);assert.ok(findPath(layout,tileAt(layout.elevator.x,layout.elevator.z),tileAt(interaction.x,interaction.z)).length>0);
      assert.ok(layout.doors.every(door=>Math.hypot(door.x-root.position.x,door.z-root.position.z)>2.5));
      let primitiveMeshes=0,triangles=0;const ownGeometries=new Set(),ownMaterials=new Set(),ownTextures=new Set();root.traverse(object=>{if(object.isMesh){assert.ok(object.matrixWorld.elements.every(Number.isFinite));if(object.geometry.userData.sharedPrimitive)primitiveMeshes++;else ownGeometries.add(object.geometry);triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);if(!Object.values(materials).includes(object.material))ownMaterials.add(object.material);}});
      assert.ok(primitiveMeshes>=6);assert.ok(triangles<4000,`cabinet triangle budget ${triangles}`);assert.equal(ownGeometries.size,1);assert.ok(root.getObjectByName('ANTIDOTE cabinet label'));assert.equal(cabinet.available,true);
      cabinet.setAvailable(false);assert.equal(cabinet.available,false);assert.equal(root.getObjectByName('Sealed antidote vials').visible,false);assert.equal(root.getObjectByName('Antidote availability light').material.emissiveIntensity,0);cabinet.setAvailable(true);assert.equal(root.getObjectByName('Sealed antidote vials').visible,true);
      for(const material of ownMaterials)for(const value of Object.values(material))if(value?.isTexture)ownTextures.add(value);assert.equal(ownTextures.size,1);
      let geometriesDisposed=0,texturesDisposed=0,materialsDisposed=0,instancesDisposed=0,instances=0,sharedDisposed=0;const shared=new Set(),onShared=()=>sharedDisposed++;
      for(const geometry of ownGeometries)geometry.addEventListener('dispose',()=>geometriesDisposed++);for(const texture of ownTextures)texture.addEventListener('dispose',()=>texturesDisposed++);for(const material of ownMaterials)material.addEventListener('dispose',()=>materialsDisposed++);
      root.traverse(object=>{if(object.geometry?.userData.sharedPrimitive)shared.add(object.geometry);if(object.isInstancedMesh){instances++;object.addEventListener('dispose',()=>instancesDisposed++);}});for(const geometry of shared)geometry.addEventListener('dispose',onShared);
      disposeObjectResources(root,{textures:true});assert.equal(geometriesDisposed,ownGeometries.size);assert.equal(texturesDisposed,ownTextures.size);assert.equal(materialsDisposed,ownMaterials.size);assert.equal(instancesDisposed,instances);assert.equal(sharedDisposed,0);for(const geometry of shared)geometry.removeEventListener('dispose',onShared);
    }
  }finally{for(const material of Object.values(materials))material.dispose();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
