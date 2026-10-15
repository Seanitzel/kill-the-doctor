import {footprint} from './collision.js';
import * as THREE from 'three';
import { makePlayer, material, mesh } from './assets.js';
import { CLINICAL_KINDS, CONVERSATIONS, ENTRY_REACTIONS, activityVolume } from './life-rules.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const Y=new THREE.Vector3(0,1,0);
export class HospitalLife {
  constructor(engine) {
    this.engine=engine;this.groups=[];this.cases=[];this.dialogues=[];this.queue=[];this.clouds=[];this.history=[];this.addedColliders=[];this.pendingCoughs=[];
    this.props=new THREE.Group();this.props.name='hospital-life-props';engine.scene.add(this.props);
    this.lastRoom=null;this.roomReactions=new Map();this.nextAmbient=0;this.nextMaternity=0;
    this.nextFlicker=8+engine.mission.random()*7;this.flicker=null;
    this.flickerCover=new THREE.Mesh(new THREE.BoxGeometry(1.235,.015,.565),new THREE.MeshBasicMaterial({color:'#172733'}));this.flickerCover.visible=false;this.props.add(this.flickerCover);
    this.setup();
  }
  propBox(parent,color,size,pos) {const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color));o.position.set(...pos);o.castShadow=true;o.userData.lifeOwned=true;parent.add(o);return o;}
  propSphere(parent,color,size,pos) {const o=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),material(color));o.scale.set(...size);o.position.set(...pos);o.userData.lifeOwned=true;parent.add(o);return o;}
  actor(name,role,gender,floor,room,x,z,activity,options={}) {
    const person={name,gender,skin:options.skin||'#d2ad94',hair:options.hair||'#4d4034',accent:role==='patient'?'#91aebe':'#719fb6',role:role==='doctor'?'Consultant':'Ward nurse'};
    const n=this.engine.spawnNPC(person,role,floor,{x,z},room,`life-${name.toLowerCase().replace(/[^a-z0-9]/g,'')}-${floor}`,{fixed:true,...options});
    n.activity=activity;n.seated=!!options.seated;n.baselineY=n.seated?-.35:options.y||0;n.pos.y=n.baselineY;
    n.visual.root.rotation.y=options.yaw||0;n.contamination=options.contamination||0;n.nextCough=3;
    if(options.lying) {
      n.lying=true;n.visual.root.quaternion.setFromAxisAngle(Y,options.bedRotation||0).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2));
      n.hitOffset=new THREE.Vector3(-Math.sin(options.bedRotation||0)*.9,.13,-Math.cos(options.bedRotation||0)*.9);n.hitRadius=.46;
    }
    return n;
  }
  setup() {
    const e=this.engine;
    for(const floor of e.levels.map((_,i)=>i)) {
      const nurseA=this.actor(floor?'Nurse Nora Ellis':'Nurse Iris Lowe','nurse','female',floor,null,-2.8,11.2,'chat',{yaw:0});
      const nurseB=this.actor(floor?'Nurse Samir Rao':'Nurse Felix Shaw','nurse','male',floor,null,-2.8,12.9,'chat',{yaw:Math.PI});
      this.groups.push({kind:'nurses',floor,actors:[nurseA,nurseB],next:4,conversation:floor});
      const patientA=this.actor('Waiting patient A','patient','female',floor,null,-6,29,'chat',{seated:true,yaw:Math.PI/2});
      const patientB=this.actor('Waiting patient B','patient','male',floor,null,-6,31.3,'chat',{seated:true,yaw:Math.PI/2,skin:'#996d51'});
      this.groups.push({kind:'patients',floor,actors:[patientA,patientB],next:6,conversation:floor});
      for(const room of e.levels[floor].rooms.filter(r=>CLINICAL_KINDS.includes(r.kind))) {
        const minX=(room.x-11)*3-1.5,maxX=(room.x+room.w-1-11)*3+1.5,minZ=(room.z-11)*3-1.5;
        const clinic=room.kind==='clinic',rotation=clinic?0:Math.PI/2;
        const bedX=clinic?maxX-1.9:minX+1.55,bedZ=clinic?room.center.z:minZ+3;
        const patient=this.actor(`${room.name} patient`,'patient',room.index%2?'male':'female',floor,room,bedX+Math.sin(rotation)*.85,bedZ+Math.cos(rotation)*.85,room.kind==='maternity'?'labor':'rest',{lying:true,y:1,bedRotation:rotation,contamination:room.kind==='emergency'?30:room.kind==='clinic'&&floor===1?60:0});
        let doctor=e.npcs.find(n=>n.room?.id===room.id&&n.id!=='target'&&n.role==='doctor'&&!n.activity);
        const doctorX=clinic?bedX-1.1:bedX,doctorZ=clinic?bedZ:bedZ+1.1;
        if(!doctor) doctor=this.actor(`Dr. ${['Rowan','Avery','Morgan','Taylor'][room.index%4]} Mercer`,'doctor',room.index%2?'female':'male',floor,room,doctorX,doctorZ,'examine');
        doctor.activity='examine';doctor.pos.set(doctorX,0,doctorZ);doctor.visual.root.rotation.y=clinic?Math.PI/2:Math.PI;doctor.clinicalPatient=patient;doctor.reaction=0;
        const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(0,-.3,.1),new THREE.Vector3(.2,-.4,.4)]),12,.014,5,false),material('#27343d'));
        cable.userData.lifeOwned=true;this.props.add(cable);
        const disc=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),material('#adbfc9',{metalness:.65,roughness:.25}));disc.scale.set(1,.3,1);disc.userData.lifeOwned=true;this.props.add(disc);
        this.cases.push({room,patient,doctor,cable,disc,nextCable:0});
        if(room.kind==='maternity') this.maternity(room,patient,floor,minZ);
      }
    }
    const cafe=e.levels[0].rooms.find(r=>r.kind==='cafe');
    const minX=(cafe.x-11)*3-1.5,minZ=(cafe.z-11)*3-1.5,maxX=(cafe.x+cafe.w-1-11)*3+1.5;
    [[minX+2,minZ+3],[maxX-2,cafe.center.z+2],[minX+2,(cafe.z+cafe.h-1-11)*3+1.5-3]].forEach(([x,z],i)=>{
      const a=this.actor(`Cafeteria diner ${i*2+1}`,i===0?'nurse':'patient',i%2?'male':'female',0,cafe,x,z-1.45,'eat',{seated:true});
      const b=this.actor(`Cafeteria diner ${i*2+2}`,i===2?'doctor':'patient',i%2?'female':'male',0,cafe,x,z+1.45,'eat',{seated:true,yaw:Math.PI});
      this.groups.push({kind:'cafe',floor:0,actors:[a,b],next:2+i*3,conversation:i});
      for(const diner of [a,b]) if(diner.visual.hand) {mesh('box',material('#b3c2ce',{metalness:.6}),[.14,.012,.015],[-.055,.015,.025],diner.visual.hand);mesh('sphere',material('#b3c2ce',{metalness:.6}),[.028,.008,.019],[-.14,.015,.025],diner.visual.hand);}
      const tableProps=new THREE.Group();tableProps.name='cafeteria-meal';this.props.add(tableProps);
      for(const side of [-1,1]) {
        const plate=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.025,24),material('#e4edf0'));plate.position.set(x,.874,z+side*.58);plate.userData.lifeOwned=true;tableProps.add(plate);
        this.propSphere(tableProps,'#bc977a',[.085,.025,.13],[x-.04,.903,z+side*.58]);this.propSphere(tableProps,'#889e70',[.055,.025,.075],[x+.09,.9,z+side*.58]);
        const cup=new THREE.Mesh(new THREE.CylinderGeometry(.065,.06,.13,12),material('#bfd2df'));cup.position.set(x+.36,.95,z+side*.51);cup.userData.lifeOwned=true;tableProps.add(cup);
      }
      tableProps.userData.floor=0;
    });
  }
  maternity(room,mother,floor,minZ) {
    const e=this.engine;
    const belly=mesh('sphere',material('#93afbd'),[.27,.3,.3],[0,1.08,.17],mother.visual.root);belly.name='clothed-pregnancy-belly';mother.pregnant=true;
    // A second clothed mother occupies the next maternity bed.
    const x=(room.x-11)*3-1.5+1.55,z=minZ+6.7;
    const other=this.actor('Maternity patient B','patient','female',floor,room,x+.85,z,'labor',{lying:true,y:1,bedRotation:Math.PI/2,skin:'#ba8c72'});
    mesh('sphere',material('#91adbd'),[.27,.31,.3],[0,1.08,.17],other.visual.root).name='clothed-pregnancy-belly';other.pregnant=true;
    const nursery=new THREE.Group();nursery.name='newborn-bassinets';nursery.userData.floor=floor;this.props.add(nursery);
    for(let i=0;i<2;i++) {
      const bx=room.center.x+1.65,bz=minZ+5+i*3.8;
      const obstacle=footprint(bx,bz,.66,1.05,1.12,0,'bassinet');this.engine.hospitals[floor].colliders.push(obstacle);this.addedColliders.push({floor,obstacle});
      this.propBox(nursery,'#9cb0bf',[.62,.06,.97],[bx,.73,bz]);this.propBox(nursery,'#e3ebef',[.54,.12,.88],[bx,.82,bz]);
      for(const dx of [-.31,.31]) this.propBox(nursery,'#a5c5d4',[.035,.3,.96],[bx+dx,.94,bz]);
      for(const dz of [-.48,.48]) this.propBox(nursery,'#a5c5d4',[.62,.3,.035],[bx,.94,bz+dz]);
      for(const dx of [-.23,.23]) for(const dz of [-.36,.36]) this.propBox(nursery,'#8195a4',[.035,.67,.035],[bx+dx,.36,bz+dz]);
      const visual={root:new THREE.Group(),animate(time){this.head.position.y=1.04+Math.sin(time*5)*.004;}};
      visual.head=this.propSphere(visual.root,'#d9af94',[.087,.075,.095],[0,1.04,-.25]);
      this.propSphere(visual.root,'#dce9ef',[.155,.085,.26],[0,.99,.055]);this.propSphere(visual.root,'#a1c1d1',[.155,.078,.22],[0,1.015,.08]);
      const baby=e.spawnNPC({name:`Newborn ${i+1}`,gender:'female'},'patient',floor,{x:bx,z:bz},room,`newborn-${i}`,{fixed:true,visual});
      baby.activity='newborn';baby.baby=true;baby.hitOffset=new THREE.Vector3(0,1.0,0);baby.hitRadius=.3;baby.contamination=0;baby.nextCough=Infinity;
      this.newbornSource= {x:bx,y:1,z:bz,floor};
    }
    this.laborSource={x:mother.pos.x,y:1.2,z:mother.pos.z,floor};
  }
  speak(actor,text,urgent=false) {
    const e=this.engine;if(actor.dead||actor.floor!==e.floor)return;
    const distance=dist(e.playerPos,actor.pos);if(distance>18)return;
    this.dialogues=this.dialogues.filter(d=>d.actor!==actor&&d.until>e.mission.elapsed);
    this.dialogues.push({actor,text,until:e.mission.elapsed+Math.max(4.5,text.length*.07)});
    this.history.push({speaker:actor.name,text,time:e.mission.elapsed});if(this.history.length>30)this.history.shift();
    e.audio.dialogue(text,actor.person,activityVolume(distance,true,e.lineOfSight(e.playerPos,actor.pos)),urgent,{x:actor.pos.x,y:actor.pos.y+1.45,z:actor.pos.z,floor:actor.floor});
    actor.speakingUntil=e.mission.elapsed+Math.max(4,text.length*.07);
  }
  reactToEntry(room) {
    const e=this.engine,now=e.mission.elapsed;
    if(!room || (!CLINICAL_KINDS.includes(room.kind) && room.kind!=='office') || (this.roomReactions.get(room.id)||-100)+30>now)return;
    const witnesses=e.npcs.filter(n=>n.room?.id===room.id&&!n.dead&&['doctor','nurse'].includes(n.role));
    const closest=witnesses.sort((a,b)=>dist(e.playerPos,a.pos)-dist(e.playerPos,b.pos))[0];if(!closest)return;
    this.roomReactions.set(room.id,now);closest.reaction=3.8;closest.wait=5;closest.path=[];closest.cursor=0;
    closest.visual.root.rotation.y=Math.atan2(e.playerPos.x-closest.pos.x,e.playerPos.z-closest.pos.z);
    const phrases=room.kind==='maternity'?ENTRY_REACTIONS.maternity:CLINICAL_KINDS.includes(room.kind)?ENTRY_REACTIONS.clinical:ENTRY_REACTIONS.office;
    this.speak(closest,phrases[Math.floor(e.mission.random()*phrases.length)],true);this.nextAmbient=now+6;
  }
  triggerFlicker(duration=1.65) {
    const e=this.engine,fixtures=e.hospitals[e.floor].fixtures;
    const fixture=[...fixtures].sort((a,b)=>a.distanceToSquared(e.playerPos)-b.distanceToSquared(e.playerPos))[0];
    this.flicker={fixture:fixture.clone(),floor:e.floor,start:e.mission.elapsed,duration};e.audio.sound('flicker');
  }
  flickerLevel() {
    if(!this.flicker||this.flicker.floor!==this.engine.floor)return 1;
    const t=this.engine.mission.elapsed-this.flicker.start;
    if(t>=this.flicker.duration)return 1;
    return [[.05,.14],[.3,.42],[.65,.75],[1.03,1.15],[1.4,1.48]].some(([a,b])=>t>=a&&t<b)?.12:1;
  }
  beginCough(patient){
    const e=this.engine;if(!patient.contamination||this.pendingCoughs.some(p=>p.patient===patient))return false;
    const sound=e.mission.random()<.3?'sneeze':'cough';patient.coughing=1.5;patient.nextCough=e.mission.elapsed+65+e.mission.random()*20;
    e.audio.patientWarning?.(sound,{x:patient.pos.x,y:1.5,z:patient.pos.z,floor:patient.floor});
    e.hooks.soundCaption?.(`A nearby patient ${sound==='sneeze'?'sneezes':'coughs'}. Keep your distance or put on a mask.`);
    this.pendingCoughs.push({patient,ready:e.mission.elapsed+.85});return true;
  }
  emitCloud(patient) {
    const e=this.engine;if(!patient.contamination)return null;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(171,231,132,.8)');g.addColorStop(.4,'rgba(109,196,83,.45)');g.addColorStop(1,'rgba(72,147,67,0)');c.fillStyle=g;c.fillRect(0,0,64,64);
    const texture=new THREE.CanvasTexture(canvas),geometry=new THREE.BufferGeometry(),count=28,positions=new Float32Array(count*3),seeds=[];
    for(let i=0;i<count;i++)seeds.push({angle:e.mission.random()*Math.PI*2,radius:.25+e.mission.random()*1.55,height:e.mission.random()*.8});
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const mat=new THREE.PointsMaterial({map:texture,size:.72,transparent:true,opacity:.48,depthWrite:false,color:'#96d67d',sizeAttenuation:true});
    const points=new THREE.Points(geometry,mat);points.frustumCulled=false;this.props.add(points);
    const origin=patient.visual.head?.getWorldPosition?.(new THREE.Vector3()) || patient.pos.clone().add(new THREE.Vector3(0,1.48,0));
    origin.add(patient.lying?new THREE.Vector3(0,.08,0):new THREE.Vector3(Math.sin(patient.visual.root.rotation.y)*.18,.02,Math.cos(patient.visual.root.rotation.y)*.18));
    points.position.copy(origin);const cloud={patient,points,texture,origin,seeds,life:5,age:0,exposed:false,floor:patient.floor};this.clouds.push(cloud);
    return cloud;
  }
  updateClouds(dt) {
    const e=this.engine;
    for(let i=this.clouds.length-1;i>=0;i--) {
      const cloud=this.clouds[i];cloud.age+=dt;cloud.life-=dt;cloud.points.visible=cloud.floor===e.floor;
      const positions=cloud.points.geometry.attributes.position;
      cloud.seeds.forEach((s,j)=>{const spread=Math.min(1,cloud.age/1.4);positions.setXYZ(j,Math.cos(s.angle)*s.radius*spread,s.height*.5+cloud.age*.1,Math.sin(s.angle)*s.radius*spread);});positions.needsUpdate=true;
      cloud.points.material.opacity=.5*Math.min(1,cloud.life/1.4);
      if(!cloud.exposed&&cloud.floor===e.floor&&dist(e.playerPos,cloud.origin)<2.15&&e.lineOfSight(e.playerPos,cloud.patient.pos)) {cloud.exposed=true;e.triggerCough(cloud.patient);}
      if(cloud.life<=0){this.props.remove(cloud.points);cloud.points.geometry.dispose();cloud.points.material.dispose();cloud.texture.dispose();this.clouds.splice(i,1);}
    }
  }
  dialogueHUD() {
    const e=this.engine;if(!e.mission)return [];
    return this.dialogues.filter(d=>!d.actor.dead&&d.actor.floor===e.floor&&d.until>e.mission.elapsed&&e.lineOfSight(e.playerPos,d.actor.pos)).slice(-2).flatMap(d=>{
      const head=d.actor.visual.head?.getWorldPosition?.(new THREE.Vector3())||d.actor.pos.clone().add(new THREE.Vector3(0,1.65,0));head.y+=.34;const p=head.project(e.camera);
      if(p.z>1||p.z<0||Math.abs(p.x)>1.1)return [];
      return [{speaker:d.actor.name,text:d.text,x:THREE.MathUtils.clamp((p.x+1)*50,12,88),y:THREE.MathUtils.clamp((1-p.y)*50,20,78)}];
    });
  }
  update(dt) {
    const e=this.engine,now=e.mission.elapsed,emergency=e.mission.state==='escape';
    const cell=e.levels[e.floor].cells.get(`${Math.round(e.playerPos.x/3+11)},${Math.round(e.playerPos.z/3+11)}`),room=e.levels[e.floor].rooms.find(r=>r.id===cell?.room);
    const roomKey=room?.id||`hall-${e.floor}`;
    if(roomKey!==this.lastRoom){this.lastRoom=roomKey;if(room&&!emergency)this.reactToEntry(room);}
    for(const n of e.npcs) {
      if(n.dead||n.evacuated||n.floor!==e.floor||dist(e.playerPos,n.pos)>30)continue;
      if(n.activity&&n.activity!=='newborn') {
        const pose=emergency&&!n.lying?'chat':n.activity;
        const angle=Math.atan2(e.playerPos.x-n.pos.x,e.playerPos.z-n.pos.z)-n.visual.root.rotation.y;
        n.visual.poseActivity?.(pose,e.time+Number(n.id.length),{seated:n.seated,reaction:n.reaction||emergency&&!n.lying?1:0,look:n.reaction?THREE.MathUtils.clamp(Math.atan2(Math.sin(angle),Math.cos(angle)),-.6,.6):0});
      }else if(n.reaction) n.visual.poseActivity?.('chat',e.time,{reaction:n.reaction});
      if(n.contamination&&n.nextCough<=now&&e.coughCooldown<=0&&dist(e.playerPos,n.pos)<3.1&&e.lineOfSight(e.playerPos,n.pos))this.beginCough(n);
    }
    for(const item of this.cases) {
      const local=item.room.floor===e.floor,alive=!item.doctor.dead&&!item.doctor.evacuating;item.cable.visible=item.disc.visible=local&&alive&&dist(e.playerPos,item.doctor.pos)<22&&!item.doctor.reaction;
      if(!item.cable.visible||now<item.nextCable)continue;item.nextCable=now+.25;
      if(!item.doctor.reaction) item.doctor.visual.root.rotation.y=Math.atan2(item.patient.pos.x-item.doctor.pos.x,item.patient.pos.z-item.doctor.pos.z);
      const start=item.doctor.pos.clone().add(new THREE.Vector3(0,1.42,0));const end=item.patient.pos.clone().add(item.patient.hitOffset.clone());end.y=1.17;
      const mid=start.clone().lerp(end,.55);mid.y-=.35;item.cable.geometry.dispose();item.cable.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start,mid,end]),12,.014,5,false);item.disc.position.copy(end);
    }
    this.props.children.forEach(o=>{if(o.userData.floor!==undefined)o.visible=o.userData.floor===e.floor;});
    if(!emergency&&now>=this.nextAmbient) {
      const near=this.groups.filter(g=>g.floor===e.floor&&g.next<=now&&g.actors.every(n=>!n.dead)&&dist(e.playerPos,g.actors[0].pos)<11).sort((a,b)=>dist(e.playerPos,a.actors[0].pos)-dist(e.playerPos,b.actors[0].pos));
      if(near.length) {
        const group=near[0],lines=CONVERSATIONS[group.kind][group.conversation++%CONVERSATIONS[group.kind].length];this.speak(group.actors[0],lines[0]);
        this.queue.push({actor:group.actors[1],text:lines[1],time:now+Math.max(4.2,lines[0].length*.07)+.4});group.next=now+14+e.mission.random()*10;this.nextAmbient=now+Math.max(14,(lines[0].length+lines[1].length)*.07+2);
      }
    }
    for(let i=this.queue.length-1;i>=0;i--)if(this.queue[i].time<=now){const line=this.queue.splice(i,1)[0];if(!emergency)this.speak(line.actor,line.text);}
    this.dialogues=this.dialogues.filter(d=>d.until>now&&!d.actor.dead);
    if(this.newbornSource) {
      const source=this.newbornSource,d=dist(e.playerPos,source),gain=activityVolume(d,source.floor===e.floor,room?.kind==='maternity');
      e.audio.ambientSample('newborn','newborn',source,gain*.72);
      if(now>=this.nextMaternity&&gain>.08){e.audio.playSample('labor',this.laborSource,gain*.7);e.audio.playSample('breathing',this.laborSource,gain*.35);this.nextMaternity=now+15+e.mission.random()*8;e.hooks.soundCaption?.('A mother cries out. Newborns are crying in the nursery.');}
    }
    e.audio.setListener(e.camera.position,e.camera.getWorldDirection(new THREE.Vector3()),e.floor);
    if(now>=this.nextFlicker&&!e.blackout){this.triggerFlicker();this.nextFlicker=now+12+e.mission.random()*17;}
    const flicker=this.flickerLevel();this.flickerCover.visible=flicker<1;
    if(this.flicker){this.flickerCover.position.copy(this.flicker.fixture);this.flickerCover.position.y=3.502;}
    for(let i=this.pendingCoughs.length-1;i>=0;i--){const warning=this.pendingCoughs[i];if(now>=warning.ready){this.pendingCoughs.splice(i,1);if(!warning.patient.dead&&!warning.patient.evacuated)this.emitCloud(warning.patient);}}
    this.updateClouds(dt);
  }
  dispose() {
    for(const {floor,obstacle} of this.addedColliders){const list=this.engine.hospitals[floor].colliders,index=list.indexOf(obstacle);if(index>=0)list.splice(index,1);}
    this.engine.audio.stopAmbient();this.engine.scene.remove(this.props);
    this.props.traverse(o=>{if(o.userData.lifeOwned||o===this.flickerCover||o.isPoints){o.geometry?.dispose();o.material?.dispose();}});
    this.clouds.forEach(c=>c.texture.dispose());this.clouds=[];
  }
}
