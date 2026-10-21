import * as THREE from 'three';
import {mesh} from './assets.js';

// Original pictograms drawn at sign resolution, with no font-icon dependency.
export function toiletPictogramSign(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#183d61';ctx.fillRect(0,0,512,384);
  ctx.fillStyle='#f0f6fa';
  const figure=(x,female)=>{
    if(ctx.arc){ctx.beginPath();ctx.arc(x,65,22,0,Math.PI*2);ctx.fill();}else ctx.fillRect(x-22,43,44,44);
    ctx.fillRect(x-24,99,48,80);
    for(const side of [-1,1]){ctx.fillRect(x+side*47-8,103,16,99);ctx.fillRect(x+side*15-9,192,18,75);}
    if(female)for(let row=0;row<40;row++){const half=24+row*.65;ctx.fillRect(x-half,148+row*1.5,half*2,2);}
    else ctx.fillRect(x-27,175,54,28);
  };
  figure(159,false);figure(353,true);ctx.fillRect(253,41,5,234);
  ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('TOILETS',256,330);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.16,roughness:.65});
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(.96,.72),material);panel.name='Toilet male and female pictograms';return panel;
}

export function addHangingToiletSign(group,batch,materials,door){
  const root=new THREE.Group();root.name='Hanging toilet wayfinding';root.position.set(door.x+1.9,3.08,door.z-1.15);root.rotation.y=Math.PI/2;
  const front=toiletPictogramSign();front.position.z=.026;root.add(front);
  const back=new THREE.Mesh(front.geometry,front.material);back.name='Toilet pictograms reverse face';back.rotation.y=Math.PI;back.position.z=-.026;root.add(back);
  mesh('box',materials.dark,[1.01,.77,.045],[0,0,0],root);
  // Suspension rods end inside the ceiling rather than appearing unsupported.
  for(const side of [-1,1])batch.box(materials.steel,root.position.x,3.53,root.position.z-side*.35,.018,.22,.018);
  group.add(root);return root;
}
