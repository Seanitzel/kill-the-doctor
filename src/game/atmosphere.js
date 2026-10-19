import {fitPregnancy} from './appearance.js';
import {TargetAppointment,TARGET_PRIVACY_GRACE} from './appointments.js';
import {RoomPrivacy} from './room-privacy.js';
import {ROOM_WARNING_LINES} from './dialogue-v25.js';
import {addInfusion} from './care-props.js';
import {createCableGeometry,updateCableGeometry} from './dynamic-cable.js';
import {footprint} from './collision.js';
import * as THREE from 'three';
import { makePlayer, material, mesh } from './assets.js';
import { CLINICAL_KINDS, CONVERSATIONS, ENTRY_REACTIONS, CLINICAL_CONVERSATIONS, PATIENT_PAIN_LINES, activityVolume } from './life-rules.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const Y=new THREE.Vector3(0,1,0);
export class HospitalLife {
  constructor(engine) {
    this.infusions=[];this.nextSneeze=12;this.nextClinical=9;this.nextMachine=2;this.nextPain=18;this.listenerDirection=new THREE.Vector3();this.engine=engine;this.groups=[];this.cases=[];this.dialogues=[];this.queue=[];this.clouds=[];this.history=[];this.addedColliders=[];this.pendingCoughs=[];
    this.props=new THREE.Group();this.props.name='hospital-life-props';engine.scene.add(this.props);
    this.lastRoom=null;this.roomReactions=new Map();this.privacy=new RoomPrivacy();this.nextAmbient=0;this.nextMaternity=0;
    this.nextFlicker=45+engine.mission.random()*35;this.flicker=null;
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
    for(const floor of e.levels.map((_,i)=>i).filter(f=>f<3)) {
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
        const patient=this.actor(`${room.name} patient`,'patient',room.kind==='maternity'?'female':room.index%2?'male':'female',floor,room,bedX+Math.sin(rotation)*.85,bedZ+Math.cos(rotation)*.85,room.kind==='maternity'?'labor':'rest',{lying:true,y:1,bedRotation:rotation,contamination:room.kind==='emergency'?30:room.kind==='clinic'&&floor===1?60:0});
        let doctor=e.npcs.find(n=>n.room?.id===room.id&&n.id==='target')||e.npcs.find(n=>n.room?.id===room.id&&n.role==='doctor'&&!n.activity);
        const doctorX=clinic?bedX-1.1:bedX,doctorZ=clinic?bedZ:bedZ+1.1;
        if(!doctor) doctor=this.actor(`Dr. ${['Rowan','Avery','Morgan','Taylor'][room.index%4]} Mercer`,'doctor',room.index%2?'female':'male',floor,room,doctorX,doctorZ,'examine');
        doctor.activity='examine';doctor.pos.set(doctorX,0,doctorZ);doctor.visual.root.rotation.y=clinic?Math.PI/2:Math.PI;doctor.clinicalPatient=patient;doctor.reaction=0;
        const cable=new THREE.Mesh(createCableGeometry(),material('#27343d'));
        cable.userData.lifeOwned=true;this.props.add(cable);
        const disc=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),material('#adbfc9',{metalness:.65,roughness:.25}));disc.scale.set(1,.3,1);disc.userData.lifeOwned=true;this.props.add(disc);
        const standX=clinic?bedX+.95:bedX-.65,standZ=clinic?bedZ+.35:bedZ-.95;
        const endpoint={x:patient.pos.x-standX,y:1.08,z:patient.pos.z-standZ};
        const infusion=addInfusion(this.props,{x:standX,z:standZ,endpoint},e.materials||{});infusion.root.userData.floor=floor;
        e.hospitals[floor].colliders.push(infusion.collider);this.addedColliders.push({floor,obstacle:infusion.collider});this.infusions.push(infusion);
        const exam={room,patient,doctor,cable,disc,infusion,nextCable:0,nextMachine:4+room.index*1.8,nextCare:10+room.index*3};this.cases.push(exam);if(doctor.id==='target'){exam.appointment=new TargetAppointment(()=>e.mission.random());this.targetCase=exam;}
        if(room.kind==='maternity') this.maternity(room,patient,floor,minZ);
      }
    }
    for(const hospital of e.hospitals){
      const shop=hospital.pharmacy;if(!shop)continue;
      const clerk=this.actor('Pharmacist Maya Lewis','nurse','female',shop.floor,shop.room,shop.clerk.x,shop.clerk.z,'chat',{yaw:shop.clerk.yaw,skin:'#5c3c2d'});
      const customers=shop.queue.map((p,i)=>this.actor(['Prescription collection','Waiting for medicine','Waiting customer'][i],'patient',i%2?'male':'female',shop.floor,shop.room,p.x,p.z,'chat',{yaw:p.yaw,skin:['#bf8c6c','#41281f','#e1bca0'][i]}));
      this.groups.push({kind:'pharmacy',floor:shop.floor,actors:[customers[0],clerk],next:5,conversation:0});
      this.groups.push({kind:'pharmacy',floor:shop.floor,actors:[customers[1],customers[2]],next:18,conversation:1});
      for(const customer of customers){const paper=mesh('box',material('#d5e2de'),[.12,.16,.008],[.04,-.08,.03],customer.visual.hand||customer.visual.root);if(!customer.visual.hand)paper.position.set(.2,1.02,.3);}
      this.pharmacy={clerk,customers,shop};
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
    fitPregnancy(mother.visual);mother.pregnant=true;
    // A second clothed mother occupies the next maternity bed.
    const x=(room.x-11)*3-1.5+1.55,z=minZ+6.7;
    const other=this.actor('Maternity patient B','patient','female',floor,room,x+.85,z,'labor',{lying:true,y:1,bedRotation:Math.PI/2,skin:'#ba8c72'});
    fitPregnancy(other.visual);other.pregnant=true;
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
    const voiceVersion=actor.voiceVersion=(actor.voiceVersion||0)+1;
    e.audio.dialogue(text,actor.person,activityVolume(distance,true,e.lineOfSight(e.playerPos,actor.pos)),urgent,{x:actor.pos.x,y:actor.pos.y+1.45,z:actor.pos.z,floor:actor.floor},{speakerId:actor.id,isCurrent:()=>!this.disposed&&actor.voiceVersion===voiceVersion});
    actor.speakingUntil=e.mission.elapsed+Math.max(4,text.length*.07);
  }
  privacyWitness(room){
    if(!room||room.kind==='emergency'||(!CLINICAL_KINDS.includes(room.kind)&&room.kind!=='office'))return null;
    const e=this.engine;if(this.targetCase?.room.id===room.id&&this.targetCase.appointment.completed)return null;
    return e.npcs.filter(n=>n.room?.id===room.id&&n.floor===e.floor&&e.levels[n.floor].cells.get(`${Math.round(n.pos.x/3+11)},${Math.round(n.pos.z/3+11)}`)?.room===room.id&&!n.dead&&!n.evacuated&&!n.reporting&&['doctor','nurse'].includes(n.role)).sort((a,b)=>(a.id==='target'?0:a.role==='nurse'?1:2)-(b.id==='target'?0:b.role==='nurse'?1:2)||dist(e.playerPos,a.pos)-dist(e.playerPos,b.pos))[0]||null;
  }
  privacyResponse(actor,action){
    if(!actor||!action)return;const e=this.engine;
    actor.reaction=3.8;actor.wait=5;actor.path=[];actor.cursor=0;
    actor.visual.root.rotation.y=Math.atan2(e.playerPos.x-actor.pos.x,e.playerPos.z-actor.pos.z);
    this.speak(actor,ROOM_WARNING_LINES[action],true);this.nextAmbient=e.mission.elapsed+9;
    this.queue=this.queue.filter(line=>line.actor!==actor);
    if(action==='warning')e.notify('Patient privacy · leave this room before staff call security','warning');
    if(action==='security')e.systems?.witness(actor,'privacy');
  }
  reactToEntry(room){
    const actor=this.privacyWitness(room);if(!actor){this.privacy.leave();return;}
    this.privacyResponse(actor,this.privacy.enter(`${this.engine.floor}:${room.id}`,this.engine.mission.elapsed,room.id===this.engine.mission.target?.room.id?{warningDelay:TARGET_PRIVACY_GRACE,reportDelay:TARGET_PRIVACY_GRACE+10}:{}));
  }
  updateAppointment(room){
    const e=this.engine,item=this.targetCase;if(!item||e.mission.targetDown||item.doctor.dead||e.mission.state==='escape')return;
    const appointment=item.appointment,now=e.mission.elapsed;
    if(room?.id===item.room.id&&e.floor===item.room.floor)appointment.start(now);
    if(!appointment.update(now))return;
    item.completed=true;item.doctor.activity='rest';item.doctor.clinicalPatient=null;item.doctor.reaction=0;item.doctor.path=[];item.cable.visible=item.disc.visible=false;
    this.privacy.release(`${item.room.floor}:${item.room.id}`);
    this.queue=this.queue.filter(line=>line.actor!==item.patient&&line.actor!==item.doctor);
    const goal={x:0,z:18};e.systems.stand(item.patient,goal);item.patient.appointmentDeparture={goal};item.patient.speed=1.6;item.patient.contamination=0;e.systems.route(item.patient,goal);
    e.notify('Appointment complete · the patient is leaving. The doctor is available.','clue');
  }
  prepareNPC(n){
    if(n.reporting||n.evacuating)return false;
    const item=this.targetCase;
    if(item&&n===item.doctor&&!item.completed&&!n.dead){n.activity='examine';n.path=[];return true;}
    if(!n.appointmentDeparture)return false;
    const e=this.engine,goal=n.appointmentDeparture.goal;
    if(dist(n.pos,goal)<1.5){n.path=[];n.activity='rest';n.appointmentDeparture=null;}
    else if(n.cursor>=n.path.length&&n.wait<0)e.systems.route(n,goal);
    return true;
  }
  appointmentHUD(){
    const e=this.engine,item=this.targetCase;if(!item||item.appointment.startedAt===null||e.mission.targetDown)return null;
    const a=item.appointment,id=`${item.room.floor}:${item.room.id}`,privacy=this.privacy.rooms.get(id),warning=this.privacy.active===id&&privacy?.stage==='requested'?Math.max(0,Math.ceil(privacy.warningDelay-(e.mission.elapsed-privacy.enteredAt))):null;
    return {room:item.room.name,floor:item.room.floor,complete:a.completed,seconds:a.remaining(e.mission.elapsed),warningSeconds:warning};
  }
  triggerFlicker(duration=1.65) {
    const e=this.engine,fixtures=e.hospitals[e.floor].fixtures;
    const fixture=[...fixtures].sort((a,b)=>a.distanceToSquared(e.playerPos)-b.distanceToSquared(e.playerPos))[0];
    this.flicker={fixture:fixture.clone(),floor:e.floor,start:e.mission.elapsed,duration};if(e.audio.hospitalMachine)e.audio.hospitalMachine('zap',{x:fixture.x,y:fixture.y,z:fixture.z,floor:e.floor},.32);else e.audio.sound('flicker');
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
    if(sound==='sneeze'&&!patient.lying)this.sneeze(patient);
    else e.audio.patientWarning?.(sound,{x:patient.pos.x,y:1.5,z:patient.pos.z,floor:patient.floor});
    e.hooks.soundCaption?.(`A nearby patient ${sound==='sneeze'?'sneezes':'coughs'}. Keep your distance or put on a mask.`);
    this.pendingCoughs.push({patient,ready:e.mission.elapsed+(sound==='sneeze'?1.3:.85)});return true;
  }
  sneeze(patient){
    const e=this.engine,now=e.mission.elapsed;if(patient.dead||patient.lying||patient.baby)return false;
    patient.sneezeUntil=now+2.5;patient.sneezeApology=now+1.25;patient.reaction=1.7;
    if(!patient.tissue){const hand=patient.visual.hand||patient.visual.root;patient.tissue=mesh('box',material('#f2f0e9'),[.083,.065,.008],[-.018,.018,.035],hand);patient.tissue.name='Paper tissue covering nose';}
    patient.tissue.visible=true;
    e.audio.patientWarning?.('sneeze',{x:patient.pos.x,y:1.5,z:patient.pos.z,floor:patient.floor});e.hooks.soundCaption?.('A passing patient sneezes into a tissue.');return true;
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
    if(!emergency)this.updateAppointment(room);
    if(roomKey!==this.lastRoom){this.lastRoom=roomKey;if(!emergency)this.reactToEntry(room);else this.privacy.leave();}
    if(!emergency&&room)this.privacyResponse(this.privacyWitness(room),this.privacy.update(`${e.floor}:${room.id}`,now));
    for(const n of e.npcs) {
      if(n.dead||n.evacuated||n.floor!==e.floor||dist(e.playerPos,n.pos)>30)continue;
      if(n.animationVisible!==false&&!(n.movementSpeed>.15)&&(n.activity||n.worriedUntil>now)&&n.activity!=='newborn') {
        const pose=emergency&&!n.lying?'chat':n.worriedUntil>now&&!n.lying?'worried':n.activity;
        const angle=Math.atan2(e.playerPos.x-n.pos.x,e.playerPos.z-n.pos.z)-n.visual.root.rotation.y;
        n.visual.poseActivity?.(pose,e.time+Number(n.id.length),{seated:n.seated,reaction:n.reaction||emergency&&!n.lying?1:0,look:n.reaction?THREE.MathUtils.clamp(Math.atan2(Math.sin(angle),Math.cos(angle)),-.6,.6):0,restricted:!!e.nearStructure?.(n.pos,n.floor,.8)});
      }else if(n.animationVisible!==false&&!(n.movementSpeed>.15)&&n.reaction) n.visual.poseActivity?.('chat',e.time,{reaction:n.reaction,restricted:!!e.nearStructure?.(n.pos,n.floor,.8)});
      if(n.activity==='drink'&&!n.heldCoffeeCup&&n.visual.hand){const cup=new THREE.Group();cup.name='Coffee held during break';n.visual.hand.add(cup);cup.position.set(-.025,.02,.07);mesh('cylinder',material('#eeeade'),[.048,.09,.048],[0,0,0],cup);mesh('cylinder',material('#403027'),[.041,.004,.041],[0,.046,0],cup);mesh('box',material('#eeeade'),[.034,.04,.012],[.05,0,0],cup);n.heldCoffeeCup=cup;}
      if(n.heldCoffeeCup)n.heldCoffeeCup.visible=n.activity==='drink';
      if(n.sneezeUntil){
        if(now<n.sneezeUntil){n.visual.poseActivity?.('sneeze',e.time,{restricted:!!e.nearStructure?.(n.pos,n.floor,.65)});if(now>=n.sneezeApology){n.sneezeApology=Infinity;this.speak(n,'Oh, sorry. Excuse me.');}}
        else{n.tissue&&(n.tissue.visible=false);n.sneezeUntil=0;}
      }
      if(n.contamination&&n.nextCough<=now&&e.coughCooldown<=0&&dist(e.playerPos,n.pos)<3.1&&e.lineOfSight(e.playerPos,n.pos))this.beginCough(n);
    }
    if(!emergency&&now>=this.nextSneeze){const candidates=e.npcs.filter(n=>n.floor===e.floor&&n.role==='patient'&&!n.lying&&!n.baby&&!n.dead&&!n.evacuated&&!n.blind&&!n.recruit&&dist(n.pos,e.playerPos)<9&&dist(n.pos,e.playerPos)>1.5);if(candidates.length)this.sneeze(candidates[Math.floor(e.mission.random()*candidates.length)]);this.nextSneeze=now+35+e.mission.random()*35;}
    for(const item of this.cases) {
      if(item.completed){item.cable.visible=item.disc.visible=false;continue;}
      const diversion=e.extras?.lure,helping=diversion&&!diversion.recovered&&(item.doctor===diversion.responder||item.doctor===diversion.target&&diversion.phase!=='collapsed');
      const local=item.room.floor===e.floor,alive=!item.doctor.dead&&!item.doctor.evacuating&&!helping;item.cable.visible=item.disc.visible=local&&alive&&dist(e.playerPos,item.doctor.pos)<22&&!item.doctor.reaction;
      const d=dist(e.playerPos,item.patient.pos),source={x:item.patient.pos.x,y:1.15,z:item.patient.pos.z,floor:item.room.floor};
      if(local&&d<20&&now>=item.nextMachine&&now>=this.nextMachine){
        const gain=activityVolume(d,true,e.lineOfSight(e.playerPos,item.patient.pos))*.30;
        const kind=['icu','emergency'].includes(item.room.kind)?(Math.floor(now/20)%3===0?'ventilator':'monitor'):'blood-pressure';
        e.audio.hospitalMachine?.(kind,source,gain);item.nextMachine=now+(kind==='blood-pressure'?33:5.5);this.nextMachine=now+2.8;
      }
      if(!emergency&&alive&&local&&d<15&&now>=item.nextCare&&now>=this.nextClinical&&now>=this.nextAmbient&&!item.doctor.reaction){
        const kind=item.room.kind==='clinic'?'temperature':item.room.kind==='cardio'?'heart':'bloodPressure',pairs=CLINICAL_CONVERSATIONS[kind],pair=pairs[Math.floor(e.mission.random()*pairs.length)];
        this.speak(item.doctor,pair[0]);this.queue.push({actor:item.patient,text:pair[1],time:now+Math.max(4.2,pair[0].length*.07)+.5});
        item.nextCare=now+37+e.mission.random()*18;this.nextClinical=now+17;this.nextAmbient=now+12;
      }
      if(!emergency&&local&&!item.patient.dead&&d<12&&now>=this.nextPain&&now>=this.nextAmbient){
        e.audio.patientPain?.(item.patient.person,source,activityVolume(d,true,true)*.38);
        this.speak(item.patient,PATIENT_PAIN_LINES[Math.floor(e.mission.random()*PATIENT_PAIN_LINES.length)]);this.nextPain=now+28+e.mission.random()*17;this.nextAmbient=now+9;
      }
      if(!item.cable.visible||now<item.nextCable)continue;item.nextCable=now+.25;
      if(!item.doctor.reaction) item.doctor.visual.root.rotation.y=Math.atan2(item.patient.pos.x-item.doctor.pos.x,item.patient.pos.z-item.doctor.pos.z);
      const start=item.doctor.pos.clone().add(new THREE.Vector3(0,1.42,0));const end=item.patient.pos.clone().add(item.patient.hitOffset.clone());end.y=1.17;
      updateCableGeometry(item.cable.geometry,start,end);item.disc.position.copy(end);
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
    e.audio.setListener(e.camera.position,e.camera.getWorldDirection(this.listenerDirection),e.floor);
    if(now>=this.nextFlicker&&!e.blackout){this.triggerFlicker();this.nextFlicker=now+55+e.mission.random()*50;}
    const flicker=this.flickerLevel();this.flickerCover.visible=flicker<1;
    if(this.flicker){this.flickerCover.position.copy(this.flicker.fixture);this.flickerCover.position.y=3.502;}
    for(let i=this.pendingCoughs.length-1;i>=0;i--){const warning=this.pendingCoughs[i];if(now>=warning.ready){this.pendingCoughs.splice(i,1);if(!warning.patient.dead&&!warning.patient.evacuated)this.emitCloud(warning.patient);}}
    this.updateClouds(dt);
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;
    for(const {floor,obstacle} of this.addedColliders){const list=this.engine.hospitals[floor].colliders,index=list.indexOf(obstacle);if(index>=0)list.splice(index,1);}
    this.engine.audio.stopAmbient();for(const infusion of this.infusions)infusion.dispose();this.infusions.length=0;this.engine.scene.remove(this.props);
    this.props.traverse(o=>{if(o.userData.lifeOwned||o===this.flickerCover||o.isPoints){o.geometry?.dispose();o.material?.dispose();}});
    this.clouds.forEach(c=>c.texture.dispose());this.props.clear();for(const list of [this.clouds,this.groups,this.cases,this.queue,this.dialogues,this.history,this.pendingCoughs,this.addedColliders])list.length=0;this.roomReactions.clear();this.privacy.dispose();this.targetCase=null;
  }
}
