import {Scene} from 'three';
import {compileForStart} from './startup.js';

// Compile every material and the lighting configurations used by other floors
// while loading. This does not upload every hidden avatar's textures/buffers.
export async function prepareGameplayGraphics(engine,task){
 const warmup=new Scene(),visibility=engine.hospitals.map(h=>h.group.visible),target=engine.renderer.getRenderTarget(),seen=new Set();
 engine.scene.updateMatrixWorld(true);
 engine.scene.traverse(object=>{if(object.isMesh||object.isPoints||object.isLine||object.isSprite)warmup.add(object.clone(false));});
 try{
  if(engine.smoothing)engine.renderer.setRenderTarget(engine.smoothing.sceneTarget);
  for(let floor=0;floor<engine.hospitals.length;floor++){
   engine.hospitals.forEach((h,i)=>h.group.visible=i===floor);
   const lights=[];engine.scene.traverseVisible(o=>{if(o.isLight)lights.push(o.type+':'+!!o.castShadow);});const signature=lights.sort().join('|');
   if(seen.has(signature))continue;seen.add(signature);
   await task.stage('Preparing lights and floor changes',.90+seen.size*.01,'Keeping flashlight and lift controls responsive');
   await compileForStart(engine.renderer,warmup,engine.camera,task,engine.scene);
  }
 }finally{engine.hospitals.forEach((h,i)=>h.group.visible=visibility[i]);engine.renderer.setRenderTarget(target);warmup.clear();}
}
