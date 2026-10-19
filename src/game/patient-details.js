import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import {disposeObjectResources} from './resources.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const cloth=color=>new THREE.MeshStandardMaterial({color,roughness:.88,side:THREE.DoubleSide});
function fitted(model,bone,geometry,mat,name){geometry.applyMatrix4(bone.matrixWorld.clone().invert().multiply(model.matrixWorld));const mesh=new THREE.Mesh(geometry,mat);mesh.name=name;mesh.userData.appearanceOwned=true;mesh.frustumCulled=false;bone.add(mesh);return mesh;}
export function attachPatientDetails(visual,{injury=null}={}){
  const model=visual.model;if(!model)return false;model.updateWorldMatrix(true,true);
  const wristPieces=[],headPieces=[],labels=[];const remember=(pieces,geometry,color,name)=>{const c=new THREE.Color(color),values=[];for(let i=0;i<geometry.attributes.position.count;i++)values.push(c.r,c.g,c.b);geometry.setAttribute('color',new THREE.Float32BufferAttribute(values,3));pieces.push(geometry);labels.push(name);};
  const fore=model.getObjectByName('LeftForeArm'),hand=model.getObjectByName('LeftHand'),head=model.getObjectByName('Head');if(!fore||!hand)return false;
  const point=b=>model.worldToLocal(b.getWorldPosition(new THREE.Vector3())),w=point(hand),f=point(fore),direction=w.clone().sub(f).normalize(),center=w.clone().addScaledVector(direction,-.016);
  const band=new THREE.CylinderGeometry(.031,.031,.026,14,1,true);band.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction));band.translate(...center.toArray());remember(wristPieces,band,'#f0ede4','Patient ID wristband');
  const tapeCenter=center.clone().addScaledVector(direction,-.025);tapeCenter.z+=.035;
  const tape=new THREE.BoxGeometry(.049,.041,.003);tape.translate(...tapeCenter.toArray());remember(wristPieces,tape,'#e5d9be','IV cannula plaster');
  const hub=new THREE.CylinderGeometry(.009,.009,.013,10);hub.rotateX(Math.PI/2);hub.translate(tapeCenter.x,tapeCenter.y,tapeCenter.z+.009);remember(wristPieces,hub,'#72a2d4','Blue IV access cap');
  const stain=new THREE.SphereGeometry(.006,8,6);stain.scale(1,.7,.12);stain.translate(tapeCenter.x+.013,tapeCenter.y-.007,tapeCenter.z+.002);remember(wristPieces,stain,'#a5695b','Tiny blood spot under plaster');
  for(let i=0;i<4;i++){const mark=new THREE.BoxGeometry(.004,.013,.002);mark.translate(center.x-.009+i*.006,center.y,center.z+.032);remember(wristPieces,mark,'#344552','Wristband ID mark');}
  if(injury&&head){const h=point(head),front=h.z+.090,y=h.y+(injury==='head'?.155:.073),g=new THREE.SphereGeometry(injury==='head'?.023:.009,10,8);g.scale(injury==='head'?1.4:.7,1,.10);g.translate(h.x+(injury==='head'?.047:0),y,front);remember(headPieces,g,'#98534e',injury==='head'?'Minor forehead abrasion':'Minor nosebleed');if(injury==='head'){const plaster=new THREE.BoxGeometry(.055,.017,.002);plaster.translate(h.x+.047,y+.02,front+.004);remember(headPieces,plaster,'#e4d9c5','Small forehead dressing');}}
  const mat=cloth('#ffffff');mat.vertexColors=true;for(const [pieces,bone,name]of [[wristPieces,fore,'Patient wrist detail assembly'],[headPieces,head,'Patient minor injury detail']])if(pieces.length){const merged=mergeGeometries(pieces,false);fitted(model,bone,merged,mat,name);for(const geometry of pieces)geometry.dispose();}for(const name of labels){const marker=new THREE.Object3D();marker.name=name;model.add(marker);}
  return true;
}
export class PatientDetails{
  constructor(e){this.e=e;this.injured=[];this.spitters=[];this.nextSpit=30;this.clock=0;this.drops=[];this.particles=[];this.root=new THREE.Group();this.root.name='bounded-patient-details';e.scene.add(this.root);
    const patients=e.npcs.filter(n=>n.role==='patient'&&!n.baby&&!n.recruit);for(const [i,n] of patients.entries()){const injury=!n.lying&&i%13===2?'nose':i%19===7?'head':null;attachPatientDetails(n.visual,{injury});if(injury)this.injured.push({n,next:0});if(!n.lying&&!n.blind&&i%11===3)this.spitters.push(n);}
    this.dropMesh=new THREE.InstancedMesh(new THREE.CircleGeometry(.018,8),new THREE.MeshBasicMaterial({color:'#894b49',transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}),48);this.dropMesh.name='Small fading blood drops';this.dropMesh.frustumCulled=false;this.root.add(this.dropMesh);this.matrix=new THREE.Matrix4();this.rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));this.hideDrops();
    this.spitGeometry=new THREE.BufferGeometry();this.spitGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(18),3));this.spitMesh=new THREE.Points(this.spitGeometry,new THREE.PointsMaterial({size:.025,color:'#d6e3d9',transparent:true,opacity:.65,depthWrite:false}));this.spitMesh.frustumCulled=false;this.spitMesh.visible=false;this.root.add(this.spitMesh);
  }
  hideDrops(){for(let i=0;i<48;i++)this.dropMesh.setMatrixAt(i,new THREE.Matrix4().makeScale(0,0,0));this.dropMesh.instanceMatrix.needsUpdate=true;}
  update(dt){const e=this.e,now=e.mission.elapsed;this.clock+=dt;if(this.clock>.25){this.clock=0;for(const item of this.injured){const n=item.n;if(n.dead||n.evacuated||n.floor!==e.floor||!n.visual.root.visible||distance(n.pos,e.playerPos)>12||now<item.next)continue;item.next=now+4+e.mission.random()*3;if(this.drops.length>=48)this.drops.shift();this.drops.push({x:n.pos.x+(e.mission.random()-.5)*.14,z:n.pos.z+.08,floor:n.floor,until:now+45});}
      this.drops=this.drops.filter(d=>d.until>now);for(let i=0;i<48;i++){const d=this.drops[i],size=d&&d.floor===e.floor?Math.min(1,(d.until-now)/7):0;this.matrix.compose(new THREE.Vector3(d?.x||0,.012,d?.z||0),this.rotation,new THREE.Vector3(size,size,size));this.dropMesh.setMatrixAt(i,this.matrix);}this.dropMesh.instanceMatrix.needsUpdate=true;
    }
    if(now>this.nextSpit&&!this.spit&&!e.mission.targetDown){const n=this.spitters.find(n=>!n.dead&&!n.evacuated&&n.floor===e.floor&&distance(n.pos,e.playerPos)<2.3&&e.lineOfSight(n.pos,e.playerPos));if(n){n.reaction=1;n.visual.root.rotation.y=Math.atan2(e.playerPos.x-n.pos.x,e.playerPos.z-n.pos.z);this.spit={from:new THREE.Vector3(n.pos.x,1.5,n.pos.z),to:e.playerPos.clone().add(new THREE.Vector3(0,1.35,0)),at:now};e.hooks.soundCaption?.('A nearby patient spits. Keep some space.');}this.nextSpit=now+(n?75:4);}
    if(this.spit){const t=(now-this.spit.at)/.55,p=this.spitGeometry.attributes.position;for(let i=0;i<6;i++){const s=Math.max(0,Math.min(1,t-i*.045)),v=this.spit.from.clone().lerp(this.spit.to,s);v.y+=Math.sin(s*Math.PI)*.08;p.setXYZ(i,v.x,v.y,v.z);}p.needsUpdate=true;this.spitMesh.visible=t<1.3;if(t>=1.3)this.spit=null;}else this.spitMesh.visible=false;
  }
  dispose(){this.root.removeFromParent();disposeObjectResources(this.root);this.root.clear();this.injured=[];this.spitters=[];this.drops=[];this.spit=null;this.e=null;}
}
