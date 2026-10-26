import {ROOM_WARNING_LINES} from './dialogue-v25.js';
import{footprint}from'./collision.js';
import{CovertRecorder}from'./covert-recorder.js';
import*as T from'three';import{mesh,material,sign}from'./assets.js';import{tileAt,key}from'./layout.js';import{disposeObjectResources}from'./resources.js';import{RECORDING_ANGLES,THIRD_DOCTOR_ARRIVAL}from'./china-rules.js';import{instrumentTray,disguiseProps}from'./infiltration-props.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class ChinaOperation{
 constructor(e,patient){this.e=e;this.patient=patient;this.case=e.mission.china;this.root=new T.Group();this.root.name='China covert operation';this.addedColliders=[];e.scene.add(this.root);this.recorder=new CovertRecorder(e.renderer?.domElement,e.mission.videoClips);this.nextVisitor=90+e.mission.random()*45;this.setup();}
 prop(floor,x,y,z,name){const root=new T.Group();root.position.set(x,y,z);root.userData.floor=floor;root.name=name;this.root.add(root);return root;}
 obstacle(floor,x,z,w,d,h){const c=footprint(x,z,w,d,h,0,'infiltration-prop');this.e.hospitals[floor].colliders.push(c);this.addedColliders.push({floor,c});this.e.systems.navigation[floor]=null;}
 setup(){
  const e=this.e;this.office=e.levels[0].rooms.find(r=>r.kind==='office');this.doors=e.levels[0].doors.filter(d=>d.room===this.office.id);for(const door of this.doors){door.open=false;door.locked=false;}
  const work=e.hospitals[0].workstations.find(w=>w.room===this.office.id),nav=e.systems.navigationFor(0);this.home=nav.nearest(work?.stand||this.office.center).point;
  // Keep this private office free of unrelated fixed staff, using real walkable positions.
  for(const n of e.npcs.filter(n=>n.floor===0&&n.room?.id===this.office.id)){n.room=null;n.fixed=false;const spot=nav.nearest({x:0,z:18+n.pos.x%3}).point;n.pos.set(spot.x,0,spot.z);n.path=[];n.activity='rest';}
  this.doctor=e.spawnNPC({name:'Dr. Liu Wen',gender:'male',skin:'#d3a98a',hair:'#242323',hairstyle:'cropped',accent:'#e2e8ec',castCountry:'china',voiceCountry:'china',voiceRole:'doctor'},'doctor',0,this.home,this.office,'china-third-doctor',{fixed:true});this.phase='working';this.breakAt=18+e.mission.random()*12;this.doctor.activity='rest';this.doctor.visual.root.rotation.y=Math.PI/2;
  this.cupPoint=work?.cup||{x:this.home.x,z:this.home.z+.6};const cup=this.prop(0,this.cupPoint.x,.91,this.cupPoint.z,'Third doctor personal cup');mesh('cylinder',material('#e7e8dc'),[.07,.14,.07],[0,0,0],cup);mesh('cylinder',material('#41302a'),[.06,.005,.06],[0,.073,0],cup);
  const bathroom=e.hospitals[0].bathrooms[0],room=e.levels[0].rooms.find(r=>r.kind==='bathroom');this.changePoint=nav.nearest(bathroom?.anchors?.center||room.center).point;const locker=this.prop(0,this.changePoint.x,.75,this.changePoint.z-.5,'Disguise supply locker');mesh('box',material('#587b91'),[.55,1.5,.35],[0,0,0],locker);const label=sign('STAFF SCRUBS','CAP / MASK',.65,.25);label.position.set(0,.50,.19);locker.add(label);this.obstacle(0,this.changePoint.x,this.changePoint.z-.5,.55,.35,1.6);
  this.bathroomGoal={...nav.nearest(room.center).point};this.setupDrawers(nav);
  this.trayPoint={x:3,z:-3};this.tray=instrumentTray(this.root,this.trayPoint.x,this.trayPoint.z);this.obstacle(3,this.trayPoint.x,this.trayPoint.z,2.8,.8,1.34);this.trayView={position:new T.Vector3(3,2.35,-.9),target:new T.Vector3(3,1.05,-3)};
  this.angles=[{...RECORDING_ANGLES[0],x:-5,z:-1},{...RECORDING_ANGLES[1],x:1.5,z:1.5},{...RECORDING_ANGLES[2],x:3,z:-9}];
  const navB=e.systems.navigationFor(3),used=[];this.angles=this.angles.map(a=>{const candidates=[...navB.nodes.values()].filter(n=>dist(n.point,this.patient.pos)>2.4&&dist(n.point,this.patient.pos)<9&&used.every(p=>dist(n.point,p)>2.5)&&e.lineOfSight(n.point,this.patient.pos,3)).sort((p,q)=>dist(p.point,a)-dist(q.point,a));const point=candidates[0]?.point||navB.nearest(a).point;used.push(point);return{...a,...point};});
  for(const a of this.angles){const marker=this.prop(3,a.x,.015,a.z,`Recording angle: ${a.name}`);const ring=new T.Mesh(new T.RingGeometry(.28,.33,24),new T.MeshBasicMaterial({color:'#a4cddb',transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;marker.add(ring);a.marker=marker;}
 }
 roomOf(pos,floor=0){const cell=tileAt(pos.x,pos.z);return this.e.levels[floor].cells.get(key(cell.x,cell.z))?.room;}
 witness(){const e=this.e;return e.npcs.find(n=>!n.dead&&!n.evacuated&&!n.lying&&!n.baby&&!n.blind&&n.floor===0&&dist(n.pos,e.playerPos)<8&&((e.playerPos.x-n.pos.x)*Math.sin(n.visual.root.rotation.y)+(e.playerPos.z-n.pos.z)*Math.cos(n.visual.root.rotation.y)>.15*dist(n.pos,e.playerPos)||dist(n.pos,e.playerPos)<1.2)&&e.lineOfSight(n.pos,e.playerPos,0));}
 say(text){const e=this.e,n=e.npcs.find(n=>n.operationDoctor&&!n.dead)||this.doctor;e.life?.speak(n,text,true);e.hooks.soundCaption?.(text);}
 doorPrompt(door){return this.doors.includes(door)&&this.case.poisoned?`${door.locked?'Unlock and open':'Close and lock'} · Records office`:null;}
 handleDoor(door){if(!this.doors.includes(door)||!this.case.poisoned)return false;
  if(door.locked){for(const d of this.doors)d.locked=false;door.open=true;this.case.sealed=false;this.e.notify('Office unlocked · close and lock it again from the corridor before leaving.');}
  else{if(this.doors.some(d=>!this.e.doorCanSwingTo(d,0,0))){this.e.notify('Stand clear of both doorways to close and lock the office.');return true;}for(const d of this.doors){d.open=false;d.locked=true;}this.sealing=true;this.e.notify('Closing and locking the office doors…');}
  this.e.systems.navigation=[];return true;
 }
 setupDrawers(nav){
  const e=this.e,r=this.office;this.drawers=[];this.keyDrawer=Math.floor(e.mission.random()*3);
  // A compact cupboard uses the rear wall; search points stay in its clear aisle.
  const x=r.center.x-2,z=r.center.z-2,root=this.prop(0,x,0,z,'Searchable office cupboard');
  mesh('box',material('#647a83'),[.95,1.45,.48],[0,.73,0],root);this.obstacle(0,x,z,.95,.48,1.46);
  for(let i=0;i<3;i++){const drawer=new T.Group();drawer.position.set(0,.30+i*.43,.26);root.add(drawer);mesh('box',material('#a3b0b4'),[.85,.36,.055],[0,0,0],drawer);mesh('box',material('#253941'),[.23,.025,.055],[0,.01,.055],drawer);this.drawers.push({id:`cupboard-${i}`,kind:'cupboard',index:i,root:drawer,x,z:z+.9,searched:false});}
  // The existing desk has separate decoy drawers, rather than a second desk in the doorway.
  for(let i=0;i<2;i++){const drawer=this.prop(0,this.cupPoint.x-.25,.55-i*.22,this.cupPoint.z,'Searchable desk drawer');mesh('box',material('#7e939c'),[.42,.19,.055],[0,0,0],drawer);mesh('box',material('#263f4b'),[.17,.02,.04],[0,0,.035],drawer);this.drawers.push({id:`desk-${i}`,kind:'desk',index:i,root:drawer,x:this.home.x,z:this.home.z,searched:false});}
  const door=this.doors[0];const wallSide=Math.sign(this.office.center.z-door.z)||1;this.switchPoint={x:door.x+1.25,z:door.z+wallSide*.95};const light=this.prop(0,this.switchPoint.x,1.35,door.z+wallSide*.17,'Private office light switch');mesh('box',material('#e6e7db'),[.12,.17,.045],[0,0,0],light);mesh('box',material('#647278'),[.05,.08,.048],[0,0,.025],light);
 }
 setOfficeLights(off){
  if(!this.lampInstances){this.lampInstances=[];const position=new T.Vector3(),matrix=new T.Matrix4();this.e.hospitals[0].group.traverse(object=>{if(!object.isInstancedMesh||object.material!==this.e.materials.light)return;for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);if(position.y>3.4&&this.roomOf(position)===this.office.id)this.lampInstances.push({object,index:i,matrix:matrix.clone()});}});}
  const hidden=new T.Matrix4().makeScale(0,0,0);for(const entry of this.lampInstances){entry.object.setMatrixAt(entry.index,off?hidden:entry.matrix);entry.object.instanceMatrix.needsUpdate=true;}
  this.case.lightsOff=off;
 }
 breakStatus(){return this.phase==='working'?'Wait for bathroom break':this.phase==='outbound'?'Doctor leaving':this.phase==='bathroom'?'Office clear':this.phase==='returning'?'Doctor returning':this.phase==='drinking'?'Doctor at his desk':'Doctor unresponsive';}
 officeClear(){return this.phase==='bathroom'&&this.roomOf(this.doctor.pos)!==this.office.id;}
 interactions(){const e=this.e,c=this.case,items=[];if(e.mission.result)return items;
  const add=(type,label,p)=>items.push({type:`china-${type}`,label,...p});
  if(e.floor===0){
   if(!c.poisoned&&!c.coffeePrepared)add('poison',this.poisonAction?`Stop mixing · ${Math.floor(c.mixedSeconds)}/30s`:`${this.officeClear()?'Mix coffee':'Wait for bathroom break'} · ${Math.floor(c.mixedSeconds)}/30s`,this.cupPoint);
   if(c.poisoned&&!c.badge)add('badge',c.sealed?'Take Dr. Liu Wen’s hospital ID badge':'Take Dr. Liu Wen’s ID · lock office first',this.home);
   if(c.poisoned&&c.sealed){for(const d of this.drawers)if(!d.searched)add(`drawer-${d.id}`,`Search ${d.kind} drawer ${d.index+1}`,d);add('lights',c.lightsOff?'Switch office lights on':'Switch office lights off',this.switchPoint);}
   if(c.badge&&!c.disguised)add('disguise','Put on doctor’s uniform, surgical cap and mask',this.changePoint);
  }
  if(e.floor===3&&c.entered&&c.recordings.length<3){add('instruments',c.order?`Equipment requested: ${c.order.name}`:'Inspect instrument tray',this.trayPoint);for(const a of this.angles)if(!c.recordings.includes(a.id))add('record',`${c.recording?'Stop':'Start'} covert recording · ${a.name}`,a);}
  return items;
 }
 interact(item){const e=this.e,c=this.case;if(e.paused||e.mission.result||dist(item,e.playerPos)>2.5)return false;
  if(item.type==='china-poison'){
   if(this.poisonAction){this.poisonAction=null;e.notify('Mixing stopped · progress saved. Watch the doorway.');return true;}
   if(c.poisoned||c.coffeePrepared)return false;
   if(!this.officeClear()){e.notify('Wait until the doctor has fully left for the bathroom.','warning');return false;}
   if(this.witness()){c.poison(true);e.finish();return false;}
   this.poisonAction={from:e.playerPos.clone()};e.notify('Mixing fictional KTD compound · 30 seconds total. USE again or move away to stop.');return true;
  }
  if(item.type.startsWith('china-drawer-')){const d=this.drawers.find(d=>`china-drawer-${d.id}`===item.type);if(!d||d.searched||!c.poisoned||!c.sealed)return false;d.searched=true;d.root.position.z+=.13;const found=d.kind==='cupboard'&&d.index===this.keyDrawer;if(found)c.takeKeys();e.audio.sound(found?'clue':'interact');e.notify(found?'Basement keys found in the cupboard.':'Only paperwork and personal items. Search another drawer.',found?'clue':'info');return true;}
  if(item.type==='china-lights'){if(!c.poisoned||!c.sealed)return false;this.setOfficeLights(!c.lightsOff);e.notify(c.lightsOff?'Private office lights off.':'Private office lights on.');return true;}
  if(item.type==='china-badge'){if(!c.takeBadge()){e.notify('Close and lock both office doors before taking the ID.');return false;}e.audio.sound('clue');e.notify('Dr. Liu Wen’s ID secured. Search his cupboard for the basement keys.','clue');return true;}
  if(item.type==='china-disguise'){if(!c.dress()){e.notify('Secure the office and steal the ID first.');return false;}e.applyDoctorDisguise();this.disguise=disguiseProps(e.player);e.notify('Disguise complete · doctor’s scrubs, cap, mask and your own covert camera.','clue');return true;}
  if(item.type==='china-record'){c.recording=!c.recording;c.progress=0;e.notify(c.recording?'Recording · face the operation and hold a clear angle.':'Recording stopped.');return true;}
  if(item.type==='china-instruments'){this.openInstruments();return true;}return false;
 }
 openInstruments(){if(!this.case.entered||this.e.floor!==3)return;this.e.instrumentView=true;this.e.keys.clear();this.e.resetTouch();this.e.aiming=false;document.exitPointerLock?.();this.e.hooks.instruments?.(true);}
 closeInstruments(){this.e.instrumentView=false;this.e.hooks.instruments?.(false);}
 chooseInstrument(id){const result=this.case.choose(id);if(result===null)return;this.e.audio.sound(result?'clue':'empty');if(result){this.handoverUntil=this.e.mission.elapsed+1.3;this.say('Thank you. Keep it steady.');this.e.notify('Correct equipment handed over.','clue');}else if(this.case.mistakes===1){this.say('That is not what I asked for. Pay attention.');this.e.notify(id==='timeout'?'Equipment request missed · one mistake remains.':'Incorrect equipment · one mistake remains.','warning');}else{this.say('Hold on. Something is wrong. Take off your mask so we can verify who you are.');this.e.notify('Disguise exposed · you are forced to remove the mask.','danger');this.disguise?.update(false);}this.closeInstruments();}
 prepareNPC(n){if(n===this.doctor){if(n.dead)return false;const goal=this.phase==='outbound'?this.bathroomGoal:this.home;n.activity=['working','bathroom','drinking'].includes(this.phase)?this.phase==='drinking'?'drink':'rest':null;if(!n.activity&&n.cursor>=n.path.length&&n.wait<0)this.e.systems.route(n,goal);return true;}if(n!==this.visitor)return false;const e=this.e;
  if(this.visitPhase==='approach'&&dist(n.pos,this.home)<2){this.visitPhase='waiting';this.visitUntil=e.mission.elapsed+7;}
  if(this.visitPhase==='approach'&&this.doors.every(d=>d.locked)&&Math.min(...this.doors.map(d=>dist(n.pos,d)))<3.5){n.path=[];this.visitPhase='waiting';this.visitUntil=e.mission.elapsed+7;e.notify('A patient tries the locked office door, then waits outside.');}
  if(this.visitPhase==='waiting'&&e.mission.elapsed>=this.visitUntil){this.visitPhase='return';e.systems.route(n,this.visitHome);}
  if(this.visitPhase==='return'&&dist(n.pos,this.visitHome)<1.5){n.activity='rest';n.path=[];this.visitor=null;return false;}if(['approach','return'].includes(this.visitPhase)&&!n.path.length&&e.mission.elapsed>=(this.nextVisitorRoute||0)){e.systems.route(n,this.visitPhase==='return'?this.visitHome:this.home);this.nextVisitorRoute=e.mission.elapsed+2;}return true;
 }
 updateDoctor(dt){
  const e=this.e,c=this.case,n=this.doctor,now=e.mission.elapsed;if(n.dead)return;
  if(this.phase==='working'&&now>=this.breakAt){this.phase='outbound';n.activity=null;n.path=[];e.systems.route(n,this.bathroomGoal);e.notify('Dr. Liu Wen is leaving for a bathroom break.','clue');}
  if(this.phase==='outbound'&&dist(n.pos,this.bathroomGoal)<.6&&this.roomOf(n.pos)!==this.office.id){this.phase='bathroom';this.returnAt=now+52;n.activity='rest';n.path=[];e.notify('Office clear · watch for visiting patients.','clue');}
  if(this.phase==='bathroom'&&now>=this.returnAt){this.phase='returning';n.activity=null;e.systems.route(n,this.home);e.notify('Dr. Liu Wen is returning. Stop mixing before anyone sees you.','warning');}
  if(this.phase==='returning'&&dist(n.pos,this.home)<.5){this.phase='drinking';this.drinkUntil=now+5;n.activity='drink';n.path=[];n.visual.root.rotation.y=Math.atan2(this.cupPoint.x-n.pos.x,this.cupPoint.z-n.pos.z);}
  if(['returning','drinking','working'].includes(this.phase)&&e.floor===0&&this.roomOf(e.playerPos)===this.office.id&&!this.poisonAction&&now>=(this.nextLeaveRequest||0)&&e.lineOfSight(n.pos,e.playerPos,0)){
   this.nextLeaveRequest=now+30;this.leaveRequests=(this.leaveRequests||0)+1;
   if(this.leaveRequests>=3){c.fail('Dr. Liu Wen called security after you ignored both requests to wait outside.');e.finish();return;}
   n.activity=this.phase==='returning'?null:'worried';e.notify(this.leaveRequests===1?'The doctor asks you to leave and wait for your appointment.':'The doctor is suspicious. Leave the office now.','warning');
   e.life?.speak(n,this.leaveRequests===1?ROOM_WARNING_LINES.request:ROOM_WARNING_LINES.warning,true);
  }
  if(this.phase==='drinking'&&now>=this.drinkUntil){if(c.coffeePrepared){c.poison(false);n.dead=true;n.falling=1;n.reporting=null;this.phase='unresponsive';e.notify('Dr. Liu Wen is unresponsive. Close and lock both office doors.','clue');}else{this.phase='working';this.breakAt=now+65;n.activity='rest';}}
 }
 update(dt){const e=this.e,c=this.case;if(c.order&&e.mission.elapsed>=c.order.until)this.chooseInstrument('timeout');c.tick();if(e.mission.result){this.closeInstruments();e.finish();return;}
  if(this.sealing&&this.doors.every(d=>Math.abs(d.angle)<.025)){this.sealing=false;c.sealed=true;e.notify('Office closed and locked.','clue');}
  this.updateDoctor(dt);
  if(this.poisonAction){
   // Cancel on movement before checking visibility. Stopping is immediate and resumable.
   if(dist(this.poisonAction.from,e.playerPos)>.35||e.floor!==0){this.poisonAction=null;e.notify('Mixing stopped · progress saved.');}
   else if(this.witness()){c.poison(true);e.finish();return;}
   else{c.mixedSeconds=Math.min(30,c.mixedSeconds+dt);if(c.mixedSeconds>=30){c.coffeePrepared=true;this.poisonAction=null;e.notify('Coffee prepared. Leave unseen; the doctor must return and drink it.','clue');}}
  }
  if(e.mission.elapsed>=this.nextVisitor&&!this.visitor&&!c.entered){this.nextVisitor=e.mission.elapsed+130+e.mission.random()*65;const n=e.npcs.find(n=>n.role==='patient'&&n.floor===0&&!n.dead&&!n.lying&&!n.baby&&!n.blind&&!n.recruit&&!n.rescuePatient&&!n.appointmentDeparture);if(n){this.visitor=n;this.visitHome={x:n.pos.x,z:n.pos.z};n.seated=false;n.baselineY=0;n.pos.y=0;n.activity=null;n.speed=1.1;this.visitPhase='approach';e.systems.route(n,this.home);}}
  if(c.poisoned&&this.visitor&&this.roomOf(this.visitor.pos)===this.office.id&&!c.sealed){c.fail('A visiting patient discovered the doctor in the unsecured office.');e.finish();return;}
  if(e.floor===3&&!c.entered){if(!c.enter()){c.fail('The operating team detected an incomplete disguise or missing stolen identity.');e.finish();return;}this.say('Finally, you’ve arrived. We were expecting Dr. Liu Wen.');}
  if(c.entered&&e.floor===3&&c.recordings.length<3){if(!c.order&&e.mission.elapsed>=c.nextOrder){const order=c.request();if(order)this.say(`Pass me the ${order.name.toLowerCase()}, please.`);}const a=this.angles.find(a=>dist(a,e.playerPos)<1.45&&!c.recordings.includes(a.id));const patient=this.patient;
    const forward=new T.Vector3(Math.sin(e.yaw),0,Math.cos(e.yaw)),toward=patient?.pos.clone().sub(e.playerPos).setY(0).normalize();const clear=!!a&&!!toward&&forward.dot(toward)>.25&&e.lineOfSight(e.playerPos,patient.pos,3)&&!e.weaponDrawn&&!e.instrumentView&&(e.blackout<=0||e.flashlight);
    this.recorder.sync(a?.id,c.recording&&clear&&c.correct>c.recordings.length&&!c.recordings.includes(a?.id));
    if(c.record(a?.id,dt,clear)){this.recorder.end(true);e.audio.sound('clue');e.notify(`Video angle secured · ${a.name} (${c.recordings.length}/3)`,'clue');if(e.renderer?.domElement){e.renderer.render(e.scene,e.camera);const image=document.createElement('canvas');image.width=320;image.height=180;image.getContext('2d')?.drawImage(e.renderer.domElement,0,0,320,180);e.mission.photoImages[a.id]=image.toDataURL('image/jpeg',.7);}if(c.recordings.length===3){e.notify('All footage secured. Stop both operating doctors and escape.','clue');}}
  }
  if(e.floor!==3||e.paused||c.recordings.length===3)this.recorder.end(false);
  if(this.disguise)this.disguise.update(c.disguised);
  for(const child of this.root.children)child.visible=child.userData.floor===e.floor;
  for(const a of this.angles)a.marker.visible=e.floor===3&&c.entered&&!c.recordings.includes(a.id);
 }
 hud(){const c=this.case;return{objective:c.objective,arrival:Math.max(0,Math.ceil(THIRD_DOCTOR_ARRIVAL-this.e.mission.elapsed)),breakState:this.breakStatus(),mixing:!!this.poisonAction,mixedSeconds:Math.floor(c.mixedSeconds),coffeePrepared:c.coffeePrepared,basementKeys:c.basementKeys,lightsOff:c.lightsOff,poisoned:c.poisoned,sealed:c.sealed,badge:c.badge,camera:c.camera,disguised:c.disguised,recordings:c.recordings.slice(),progress:c.progress,recording:c.recording,correct:c.correct,mistakes:c.mistakes,order:c.order?{...c.order,seconds:Math.max(0,Math.ceil(c.order.until-this.e.mission.elapsed))}:null,verification:c.verificationAt!==null,angles:this.angles.map(({id,name,x,z})=>({id,name,x,z}))};}
 dispose(){if(this.disposed)return;this.disposed=true;this.closeInstruments();this.recorder.dispose();this.disguise?.dispose();if(this.case.lightsOff)this.setOfficeLights(false);this.lampInstances=null;for(const{floor,c}of this.addedColliders){const list=this.e.hospitals[floor].colliders,index=list.indexOf(c);if(index>=0)list.splice(index,1);}this.addedColliders.length=0;this.root.removeFromParent();disposeObjectResources(this.root,{textures:true});this.root.clear();this.poisonAction=null;this.visitor=null;this.e=null;}
}
