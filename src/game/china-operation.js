import {OfficeVisitors} from './office-visitors.js';
import {OfficeMixing} from './office-mixing.js';
import {RoomPrivacy} from './room-privacy.js';
import {OperatingTeamEscape} from './operating-team-escape.js';
import {CoffeeSip} from './coffee-sip.js';
import {BASEMENT_GREETING} from './infiltration-dialogue.js';
import {OfficeDarkness} from './office-darkness.js';
import {beginBodyFall} from './body-pose.js';
import {remainingWalkSeconds} from './appointments.js';
import {OfficeStatus} from './office-status.js';
import {ROOM_WARNING_LINES,OFFICE_VISITOR_LINES} from './dialogue-v25.js';
import{footprint}from'./collision.js';
import{CovertRecorder}from'./covert-recorder.js';
import*as T from'three';import{mesh,material,sign}from'./assets.js';import{tileAt,key}from'./layout.js';import{disposeObjectResources}from'./resources.js';import{INSTRUMENTS,RECORDING_ANGLES,THIRD_DOCTOR_ARRIVAL}from'./china-rules.js';import{instrumentTray,disguiseProps}from'./infiltration-props.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export class ChinaOperation{
 constructor(e,patient){this.e=e;this.escape=new OperatingTeamEscape(e);this.patient=patient;this.case=e.mission.china;this.root=new T.Group();this.root.name='China covert operation';this.addedColliders=[];e.scene.add(this.root);this.recorder=new CovertRecorder(e.renderer?.domElement,e.mission.videoClips);this.nextVisitor=Infinity;this.officePrivacy=new RoomPrivacy();this.setup();this.mixing=new OfficeMixing(e,this.coffeeCup);this.patients=new OfficeVisitors(this);const cafe=e.levels[0].rooms.find(r=>r.kind==='cafe');this.spoonPoint={x:cafe.center.x,z:cafe.center.z};const utensilTable=this.prop(0,this.spoonPoint.x,1.01,this.spoonPoint.z,'Cafeteria utensils table');mesh('cylinder',material('#647b88'),[.20,1,.20],[0,-.5,0],utensilTable);mesh('box',material('#cbd6d5'),[.6,.04,.45],[0,-.025,0],utensilTable);this.spoonProp=this.prop(0,this.spoonPoint.x,1.03,this.spoonPoint.z,'Cafeteria teaspoon');this.obstacle(0,this.spoonPoint.x,this.spoonPoint.z,.6,.45,1.02);mesh('box',material('#a9b7bb'),[.025,.015,.22],[0,0,0],this.spoonProp);}
 prop(floor,x,y,z,name){const root=new T.Group();root.position.set(x,y,z);root.userData.floor=floor;root.name=name;this.root.add(root);return root;}
 obstacle(floor,x,z,w,d,h){const c=footprint(x,z,w,d,h,0,'infiltration-prop');this.e.hospitals[floor].colliders.push(c);this.addedColliders.push({floor,c});this.e.systems.navigation[floor]=null;return c;}
 setup(){
  const e=this.e;this.office=e.levels[0].rooms.find(r=>r.kind==='office');this.doors=e.levels[0].doors.filter(d=>d.room===this.office.id);for(const door of this.doors){door.open=false;door.locked=false;}
  const work=this.work=e.hospitals[0].workstations.find(w=>w.room===this.office.id),nav=e.systems.navigationFor(0);this.home=nav.nearest(work?.stand||this.office.center).point;
  // Keep this private office free of unrelated fixed staff, using real walkable positions.
  for(const n of e.npcs.filter(n=>n.floor===0&&n.room?.id===this.office.id)){n.room=null;n.fixed=false;const spot=nav.nearest({x:0,z:18+n.pos.x%3}).point;n.pos.set(spot.x,0,spot.z);n.path=[];n.activity='rest';}
  this.doctor=e.spawnNPC({name:'Dr. Liu Wen',gender:'male',skin:'#d3a98a',hair:'#242323',hairstyle:'cropped',accent:'#e2e8ec',castCountry:'china',voiceCountry:'china',voiceRole:'doctor'},'doctor',0,this.home,this.office,'china-third-doctor',{fixed:true});this.doctor.personalCoffeeCup=true;this.phase='working';this.breakAt=18+e.mission.random()*12;this.doctor.activity='rest';this.doctor.visual.root.rotation.y=Math.PI/2;this.statusSign=new OfficeStatus(e.hospitals[0].group,this.doors[0],this.office);
  this.cupPoint=work?{x:work.x+Math.cos(work.rotation)*1.02,z:work.z-Math.sin(work.rotation)*1.02}:{x:this.home.x,z:this.home.z+.6};const cup=this.coffeeCup=this.prop(0,this.cupPoint.x,.91,this.cupPoint.z,'Third doctor personal cup');mesh('cylinder',material('#e7e8dc'),[.07,.14,.07],[0,0,0],cup);mesh('cylinder',material('#41302a'),[.06,.005,.06],[0,.073,0],cup);
  this.sip=new CoffeeSip(this.doctor.visual,cup,this.root,{x:this.cupPoint.x,y:.91,z:this.cupPoint.z});
  const bathroom=e.hospitals[0].bathrooms[0],room=e.levels[0].rooms.find(r=>r.kind==='bathroom');this.setupWardrobe(nav);
  this.bathroomGoal={...nav.nearest(room.center).point};this.returnWalkSeconds=remainingWalkSeconds({pos:this.bathroomGoal,path:nav.smoothRoute(this.bathroomGoal,this.home),cursor:0,speed:this.doctor.speed},this.home);this.setupDrawers(nav);this.darkness=new OfficeDarkness(this.office);this.darkness.install(e.scene);
  this.trayPoint={x:3,z:-3};this.tray=instrumentTray(this.root,this.trayPoint.x,this.trayPoint.z);this.obstacle(3,this.trayPoint.x,this.trayPoint.z,2.8,.8,1.34);this.trayView={position:new T.Vector3(3,2.35,-.9),target:new T.Vector3(3,1.05,-3)};
  this.angles=[{...RECORDING_ANGLES[0],x:-5,z:-1},{...RECORDING_ANGLES[1],x:1.5,z:1.5},{...RECORDING_ANGLES[2],x:3,z:-9}];
  const navB=e.systems.navigationFor(3),used=[];this.angles=this.angles.map(a=>{const candidates=[...navB.nodes.values()].filter(n=>dist(n.point,this.patient.pos)>2.4&&dist(n.point,this.patient.pos)<9&&used.every(p=>dist(n.point,p)>2.5)&&e.lineOfSight(n.point,this.patient.pos,3)).sort((p,q)=>dist(p.point,a)-dist(q.point,a));const point=candidates[0]?.point||navB.nearest(a).point;used.push(point);return{...a,...point};});
  for(const a of this.angles){const marker=this.prop(3,a.x,.015,a.z,`Recording angle: ${a.name}`);const ring=new T.Mesh(new T.RingGeometry(.28,.33,24),new T.MeshBasicMaterial({color:'#a4cddb',transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;marker.add(ring);a.marker=marker;}
 }
 roomOf(pos,floor=0){const cell=tileAt(pos.x,pos.z);return this.e.levels[floor].cells.get(key(cell.x,cell.z))?.room;}
 witness(){const e=this.e;return e.npcs.find(n=>!n.dead&&!n.evacuated&&!n.lying&&!n.baby&&!n.blind&&n.floor===0&&dist(n.pos,e.playerPos)<8&&((e.playerPos.x-n.pos.x)*Math.sin(n.visual.root.rotation.y)+(e.playerPos.z-n.pos.z)*Math.cos(n.visual.root.rotation.y)>.15*dist(n.pos,e.playerPos)||dist(n.pos,e.playerPos)<1.2)&&e.lineOfSight(n.pos,e.playerPos,0));}
 say(text){const e=this.e,n=e.npcs.find(n=>n.operationDoctor&&!n.dead)||this.doctor;e.life?.speak(n,text,true);e.hooks.soundCaption?.(text);}
 doorPrompt(door){return this.doors.includes(door)&&this.case.poisoned?`${!door.open&&Math.abs(door.angle)>.025?'Closing':door.locked?'Unlock':door.open?'Close':'Lock'} · office door`:null;}
 handleDoor(door){if(!this.doors.includes(door)||!this.case.poisoned)return false;
  const e=this.e;if(dist(e.playerPos,door)>2)return true;
  if(door.locked){if(!this.officeKey)return true;door.locked=false;door.open=true;this.case.sealed=false;e.notify('Office door unlocked.');return true;}
  if(door.open||Math.abs(door.angle)>.025){if(!e.doorCanSwingTo(door,0,0)){e.notify('Move clear of the doorway.');return true;}door.open=false;e.audio.sound('door');return true;}
  if(!this.officeKey){e.notify('Collect the office key from its holder beside the door.','guidance');return true;}
  if(this.roomOf(e.playerPos)!==this.office.id){e.notify('Lock the office from inside.');return true;}door.locked=true;this.case.sealed=this.doors.every(d=>d.locked&&!d.open&&Math.abs(d.angle)<.025);if(this.case.sealed)this.securedAt??=e.mission.elapsed;e.audio.sound('interact');e.notify('Door locked.');return true;
 }
 drawerTray(parent,w,h,d){const wood=material('#73838a');mesh('box',wood,[w,.025,d],[0,-h/2,-d/2],parent);for(const x of [-w/2,w/2])mesh('box',wood,[.024,h,d],[x,0,-d/2],parent);mesh('box',wood,[w,h,.025],[0,0,-d],parent);}
 drawerContents(drawer,index,w,h,d){
  const paper=material(index===1?'#d5d0b8':'#e8e5d8'),ink=material('#687b86'),base=-h/2+.022;
  for(let j=0;j<3+index;j++){const sheet=mesh('box',paper,[w*.63,.004,d*.58],[(j%2?1:-1)*w*.06,base+j*.005,-d*.52],drawer);sheet.name='Drawer paperwork';sheet.rotation.y=(j-1)*.06;for(let line=0;line<3;line++)mesh('box',ink,[w*.35,.002,.004],[-w*.04,base+j*.005+.003,-d*.5+line*.035],drawer);}
  if(index===0){mesh('box',material('#ba9760'),[w*.16,.045,.09],[w*.32,base+.025,-d*.3],drawer);mesh('cylinder',ink,[.009,.19,.009],[-w*.35,base+.01,-d*.45],drawer).rotation.x=Math.PI/2;}
  else if(index===1)for(let j=0;j<3;j++){const clip=new T.Mesh(new T.TorusGeometry(.022,.003,4,10),ink);clip.rotation.x=Math.PI/2;clip.position.set(w*.32,base+.009,-d*.3-j*.06);drawer.add(clip);}
  else mesh('box',material('#5b6d7a'),[w*.23,.045,d*.3],[w*.29,base+.025,-d*.5],drawer);
 }
 setupWardrobe(nav){
  const e=this.e,r=this.office,x=(r.x+r.w-12)*3+1.5-.7,z=r.center.z;this.wardrobeInstances=[];
  const matrix=new T.Matrix4(),p=new T.Vector3();e.hospitals[0].group.traverse(o=>{if(!o.isInstancedMesh||![e.materials.white,e.materials.blue].includes(o.material))return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);if(Math.abs(p.z-z)<.1&&p.x>x-.1&&p.x<x+.65&&p.y<2.3){this.wardrobeInstances.push({object:o,index:i,matrix:matrix.clone()});o.setMatrixAt(i,new T.Matrix4().makeScale(0,0,0));o.instanceMatrix.needsUpdate=true;}}});
  this.obstacle(0,x,z,.80,2.96,2.12);const cabinet=this.wardrobe=this.prop(0,x,0,z,'Doctor uniform cupboard');cabinet.rotation.y=-Math.PI/2;const white=material('#cdd6d8'),inside=material('#596e7b'),rail=material('#8d9ea8',{metalness:.6});
  // It replaces the wall cabinet's existing .8 × 3 m footprint, not an aisle.
  mesh('box',inside,[2.86,2.05,.04],[0,1.05,-.36],cabinet);for(const side of [-1,1])mesh('box',white,[.055,2.1,.76],[side*1.45,1.05,0],cabinet);for(const y of [.05,2.08])mesh('box',white,[2.9,.055,.76],[0,y,0],cabinet);
  mesh('box',rail,[2.65,.035,.035],[0,1.88,0],cabinet);mesh('box',rail,[.018,.10,.018],[-.5,1.83,.03],cabinet);const hanger=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-.76,1.65,.03),new T.Vector3(-.5,1.79,.03),new T.Vector3(-.24,1.65,.03),new T.Vector3(-.76,1.65,.03)]),new T.LineBasicMaterial({color:'#a2afb4'}));hanger.name='Doctor outfit hanger';cabinet.add(hanger);mesh('box',white,[2.7,.04,.70],[0,.42,0],cabinet);
  const coat=new T.Group();coat.name='Stored doctor outfit';coat.position.set(-.5,.9,.03);cabinet.add(coat);const cloth=material('#d9e7eb');mesh('box',cloth,[.49,.72,.10],[0,.40,0],coat);for(const side of [-1,1]){const sleeve=mesh('box',cloth,[.17,.54,.10],[side*.30,.48,0],coat);sleeve.rotation.z=side*.18;}mesh('box',material('#708fa2'),[.02,.68,.015],[0,.4,.06],coat);mesh('box',material('#b7c3c8'),[.5,.08,.4],[.6,.48,0],cabinet);
  this.wardrobeDoors=[];for(const side of [-1,1]){const hinge=new T.Group();hinge.position.set(side*1.43,0,.39);cabinet.add(hinge);mesh('box',white,[1.42,2,.055],[-side*.71,1.05,0],hinge);mesh('box',rail,[.035,.25,.04],[-side*1.25,1.1,.05],hinge);this.wardrobeDoors.push({hinge,side,collider:Object.assign(this.obstacle(0,x,z,.1,.1,2.1),{dynamic:true})});}
  this.changePoint={x:x-.45,z};this.wardrobeBox=new T.Box3();
 }
 setupDrawers(nav){
  const e=this.e,r=this.office;this.drawers=[];this.keyDrawer=Math.floor(e.mission.random()*3);
  // A compact cupboard uses the rear wall; search points stay in its clear aisle.
  const x=(r.x-11)*3-.65,z=(r.z-11)*3-.72,root=this.prop(0,x,0,z,'Searchable office cupboard');
  mesh('box',material('#647a83'),[1.25,1.65,.72],[0,.83,0],root);this.obstacle(0,x,z,1.25,.72,1.66);
  for(let i=0;i<3;i++){const drawer=new T.Group();drawer.position.set(0,1.24-i*.47,.38);root.add(drawer);mesh('box',material('#a3b0b4'),[1.12,.39,.055],[0,0,0],drawer);mesh('box',material('#253941'),[.23,.025,.055],[0,.01,.055],drawer);this.drawerTray(drawer,1.08,.36,.55);this.drawerContents(drawer,i,1.08,.36,.55);this.drawers.push({closedZ:drawer.position.z,opened:false,id:`cupboard-${i}`,kind:'cupboard',index:i,root:drawer,x,z:z+.5,searched:false,collider:Object.assign(this.obstacle(0,x,z,1.12,.55,1.65),{dynamic:true})});}
  // Retire the solid pedestal only for this desk; build a hollow drawer bay
  // so sliding trays have a real opening instead of emerging through a block.
  const work=this.work,wood=material('#708895');this.deskInstances=[];if(work){const matrix=new T.Matrix4(),p=new T.Vector3();e.hospitals[0].group.traverse(object=>{if(!object.isInstancedMesh||object.material!==e.materials.blue)return;for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);if(Math.abs(p.x-work.x)<.02&&Math.abs(p.z-work.z)<.02&&Math.abs(p.y-.42)<.02){this.deskInstances.push({object,index:i,matrix:matrix.clone()});object.setMatrixAt(i,new T.Matrix4().makeScale(0,0,0));object.instanceMatrix.needsUpdate=true;}}});
   const desk=this.prop(0,work.x,0,work.z,'Office desk open leg structure');desk.rotation.y=work.rotation;for(const x of [-1,1])for(const z of [-.32,.32])mesh('box',material('#526d7c'),[.055,.79,.055],[x,.40,z],desk);mesh('box',wood,[1.8,.45,.04],[0,.58,.32],desk);
   const bay=this.prop(0,work.x+Math.cos(work.rotation)*.67,0,work.z-Math.sin(work.rotation)*.67,'Desk drawer cabinet');bay.rotation.y=work.rotation+Math.PI;for(const x of [-.25,.25])mesh('box',wood,[.025,.70,.65],[x,.42,0],bay);for(const y of [.08,.76])mesh('box',wood,[.52,.025,.65],[0,y,0],bay);mesh('box',wood,[.52,.70,.025],[0,.42,-.33],bay);
   for(let i=0;i<3;i++){const drawer=new T.Group();drawer.name='Searchable desk drawer';drawer.position.set(0,.63-i*.23,.34);bay.add(drawer);mesh('box',wood,[.46,.20,.035],[0,0,0],drawer);mesh('box',material('#263f4b'),[.17,.02,.04],[0,0,.035],drawer);this.drawerTray(drawer,.44,.18,.57);this.drawerContents(drawer,i,.44,.18,.57);this.drawers.push({closedZ:drawer.position.z,opened:false,id:`desk-${i}`,kind:'desk',index:i,root:drawer,x:this.home.x,z:this.home.z,searched:false});}
  }
  const door=this.doors[0];const wallSide=Math.sign(this.office.center.z-door.z)||1;this.switchPoint={x:door.x+1.25,z:door.z+wallSide*.95};this.officeKeyPoint={x:door.x+wallSide*1.05,z:door.z+wallSide*.9};this.officeKeyProp=this.prop(0,door.x+wallSide*1.05,1.45,door.z+wallSide*.17,'Office key holder');mesh('box',material('#365164'),[.19,.26,.04],[0,0,0],this.officeKeyProp);const keyRing=new T.Mesh(new T.TorusGeometry(.035,.008,6,12),material('#c5ad75'));this.officeKeyProp.add(keyRing);const light=this.prop(0,this.switchPoint.x,1.35,door.z+wallSide*.17,'Private office light switch');mesh('box',material('#e6e7db'),[.12,.17,.045],[0,0,0],light);mesh('box',material('#647278'),[.05,.08,.048],[0,0,.025],light);
 }
 setOfficeLights(off){
  if(!this.lampInstances){this.lampInstances=[];const position=new T.Vector3(),matrix=new T.Matrix4();this.e.hospitals[0].group.traverse(object=>{if(!object.isInstancedMesh||object.material!==this.e.materials.light)return;for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);if(position.y>3.4&&this.roomOf(position)===this.office.id)this.lampInstances.push({object,index:i,matrix:matrix.clone()});}});}
  const hidden=new T.Matrix4().makeScale(0,0,0);for(const entry of this.lampInstances){entry.object.setMatrixAt(entry.index,off?hidden:entry.matrix);entry.object.instanceMatrix.needsUpdate=true;}
  if(!this.officeSurfaces){this.officeSurfaces=[];const matrix=new T.Matrix4(),point=new T.Vector3(),color=new T.Color();this.e.hospitals[0].group.traverse(object=>{if(!object.isInstancedMesh||object.material===this.e.materials.light)return;for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);if(this.roomOf(point)!==this.office.id)continue;if(object.instanceColor)object.getColorAt(i,color);else color.set('#ffffff');this.officeSurfaces.push({object,index:i,color:color.clone()});}});}
  for(const entry of this.officeSurfaces){entry.object.setColorAt(entry.index,off?entry.color.clone().multiplyScalar(.16):entry.color);entry.object.instanceColor.needsUpdate=true;}
  this.case.lightsOff=off;this.darkness?.set(off,this.e.floor);
 }
 breakStatus(){if(!this.doctor.dead&&this.roomOf(this.doctor.pos)!==this.office.id)return this.phase==='returning'?'Doctor returning · office clear':'Office clear · doctor away';return this.phase==='working'?'Wait for bathroom break':this.phase==='outbound'?'Doctor leaving':this.phase==='bathroom'?'Doctor in office':this.phase==='returning'?'Doctor returning':this.phase==='drinking'?'Doctor at his desk':'Doctor unresponsive';}
 officeClear(){return !this.doctor.dead&&this.roomOf(this.doctor.pos)!==this.office.id;}
 interactions(){const e=this.e,c=this.case,items=[];if(e.mission.result||this.caughtAt!=null)return items;
  const add=(type,label,p)=>items.push({type:`china-${type}`,label,...p});
  if(e.floor===0){
   if(!this.hasSpoon)add('spoon','Collect cafeteria spoon',this.spoonPoint);
   if(c.poisoned&&!this.officeKey&&this.roomOf(e.playerPos)===this.office.id)add('office-key','Take office door key',this.officeKeyPoint);
   if(!c.poisoned&&!c.coffeePrepared)add('poison',this.poisonAction?`Stop mixing · ${Math.floor(c.mixedSeconds)}/30s`:`${this.officeClear()?'Mix coffee':'Wait for bathroom break'} · ${Math.floor(c.mixedSeconds)}/30s`,this.cupPoint);
   if(c.poisoned&&!c.badge)add('badge',c.sealed?'Take doctor’s ID and basement access pass':'Take Dr. Liu Wen’s ID · lock office first',this.home);
   if(c.poisoned&&c.sealed){for(const d of this.drawers)add(`drawer-${d.id}`,`${d.searched?(d.opened?'Close':'Open'):'Search'} ${d.kind} drawer ${d.index+1}`,d);for(const kind of ['desk','cupboard']){const group=this.drawers.filter(d=>d.kind===kind);if(group.some(d=>d.opened))add(`drawers-close-${kind}`,`Close ${kind} drawers`,{x:group[0].x+.7,z:group[0].z});else if(group.every(d=>d.searched))add(`drawers-open-${kind}`,`Open ${kind} drawers`,group[0]);}add('lights',c.lightsOff?'Switch office lights on':'Switch office lights off',this.switchPoint);}
   if(c.badge){if(!this.wardrobeOpen)add('wardrobe','Open doctor’s uniform cupboard',this.changePoint);else{if(!c.disguised)add('disguise','Change into doctor’s outfit · cupboard',this.changePoint);add('wardrobe-close','Close doctor’s uniform cupboard',{x:this.changePoint.x+.7,z:this.changePoint.z+.9});}}
  }
  if(e.floor===3&&c.entered&&c.recordings.length<3){add('instruments',c.order?'Choose from the equipment tray':'Inspect instrument tray',this.trayPoint);for(const a of this.angles)if(!c.recordings.includes(a.id))add('record',`${c.recording?'Stop':'Start'} covert recording · ${a.name}`,a);}
  return items.filter(i=>dist(i,e.playerPos)<=1.65);
 }
 interact(item){const e=this.e,c=this.case;const available=this.interactions().find(i=>i.type===item.type);if(e.paused||e.mission.result||!available||dist(available,e.playerPos)>1.65)return false;
  if(item.type==='china-spoon'){this.hasSpoon=true;this.spoonProp.visible=false;e.audio.sound('clue');return true;}
  if(item.type==='china-office-key'){this.officeKey=true;this.officeKeyProp.visible=false;e.audio.sound('clue');return true;}
  if(item.type==='china-poison'){
   if(this.poisonAction){this.poisonAction=null;e.notify('Mixing stopped · progress saved. Watch the doorway.');return true;}
   if(c.poisoned||c.coffeePrepared)return false;if(!this.hasSpoon){e.notify('Collect a spoon from the cafeteria first.','guidance');return false;}
   if(dist(e.playerPos,this.cupPoint)>.65){e.notify('Move closer to the coffee cup.','guidance');return false;}if(!this.officeClear()){e.notify('Wait until the doctor has fully left for the bathroom.','warning');return false;}
   if(this.mixingWitness()){this.caughtAt=e.mission.elapsed;e.life?.speak(this.mixingWitness(),'What are you doing?',true);return false;}
   e.player.root.rotation.y=Math.atan2(this.cupPoint.x-e.playerPos.x,this.cupPoint.z-e.playerPos.z);this.poisonAction={from:e.playerPos.clone()};this.mixingStarted??=e.mission.elapsed;this.patients.begin(e.mission.elapsed);e.notify('Mixing fictional KTD compound · 30 seconds total. USE again or move away to stop.');return true;
  }
  if(item.type.startsWith('china-drawers-')){const [,action,kind]=item.type.slice(6).split('-');return this.setDrawers(kind,action==='open');}
  if(item.type.startsWith('china-drawer-')){const d=this.drawers.find(d=>`china-drawer-${d.id}`===item.type);if(!d||!c.poisoned||!c.sealed)return false;if(d.searched){d.opened=!d.opened;e.audio.sound('interact');e.systems.navigation[0]=null;return true;}d.searched=true;d.opened=true;const found=d.kind==='cupboard'&&d.index===this.keyDrawer;if(found)c.takeKeys();e.audio.sound(found?'clue':'interact');e.notify(found?'Basement keys found in the cupboard.':'Only paperwork and personal items. Search another drawer.',found?'clue':'info');return true;}
  if(item.type==='china-lights'){if(!c.poisoned||!c.sealed)return false;this.setOfficeLights(!c.lightsOff);e.notify(c.lightsOff?'Private office lights off.':'Private office lights on.');return true;}
  if(item.type==='china-badge'){if(!c.takeBadge()){e.notify('Close and lock both office doors before taking the ID.');return false;}c.takeKeys();e.mission.collectKey('basement');e.audio.sound('clue');e.notify('Doctor’s ID and basement access pass collected. Basement access is recorded in your inventory.','clue');return true;}
  if(item.type==='china-wardrobe'||item.type==='china-wardrobe-close'){if(!c.badge)return false;this.wardrobeOpen=item.type==='china-wardrobe';e.systems.navigation[0]=null;e.audio.sound('door');e.notify(this.wardrobeOpen?(c.disguised?'Cupboard open.':'Doctor’s outfit found · change into it, or close the cupboard.'):'Doctor’s uniform cupboard closed.');e.emitHUD();return true;}
  if(item.type==='china-disguise'){if(!c.dress()){e.notify('Secure the office and steal the ID first.');return false;}this.wardrobe.getObjectByName('Stored doctor outfit').visible=false;e.applyDoctorDisguise();this.darkness?.install(e.player.root);this.disguise=disguiseProps(e.player);e.notify('Disguise complete · doctor’s scrubs, cap, mask and your own covert camera.','clue');return true;}
  if(item.type==='china-record'){c.recording=!c.recording;c.progress=0;e.notify(c.recording?'Recording · face the operation and hold a clear angle.':'Recording stopped.');return true;}
  if(item.type==='china-instruments'){this.openInstruments();return true;}return false;
 }
 setDrawers(kind,opened){const e=this.e,group=this.drawers.filter(d=>d.kind===kind);if(e.paused||e.mission.result||e.floor!==0||!group.length||dist(e.playerPos,group[0])>1.65||!this.case.poisoned||!this.case.sealed)return false;for(const d of group)d.opened=opened;e.audio.sound('interact');e.systems.navigation[0]=null;e.notify(`${kind==='desk'?'Desk':'Cupboard'} drawers ${opened?'opened':'closed'}.`);e.emitHUD();return true;}
 openInstruments(){if(!this.case.entered||this.e.floor!==3)return;this.e.instrumentView=true;this.e.keys.clear();this.e.resetTouch();this.e.aiming=false;document.exitPointerLock?.();this.e.hooks.instruments?.(true);}
 closeInstruments(){this.e.instrumentView=false;this.e.hooks.instruments?.(false);}
 chooseInstrument(id){const tool=INSTRUMENTS.find(t=>t.id===id);if(this.case.verificationAt!==null||this.e.paused||!this.case.entered||this.e.floor!==3||(!tool&&id!=='timeout'))return false;if(tool)this.selectedInstrument=tool.id;if(!this.case.order){if(tool){this.e.notify(`Instrument ${tool.letter} selected · ready for the next request.`,'clue');this.e.emitHUD();return true;}return false;}const result=this.case.choose(id);if(result===null)return false;this.e.audio.sound(result?'clue':'empty');if(result){this.handoverUntil=this.e.mission.elapsed+1.3;this.say('Thank you. Keep it steady.');this.e.notify('Correct equipment handed over.','clue');}else if(this.case.mistakes===1){this.say('That is not what I asked for. Pay attention.');this.e.notify(id==='timeout'?'Equipment request missed · one mistake remains.':'Incorrect equipment · one mistake remains.','warning');}else{this.say('Hold on. Something is wrong. Take off your mask so we can verify who you are.');this.e.notify('Disguise exposed · you are forced to remove the mask.','danger');this.disguise?.update(false);}this.e.emitHUD();this.closeInstruments();return result;}
 panicDoctors(){this.escape.panic();}
 prepareNPC(n){if(this.escape.prepare(n)||this.patients.prepare(n))return true;if(n!==this.doctor&&n!==this.visitor&&n.role==='patient'&&!n.lying&&n.floor===0){
  const e=this.e,end=n.path?.at(-1),destination=end?{x:(end.x-11)*3,z:(end.z-11)*3}:n.pos;
  if(!this.visitorAllowed()&&(this.roomOf(destination)===this.office.id||this.roomOf(n.pos)===this.office.id)&&!n.officeLeaving){const door=this.doors[0];n.officeLeaving=true;n.activity=null;e.systems.route(n,{x:door.x,z:door.z+1.8});}
  if(n.officeLeaving){if(this.roomOf(n.pos)!==this.office.id&&n.cursor>=n.path.length){n.officeLeaving=false;n.wait=3;}return true;}
 }if(n===this.doctor){if(n.dead)return false;const goal=this.phase==='outbound'?this.bathroomGoal:this.home;n.activity=['working','bathroom','drinking'].includes(this.phase)?this.phase==='drinking'?'drink':'rest':null;if(!n.activity&&n.cursor>=n.path.length&&n.wait<0)this.e.systems.route(n,goal);return true;}return false;
 }
 sendVisitorHome(){}
 visitorAllowed(){return false;}

 doctorTiming(){
  const e=this.e,n=this.doctor,away=this.officeClear(),now=e.mission.elapsed;if(!away)return{away:false,awaySeconds:0,returnSeconds:null};
  const goal=this.phase==='outbound'?this.bathroomGoal:this.home;
  const travel=remainingWalkSeconds(n,goal),homeTrip=this.returnWalkSeconds||dist(this.bathroomGoal,this.home)/Math.max(.5,n.speed||1.3);
  return{away:true,awaySeconds:Math.max(0,Math.floor(now-(this.awaySince??now))),returnSeconds:Math.ceil(this.phase==='returning'?travel:Math.max(0,(this.returnAt??now+40)-now)+homeTrip+(this.phase==='outbound'?travel:0)),returning:this.phase==='returning'};
 }
 updateDoctor(dt){
  const e=this.e,c=this.case,n=this.doctor,now=e.mission.elapsed;if(n.dead)return;
  if(this.officeClear())this.awaySince??=now;else this.awaySince=null;
  if(this.phase==='working'&&now>=this.breakAt){this.phase='outbound';this.returnAt=null;n.activity=null;n.speed=2.1;n.path=[];e.systems.route(n,this.bathroomGoal);e.notify('Dr. Liu Wen is leaving for a bathroom break.','clue');}
  if(this.phase==='outbound'&&dist(n.pos,this.bathroomGoal)<.6&&this.roomOf(n.pos)!==this.office.id){this.phase='bathroom';this.returnAt=now+38;n.activity='rest';n.path=[];e.notify('Office clear · watch for visiting patients.','clue');}
  if(this.phase==='bathroom'&&now>=this.returnAt){this.phase='returning';n.activity=null;e.systems.route(n,this.home);this.sendVisitorHome();e.notify(this.poisonAction?'Dr. Liu Wen is returning. Stop mixing before anyone sees you.':c.coffeePrepared?'Dr. Liu Wen is returning to his prepared coffee. Stay out of sight.':'Dr. Liu Wen is returning to his office.','warning');}
  if(this.phase==='returning'&&dist(n.pos,this.home)<.5){this.phase='drinking';this.drinkUntil=now+5;n.activity='drink';n.path=[];n.visual.root.rotation.y=Math.atan2(this.cupPoint.x-n.pos.x,this.cupPoint.z-n.pos.z);}
  const inside=e.floor===0&&this.roomOf(e.playerPos)===this.office.id&&e.lineOfSight(n.pos,e.playerPos,0);if(inside&&['returning','drinking','working'].includes(this.phase)){
   const id=this.office.id,action=this.officePrivacy.active===id?this.officePrivacy.update(id,now):this.officePrivacy.enter(id,now);if(action){const patient=e.npcs.some(p=>p.role==='patient'&&!p.dead&&!p.baby&&p.floor===0&&this.roomOf(p.pos)===id);e.life?.speak(n,action==='request'?(patient?'Excuse me, please wait until we finish with this patient.':'Excuse me, please wait outside.'):ROOM_WARNING_LINES[action],true);if(action==='security'){c.fail('The doctor called security after both grace periods.');e.finish();return;}}}else this.officePrivacy.leave();
  if(this.phase==='drinking'&&now>=this.drinkUntil){if(c.coffeePrepared){c.poison(false);n.dead=true;beginBodyFall(n,e);this.dropCup();n.reporting=null;this.phase='unresponsive';this.unresponsiveAt=now;this.patients.collapse(now);this.enteredAfterFall=e.floor===0&&this.roomOf(e.playerPos)===this.office.id;this.sendVisitorHome();e.notify('Get inside and secure the office before a visitor notices.','guidance');}else{this.phase='working';this.breakAt=now+28;n.activity='rest';}}
 }
 syncCupGrip(){if(!this.cupDropped)this.sip.update(this.phase==='drinking'&&!this.doctor.dead,this.e.time,{hold:this.case.coffeePrepared});}
 updateCup(dt){const cup=this.coffeeCup,fall=this.cupDropped;if(!fall||fall.landed)return;fall.age+=dt;if(fall.age<.3&&this.doctor.visual.hand){const p=this.doctor.visual.hand.getWorldPosition(new T.Vector3());cup.position.copy(this.root.worldToLocal(p));fall.position.copy(cup.position);return;}if(!fall.released){fall.released=true;fall.position.copy(cup.position);fall.velocity.set(Math.sin(this.doctor.visual.root.rotation.y)*.6,-.5,Math.cos(this.doctor.visual.root.rotation.y)*.6);}fall.velocity.y-=9.8*dt;fall.position.addScaledVector(fall.velocity,dt);cup.position.copy(fall.position);cup.rotation.z+=dt*3;if(cup.position.y<=.04){fall.landed=true;cup.visible=false;this.spill.position.set(cup.position.x,.018,cup.position.z);this.spill.visible=true;this.e.audio.sound('glass-break');}}
 dropCup(){if(this.cupDropped)return;const cup=this.coffeeCup;this.root.attach(cup);this.cupDropped={age:0,position:cup.position.clone(),velocity:new T.Vector3()};this.spill=this.prop(0,cup.position.x,.018,cup.position.z,'Spilled coffee and shattered cup');this.spill.visible=false;const puddle=new T.Mesh(new T.CircleGeometry(.38,24),material('#382b24',{roughness:.3,transparent:true,opacity:.86}));puddle.rotation.x=-Math.PI/2;puddle.scale.set(1,.72,1);this.spill.add(puddle);const chest=this.doctor.visual.model?.getObjectByName('Spine2');if(chest){const stain=new T.Mesh(new T.SphereGeometry(.07,8,6),material('#64504a',{transparent:true,opacity:.5}));stain.scale.set(1,1,.08);stain.rotation.y=this.doctor.visual.root.rotation.y;const world=chest.getWorldPosition(new T.Vector3());world.y-=.1;world.x+=Math.sin(this.doctor.visual.root.rotation.y)*.15;world.z+=Math.cos(this.doctor.visual.root.rotation.y)*.15;this.root.attach(stain);stain.position.copy(this.root.worldToLocal(world));chest.attach(stain);this.coffeeStain=stain;}const china=material('#dbded5');for(let i=0;i<9;i++){const a=i*2.399,r=.12+i*.026,shard=new T.Mesh(new T.ConeGeometry(.035,.012,3),china);shard.position.set(Math.cos(a)*r,.014,Math.sin(a)*r);shard.rotation.set(.2,a,.3);this.spill.add(shard);}}
 update(dt){const e=this.e,c=this.case;if(this.caughtAt!=null&&e.mission.elapsed-this.caughtAt>1.5){c.poison(true);e.finish();return;}if(c.order&&e.mission.elapsed>=c.order.until)this.chooseInstrument('timeout');c.tick();if(e.mission.result){this.closeInstruments();e.finish();return;}
  if(this.sealing&&this.doors.every(d=>Math.abs(d.angle)<.025)){this.sealing=false;c.sealed=true;e.notify('Office closed and locked.','clue');}
  this.updateDoctor(dt);if(e.mission.result)return;this.updateCup(dt);this.darkness?.set(c.lightsOff,e.floor);
  if(c.poisoned&&this.securedAt==null&&!c.sealed&&e.mission.elapsed-(this.unresponsiveAt??e.mission.elapsed)>=10){this.discoverDoctor();return;}
  for(const {hinge,side,collider}of this.wardrobeDoors||[]){hinge.rotation.y=T.MathUtils.damp(hinge.rotation.y,this.wardrobeOpen?side*-Math.PI*.48:0,4,dt);hinge.updateWorldMatrix(true,true);this.wardrobeBox.setFromObject(hinge);Object.assign(collider,{minX:this.wardrobeBox.min.x,maxX:this.wardrobeBox.max.x,minZ:this.wardrobeBox.min.z,maxZ:this.wardrobeBox.max.z});}
  for(const d of this.drawers){d.root.position.z=T.MathUtils.damp(d.root.position.z,d.closedZ+(d.opened?.42:0),7,dt);if(d.collider){d.root.updateWorldMatrix(true,true);this.wardrobeBox.setFromObject(d.root);Object.assign(d.collider,{minX:this.wardrobeBox.min.x,maxX:this.wardrobeBox.max.x,minZ:this.wardrobeBox.min.z,maxZ:this.wardrobeBox.max.z});}}this.statusSign?.update(this.officeClear(),this.doctor.dead);
  if(this.poisonAction){
   // Cancel on movement before checking visibility. Stopping is immediate and resumable.
   if(dist(this.poisonAction.from,e.playerPos)>.35||e.floor!==0){this.poisonAction=null;e.notify('Mixing stopped · progress saved.');}
   else if(!this.officeClear()){this.poisonAction=null;e.notify('The doctor has entered the office. Mixing stopped · progress saved.','warning');}
   else if(this.mixingWitness()){this.caughtAt=e.mission.elapsed;this.poisonAction=null;e.life?.speak(this.mixingWitness(),'What are you doing?',true);return;}
   else{c.mixedSeconds=Math.min(30,c.mixedSeconds+dt);if(c.mixedSeconds>=30){c.coffeePrepared=true;this.poisonAction=null;e.notify('Coffee prepared · leave unseen and watch through the office window. Enter as soon as the doctor becomes unresponsive.','clue');}}
  }

  if(e.floor===3&&!c.entered){if(!c.enter()){c.fail('The operating team detected an incomplete disguise or missing stolen identity.');e.finish();return;}}
  if(c.entered&&e.floor===3&&!this.greeted&&e.levels[3].doors.some(d=>d.open&&Math.abs(d.angle-d.openAngle)<.08)){this.greeted=true;this.say(BASEMENT_GREETING);}
  this.escape.update();if(e.mission.result)return;
  if(c.entered&&this.greeted&&!this.escape.active&&e.floor===3&&c.recordings.length<3){if(!c.order&&e.mission.elapsed>=c.nextOrder){const order=c.request();if(order)this.say(`Pass me the ${order.name.toLowerCase()}, please.`);}const a=this.angles.find(a=>dist(a,e.playerPos)<1.45&&!c.recordings.includes(a.id));const patient=this.patient;
    const forward=new T.Vector3(Math.sin(e.yaw),0,Math.cos(e.yaw)),toward=patient?.pos.clone().sub(e.playerPos).setY(0).normalize();const clear=!!a&&!!toward&&forward.dot(toward)>.25&&e.lineOfSight(e.playerPos,patient.pos,3)&&!e.weaponDrawn&&!e.instrumentView&&(e.blackout<=0||e.flashlight);
    this.recorder.sync(a?.id,c.recording&&clear&&c.correct>c.recordings.length&&!c.recordings.includes(a?.id));
    if(c.record(a?.id,dt,clear)){this.recorder.end(true);e.audio.sound('clue');e.notify(`Video angle secured · ${a.name} (${c.recordings.length}/3)`,'clue');if(e.renderer?.domElement){e.renderer.render(e.scene,e.camera);const image=document.createElement('canvas');image.width=320;image.height=180;image.getContext('2d')?.drawImage(e.renderer.domElement,0,0,320,180);e.mission.photoImages[a.id]=image.toDataURL('image/jpeg',.7);}if(c.recordings.length===3){e.notify('All footage secured. Stop both operating doctors and escape.','clue');}}
  }
  if(e.floor!==3||e.paused||c.recordings.length===3)this.recorder.end(false);
  if(this.disguise)this.disguise.update(c.disguised);
  for(const child of this.root.children)child.visible=child.userData.floor===e.floor&&!(child===this.coffeeCup&&this.cupDropped?.landed)&&!(child===this.spill&&!this.cupDropped?.landed);
  if(this.hasSpoon)this.spoonProp.visible=false;if(this.officeKey)this.officeKeyProp.visible=false;
  for(const a of this.angles)a.marker.visible=e.floor===3&&c.entered&&!c.recordings.includes(a.id);
 }
 mixingWitness(){const candidate=this.witness();if(!candidate)return null;const staged=this.patients.entries.find(v=>v.n===candidate);return !staged||this.patients.witnesses().includes(candidate)?candidate:null;}
 discoverDoctor(){this.case.fail('A visitor discovered Dr. Liu Wen before you secured the office.');this.e.finish();}
 objectiveLabel(){const c=this.case;if(!c.officeDiscovered&&!c.poisoned)return c.objective;if(!c.poisoned&&!c.coffeePrepared){if(this.phase==='returning')return this.poisonAction?'Doctor returning · stop mixing before he enters the office':'Doctor returning · stay out of sight';if(this.officeClear())return 'Office clear · prepare the coffee unseen · 30s total';if(this.phase==='outbound')return 'Doctor leaving his office · wait until he is outside';}return c.objective;}
 hud(){const c=this.case;return{objective:this.objectiveLabel(),arrival:Math.max(0,Math.ceil(THIRD_DOCTOR_ARRIVAL-this.e.mission.elapsed)),breakState:this.breakStatus(),doctorTiming:this.doctorTiming(),mixing:!!this.poisonAction,mixedSeconds:Math.floor(c.mixedSeconds),coffeePrepared:c.coffeePrepared,basementKeys:c.basementKeys,lightsOff:c.lightsOff,poisoned:c.poisoned,sealed:c.sealed,badge:c.badge,camera:c.camera,disguised:c.disguised,nearDrawers:this.e.floor===0?this.drawers.find(d=>dist(this.e.playerPos,d)<1.65)?.kind:null,openDrawers:['desk','cupboard'].filter(kind=>this.drawers.some(d=>d.kind===kind&&d.opened)),selectedInstrument:this.selectedInstrument||null,recordings:c.recordings.slice(),progress:c.progress,recording:c.recording,correct:c.correct,mistakes:c.mistakes,order:c.order?{...c.order,seconds:Math.max(0,Math.ceil(c.order.until-this.e.mission.elapsed))}:null,verification:c.verificationAt!==null,angles:this.angles.map(({id,name,x,z})=>({id,name,x,z}))};}
 dispose(){if(this.disposed)return;this.disposed=true;if(this.coffeeStain){this.coffeeStain.removeFromParent();disposeObjectResources(this.coffeeStain);}this.patients?.dispose();this.mixing?.dispose();this.officePrivacy.dispose();this.sip?.dispose();this.statusSign?.dispose();this.statusSign=null;this.closeInstruments();this.recorder.dispose();this.disguise?.dispose();this.darkness?.dispose();if(this.case.lightsOff)this.setOfficeLights(false);this.lampInstances=null;for(const entry of this.deskInstances||[]){entry.object.setMatrixAt(entry.index,entry.matrix);entry.object.instanceMatrix.needsUpdate=true;}this.deskInstances=[];for(const entry of this.wardrobeInstances||[]){entry.object.setMatrixAt(entry.index,entry.matrix);entry.object.instanceMatrix.needsUpdate=true;}this.wardrobeInstances=[];for(const{floor,c}of this.addedColliders){const list=this.e.hospitals[floor].colliders,index=list.indexOf(c);if(index>=0)list.splice(index,1);}this.addedColliders.length=0;this.root.removeFromParent();disposeObjectResources(this.root,{textures:true});this.root.clear();this.poisonAction=null;this.visitor=null;this.e=null;}
}
