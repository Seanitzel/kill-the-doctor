import {measureHead} from './head-fit.js';import*as T from'three';import{mesh,material}from'./assets.js';import{disposeObjectResources}from'./resources.js';
function instrumentLabel(letter){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;const c=canvas.getContext('2d');c.fillStyle='#21485f';c.fillRect(0,0,256,192);c.fillStyle='#eef7fd';c.textBaseline='middle';c.textAlign='center';c.font='bold 145px Arial';c.fillText(letter,128,104);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(.25,.19),new T.MeshBasicMaterial({map}));}
export function instrumentTray(parent,x,z){
 const root=new T.Group();root.name='Interactive equipment station';root.position.set(x,0,z);parent.add(root);root.userData.floor=3;
 const steel=material('#b2c4cc',{metalness:.7,roughness:.25}),dark=material('#2d4357'),blue=material('#73b5ce');
 mesh('box',steel,[2.8,.08,.8],[0,.94,0],root);for(const a of[-1.2,1.2])mesh('box',steel,[.05,.9,.05],[a,.46,0],root);
 const groups=[];for(let i=0;i<4;i++){const g=new T.Group();g.name=['Surgical forceps','Retractor','Portable monitor','Infusion pump'][i];g.position.set(-1.02+i*.68,1.02,0);root.add(g);groups.push(g);const label=instrumentLabel(String.fromCharCode(65+i));label.position.set(g.position.x,1.37,.25);root.add(label);}
 // Ring-handled forceps, a hooked retractor, a screen and a pump have distinct silhouettes.
 for(const a of[-.07,.07]){const arm=mesh('box',steel,[.025,.025,.30],[a,0,0],groups[0]);arm.rotation.y=a>0?-.2:.2;const ring=new T.Mesh(new T.TorusGeometry(.05,.01,6,16),steel);ring.rotation.x=Math.PI/2;ring.position.set(a,0,-.18);groups[0].add(ring);}
 mesh('box',steel,[.035,.025,.30],[0,0,0],groups[1]);mesh('box',steel,[.14,.025,.035],[.05,0,.16],groups[1]);mesh('box',steel,[.025,.11,.035],[.11,.045,.16],groups[1]);
 mesh('box',dark,[.36,.25,.09],[0,.13,0],groups[2]);mesh('box',blue,[.29,.18,.014],[0,.13,.052],groups[2]);for(let i=0;i<4;i++)mesh('box',steel,[.035,.018,.02],[-.1+i*.065,.04,.063],groups[2]);
 mesh('box',steel,[.25,.32,.16],[0,.16,0],groups[3]);mesh('box',blue,[.16,.10,.014],[0,.22,.087],groups[3]);mesh('cylinder',dark,[.055,.04,.055],[0,.08,.10],groups[3]);
 return root;
}
export function disguiseProps(visual){
 const fit=measureHead(visual.model),root=new T.Group();root.name='Stolen doctor identity: surgical cap and mask';(fit?.head||visual.root).add(root);
 const face=fit?.face||new T.Box3(new T.Vector3(-.09,0,-.07),new T.Vector3(.09,.22,.11)),eyes=fit?.eyes,cx=(face.min.x+face.max.x)/2,cz=(face.min.z+face.max.z)/2;
 const rx=(face.max.x-face.min.x)*.47,rz=(face.max.z-face.min.z)*.50,base=Math.max(face.max.y-.064,(eyes?.max.y||.12)+.032),white=material('#bdd2d7'),dark=material('#152c36');
 const dome=new T.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI/2);dome.scale(rx,.065,rz);dome.translate(cx,base,cz);const cap=new T.Mesh(dome,white);cap.name='Surgical cap';root.add(cap);
 const rim=new T.Mesh(new T.CylinderGeometry(rx,rx*.98,.012,28,1,true),white);rim.scale.z=rz/rx;rim.position.set(cx,base,cz);cap.add(rim); // rim coordinates stay in head space
 const width=(face.max.x-face.min.x)*.76,height=.064,geometry=new T.PlaneGeometry(width,height,10,16),positions=geometry.attributes.position,maskY=(eyes?.min.y||.12)-.048;
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i);positions.setXYZ(i,cx+x,maskY+y*(1-.13*(x/(width/2))**2),face.max.z-.045+.060*(1-(x/(width/2))**2)-.005*(y/(height/2))**2+.0015*Math.sin(y/height*Math.PI*12));}geometry.computeVertexNormals();
 const mask=new T.Mesh(geometry,material('#bfd4da',{side:T.DoubleSide,roughness:.96}));mask.name='Surgical mask';root.add(mask);
 const loops=new T.Group();mask.add(loops);for(const side of[-1,1]){const loop=new T.Mesh(new T.TorusGeometry(.025,.0016,5,16),white);loop.rotation.y=Math.PI/2;loop.position.set(cx+side*width*.53,maskY,face.max.z-.045);loops.add(loop);}
 const camera=new T.Mesh(new T.BoxGeometry(.025,.025,.009),dark);camera.name='Covert badge camera';const chest=visual.model?.getObjectByName('Spine2');if(chest){visual.model.updateWorldMatrix(true,true);const point=new T.Vector3(.065,1.39,.145);visual.model.localToWorld(point);chest.worldToLocal(point);camera.position.copy(point);chest.add(camera);}else{camera.position.set(.065,1.39,.145);visual.root.add(camera);}
 if(!fit)root.position.y=1.55;let disposed=false;
 return {root,update(valid=true){if(!disposed){mask.visible=valid;loops.visible=valid;}},dispose(){if(disposed)return;disposed=true;camera.removeFromParent();disposeObjectResources(camera);root.removeFromParent();disposeObjectResources(root);}};
}
