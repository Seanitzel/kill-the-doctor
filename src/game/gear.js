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
  const rim=[[0,.044,-.012],[.047,.034,-.018],[.072,.006,-.025],[.055,-.036,-.016],[0,-.048,-.007],[-.055,-.036,-.016],[-.072,.006,-.025],[-.047,.034,-.018]],v=[0,-.004,.046],indices=[];for(const p of rim)v.push(...p);for(let i=0;i<rim.length;i++)indices.push(0,(i+1)%rim.length+1,i+1);const shellGeometry=new THREE.BufferGeometry();shellGeometry.setAttribute('position',new THREE.Float32BufferAttribute(v,3));shellGeometry.setIndex(indices);shellGeometry.computeVertexNormals();const shell=new THREE.Mesh(shellGeometry,white);shell.name='Folded respirator face cup';n95.add(shell);
  const valve=mesh('cylinder',material('#d8ded9'),[.019,.009,.019],[.016,-.013,.045],n95);valve.name='Respirator exhalation valve';valve.rotation.x=Math.PI/2;const grille=mesh('cylinder',material('#c4cdc8'),[.012,.003,.012],[.016,-.013,.051],n95);grille.rotation.x=Math.PI/2;
  const noseClip=mesh('box',material('#a7b0ab',{metalness:.6}),[.052,.004,.003],[0,.032,.006],n95);

  // Head joints sit near the neck, not at the mouth. Fit to the actual eyes and
  // face surface so the mask follows either avatar without covering the chest.
  mask.position.set(0,.035,.15);visual.root.updateMatrixWorld(true);
  if(visual.model&&visual.head){const face=new THREE.Box3(),eyes=new THREE.Box3();visual.model.traverse(o=>{if(o.isSkinnedMesh&&o.material?.name==='Wolf3D_Skin')face.expandByObject(o,true);if(o.isSkinnedMesh&&o.material?.name==='Wolf3D_Eye')eyes.expandByObject(o,true);});if(!face.isEmpty()&&!eyes.isEmpty()){const head=visual.head.getWorldPosition(new THREE.Vector3()),q=visual.head.getWorldQuaternion(new THREE.Quaternion()).invert();mask.position.set((face.min.x+face.max.x)/2,eyes.min.y-.045,face.max.z+.012).sub(head).applyQuaternion(q);mask.scale.x=(face.max.x-face.min.x)/.187;}}

  // Seal the cup perimeter to this rig's cheek/nose surface. Bounds alone use
  // the nose tip for every vertex, leaving the sides floating off the cheeks.
  if(visual.model&&visual.head){
    const skin=[];visual.model.traverse(o=>{if(o.isSkinnedMesh&&o.material?.name==='Wolf3D_Skin')for(let i=0;i<o.geometry.attributes.position.count;i++){const p=visual.head.worldToLocal(o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld));if(p.z>0)skin.push(p);}});
    const surface=(x,y)=>{const nearest=skin.map(p=>({p,d:(p.x-x)**2+(p.y-y)**2})).sort((a,b)=>a.d-b.d).slice(0,4);return nearest.length?Math.max(...nearest.map(n=>n.p.z))+.007-mask.position.z:-.02;};
    // A curved, subdivided cup clears the convex cheek between seal vertices;
    // one flat triangle from nose to jaw can cut through the intervening face.
    const positions=[0,-.004,.046],faces=[],segments=32,rings=6;
    for(let r=1;r<=rings;r++)for(let i=0;i<segments;i++){const u=i/segments*rim.length,j=Math.floor(u),t=u-j,a=rim[j],b=rim[(j+1)%rim.length],f=r/rings,x=THREE.MathUtils.lerp(a[0],b[0],t)*f,y=THREE.MathUtils.lerp(-.004,THREE.MathUtils.lerp(a[1],b[1],t),f),edge=surface(mask.position.x+x*mask.scale.x,mask.position.y+y),z=Math.max(THREE.MathUtils.lerp(.046,edge,f*f),surface(mask.position.x+x*mask.scale.x,mask.position.y+y));positions.push(x,y,z);}
    for(let i=0;i<segments;i++)faces.push(0,1+(i+1)%segments,1+i);
    for(let r=0;r<rings-1;r++)for(let i=0;i<segments;i++){const a=1+r*segments+i,b=1+r*segments+(i+1)%segments,c=a+segments,d=b+segments;faces.push(a,b,c,b,d,c);}
    shellGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));shellGeometry.setIndex(faces);shellGeometry.deleteAttribute('normal');shellGeometry.computeVertexNormals();const bridge=positions.filter((_,i)=>i%3===2&&Math.abs(positions[i-2])<.027&&Math.abs(positions[i-1]-.032)<.009);noseClip.position.z=Math.max(...bridge,.006)+.002;
    for(let i=0;i<rim.length;i++)rim[i][2]=surface(mask.position.x+rim[i][0]*mask.scale.x,mask.position.y+rim[i][1]);
  }
  const straps=material('#d4dfdf');for(const side of [-1,1]){const z=rim[side>0?2:6][2];const points=[new THREE.Vector3(side*.066,.023,z),new THREE.Vector3(side*.085,.024,-.105),new THREE.Vector3(side*.088,-.012,-.13),new THREE.Vector3(side*.082,-.036,-.105),new THREE.Vector3(side*.058,-.029,z)];const loop=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.0018,5,false),straps);loop.name='Fitted elastic ear strap';mask.add(loop);}

  const gold=material('#9babb7',{metalness:.9,roughness:.22});
  const chain=new THREE.Mesh(new THREE.TorusGeometry(.068,.0035,8,32),gold);chain.rotation.x=Math.PI/2;chain.scale.y=.84;jewelry.add(chain);
  const earPositions=[new THREE.Vector3(-.083,.055,.005),new THREE.Vector3(.083,.055,.005)];
  if(visual.model&&visual.head){visual.root.updateWorldMatrix(true,true);const head=visual.head.getWorldPosition(new THREE.Vector3()),inverse=visual.head.getWorldQuaternion(new THREE.Quaternion()).invert(),points=[];visual.model.traverse(o=>{if(o.isSkinnedMesh&&/Skin/.test(o.material?.name||'')){const position=o.geometry.attributes.position;for(let i=0;i<position.count;i++){const v=o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld).sub(head).applyQuaternion(inverse);if(v.y>.025&&v.y<.14&&Math.abs(v.x)<.13)points.push(v);}}});for(const [i,side]of[-1,1].entries()){const edge=points.filter(p=>Math.sign(p.x)===side).sort((a,b)=>Math.abs(b.x)-Math.abs(a.x)).slice(0,20);if(edge.length){const x=side*Math.min(.105,Math.max(.065,Math.abs(edge[0].x)));earPositions[i].set(x,edge.reduce((n,p)=>n+p.y,0)/edge.length-.018,edge.reduce((n,p)=>n+p.z,0)/edge.length+.004);}}}
  for(const position of earPositions){const ring=new THREE.Mesh(new THREE.TorusGeometry(.011,.003,8,16),gold);ring.position.copy(position);earrings.add(ring);}
  const neck=visual.model?.getObjectByName('Neck'),neckPosition=new THREE.Vector3(),neckQuaternion=new THREE.Quaternion(),groupQuaternion=new THREE.Quaternion(),neckOffset=new THREE.Vector3(0,-.01,0);
  // Fit the collar to this rig's neck surface, then retain its offset in neck
  // space. Male and female neck joints have different depths and widths.
  if(neck&&visual.model){const center=visual.root.worldToLocal(neck.getWorldPosition(new THREE.Vector3())),bounds=new THREE.Box3();visual.model.traverse(o=>{if(o.isSkinnedMesh&&/Skin/.test(o.material?.name||'')){for(let i=0;i<o.geometry.attributes.position.count;i++){const v=visual.root.worldToLocal(o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld));if(Math.abs(v.y-(center.y-.01))<.008&&Math.abs(v.x-center.x)<.13)bounds.expandByPoint(v);}}});if(!bounds.isEmpty()){const fitted=bounds.getCenter(new THREE.Vector3());fitted.y=center.y-.01;neckOffset.copy(neck.worldToLocal(visual.root.localToWorld(fitted)));chain.scale.x=((bounds.max.x-bounds.min.x)/2+.007)/.068;chain.scale.y=((bounds.max.z-bounds.min.z)/2+.007)/.068;}}

  const torch=new THREE.Group();torch.name='Held physical flashlight';visual.root.add(torch);torch.visible=false;
  const dark=material('#202c35',{metalness:.6,roughness:.35}),metal=material('#6e7d87',{metalness:.8,roughness:.25});
  const body=mesh('cylinder',dark,[.026,.18,.026],[0,0,.025],torch);body.rotation.x=Math.PI/2;
  const bezel=mesh('cylinder',metal,[.042,.045,.034],[0,0,.125],torch);bezel.rotation.x=Math.PI/2;
  const lens=mesh('cylinder',material('#d5eff4',{emissive:'#a8d9e8',emissiveIntensity:.5,roughness:.08}),[.035,.008,.035],[0,0,.15],torch);lens.rotation.x=Math.PI/2;
  const leftHand=visual.model?.getObjectByName('LeftHand'),footGroups=[];let torchSelected=false;
  for(const side of ['Left','Right']){const bone=visual.model?.getObjectByName(side+'Foot');if(!bone)continue;const g=new THREE.Group();g.name='Upgraded lightweight footwear '+side;visual.root.add(g);const sole=mesh('box',dark,[.145,.045,.28],[0,-.065,.055],g);for(let i=0;i<5;i++)mesh('box',metal,[.148,.013,.018],[0,-.044,-.04+i*.045],g);mesh('box',material('#b8c8c5'),[.10,.018,.018],[0,-.012,-.060],g);g.visible=false;footGroups.push({g,bone});}
  const torchGrip=new THREE.Vector3(),localPoint=new THREE.Vector3(),localQ=new THREE.Quaternion(),rootQ=new THREE.Quaternion();
  function follow(object,bone){visual.root.updateWorldMatrix(true,true);object.position.copy(visual.root.worldToLocal(bone.getWorldPosition(localPoint)));object.quaternion.copy(visual.root.getWorldQuaternion(rootQ).invert().multiply(bone.getWorldQuaternion(localQ)));}
  const headPosition=new THREE.Vector3(),headQuaternion=new THREE.Quaternion(),rootQuaternion=new THREE.Quaternion();let disposed=false;
  return {torch,torchGrip,setFlashlight(value){torchSelected=!!value;torch.visible=torchSelected;},update(save){torch.visible=torchSelected;if(torchSelected&&leftHand){follow(torch,leftHand);const first=visual.model?.getObjectByName('LeftHandMiddle1'),tip=visual.model?.getObjectByName('LeftHandMiddle3'),index=visual.model?.getObjectByName('LeftHandIndex1'),ring=visual.model?.getObjectByName('LeftHandRing1');if(first&&tip&&index&&ring){torchGrip.copy(first.getWorldPosition(new THREE.Vector3())).add(tip.getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);const forward=index.getWorldPosition(new THREE.Vector3()).sub(ring.getWorldPosition(new THREE.Vector3())).normalize(),facing=new THREE.Vector3(0,0,1).applyQuaternion(visual.root.getWorldQuaternion(rootQ));if(forward.dot(facing)<0)forward.negate();torch.position.copy(visual.root.worldToLocal(torchGrip.clone().addScaledVector(forward,-.025)));torch.quaternion.copy(visual.root.getWorldQuaternion(rootQ).invert().multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),forward)));}}for(const {g,bone}of footGroups){g.visible=!!save.upgrades?.shoes;if(g.visible)follow(g,bone);}regular.visible=save.loadout?.maskType==='regular';n95.visible=!regular.visible;mask.visible=!!(save.upgrades?.mask||save.upgrades?.n95||save.upgrades?.regularMask)&&!!save.loadout?.mask;jewelry.visible=!!save.appearance?.necklace||(save.appearance?.necklace===undefined&&!!save.appearance?.jewelry);earrings.visible=!!save.appearance?.earrings||(save.appearance?.earrings===undefined&&!!save.appearance?.jewelry);visual.root.updateMatrixWorld(true);if(visual.head){const head=visual.head.getWorldPosition(headPosition);group.position.copy(visual.root.worldToLocal(head));visual.head.getWorldQuaternion(headQuaternion);visual.root.getWorldQuaternion(rootQuaternion);group.quaternion.copy(rootQuaternion.invert().multiply(headQuaternion));}else group.position.set(0,1.68,0);if(neck){group.updateWorldMatrix(true,true);neckPosition.copy(neckOffset);neck.localToWorld(neckPosition);jewelry.position.copy(group.worldToLocal(neckPosition));jewelry.quaternion.copy(group.getWorldQuaternion(groupQuaternion).invert().multiply(neck.getWorldQuaternion(neckQuaternion)));}else jewelry.position.set(0,-.12,0);},dispose(){if(disposed)return;disposed=true;for(const o of [group,torch,...footGroups.map(f=>f.g)]){disposeObjectResources(o);o.removeFromParent();}}};
}
