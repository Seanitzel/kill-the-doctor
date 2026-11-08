import * as T from 'three';
const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function smokingLift(time){const t=((time%9)+9)%9;return t<1.6?0:t<3.2?smooth((t-1.6)/1.6):t<4.8?1:t<6.6?1-smooth((t-4.8)/1.8):0;}
export function eatingLift(time){const t=((time%8)+8)%8;return t<1?0:t<2.8?smooth((t-1)/1.8):t<3.8?1:t<5.9?1-smooth((t-3.8)/2.1):0;}
const Z=new T.Vector3(0,0,1);
function basis(forward,normal){const x=forward.clone().normalize(),z=normal.clone().addScaledVector(x,-normal.dot(x)).normalize(),y=z.clone().cross(x).normalize();return new T.Matrix4().makeBasis(x,y,z);}
// Solve the wrist for a fingertip grip at the lips, rather than lifting an open
// palm beside the head. All targets are in model space, so root yaw is irrelevant.
export class SmokingPose{
 constructor(model,restingFingers=[],mode='smoke'){this.mode=mode;
  this.model=model;this.head=model.getObjectByName('Head');this.hand=model.getObjectByName('RightHand');this.arm=model.getObjectByName('RightArm');this.fore=model.getObjectByName('RightForeArm');this.hips=model.getObjectByName('Hips');this.index=model.getObjectByName('RightHandIndex2');this.middle=model.getObjectByName('RightHandMiddle2');
  this.fingers=restingFingers.filter(f=>f.bone.name.startsWith('RightHand'));
  this.grip=new T.Vector3();this.direction=new T.Vector3();this.result={grip:this.grip,direction:this.direction,lift:0};
  this.mouth=new T.Vector3(0,.09,.105);this.palmNormal=new T.Vector3(0,-1,0);this.cigaretteAxis=new T.Vector3();this.localBasis=new T.Quaternion();
  this.v=Array.from({length:15},()=>new T.Vector3());this.q=Array.from({length:5},()=>new T.Quaternion());this.low=new T.Quaternion();this.high=new T.Quaternion();
  if(!this.head||!this.hand||!this.arm||!this.fore||!this.index||!this.middle)return;
  model.parent?.updateWorldMatrix(true,false);model.updateMatrixWorld(true);
  const bounds=name=>{const box=new T.Box3(),point=new T.Vector3();model.traverse(o=>{if(!o.isSkinnedMesh||o.material?.name!==name)return;for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,point);point.applyMatrix4(o.matrixWorld);this.head.worldToLocal(point);box.expandByPoint(point);}});return box;};
  const face=bounds('Wolf3D_Skin'),eyes=bounds('Wolf3D_Eye');if(!face.isEmpty()&&!eyes.isEmpty())this.mouth.set((eyes.min.x+eyes.max.x)/2,eyes.min.y-.046,face.max.z-.008);
  const local=b=>this.hand.worldToLocal(b.getWorldPosition(new T.Vector3())),forward=local(this.middle).add(local(this.index)).multiplyScalar(.5).normalize(),across=local(model.getObjectByName('RightHandIndex1')).sub(local(model.getObjectByName('RightHandRing1')));
  this.fingerForward=forward.clone();this.palmNormal.copy(forward).cross(across).normalize();this.cigaretteAxis.copy(forward).cross(this.palmNormal).normalize();this.localBasis.setFromRotationMatrix(basis(forward,this.palmNormal)).invert();
  this.low.setFromRotationMatrix(this.mode==='eat'?basis(new T.Vector3(.85,.08,.52),new T.Vector3(0,1,.12)):basis(new T.Vector3(.10,-.93,.30),new T.Vector3(.95,.1,.25))).multiply(this.localBasis);
  this.high.setFromRotationMatrix(basis(new T.Vector3(.90,.42,-.03),new T.Vector3(0,1,.18))).multiply(this.localBasis);
 }
 point(b,out){return this.model.worldToLocal(b.getWorldPosition(out));}
 orient(bone,tip,direction,roll){const parent=bone.parent.getWorldQuaternion(this.q[0]),model=this.model.getWorldQuaternion(this.q[1]),relative=model.invert().multiply(parent),axis=this.v[14].copy(tip.position).normalize();const target=this.q[2].setFromUnitVectors(axis.applyQuaternion(roll),direction.normalize()).multiply(roll);bone.quaternion.copy(relative.invert().multiply(target));bone.updateWorldMatrix(false,true);}
 stir(target){
  if(!this.update(0))return null;
  const m=this.model,hand=this.hand,start=this.point(this.arm,this.v[0]),grip=this.v[1].copy(target);m.worldToLocal(grip);
  const orientation=this.q[4].copy(this.low),offset=this.v[2];this.index.getWorldPosition(offset);this.middle.getWorldPosition(this.v[3]);offset.add(this.v[3]).multiplyScalar(.5);hand.worldToLocal(offset);offset.applyQuaternion(orientation);
  const wrist=this.v[4].copy(grip).sub(offset),delta=this.v[5].copy(wrist).sub(start),a=this.fore.position.length(),b=hand.position.length(),d=T.MathUtils.clamp(delta.length(),Math.abs(a-b)+.001,a+b-.003);delta.normalize();
  const bend=this.v[6].set(-1,-.45,.25).addScaledVector(delta,-this.v[6].dot(delta)).normalize(),along=(a*a-b*b+d*d)/(2*d),elbow=this.v[7].copy(start).addScaledVector(delta,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)));
  this.orient(this.arm,this.fore,this.v[8].copy(elbow).sub(start),orientation);this.orient(this.fore,hand,this.v[8].copy(wrist).sub(this.point(this.fore,this.v[9])),orientation);
  hand.quaternion.copy(hand.parent.getWorldQuaternion(this.q[0]).invert().multiply(m.getWorldQuaternion(this.q[1])).multiply(orientation));hand.updateWorldMatrix(false,true);
  this.index.getWorldPosition(this.grip);this.middle.getWorldPosition(this.v[10]);this.grip.add(this.v[10]).multiplyScalar(.5);return this.result;
 }
 update(time){
  if(!this.head||!this.hand||!this.arm||!this.fore||!this.index||!this.middle)return null;
  const lift=this.mode==='drink'?(time<.5?0:time<2?smooth((time-.5)/1.5):time<3?1:1-smooth((time-3)/1.6)):this.mode==='eat'?eatingLift(time):smokingLift(time),m=this.model,hand=this.hand;
  // A relaxed two-finger grip; ring and little fingers curl into the palm.
  for(const f of this.fingers){const n=f.bone.name,small=/Ring|Pinky/.test(n),thumb=/Thumb/.test(n),joint=Number(n.at(-1)),angle=this.mode!=='smoke'?(thumb?.45:joint===1?.24:.68):small?(joint===1?.32:.62):thumb?(joint===1?.35:.50):(joint===1?.03:.13);f.bone.quaternion.copy(f.bind).multiply(this.q[3].setFromAxisAngle(Z,angle));}
  m.updateWorldMatrix(true,true);
  const start=this.point(this.arm,this.v[0]),mouth=this.v[1].copy(this.mouth);this.head.localToWorld(mouth);m.worldToLocal(mouth);
  const highGrip=this.v[2].copy(mouth);highGrip.z+=this.mode==='drink'?.075:this.mode==='eat'?.080:.022;if(this.mode==='eat')highGrip.y-=.026;else if(this.mode==='drink')highGrip.y-=.065;
  const hip=this.point(this.hips||this.arm,this.v[3]),lowGrip=this.v[4].set(this.mode==='smoke'?-.23:-.20,hip.y+(this.mode==='smoke'?-.12:.31),hip.z+(this.mode==='smoke'?.055:.36)),targetGrip=this.v[5].copy(lowGrip).lerp(highGrip,lift);
  const handModel=this.q[4].copy(this.low).slerp(this.high,lift);
  // Update the grip offset after finger curling, then solve for the wrist that
  // puts that exact offset at the requested point in front of the mouth.
  const gripOffset=this.v[6];this.index.getWorldPosition(gripOffset);this.middle.getWorldPosition(this.v[7]);gripOffset.add(this.v[7]).multiplyScalar(.5);hand.worldToLocal(gripOffset);gripOffset.applyQuaternion(handModel);
  if(this.mode==='smoke'){const reach=this.fore.position.length()+hand.position.length();lowGrip.set(start.x-.015,start.y-reach+.015,start.z+.025).add(gripOffset);targetGrip.copy(lowGrip).lerp(highGrip,lift);}
  const wrist=this.v[8].copy(targetGrip).sub(gripOffset),toward=this.v[9].copy(wrist).sub(start),upper=this.fore.position.length(),lower=hand.position.length(),d=T.MathUtils.clamp(toward.length(),Math.abs(upper-lower)+.001,upper+lower-.003);toward.normalize();
  const bend=this.v[10].copy(this.fingerForward).applyQuaternion(handModel).negate().lerp(this.v[11].set(-1,-.8,.2),1-lift);if(this.mode==='smoke')bend.set(-1,-.15,.6);bend.addScaledVector(toward,-bend.dot(toward));if(bend.lengthSq()<.0001)bend.set(-1,0,.5).addScaledVector(toward,toward.x-.5*toward.z);bend.normalize();const along=(upper*upper-lower*lower+d*d)/(2*d),out=Math.sqrt(Math.max(0,upper*upper-along*along)),elbow=this.v[11].copy(start).addScaledVector(toward,along).addScaledVector(bend,out);
  this.orient(this.arm,this.fore,this.v[12].copy(elbow).sub(start),handModel);this.orient(this.fore,hand,this.v[12].copy(wrist).sub(this.point(this.fore,this.v[13])),handModel);
  const parent=hand.parent.getWorldQuaternion(this.q[0]),model=m.getWorldQuaternion(this.q[1]);hand.quaternion.copy(parent.invert().multiply(model).multiply(handModel));hand.updateWorldMatrix(false,true);
  this.index.getWorldPosition(this.grip);this.middle.getWorldPosition(this.v[7]);this.grip.add(this.v[7]).multiplyScalar(.5);
  this.direction.copy(this.cigaretteAxis).applyQuaternion(hand.getWorldQuaternion(this.q[0])).normalize();
  this.result.lift=lift;return this.result;
 }
}
