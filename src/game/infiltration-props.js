import*as T from'three';import{mesh,material}from'./assets.js';import{disposeObjectResources}from'./resources.js';
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
 const root=new T.Group();root.name='Stolen doctor identity: surgical cap, mask and camera';visual.root.add(root);const white=material('#c2dbe0'),dark=material('#152c36'),cap=mesh('sphere',white,[.18,.10,.17],[0,.115,0],root);cap.name='Surgical cap';const mask=mesh('box',white,[.23,.10,.055],[0,-.06,.14],root);mask.name='Surgical mask';
 const camera=mesh('box',dark,[.035,.035,.014],[0,-.42,.18],root);camera.name='Covert badge camera';let disposed=false;const pos=new T.Vector3();
 return{root,update(valid=true){if(disposed)return;mask.visible=valid;visual.root.updateMatrixWorld(true);if(visual.head){visual.head.getWorldPosition(pos);root.position.copy(visual.root.worldToLocal(pos));}else root.position.y=1.68;},dispose(){if(disposed)return;disposed=true;root.removeFromParent();disposeObjectResources(root);}};
}
