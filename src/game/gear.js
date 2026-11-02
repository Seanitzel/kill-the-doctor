import * as THREE from 'three';
import {disposeObjectResources} from './resources.js';
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
  const group=new THREE.Group(),mask=new THREE.Group(),jewelry=new THREE.Group(),earrings=new THREE.Group();group.add(mask,jewelry,earrings);visual.root.add(group);
  const regular=new THREE.Group(),n95=new THREE.Group();regular.name='Regular fitted face mask';n95.name='Fitted N95 respirator';mask.add(regular,n95);
  const blue=material('#9bbbc8'),white=material('#dce2da');mesh('box',blue,[.145,.062,.018],[0,0,.006],regular);for(const y of [-.019,0,.019])mesh('box',material('#b4cbd3'),[.139,.002,.003],[0,y,.017],regular);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1,20,12,0,Math.PI),white);shell.scale.set(.074,.033,.030);shell.position.z=-.018;n95.add(shell);
  const straps=material('#d4dfdf');for(const x of [-.076,.076]){const loop=new THREE.Mesh(new THREE.TorusGeometry(.026,.0025,5,16),straps);loop.rotation.y=Math.PI/2;loop.position.set(x,0,-.063);mask.add(loop);}
  // Head joints sit near the neck, not at the mouth. Fit to the actual eyes and
  // face surface so the mask follows either avatar without covering the chest.
  mask.position.set(0,.035,.15);visual.root.updateMatrixWorld(true);
  if(visual.model&&visual.head){const face=new THREE.Box3(),eyes=new THREE.Box3();visual.model.traverse(o=>{if(o.isSkinnedMesh&&o.material?.name==='Wolf3D_Skin')face.expandByObject(o,true);if(o.isSkinnedMesh&&o.material?.name==='Wolf3D_Eye')eyes.expandByObject(o,true);});if(!face.isEmpty()&&!eyes.isEmpty()){const head=visual.head.getWorldPosition(new THREE.Vector3()),q=visual.head.getWorldQuaternion(new THREE.Quaternion()).invert();mask.position.set((face.min.x+face.max.x)/2,eyes.min.y-.045,face.max.z+.012).sub(head).applyQuaternion(q);mask.scale.x=(face.max.x-face.min.x)/.187;}}

  const gold=material('#9babb7',{metalness:.9,roughness:.22});
  const chain=new THREE.Mesh(new THREE.TorusGeometry(.13,.012,6,24),gold);chain.position.set(0,-.33,.03);chain.rotation.x=1.1;jewelry.add(chain);
  for(const x of [-.16,.16]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.023,.006,6,12),gold);ring.position.set(x,-.08,.015);earrings.add(ring);}
  const headPosition=new THREE.Vector3(),headQuaternion=new THREE.Quaternion(),rootQuaternion=new THREE.Quaternion();let disposed=false;
  return {update(save){regular.visible=save.loadout?.maskType==='regular';n95.visible=!regular.visible;mask.visible=!!(save.upgrades?.mask||save.upgrades?.n95||save.upgrades?.regularMask)&&!!save.loadout?.mask;jewelry.visible=!!save.appearance?.necklace||(save.appearance?.necklace===undefined&&!!save.appearance?.jewelry);earrings.visible=!!save.appearance?.earrings||(save.appearance?.earrings===undefined&&!!save.appearance?.jewelry);visual.root.updateMatrixWorld(true);if(visual.head){const head=visual.head.getWorldPosition(headPosition);group.position.copy(visual.root.worldToLocal(head));visual.head.getWorldQuaternion(headQuaternion);visual.root.getWorldQuaternion(rootQuaternion);group.quaternion.copy(rootQuaternion.invert().multiply(headQuaternion));}else group.position.set(0,1.68,0);},dispose(){if(disposed)return;disposed=true;disposeObjectResources(group);group.removeFromParent();}};
}
