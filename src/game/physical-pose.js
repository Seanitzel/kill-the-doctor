import * as T from 'three';

// Overrides are restored before the next mixer tick. This also works with clips
// that do not animate hip translation, rather than accumulating a crouch offset.
export class PhysicalPose {
  constructor(model) {
    this.model=model;this.bones={};model.traverse(b=>{if(b.isBone)this.bones[b.name]=b;});
    this.records=new Map();this.changed=[];
    for(const b of Object.values(this.bones))this.records.set(b,{bone:b,p:new T.Vector3(),q:new T.Quaternion(),active:false});
    this.fingers=Object.keys(this.bones).filter(n=>n.startsWith('RightHand')&&/\d$/.test(n)).map(n=>this.bones[n]);
    this.vectors=Array.from({length:96},()=>new T.Vector3());this.quaternions=Array.from({length:40},()=>new T.Quaternion());this.matrix=new T.Matrix4();
    this.scratchResult={target:new T.Vector3(),grip:new T.Vector3(),palmNormal:new T.Vector3(),error:Infinity,reachable:false};
  }
  begin(){this.vi=this.qi=0;this.model.updateWorldMatrix(true,true);}
  v(x=0,y=0,z=0){const v=this.vectors[this.vi]??=new T.Vector3();this.vi++;return v.set(x,y,z);}
  q(){const q=this.quaternions[this.qi]??=new T.Quaternion();this.qi++;return q.identity();}
  save(b){const r=this.records.get(b);if(r&&!r.active){r.p.copy(b.position);r.q.copy(b.quaternion);r.active=true;this.changed.push(r);}}
  reset(){if(!this.changed.length)return;for(const r of this.changed){r.bone.position.copy(r.p);r.bone.quaternion.copy(r.q);r.active=false;}this.changed.length=0;this.model.updateWorldMatrix(true,true);}
  point(b){return this.model.worldToLocal(b.getWorldPosition(this.v()));}
  basis(forward,normal){const x=this.v().copy(forward).normalize(),z=this.v().copy(normal).addScaledVector(x,-normal.dot(x)).normalize(),y=this.v().copy(z).cross(x).normalize();return this.matrix.makeBasis(x,y,z);}
  orient(b,child,direction){
    this.save(b);const relative=this.model.getWorldQuaternion(this.q()).invert().multiply(b.parent.getWorldQuaternion(this.q()));
    b.quaternion.copy(relative.invert().multiply(this.q().setFromUnitVectors(this.v().copy(child.position).normalize(),this.v().copy(direction).normalize())));b.updateWorldMatrix(false,true);
  }
  solve(upper,lower,end,target,pole){
    const start=this.point(upper),delta=this.v().copy(target).sub(start),a=lower.position.length(),b=end.position.length(),d=T.MathUtils.clamp(delta.length(),Math.abs(a-b)+.001,a+b-.003),direction=delta.normalize();
    const tip=this.v().copy(start).addScaledVector(direction,d),bend=this.v().copy(pole).addScaledVector(direction,-pole.dot(direction));
    if(bend.lengthSq()<.00001)bend.set(1,0,0).addScaledVector(direction,-direction.x);bend.normalize();
    const along=(a*a-b*b+d*d)/(2*d),joint=this.v().copy(start).addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)));
    this.orient(upper,lower,joint.sub(start));this.orient(lower,end,tip.sub(this.point(lower)));
  }
  crouch(weight=1){
    const b=this.bones,w=T.MathUtils.clamp(weight,0,1);if(w<.001||!b.Hips||!b.Spine2||!['Right','Left'].every(s=>b[s+'UpLeg']&&b[s+'Leg']&&b[s+'Foot']))return false;
    this.begin();const feet=['Right','Left'].map(s=>({s,p:this.point(b[s+'Foot']),q:b[s+'Foot'].getWorldQuaternion(this.q())})),scale=this.model.getWorldScale(this.v()).y;
    this.save(b.Hips);b.Hips.position.y-=.34*w/scale;b.Hips.position.z-=.10*w/scale;this.model.updateWorldMatrix(true,true);
    for(const f of feet){this.solve(b[f.s+'UpLeg'],b[f.s+'Leg'],b[f.s+'Foot'],f.p,this.v(0,0,1));const foot=b[f.s+'Foot'];this.save(foot);foot.quaternion.copy(foot.parent.getWorldQuaternion(this.q()).invert().multiply(f.q));foot.updateWorldMatrix(false,true);}
    this.save(b.Spine2);b.Spine2.rotation.x+=.16*w;this.model.updateWorldMatrix(true,true);return true;
  }
  leanToDesk(){for(const[name,angle]of[['Spine',.25],['Spine1',.12]]){const bone=this.bones[name];if(!bone)continue;this.save(bone);bone.quaternion.copy(this.records.get(bone).q);bone.rotation.x+=angle;}this.model.updateWorldMatrix(true,true);}
  cover(direction,weight=1){const b=this.bones;if(!b.Spine)return false;this.begin();const local=this.v().copy(direction).applyQuaternion(this.model.getWorldQuaternion(this.q()).invert());for(const[name,scale]of[['Spine',.30],['Spine1',.18]]){const bone=b[name];if(!bone)continue;this.save(bone);bone.rotation.z-=local.x*scale*weight;bone.rotation.x+=local.z*scale*weight;bone.updateWorldMatrix(false,true);}return true;}

  scratch(time,blend=1){
    const b=this.bones,m=this.model,hand=b.RightHand;if(!hand||!b.RightArm||!b.RightForeArm||!b.Head||!b.RightHandIndex2||!b.RightHandMiddle2||!b.RightHandIndex1||!b.RightHandRing1)return null;
    this.begin();
    for(const finger of this.fingers){this.save(finger);const n=finger.name,j=Number(n.at(-1)),angle=n.includes('Thumb')?.25:/Ring|Pinky/.test(n)?.36:j===1?.06:.12;finger.quaternion.multiply(this.q().setFromAxisAngle(this.v(0,0,1),angle));}
    m.updateWorldMatrix(true,true);const local=bone=>hand.worldToLocal(bone.getWorldPosition(this.v())),offset=local(b.RightHandIndex2).add(local(b.RightHandMiddle2)).multiplyScalar(.5),forward=this.v().copy(offset).normalize(),across=local(b.RightHandIndex1).sub(local(b.RightHandRing1));
    // Positive-Z finger flexion curls toward this side of the right hand.
    const palm=this.v().copy(forward).cross(across).negate().normalize(),head=this.point(b.Head),target=this.v().copy(head).add(this.v(-.125,.025+Math.sin(time*8)*.012,.08)),normal=this.v().copy(head).sub(target).normalize();
    const orientation=this.q().setFromRotationMatrix(this.basis(this.v(0,1,.1),normal)).multiply(this.q().setFromRotationMatrix(this.basis(forward,palm)).invert()),wrist=this.v().copy(target).sub(this.v().copy(offset).applyQuaternion(orientation));
    this.solve(b.RightArm,b.RightForeArm,hand,wrist,this.v(-1,-.4,.25));this.save(hand);hand.quaternion.copy(hand.parent.getWorldQuaternion(this.q()).invert().multiply(m.getWorldQuaternion(this.q())).multiply(orientation));
    const weight=T.MathUtils.clamp(blend,0,1);if(weight<1)for(const bone of [b.RightArm,b.RightForeArm,hand,...this.fingers]){const r=this.records.get(bone);if(r?.active){const posed=this.q().copy(bone.quaternion);bone.quaternion.copy(r.q).slerp(posed,weight);}}
    m.updateWorldMatrix(true,true);const r=this.scratchResult;r.target.copy(target);m.localToWorld(r.target);b.RightHandIndex2.getWorldPosition(r.grip);r.grip.add(b.RightHandMiddle2.getWorldPosition(this.v())).multiplyScalar(.5);r.palmNormal.copy(palm).applyQuaternion(hand.getWorldQuaternion(this.q()));r.error=r.grip.distanceTo(r.target);r.reachable=r.error<.02;return r;
  }
}
