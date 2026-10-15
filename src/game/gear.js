import * as THREE from 'three';
import {mesh,material} from './assets.js';
export function weaponModel(kind){
  const g=new THREE.Group(),dark=material('#25313c',{metalness:.5}),black=material('#15212a');
  if(kind==='sniper'){
    mesh('box',dark,[.09,.12,.62],[0,0,.17],g);mesh('box',black,[.1,.16,.28],[0,-.03,-.24],g);mesh('box',black,[.07,.17,.1],[0,-.12,-.03],g);
    const barrel=mesh('cylinder',dark,[.023,.65,.023],[0,.02,.75],g);barrel.rotation.x=Math.PI/2;
    const scope=mesh('cylinder',black,[.055,.28,.055],[0,.14,.11],g);scope.rotation.x=Math.PI/2;
    mesh('sphere',material('#56849c',{metalness:.6}),[.04,.04,.012],[0,.14,.255],g);
  }else{mesh('box',dark,[.075,.11,.32],[0,0,.1],g);mesh('box',black,[.07,.17,.1],[0,-.1,0],g);}
  return g;
}
export function playerAccessories(visual){
  const group=new THREE.Group(),mask=new THREE.Group(),jewelry=new THREE.Group();group.add(mask,jewelry);visual.root.add(group);
  mesh('box',material('#9bbbc8'),[.23,.105,.07],[0,-.065,.15],mask);
  const gold=material('#9babb7',{metalness:.9,roughness:.22});
  const chain=new THREE.Mesh(new THREE.TorusGeometry(.13,.012,6,24),gold);chain.position.set(0,-.33,.03);chain.rotation.x=1.1;jewelry.add(chain);
  for(const x of [-.16,.16]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.023,.006,6,12),gold);ring.position.set(x,-.08,.015);jewelry.add(ring);}
  return {update(save){mask.visible=!!save.upgrades?.mask&&!!save.loadout?.mask;jewelry.visible=!!save.appearance?.jewelry;visual.root.updateMatrixWorld(true);if(visual.head){const head=visual.head.getWorldPosition(new THREE.Vector3());group.position.copy(visual.root.worldToLocal(head));}else group.position.set(0,1.68,0);},dispose(){group.traverse(o=>{if(o.isMesh){if(o.geometry.type==='TorusGeometry')o.geometry.dispose();o.material.dispose();}});group.removeFromParent();}};
}
