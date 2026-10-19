import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
let reflecting=false;
export function bathroomMirror(width=1.16,height=1.04){
  const coarse=typeof window!=='undefined'&&window.matchMedia?.('(pointer:coarse)').matches;
  const mirror=new Reflector(new THREE.PlaneGeometry(width,height),{color:0xb9c5c9,textureWidth:coarse?256:384,textureHeight:coarse?256:384,clipBias:.003,multisample:0});
  mirror.name='Working bathroom mirror';mirror.userData.reflection=true;
  const draw=mirror.onBeforeRender,position=new THREE.Vector3(),normal=new THREE.Vector3(),toward=new THREE.Vector3();let nextAt=0;
  mirror.onBeforeRender=function(renderer,scene,camera){
    if(reflecting||camera.userData.ktdReflection)return;
    mirror.getWorldPosition(position);normal.set(0,0,1).transformDirection(mirror.matrixWorld);toward.copy(camera.position).sub(position);
    const now=typeof performance!=='undefined'?performance.now():Date.now();if(toward.lengthSq()>81||normal.dot(toward)<=0||now<nextAt)return;
    nextAt=now+(coarse?125:80);reflecting=true;try{draw.call(mirror,renderer,scene,camera);}finally{reflecting=false;}
  };
  const dispose=mirror.dispose.bind(mirror);let disposed=false;mirror.dispose=()=>{if(disposed)return;disposed=true;mirror.geometry.dispose();dispose();};return mirror;
}
