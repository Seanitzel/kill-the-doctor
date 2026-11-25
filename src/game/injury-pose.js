import * as T from 'three';
import {injurySpeed} from './injury.js';
const boneCache=new WeakMap();
export function poseInjury(visual,state,time,speed=0){
 if(!state||state.dead||!state.wounds.length||!visual.model)return;
 const model=visual.model;let b=boneCache.get(model);if(!b){b={};model.traverse(o=>{if(o.isBone)b[o.name]=o;});boneCache.set(model,b);}model.updateWorldMatrix(true,true);
 const local=bone=>model.worldToLocal(bone.getWorldPosition(new T.Vector3()));
 const orient=(name,child,direction)=>{const bone=b[name],tip=b[child];if(!bone||!tip)return;const relative=model.getWorldQuaternion(new T.Quaternion()).invert().multiply(bone.parent.getWorldQuaternion(new T.Quaternion()));bone.quaternion.copy(relative.invert().multiply(new T.Quaternion().setFromUnitVectors(tip.position.clone().normalize(),direction.clone().normalize())));bone.updateWorldMatrix(false,true);};
 const arm=state.wounds.find(w=>w.part==='arm');
 if(arm){const side=arm.side,other=side==='Left'?'Right':'Left',sign=side==='Left'?-1:1;
  orient(side+'Arm',side+'ForeArm',new T.Vector3(sign*.10,-.7,.16));orient(side+'ForeArm',side+'Hand',new T.Vector3(-sign*.12,-.35,.30));
  const shoulder=b[other+'Arm'],elbow=b[other+'ForeArm'],hand=b[other+'Hand'],hurt=b[side+'ForeArm'],hurtHand=b[side+'Hand'];
  if(shoulder&&elbow&&hand&&hurt&&hurtHand){const start=local(shoulder),target=local(hurt).lerp(local(hurtHand),.55),toward=target.clone().sub(start),upper=elbow.position.length(),lower=hand.position.length(),d=T.MathUtils.clamp(toward.length(),.005,upper+lower-.005);toward.normalize();const bend=new T.Vector3(0,-1,.65).addScaledVector(toward,-new T.Vector3(0,-1,.65).dot(toward)).normalize(),along=(upper*upper-lower*lower+d*d)/(2*d),out=Math.sqrt(Math.max(0,upper*upper-along*along));const e=start.clone().addScaledVector(toward,along).addScaledVector(bend,out);orient(other+'Arm',other+'ForeArm',e.sub(start));orient(other+'ForeArm',other+'Hand',target.sub(local(elbow)));}
 }
 const leg=state.wounds.find(w=>w.part==='leg'),torso=state.wounds.some(w=>['hips','back'].includes(w.part));
 if(injurySpeed(state)<1){const cycle=Math.sin(time*5),side=leg?.side==='Left'?-1:1;if(b.Spine2){b.Spine2.rotation.x+=torso?.16:.06;b.Spine2.rotation.z+=side*(.045+(speed>.1?cycle*.045:0));}if(leg){const thigh=b[leg.side+'UpLeg'],shin=b[leg.side+'Leg'];if(thigh)thigh.rotation.x*=.45;if(shin)shin.rotation.x+=.22;}if(b.Head)b.Head.rotation.x+=.06;}
 model.traverse(o=>{if(o.morphTargetDictionary)for(const [name,index]of Object.entries(o.morphTargetDictionary)){if(/browInnerUp/i.test(name))o.morphTargetInfluences[index]=.45;if(/jawOpen|mouthOpen/i.test(name))o.morphTargetInfluences[index]=.10;}});
 model.updateWorldMatrix(true,true);
}
