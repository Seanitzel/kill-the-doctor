import * as T from 'three';
const cache=new WeakMap(),up=new T.Vector3(0,1,0);
function bonesFor(visual){let bones=cache.get(visual);if(!bones){bones={};(visual.model||visual.root)?.traverse(o=>{if(o.isBone)bones[o.name]=o;});cache.set(visual,bones);}return bones;}
export function bodyRegions(visual){
 const bones=bonesFor(visual),root=visual.root;root.updateWorldMatrix(true,true);const point=name=>bones[name]?.getWorldPosition(new T.Vector3());const regions=[];
 const capsule=(part,side,from,to,radius,boneName)=>{const a=point(from),b=point(to);if(a&&b)regions.push({part,side,a,b,radius,bone:bones[boneName||from]});};
 const head=point('Head');if(head)regions.push({part:'head',a:head.clone().addScaledVector(up,.06),b:head.clone().addScaledVector(up,.12),radius:.115,bone:bones.Head});
 capsule('neck',null,'Neck','Head',.065,'Neck');
 capsule('chest',null,'Spine2','Neck',.16,'Spine2');
 capsule('hips',null,'Hips','Spine1',.155,'Hips');
 for(const side of ['Left','Right']){
  capsule('arm',side,side+'Arm',side+'ForeArm',.065,side+'Arm');capsule('arm',side,side+'ForeArm',side+'Hand',.06,side+'ForeArm');
  capsule('leg',side,side+'UpLeg',side+'Leg',.095,side+'UpLeg');capsule('leg',side,side+'Leg',side+'Foot',.075,side+'Leg');
 }
 if(!regions.length){const p=(x,y,z=0)=>root.localToWorld(new T.Vector3(x,y,z)),add=(part,side,a,b,radius)=>regions.push({part,side,a:p(...a),b:p(...b),radius,bone:root});add('head',null,[0,1.65,0],[0,1.73,0],.12);add('neck',null,[0,1.51,0],[0,1.59,0],.07);add('chest',null,[0,1.28,0],[0,1.46,0],.17);add('hips',null,[0,.94,0],[0,1.14,0],.16);for(const sign of[-1,1]){const side=sign<0?'Left':'Right';add('arm',side,[sign*.3,1.43,0],[sign*.34,.98,0],.07);add('leg',side,[sign*.12,.89,0],[sign*.13,.13,0],.09);}}
 return regions;
}
export function bodyHit(visual,ray,maxDistance=Infinity){
 let best=null;const forward=new T.Vector3(0,0,1).applyQuaternion(visual.root.getWorldQuaternion(new T.Quaternion()));
 // Closely spaced spheres approximate each posed bone capsule. No model triangle
 // scan, oversized aim-assist boxes, or fixed standing heights for seated actors.
 for(const region of bodyRegions(visual)){
  const steps=Math.max(1,Math.ceil(region.a.distanceTo(region.b)/.045));
  for(let i=0;i<=steps;i++){
   const center=region.a.clone().lerp(region.b,i/steps),p=ray.intersectSphere(new T.Sphere(center,region.radius),new T.Vector3());if(!p)continue;const distance=p.distanceTo(ray.origin);
   if(distance>=maxDistance||best&&distance>=best.distance)continue;
   best={...region,part:region.part==='chest'&&ray.direction.dot(forward)>.25?'back':region.part,point:p,distance};
  }
 }
 return best;
}
export function aimAtRegion(visual,part='chest',side='Right'){
 const region=bodyRegions(visual).find(r=>r.part===part&&(!r.side||r.side===side));
 return region?region.a.clone().lerp(region.b,.55):visual.root.getWorldPosition(new T.Vector3()).addScaledVector(up,1.4);
}
