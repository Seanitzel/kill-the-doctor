import * as T from 'three';
const UP=new T.Vector3(0,1,0),X=new T.Vector3(1,0,0);
const turn=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
// Choose a body-length patch of floor; a foot-pivot rotation alone sends a
// standing character's entire torso sideways into nearby walls and cupboards.
export function bodyLanding(n,engine,height=1.82,halfWidth=.32){
 const start={x:n.pos.x,z:n.pos.z},yaw=n.visual.root.rotation.y;if(!engine?.canStand)return {...start,yaw};
 const offsets=[[0,0],[.35,0],[-.35,0],[0,.35],[0,-.35],[.5,.5],[-.5,.5],[.5,-.5],[-.5,-.5],[0,.8],[0,-.8],[.8,0],[-.8,0]],angles=[yaw,yaw+Math.PI/2,yaw-Math.PI/2,yaw+Math.PI,0,Math.PI/2];let best={...start,yaw},bestScore=-1;
 for(const [dx,dz]of offsets)for(const angle of angles){const x=start.x+dx,z=start.z+dz,ux=-Math.sin(angle),uz=-Math.cos(angle);let score=0;for(const t of [-.47,-.25,0,.25,.47])if(engine.canStand(x+ux*height*t,z+uz*height*t,halfWidth,n.floor))score++;if(score===5)return{x,z,yaw:angle};if(score>bestScore){bestScore=score;best={x,z,yaw:angle};}}
 return best;
}
export function beginBodyFall(n,engine){
 if(n.bodyFall)return;n.visual.animate?.(0,0,.35);n.visual.poseActivity?.('rest',0);const root=n.visual.root,position=root.position.clone(),rotation=root.rotation.clone();root.position.set(0,0,0);root.rotation.set(0,0,0);root.updateMatrixWorld(true);const subject=n.visual.model||n.visual.body||root,box=new T.Box3();let skinned=false;subject.traverse(o=>{if(o.isSkinnedMesh){box.expandByObject(o,true);skinned=true;}});if(!skinned)box.setFromObject(subject,true);root.position.copy(position);root.rotation.copy(rotation);
 const minY=Number.isFinite(box.min.y)?box.min.y:0,maxY=Number.isFinite(box.max.y)?box.max.y:1.82,landing=bodyLanding(n,engine,maxY-minY,Math.max(.25,Math.min(.5,Math.max(Math.abs(box.min.x),Math.abs(box.max.x)))));
 n.bodyFall={age:0,rotation:new T.Quaternion(),yaw:rotation.y,landing,origin:{x:position.x,z:position.z},centerY:(maxY+minY)/2,minZ:Number.isFinite(box.min.z)?box.min.z:-.18,minY};n.path=[];n.reporting=null;n.activity=null;n.seated=false;n.falling=1;
}
export function updateBodyFall(n,dt,engine){beginBodyFall(n,engine);const f=n.bodyFall;if(f.settled)return;f.age=Math.min(1,f.age+dt*1.5);const t=f.age*f.age*(3-2*f.age),angle=t*Math.PI/2,yaw=f.yaw+turn(f.yaw,f.landing.yaw)*t;n.visual.root.quaternion.setFromAxisAngle(UP,yaw).multiply(f.rotation.setFromAxisAngle(X,-angle));const pivot=f.centerY*Math.sin(angle);n.pos.x=T.MathUtils.lerp(f.origin.x,f.landing.x,t)+pivot*Math.sin(yaw);n.pos.z=T.MathUtils.lerp(f.origin.z,f.landing.z,t)+pivot*Math.cos(yaw);n.pos.y=.025-f.minZ*Math.sin(angle)-f.minY*Math.cos(angle);n.falling=1-f.age;f.settled=f.age===1;}
export function settleBedPatient(n){if(!n.lying)return;n.visual.animate?.(0,0,.35);n.visual.poseActivity?.('rest',0);n.pos.y=n.baselineY??1;n.visual.root.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),n.bedRotation||0).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2));}
