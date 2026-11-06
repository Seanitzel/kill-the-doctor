import {EgressNavigation} from './egress.js';
import {footprint,obstacleBounds,circleOverlaps} from './collision.js';
import {overlaps} from './furniture-placement.js';
import * as T from 'three';
import {makePlayer,mesh,material,sign} from './assets.js';
import {disposeObjectResources} from './resources.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// One reusable ambulance/crew. Driven by the mission clock; no extra RAF,
// timeouts, recurring NPC spawns or unbounded patient/particle lists.
export class EmergencyArrivals{
 constructor(e){this.e=e;this.nextAt=80+e.mission.random()*40;this.events=0;this.phase='idle';this.root=new T.Group();this.root.name='Intermittent emergency arrivals';e.hospitals[0].group.add(this.root);this.root.visible=false;this.avatars=[];this.makeVan();}
 makeVan(){const van=this.van=new T.Group();this.root.add(van);const white=material('#d8e1df'),blue=material('#386787'),dark=material('#1c303c'),glass=material('#314c5d',{metalness:.5,roughness:.2});
 mesh('box',white,[2.1,.12,4.8],[0,.4,0],van);mesh('box',white,[2.1,.12,4.8],[0,2.2,0],van);for(const x of[-1.02,1.02])mesh('box',white,[.12,1.85,4.8],[x,1.28,0],van);mesh('box',dark,[1.95,1.7,.10],[0,1.3,1.0],van);this.rearDoors=[];mesh('box',white,[2.1,.6,1.2],[0,.65,2.2],van);this.makeFront(van,{white,blue,dark,glass});for(const x of[-1.085,1.085])mesh('box',blue,[.025,.25,4.5],[x,1.1,0],van);
 for(const side of[-1,1]){const label=sign('AMBULANCE','EMERGENCY MEDICAL SERVICE',2.8,.58);label.position.set(side*1.065,1.65,-.5);label.rotation.y=side*Math.PI/2;van.add(label);for(const z of[-1.45,1.5]){const wheel=mesh('cylinder',dark,[.43,.18,.43],[side*1.02,.43,z],van);wheel.rotation.z=Math.PI/2;}const hinge=new T.Group();hinge.position.set(side*1.01,1.31,-2.43);van.add(hinge);mesh('box',white,[1,.1+1.55,.07],[-side*.50,0,0],hinge);mesh('box',glass,[.64,.49,.08],[-side*.50,.38,0],hinge);mesh('box',dark,[.04,.32,.09],[-side*.86,-.18,-.035],hinge);this.rearDoors.push({hinge,side});}
 this.beacons=[];for(const x of[-.66,.66]){const light=mesh('box',material(x<0?'#5c93e1':'#dc6a58',{emissive:x<0?'#458df0':'#e55a44',emissiveIntensity:1}),[.5,.17,.28],[x,2.35,1.2],van);this.beacons.push(light);}
 this.vanCollider={minX:0,maxX:0,minZ:0,maxZ:0,minY:0,maxY:2.45,type:'ambulance',dynamic:true};
 }
 makeFront(van,{white,blue,dark,glass}){
 const panel=(name,points,mat)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const mesh=new T.Mesh(g,mat);mesh.name=name;van.add(mesh);return mesh;};
 const rod=(a,b,r,mat)=>{const from=new T.Vector3(...a),to=new T.Vector3(...b),g=new T.CylinderGeometry(r,r,from.distanceTo(to),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize()));g.translate(...from.lerp(to,.5).toArray());const mesh=new T.Mesh(g,mat);van.add(mesh);return mesh;};
 panel('Sloped ambulance windscreen',[[-.94,1.22,2.65],[.94,1.22,2.65],[.94,1.97,2.26],[-.94,1.97,2.26]],glass);
 panel('Sloping ambulance hood',[[-1.04,.98,2.82],[1.04,.98,2.82],[.98,1.22,2.65],[-.98,1.22,2.65]],white);
 for(const side of[-1,1]){rod([side*.98,1.19,2.67],[side*.98,2.01,2.24],.035,white);rod([side*.20,1.26,2.64],[side*.67,1.39,2.57],.008,dark);mesh('box',dark,[.10,.055,.28],[side*1.13,1.5,2.02],van);mesh('box',dark,[.13,.22,.15],[side*1.19,1.57,2.15],van);mesh('box',glass,[.018,.52,.73],[side*1.086,1.62,1.78],van);}
 const grille=mesh('box',dark,[1.10,.30,.07],[0,.76,2.84],van);grille.name='Ambulance front grille';for(let i=0;i<4;i++)mesh('box',material('#8497a0',{metalness:.75,roughness:.3}),[1.04,.014,.013],[0,.66+i*.065,2.882],van);
 const headlights=material('#fff0c5',{emissive:'#ffe4a6',emissiveIntensity:.5,roughness:.25});for(const side of[-1,1]){mesh('box',dark,[.43,.25,.07],[side*.80,.80,2.84],van);const lamp=mesh('box',headlights,[.34,.17,.045],[side*.80,.81,2.89],van);lamp.name='Ambulance aligned headlight';mesh('box',blue,[.20,.055,.035],[side*.76,1.04,2.81],van);}
 mesh('box',dark,[2.15,.15,.16],[0,.43,2.87],van);mesh('box',white,[.40,.12,.019],[0,.44,2.963],van);mesh('box',blue,[1.86,.06,.026],[0,1.025,2.81],van);
 const label=sign('AMBULANCE','',1.55,.22,{fontSize:48});label.name='Ambulance front identification';label.position.set(0,1.10,2.79);van.add(label);
 }
 makeCrew(){if(this.crew)return;const e=this.e;this.crew=new T.Group();this.crew.name='Paramedics with emergency stretcher';this.root.add(this.crew);
 const steel=material('#9cabb1',{metalness:.7}),linen=material('#b5c7d2'),rubber=material('#26333a');this.stretcher=new T.Group();this.crew.add(this.stretcher);mesh('box',steel,[.64,.07,1.95],[0,.78,0],this.stretcher);mesh('box',linen,[.58,.12,1.88],[0,.88,0],this.stretcher);
 for(const x of[-.28,.28])for(const z of[-.7,.7]){mesh('box',steel,[.035,.55,.035],[x,.47,z],this.stretcher);const wheel=mesh('cylinder',rubber,[.10,.045,.10],[x,.13,z],this.stretcher);wheel.rotation.z=Math.PI/2;}
 for(const x of[-.34,.34])mesh('box',steel,[.025,.025,1.7],[x,1.02,0],this.stretcher);
 this.medics=[0,1].map(i=>{const v=makePlayer(e.assets,i?'female':'male',{gender:i?'female':'male',skin:i?'#8b5d45':'#b98b69',accent:'#567e91',hairstyle:'cropped'},'nurse');v.root.position.z=i?1.5:-1.45;this.crew.add(v.root);this.avatars.push(v);return v;});
 this.patient=makePlayer(e.assets,'male',{gender:'male',skin:'#996d51',accent:'#8a929c',hairstyle:'cropped'},'patient');this.avatars.push(this.patient);this.crew.add(this.patient.root);this.patient.root.rotation.x=-Math.PI/2;this.patient.root.position.set(0,.99,.86);for(let i=0;i<8;i++)this.patient.animate(i*.05,0,.05);this.patient.poseActivity?.('rest',0);
 this.crew.visible=false;this.bedCollider={...footprint(0,0,.72,2.05,1.08),type:'emergency-stretcher',dynamic:true};
 }
 setVan(x,z,heading){const dt=Math.max(.016,this.e.mission.elapsed-(this.vanSampleAt??this.e.mission.elapsed));this.vanVelocity={x:this.vanSampleAt===undefined?0:(x-this.van.position.x)/dt,z:this.vanSampleAt===undefined?0:(z-this.van.position.z)/dt};this.vanSampleAt=this.e.mission.elapsed;const next=footprint(x+Math.sin(heading)*.255,z+Math.cos(heading)*.255,2.54,5.57,2.45,heading);if(this.e.hospitals[0].colliders.some(c=>c.type==='streetlamp'&&overlaps(next,c,.08)))return false;this.van.position.set(x,0,z);this.van.rotation.y=heading;const c=this.vanCollider,s=Math.sin(heading),co=Math.cos(heading),centerX=x+s*.255,centerZ=z+co*.255,halfX=Math.abs(s)*2.785+Math.abs(co)*1.27,halfZ=Math.abs(co)*2.785+Math.abs(s)*1.27;c.minX=centerX-halfX;c.maxX=centerX+halfX;c.minZ=centerZ-halfZ;c.maxZ=centerZ+halfZ;}
 syncBedBounds(){if(!this.crew)return;Object.assign(this.bedCollider,footprint(this.crew.position.x,this.crew.position.z,.72,2.05,1.09,this.crew.rotation.y,'emergency-stretcher'));const list=this.e.hospitals[0].colliders;if(this.crew.visible&&!list.includes(this.bedCollider))list.push(this.bedCollider);if(!this.crew.visible){const i=list.indexOf(this.bedCollider);if(i>=0)list.splice(i,1);}}
 yieldToCrew(n){
  const e=this.e,now=e.mission.elapsed;
  if(n.dead||n.evacuated||n.lying||n.baby||now<(n.nextEmergencyYield||0))return;
  n.nextEmergencyYield=now+.85;
  const nav=e.systems.navigationFor(0),p=this.crew.position;
  const candidates=[...nav.nodes.values()].filter(v=>distance(v.point,p)>1.6&&distance(v.point,p)<3.3&&distance(v.point,n.pos)<3&&e.canStand(v.point.x,v.point.z,.25,0)).sort((a,b)=>distance(a.point,n.pos)-distance(b.point,n.pos));
  const goal=candidates[0]?.point;if(!goal)return;
  n.emergencyYieldUntil=now+5;n.activity=null;n.reaction=0;
  // Security's SeatMotion must finish standing before following the yield
  // route; cancelling it would strand the guard inside the solid chair.
  if(!n.guardSeat){if(n.seated)e.systems.stand(n,goal);n.seated=false;n.baselineY=0;n.pos.y=0;}
  e.routeNPC(n,goal);
 }

 route(goal){const nav=this.transportNav=new EgressNavigation(this.e.levels[0],this.e.hospitals[0].colliders,{respectLocked:true});this.path=nav.smoothRoute(this.crew.position,goal).map(p=>({x:(p.x-11)*3,z:(p.z-11)*3}));if(this.path.length&&goal.z>40&&nav.clear(this.path.at(-1),goal))this.path.push({...goal});this.cursor=0;}
 start(){const e=this.e;this.van.visible=true;this.events++;this.stopping=this.events%3!==0;this.root.visible=true;this.phase='approach';this.phaseAt=e.mission.elapsed;this.setVan(-45,50,Math.PI/2);if(!e.hospitals[0].colliders.includes(this.vanCollider))e.hospitals[0].colliders.push(this.vanCollider);}
 moveCrew(dt){const e=this.e,goal=this.path?.[this.cursor];if(!goal)return !!this.path?.length;const pos=this.crew.position,d=distance(pos,goal);if(d<.08){this.cursor++;return this.cursor>=this.path.length;}
 // Open well before the leading medic/bed reaches the threshold; do not
 // admit any part of the rig while a swinging leaf is still in its path.
 for(const door of e.levels[0].doors){if(distance(pos,door)>3.7)continue;if(door.locked)return false;door.open=true;if(Math.abs(door.angle-door.openAngle)>.08)return false;}
 for(const entrance of e.hospitals[0].entrances||[])if(distance(pos,{x:1.5,z:34.5})<5.5){entrance.transportUntil=e.mission.elapsed+2;if(entrance.amount<.97)return false;}
 if(e.floor===0&&distance(pos,e.playerPos)<1.4)return false;
 const blocker=e.npcs.find(n=>n.floor===0&&!n.dead&&!n.evacuated&&!n.lying&&!n.baby&&distance(pos,n.pos)<1.4);
 if(blocker){this.yieldToCrew(blocker);return false;}
 const step=Math.min(d,1.15*dt),heading=Math.atan2(goal.x-pos.x,goal.z-pos.z);pos.x+=Math.sin(heading)*step;pos.z+=Math.cos(heading)*step;this.crew.rotation.y+=Math.atan2(Math.sin(heading-this.crew.rotation.y),Math.cos(heading-this.crew.rotation.y))*Math.min(1,dt*6);this.walking=true;return false;
 }
 update(dt){if(this.disposed)return;const e=this.e,now=e.mission.elapsed;if(e.mission.result)return;this.walking=false;
 if(this.phase==='idle'){if(now<this.nextAt||e.systems.evacuating||e.mission.targetDown)return;if(this.patientResting&&e.floor===0&&distance(e.playerPos,this.patient.root.position)<12){this.nextAt=now+20;return;}this.start();}
 const age=now-this.phaseAt;
 for(const {hinge,side}of this.rearDoors)hinge.rotation.y=T.MathUtils.damp(hinge.rotation.y,['unloading','transport','handover','return','loading'].includes(this.phase)?side*1.6:0,4,dt);
 for(let i=0;i<this.beacons.length;i++)this.beacons[i].material.emissiveIntensity=Math.sin(now*5+i*Math.PI)>.3?1.8:.3;
 if(this.phase==='approach'){
  if(!this.stopping){this.setVan(-45+age*6,50,Math.PI/2);if(age>16)this.finish();}
  else if(age<15){const t=Math.min(1,age/15),u=1-(1-t)**1.6;const path=new T.CubicBezierCurve3(new T.Vector3(-45,0,50),new T.Vector3(-3,0,50),new T.Vector3(1,0,43.2),new T.Vector3(7.8,0,43.2)),point=path.getPoint(u),heading=path.getTangent(u);this.setVan(point.x,point.z,Math.atan2(heading.x,heading.z));}
  else{this.setVan(7.8,43.2,Math.PI/2);this.makeCrew();this.patient.root.removeFromParent();this.crew.add(this.patient.root);this.patient.root.position.set(0,.99,.86);this.patient.root.rotation.set(-Math.PI/2,0,0);this.patientResting=false;this.patient.root.visible=true;this.crew.visible=true;this.crew.position.set(6.8,0,43.2);this.crew.rotation.y=Math.PI;
   const room=e.levels[0].rooms.find(r=>r.kind==='emergency');this.admit=e.systems.navigationFor(0).nearest(room.center).point;this.phase='unloading';this.phaseAt=now;}
 }else if(this.phase==='unloading'){this.crew.position.x=6.8-Math.min(1,age/3)*2.25;this.walking=true;if(age>=3){this.route(this.admit);this.phase='transport';}}
 else if(this.phase==='transport'&&this.moveCrew(dt)){this.phase='handover';this.phaseAt=now;}
 else if(this.phase==='handover'&&age>10){this.patient.root.getWorldPosition(this.patientPosition??=new T.Vector3());const rotation=this.patient.root.getWorldQuaternion(new T.Quaternion());this.patient.root.removeFromParent();this.root.add(this.patient.root);this.patient.root.position.copy(this.patientPosition);if(!this.admissionBed){this.admissionBed=this.stretcher.clone();this.admissionBed.name='Emergency admission bed supporting patient';this.root.add(this.admissionBed);}this.admissionBed.position.copy(this.crew.position);this.admissionBed.rotation.copy(this.crew.rotation);this.admissionCollider||={dynamic:true};Object.assign(this.admissionCollider,footprint(this.crew.position.x,this.crew.position.z,.72,2.05,1.08,this.crew.rotation.y,'admitted-patient-bed'));if(!e.hospitals[0].colliders.includes(this.admissionCollider))e.hospitals[0].colliders.push(this.admissionCollider);this.patient.root.quaternion.copy(rotation);this.patientResting=true;this.route({x:4.55,z:43.2});this.phase='return';}
 else if(this.phase==='return'&&this.moveCrew(dt)){this.phase='loading';this.phaseAt=now;}
 else if(this.phase==='loading'&&age>3){this.crew.visible=false;this.phase='depart';this.phaseAt=now;}
 else if(this.phase==='depart'){const t=Math.min(1,age/10),path=new T.CubicBezierCurve3(new T.Vector3(7.8,0,43.2),new T.Vector3(16,0,43.2),new T.Vector3(17,0,50),new T.Vector3(60,0,50)),point=path.getPoint(t*t),heading=path.getTangent(t*t);this.setVan(point.x,point.z,Math.atan2(heading.x,heading.z));if(age>10)this.finish();}
 this.syncBedBounds();
 e.audio.siren?.(['approach','depart'].includes(this.phase),{x:this.van.position.x,y:1.5,z:this.van.position.z},this.vanVelocity);
 for(const [index,medic]of(this.medics||[]).entries()){medic.animate(e.time,this.walking?1.15:0,dt);medic.poseActivity?.(index?'stretcher-pull':'stretcher-push',e.time);}
 }
 finish(){this.e.audio.siren?.(false,this.van.position);this.van.visible=false;this.phase='idle';this.nextAt=this.e.mission.elapsed+120+this.e.mission.random()*90;const list=this.e.hospitals[0].colliders,index=list.indexOf(this.vanCollider);if(index>=0)list.splice(index,1);this.van.visible=true;this.root.visible=!!this.patientResting;this.van.visible=false;}
 dispose(){if(this.disposed)return;this.disposed=true;this.e.audio.siren?.(false,this.van.position);for(const v of this.avatars){v.root.removeFromParent();if(v.dispose)v.dispose();else disposeObjectResources(v.root,{textures:true});}this.avatars=[];this.transportNav=null;const list=this.e.hospitals[0].colliders,index=list.indexOf(this.vanCollider);if(index>=0)list.splice(index,1);for(const c of [this.bedCollider,this.admissionCollider]){const i=list.indexOf(c);if(i>=0)list.splice(i,1);}this.root.removeFromParent();disposeObjectResources(this.root,{textures:true});this.root.clear();this.e=null;}
}
