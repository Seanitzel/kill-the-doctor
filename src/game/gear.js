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
  const chain=new THREE.Mesh(new THREE.TorusGeometry(.068,.0035,8,32),gold);chain.rotation.x=Math.PI/2;chain.scale.y=.84;jewelry.add(chain);
  const earPositions=[new THREE.Vector3(-.083,.055,.005),new THREE.Vector3(.083,.055,.005)];
  if(visual.model&&visual.head){visual.root.updateWorldMatrix(true,true);const head=visual.head.getWorldPosition(new THREE.Vector3()),inverse=visual.head.getWorldQuaternion(new THREE.Quaternion()).invert(),points=[];visual.model.traverse(o=>{if(o.isSkinnedMesh&&/Skin/.test(o.material?.name||'')){const position=o.geometry.attributes.position;for(let i=0;i<position.count;i++){const v=o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld).sub(head).applyQuaternion(inverse);if(v.y>.025&&v.y<.14&&Math.abs(v.x)<.13)points.push(v);}}});for(const [i,side]of[-1,1].entries()){const edge=points.filter(p=>Math.sign(p.x)===side).sort((a,b)=>Math.abs(b.x)-Math.abs(a.x)).slice(0,20);if(edge.length){const x=side*Math.min(.105,Math.max(.065,Math.abs(edge[0].x)));earPositions[i].set(x,edge.reduce((n,p)=>n+p.y,0)/edge.length-.018,edge.reduce((n,p)=>n+p.z,0)/edge.length+.004);}}}
  for(const position of earPositions){const ring=new THREE.Mesh(new THREE.TorusGeometry(.011,.003,8,16),gold);ring.position.copy(position);earrings.add(ring);}
  const neck=visual.model?.getObjectByName('Neck'),neckPosition=new THREE.Vector3(),neckQuaternion=new THREE.Quaternion(),groupQuaternion=new THREE.Quaternion(),neckOffset=new THREE.Vector3(0,-.01,0);
  // Fit the collar to this rig's neck surface, then retain its offset in neck
  // space. Male and female neck joints have different depths and widths.
  if(neck&&visual.model){const center=visual.root.worldToLocal(neck.getWorldPosition(new THREE.Vector3())),bounds=new THREE.Box3();visual.model.traverse(o=>{if(o.isSkinnedMesh&&/Skin/.test(o.material?.name||'')){for(let i=0;i<o.geometry.attributes.position.count;i++){const v=visual.root.worldToLocal(o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld));if(Math.abs(v.y-(center.y-.01))<.008&&Math.abs(v.x-center.x)<.13)bounds.expandByPoint(v);}}});if(!bounds.isEmpty()){const fitted=bounds.getCenter(new THREE.Vector3());fitted.y=center.y-.01;neckOffset.copy(neck.worldToLocal(visual.root.localToWorld(fitted)));chain.scale.x=((bounds.max.x-bounds.min.x)/2+.007)/.068;chain.scale.y=((bounds.max.z-bounds.min.z)/2+.007)/.068;}}

  const headPosition=new THREE.Vector3(),headQuaternion=new THREE.Quaternion(),rootQuaternion=new THREE.Quaternion();let disposed=false;
  return {update(save){regular.visible=save.loadout?.maskType==='regular';n95.visible=!regular.visible;mask.visible=!!(save.upgrades?.mask||save.upgrades?.n95||save.upgrades?.regularMask)&&!!save.loadout?.mask;jewelry.visible=!!save.appearance?.necklace||(save.appearance?.necklace===undefined&&!!save.appearance?.jewelry);earrings.visible=!!save.appearance?.earrings||(save.appearance?.earrings===undefined&&!!save.appearance?.jewelry);visual.root.updateMatrixWorld(true);if(visual.head){const head=visual.head.getWorldPosition(headPosition);group.position.copy(visual.root.worldToLocal(head));visual.head.getWorldQuaternion(headQuaternion);visual.root.getWorldQuaternion(rootQuaternion);group.quaternion.copy(rootQuaternion.invert().multiply(headQuaternion));}else group.position.set(0,1.68,0);if(neck){group.updateWorldMatrix(true,true);neckPosition.copy(neckOffset);neck.localToWorld(neckPosition);jewelry.position.copy(group.worldToLocal(neckPosition));jewelry.quaternion.copy(group.getWorldQuaternion(groupQuaternion).invert().multiply(neck.getWorldQuaternion(neckQuaternion)));}else jewelry.position.set(0,-.12,0);},dispose(){if(disposed)return;disposed=true;disposeObjectResources(group);group.removeFromParent();}};
}
