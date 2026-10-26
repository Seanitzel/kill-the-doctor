import * as T from 'three';
import {disposeObjectResources} from './resources.js';
// One reusable prop set and a fixed particle pool, retired with the player.
export class WaitBreak {
 constructor(visual){
  this.visual=visual;this.root=new T.Group();this.root.name='Phone and optional smoke break';visual.root.add(this.root);this.root.visible=false;
  this.phone=new T.Group();this.phone.name='Character phone';this.root.add(this.phone);
  const black=new T.MeshStandardMaterial({color:'#10171c',roughness:.35,metalness:.5}),screen=new T.MeshBasicMaterial({color:'#92c8df'});
  this.phone.add(new T.Mesh(new T.BoxGeometry(.075,.145,.013),black));const glass=new T.Mesh(new T.PlaneGeometry(.064,.122),screen);glass.position.z=.0075;this.phone.add(glass);
  this.cigarette=new T.Group();this.cigarette.name='Optional cigarette';this.root.add(this.cigarette);
  const paper=new T.Mesh(new T.CylinderGeometry(.004,.004,.075,6),new T.MeshStandardMaterial({color:'#e3dfd1'}));paper.rotation.x=Math.PI/2;this.cigarette.add(paper);
  const ember=new T.Mesh(new T.SphereGeometry(.0045,6,4),new T.MeshBasicMaterial({color:'#e99c54'}));ember.position.z=.038;this.cigarette.add(ember);
  this.smokeGeometry=new T.BufferGeometry();this.positions=new Float32Array(48*3);this.smokeGeometry.setAttribute('position',new T.BufferAttribute(this.positions,3));
  const pixels=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,alpha=Math.exp(-((x-31.5)**2+(y-31.5)**2)/140);pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(alpha*255);}const map=new T.DataTexture(pixels,64,64);map.needsUpdate=true;this.smoke=new T.Points(this.smokeGeometry,new T.PointsMaterial({map,color:'#c9d4df',size:.19,transparent:true,opacity:.13,depthWrite:false}));this.root.add(this.smoke);this.grip=new T.Vector3();this.disposed=false;
 }
 update(active,smoking,time){
  if(this.disposed)return;this.root.visible=active;if(!active)return;
  this.visual.poseActivity?.(smoking?'smoke-break':'phone',time);this.visual.root.updateMatrixWorld(true);
  const bone=this.visual.hand;if(bone){bone.getWorldPosition(this.grip);this.visual.root.worldToLocal(this.grip);}else this.grip.set(.25,1.24,.3);
  this.phone.position.copy(this.grip);this.phone.position.y+=.035;this.phone.position.z+=.025;this.phone.rotation.set(-.7,Math.PI,0);this.phone.visible=!smoking;
  this.cigarette.visible=this.smoke.visible=smoking;this.cigarette.position.copy(this.grip);this.cigarette.position.x-=.02;this.cigarette.position.y+=.01;this.cigarette.position.z+=.035;
  if(smoking){for(let i=0;i<48;i++){const age=(time*.32+i/48)%1;this.positions[i*3]=this.grip.x-.02+Math.sin(i*2.4+time*.6)*age*.17;this.positions[i*3+1]=this.grip.y+.04+age*.85;this.positions[i*3+2]=this.grip.z+.07+Math.sin(i+time*.3)*age*.1;}this.smokeGeometry.attributes.position.needsUpdate=true;this.smoke.geometry.computeBoundingSphere();}
 }
 dispose(){if(this.disposed)return;this.disposed=true;disposeObjectResources(this.root,{textures:true});this.root.removeFromParent();this.root.clear();}
}
