import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
let reflecting=false;
// Match the camera framebuffer's aspect ratio without allocating full Retina
// targets for every bathroom. Targets begin tiny and grow only when viewed.
export function mirrorRenderSize(width,height,coarse=false){
  const limit=coarse?1536:2048,scale=Math.min(1,limit/Math.max(width||1,height||1));
  return {width:Math.max(64,Math.round((width||1)*scale)),height:Math.max(64,Math.round((height||1)*scale))};
}
export function bathroomMirror(width=1.16,height=1.04){
  const coarse=typeof window!=='undefined'&&window.matchMedia?.('(pointer:coarse)').matches;
  const shader={...Reflector.ReflectorShader,fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('blendOverlay( base.rgb, color )','base.rgb * 0.98')};
  const mirror=new Reflector(new THREE.PlaneGeometry(width,height),{shader,textureWidth:64,textureHeight:64,clipBias:.003,multisample:4});
  mirror.name='Working bathroom mirror';mirror.userData.reflection=true;mirror.camera.userData.ktdReflection=true;
  const draw=mirror.onBeforeRender,position=new THREE.Vector3(),normal=new THREE.Vector3(),toward=new THREE.Vector3(),buffer=new THREE.Vector2();let nextAt=0,disposed=false;
  mirror.onBeforeRender=function(renderer,scene,camera){
    if(disposed||reflecting||camera.userData.ktdReflection)return;
    mirror.getWorldPosition(position);normal.set(0,0,1).transformDirection(mirror.matrixWorld);camera.getWorldPosition(toward);toward.sub(position);
    const now=typeof performance!=='undefined'?performance.now():Date.now();if(toward.lengthSq()>81||normal.dot(toward)<=0||now<nextAt)return;
    renderer.getDrawingBufferSize(buffer);const size=mirrorRenderSize(buffer.x,buffer.y,coarse),target=mirror.getRenderTarget();
    if(target.width!==size.width||target.height!==size.height)target.setSize(size.width,size.height);
    nextAt=now+(toward.lengthSq()<25?1000/30:80);reflecting=true;try{draw.call(mirror,renderer,scene,camera);}finally{reflecting=false;}
  };
  const dispose=mirror.dispose.bind(mirror);mirror.dispose=()=>{if(disposed)return;disposed=true;mirror.geometry.dispose();dispose();};return mirror;
}

const mirrorPosition=new THREE.Vector3();
// Returning to a room reallocates its reflection lazily; unused floors do not
// retain large multisampled targets on phones after visiting every bathroom.
export function trimMirrorMemory(hospitals=[],floor=0,player){
 for(let i=0;i<hospitals.length;i++)for(const bath of hospitals[i]?.bathrooms||[])for(const mirror of bath.mirrors||[]){const target=mirror.getRenderTarget();if(target.width<=64&&target.height<=64)continue;mirror.getWorldPosition(mirrorPosition);if(i!==floor||player&&(mirrorPosition.x-player.x)**2+(mirrorPosition.z-player.z)**2>100)target.setSize(64,64);}
}
