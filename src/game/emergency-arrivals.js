import * as T from 'three';
import {makePlayer,mesh,material,sign} from './assets.js';
import {disposeObjectResources} from './resources.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// One reusable ambulance/crew. Driven by the mission clock; no extra RAF,
// timeouts, recurring NPC spawns or unbounded patient/particle lists.
export class EmergencyArrivals{
 constructor(e){this.e=e;this.nextAt=80+e.mission.random()*40;this.events=0;this.phase='idle';this.root=new T.Group();this.root.name='Intermittent emergency arrivals';e.hospitals[0].group.add(this.root);this.root.visible=false;this.avatars=[];this.makeVan();}
 makeVan(){const van=this.van=new T.Group();this.root.add(van);const white=material('#d8e1df'),blue=material('#386787'),dark=material('#1c303c'),glass=material('#314c5d',{metalness:.5,roughness:.2});
 mesh('box',white,[2.1,.12,4.8],[0,.4,0],van);mesh('box',white,[2.1,.12,4.8],[0,2.2,0],van);for(const x of[-1.02,1.02])mesh('box',white,[.12,1.85,4.8],[x,1.28,0],van);mesh('box',dark,[1.95,1.7,.10],[0,1.3,1.0],van);this.rearDoors=[];mesh('box',white,[2.1,.6,1.2],[0,.65,2.2],van);mesh('box',glass,[1.91,.72,.04],[0,1.6,2.42],van);for(const x of[-1.085,1.085])mesh('box',blue,[.025,.25,4.5],[x,1.1,0],van);
 for(const side of[-1,1]){const label=sign('AMBULANCE','EMERGENCY MEDICAL SERVICE',2.8,.58);label.position.set(side*1.065,1.65,-.5);label.rotation.y=side*Math.PI/2;van.add(label);for(const z of[-1.45,1.5]){const wheel=mesh('cylinder',dark,[.43,.18,.43],[side*1.02,.43,z],van);wheel.rotation.z=Math.PI/2;}const hinge=new T.Group();hinge.position.set(side*1.01,1.31,-2.43);van.add(hinge);mesh('box',white,[1,.1+1.55,.07],[-side*.50,0,0],hinge);mesh('box',glass,[.64,.49,.08],[-side*.50,.38,0],hinge);mesh('box',dark,[.04,.32,.09],[-side*.86,-.18,-.035],hinge);this.rearDoors.push({hinge,side});}
 this.beacons=[];for(const x of[-.66,.66]){const light=mesh('box',material(x<0?'#5c93e1':'#dc6a58',{emissive:x<0?'#458df0':'#e55a44',emissiveIntensity:1}),[.5,.17,.28],[x,2.35,1.2],van);this.beacons.push(light);}
 this.vanCollider={minX:0,maxX:0,minZ:0,maxZ:0,minY:0,maxY:2.45,type:'ambulance'};
 }
 makeCrew(){if(this.crew)return;const e=this.e;this.crew=new T.Group();this.crew.name='Paramedics with emergency stretcher';this.root.add(this.crew);
 const steel=material('#9cabb1',{metalness:.7}),linen=material('#b5c7d2'),rubber=material('#26333a');this.stretcher=new T.Group();this.crew.add(this.stretcher);mesh('box',steel,[.64,.07,1.95],[0,.78,0],this.stretcher);mesh('box',linen,[.58,.12,1.88],[0,.88,0],this.stretcher);
 for(const x of[-.28,.28])for(const z of[-.7,.7]){mesh('box',steel,[.035,.55,.035],[x,.47,z],this.stretcher);const wheel=mesh('cylinder',rubber,[.10,.045,.10],[x,.13,z],this.stretcher);wheel.rotation.z=Math.PI/2;}
 for(const x of[-.34,.34])mesh('box',steel,[.025,.025,1.7],[x,1.02,0],this.stretcher);
 this.medics=[0,1].map(i=>{const v=makePlayer(e.assets,i?'female':'male',{gender:i?'female':'male',skin:i?'#8b5d45':'#b98b69',accent:'#567e91',hairstyle:'cropped'},'nurse');v.root.position.z=i?1.5:-1.45;this.crew.add(v.root);this.avatars.push(v);return v;});
 this.patient=makePlayer(e.assets,'male',{gender:'male',skin:'#996d51',accent:'#8a929c',hairstyle:'cropped'},'patient');this.avatars.push(this.patient);this.crew.add(this.patient.root);this.patient.root.rotation.x=-Math.PI/2;this.patient.root.position.set(0,.99,.86);for(let i=0;i<8;i++)this.patient.animate(i*.05,0,.05);this.patient.poseActivity?.('rest',0);
 this.crew.visible=false;
 }
 setVan(x,z,heading){this.van.position.set(x,0,z);this.van.rotation.y=heading;const c=this.vanCollider,wide=Math.abs(Math.sin(heading))>.5;c.minX=x-(wide?2.65:1.15);c.maxX=x+(wide?2.65:1.15);c.minZ=z-(wide?1.15:2.65);c.maxZ=z+(wide?1.15:2.65);}
 route(goal){const nav=this.e.systems.navigationFor(0);this.path=nav.smoothRoute(this.crew.position,goal).map(p=>({x:(p.x-11)*3,z:(p.z-11)*3}));if(this.path.length&&goal.z>40&&nav.clear(this.path.at(-1),goal))this.path.push({...goal});this.cursor=0;}
 start(){const e=this.e;this.van.visible=true;this.events++;this.stopping=this.events%3!==0;this.root.visible=true;this.phase='approach';this.phaseAt=e.mission.elapsed;this.setVan(-45,50,Math.PI/2);if(!e.hospitals[0].colliders.includes(this.vanCollider))e.hospitals[0].colliders.push(this.vanCollider);}
 moveCrew(dt){const e=this.e,goal=this.path?.[this.cursor];if(!goal)return !!this.path?.length;const pos=this.crew.position,d=distance(pos,goal);if(d<.08){this.cursor++;return this.cursor>=this.path.length;}
 const door=e.levels[0].doors.find(d=>distance(pos,d)<3&&distance(goal,d)<4);if(door){if(door.locked)return false;door.open=true;if(Math.abs(door.angle-door.openAngle)>.08)return false;}
 if(e.floor===0&&distance(pos,e.playerPos)<1.1)return false;
 if(e.npcs.some(n=>n.floor===0&&!n.dead&&!n.evacuated&&!n.lying&&distance(pos,n.pos)<.85))return false;
 const step=Math.min(d,1.15*dt),heading=Math.atan2(goal.x-pos.x,goal.z-pos.z);pos.x+=Math.sin(heading)*step;pos.z+=Math.cos(heading)*step;this.crew.rotation.y+=Math.atan2(Math.sin(heading-this.crew.rotation.y),Math.cos(heading-this.crew.rotation.y))*Math.min(1,dt*6);this.walking=true;return false;
 }
 update(dt){if(this.disposed)return;const e=this.e,now=e.mission.elapsed;if(e.mission.result)return;this.walking=false;
 if(this.phase==='idle'){if(now<this.nextAt||e.systems.evacuating||e.mission.targetDown)return;if(this.patientResting&&e.floor===0&&distance(e.playerPos,this.patient.root.position)<12){this.nextAt=now+20;return;}this.start();}
 const age=now-this.phaseAt;
 for(const {hinge,side}of this.rearDoors)hinge.rotation.y=T.MathUtils.damp(hinge.rotation.y,['unloading','transport','handover','return','loading'].includes(this.phase)?side*1.6:0,4,dt);
 for(let i=0;i<this.beacons.length;i++)this.beacons[i].material.emissiveIntensity=Math.sin(now*5+i*Math.PI)>.3?1.8:.3;
 if(this.phase==='approach'){
  if(!this.stopping){this.setVan(-45+age*6,50,Math.PI/2);if(age>16)this.finish();}
  else if(age<8.8)this.setVan(-45+age*6,50,Math.PI/2);
  else if(age<11.8){const t=(age-8.8)/3;this.setVan(7.8,50-t*6.8,Math.PI/2);}
  else{this.setVan(7.8,43.2,Math.PI/2);this.makeCrew();this.patient.root.removeFromParent();this.crew.add(this.patient.root);this.patient.root.position.set(0,.99,.86);this.patient.root.rotation.set(-Math.PI/2,0,0);this.patientResting=false;this.patient.root.visible=true;this.crew.visible=true;this.crew.position.set(6.8,0,43.2);this.crew.rotation.y=Math.PI;
   const room=e.levels[0].rooms.find(r=>r.kind==='emergency');this.admit=e.systems.navigationFor(0).nearest(room.center).point;this.phase='unloading';this.phaseAt=now;}
 }else if(this.phase==='unloading'){this.crew.position.x=6.8-Math.min(1,age/3)*2.25;this.walking=true;if(age>=3){this.route(this.admit);this.phase='transport';}}
 else if(this.phase==='transport'&&this.moveCrew(dt)){this.phase='handover';this.phaseAt=now;}
 else if(this.phase==='handover'&&age>10){this.patient.root.getWorldPosition(this.patientPosition??=new T.Vector3());const rotation=this.patient.root.getWorldQuaternion(new T.Quaternion());this.patient.root.removeFromParent();this.root.add(this.patient.root);this.patient.root.position.copy(this.patientPosition);this.patient.root.quaternion.copy(rotation);this.patientResting=true;this.route({x:4.55,z:43.2});this.phase='return';}
 else if(this.phase==='return'&&this.moveCrew(dt)){this.phase='loading';this.phaseAt=now;}
 else if(this.phase==='loading'&&age>3){this.crew.visible=false;this.phase='depart';this.phaseAt=now;}
 else if(this.phase==='depart'){this.setVan(7.8+age*5.5,43.2+Math.min(6.8,age*2),Math.PI/2);if(age>9)this.finish();}
 for(const [index,medic]of(this.medics||[]).entries()){medic.animate(e.time,this.walking?1.15:0,dt);medic.poseActivity?.(index?'stretcher-pull':'stretcher-push',e.time);}
 }
 finish(){this.van.visible=false;this.phase='idle';this.nextAt=this.e.mission.elapsed+120+this.e.mission.random()*90;const list=this.e.hospitals[0].colliders,index=list.indexOf(this.vanCollider);if(index>=0)list.splice(index,1);this.van.visible=true;this.root.visible=!!this.patientResting;this.van.visible=false;}
 dispose(){if(this.disposed)return;this.disposed=true;for(const v of this.avatars){v.root.removeFromParent();if(v.dispose)v.dispose();else disposeObjectResources(v.root,{textures:true});}this.avatars=[];const list=this.e.hospitals[0].colliders,index=list.indexOf(this.vanCollider);if(index>=0)list.splice(index,1);this.root.removeFromParent();disposeObjectResources(this.root,{textures:true});this.root.clear();this.e=null;}
}
