import {ChinaOperation} from './china-operation.js';
import * as THREE from 'three';
import {mesh,material} from './assets.js';
import {disposeObjectResources} from './resources.js';
import {seesDrawnWeapon} from './loadout.js';
import {specialObjective} from './assignment-types.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const PHOTO_SITES=[{id:'ledger',floor:0,roomKind:'office',label:'Altered treatment ledger'},{id:'consent',floor:2,roomKind:'lab',label:'Unsigned consent file'},{id:'theatre',floor:3,roomKind:'rescue-theater',label:'Unauthorized operating theatre'}];
export class AssignmentObjectives{
  constructor(e){this.e=e;this.props=new THREE.Group();this.props.name='assignment-evidence-and-keys';e.scene.add(this.props);this.items=[];this.photoSites=[];this.nextRoute=0;this.escort=null;this.escortRouteFloor=null;this.setup();}
  setup(){
    const e=this.e,m=e.mission;for(const level of e.levels)for(const door of level.doors){door.locked=level.floor===3;door.keyId=level.floor===3?'theatre':null;}
    if(m.type==='standard')return;
    if(m.photoOnly){this.cameraProp=new THREE.Group();this.cameraProp.name='evidence-camera';e.player.root.add(this.cameraProp);const body=material('#202c34'),glass=material('#5f9cbb',{metalness:.5,roughness:.15});mesh('box',body,[.22,.14,.08],[0,0,0],this.cameraProp);const lens=mesh('cylinder',body,[.057,.11,.057],[0,0,.07],this.cameraProp);lens.rotation.x=Math.PI/2;mesh('sphere',glass,[.05,.05,.012],[0,0,.13],this.cameraProp);mesh('box',glass,[.14,.085,.006],[0,0,-.043],this.cameraProp);this.cameraProp.visible=false;this.cameraGrip=new THREE.Vector3();}
    if(!m.china){
    const records=e.levels[0].rooms.find(r=>r.kind==='office'),maintenance=e.levels[0].rooms.find(r=>r.kind==='utility');
    this.addKey('basement','Basement access pass',records.center.x,records.center.z+.6,0);
    this.addKey('theatre','Spare theatre key',maintenance.center.x,maintenance.center.z+2,0);
    const nurse=e.npcs.find(n=>n.id==='life-nurseirislowe-0');if(nurse){nurse.activity=null;nurse.room=null;nurse.wait=0;nurse.keyCarrier=true;nurse.speed=.85;this.keyCarrier=nurse;}
    for(const spec of PHOTO_SITES){const room=e.levels[spec.floor].rooms.find(r=>r.kind===spec.roomKind),site={...spec,x:room.center.x,y:1.35,z:room.center.z,room};
      if(spec.id!=='theatre'){const board=new THREE.Group();board.position.set(site.x,1.28,site.z);this.props.add(board);board.userData.floor=spec.floor;mesh('box',material('#334c60'),[.68,.7,.04],[0,0,0],board);mesh('box',material('#ece9da'),[.58,.6,.045],[0,0,.025],board);for(let i=0;i<6;i++)mesh('box',material(i===3?'#9f4d4d':'#4e626a'),[.4,.018,.005],[0,.19-i*.075,.052],board);mesh('box',material('#617986'),[.07,1.3,.07],[0,-.6,0],board);site.z+=.08;}
      this.photoSites.push(site);
    }
    }
    const operating=e.hospitals[3].operatingSets?.[0],room=e.levels[3].rooms[0],anchors=operating?.anchors||{patient:{x:-3,y:1,z:-3.65,bedRotation:0},doctor:{x:-4.4,z:-4.5,yaw:Math.PI/2},assistant:{x:-1.6,z:-4.5,yaw:-Math.PI/2},rescue:{x:-3,z:-1}};
    for(const [i,p] of [anchors.doctor,anchors.assistant].entries()){
      const doctor={...m.target,name:i===0?m.country?.doctor||'Dr. Adrian Vale':'Dr. Amira Solano',gender:i===0?m.country?.gender||'male':'female',accent:'#729a9f'};
      const n=e.spawnNPC(doctor,'doctor',3,p,room,`operation-doctor-${i}`,{fixed:true});n.activity='examine';n.visual.root.rotation.y=p.yaw||0;n.operationDoctor=true;
    }
    const person={name:'Casey Morris',gender:'female',skin:'#b98664',hair:'#332621',accent:'#a7bbc1'},p=anchors.patient;
    const patient=e.spawnNPC(person,'patient',3,p,room,'rescue-patient',{fixed:true});patient.activity='rest';patient.lying=true;patient.baselineY=p.y||1;patient.pos.y=patient.baselineY;patient.bedRotation=p.bedRotation||0;patient.visual.root.rotation.x=-Math.PI/2;patient.hitOffset=new THREE.Vector3(0,.13,-.9);patient.hitRadius=.46;patient.contamination=0;patient.rescuePatient=true;this.patient=patient;this.releasePoint=anchors.rescue;this.escort=patient;if(m.china)this.china=new ChinaOperation(e,this.patient);
  }
  addKey(id,label,x,z,floor){
    const stand=new THREE.Group();stand.name='Key display table (permanent)';stand.position.set(x,1.2,z);stand.userData.floor=floor;this.props.add(stand);
    mesh('box',material('#294c65'),[.34,.02,.26],[0,-.05,0],stand);mesh('box',material('#69808a'),[.045,1.16,.045],[0,-.65,0],stand);
    const root=new THREE.Group();root.name='Collectible key only';root.position.set(x,1.2,z);root.userData.floor=floor;this.props.add(root);

    const ring=new THREE.Mesh(new THREE.TorusGeometry(.085,.018,6,16),material('#dfc780',{metalness:.7,roughness:.3}));ring.rotation.x=Math.PI/2;root.add(ring);
    mesh('box',ring.material,[.035,.03,.19],[0,0,.15],root);mesh('box',ring.material,[.09,.03,.03],[.025,0,.23],root);

    this.items.push({type:'mission-key',id,label,x,z,floor,root});
  }
  interactions(){
    if(this.china)return this.china.interactions();
    const m=this.e.mission,items=this.items.filter(i=>i.floor===this.e.floor&&!m.keys.includes(i.id));
    if(this.patient&&this.e.floor===3&&!m.patientReleased)items.push({type:'release-patient',label:m.targetDown?'Release and escort patient':'Stop both doctors before releasing patient',x:this.releasePoint.x,z:this.releasePoint.z});
    if(m.type==='evidence')for(const s of this.photoSites)if(s.floor===this.e.floor&&!m.photos.includes(s.id))items.push({type:'photo-subject',label:`Photograph · ${s.label}`,x:s.x,z:s.z});
    return items;
  }
  collect(item){const ok=this.e.mission.collectKey(item.id);if(ok){item.root.visible=false;this.e.audio.sound('clue');this.e.notify(`${item.label} collected`,'clue');this.e.emitHUD();}return ok;}
  steal(n){
    const e=this.e;if(!n.keyCarrier||e.mission.keys.includes('theatre'))return false;
    if(n.dead||n.evacuated||n.floor!==e.floor||distance(n.pos,e.playerPos)>2.3)return false;
    const seenBy=person=>{const dx=e.playerPos.x-person.pos.x,dz=e.playerPos.z-person.pos.z,d=Math.hypot(dx,dz),yaw=person.visual.root.rotation.y;return d<.15||(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d>.15;};
    const visible=!n.blind&&seenBy(n)&&e.lineOfSight(n.pos,e.playerPos);
    if(!e.crouched||visible){e.mission.finish(false,'The nurse caught you taking the theatre key. Security intercepted you.');e.finish();return false;}
    const witness=e.npcs.some(other=>other!==n&&!other.blind&&!other.dead&&!other.evacuated&&!other.lying&&!other.baby&&other.floor===e.floor&&distance(other.pos,e.playerPos)<6&&seenBy(other)&&e.lineOfSight(other.pos,e.playerPos));
    if(witness){e.mission.finish(false,'A witness saw the key theft and called security.');e.finish();return false;}
    e.mission.collectKey('theatre');e.audio.sound('clue');e.notify('Theatre key lifted quietly','clue');return true;
  }
  release(){const e=this.e;if(!e.mission.releasePatient()){e.notify('Stop both operating doctors first. The patient is still in danger.');return false;}
    const n=this.patient;n.lying=false;n.activity=null;n.baselineY=0;n.bedRotation=0;n.hitOffset=null;n.visual.root.rotation.set(0,this.releasePoint.yaw||0,0);n.pos.set(this.releasePoint.x,0,this.releasePoint.z);n.room=null;n.speed=2.4;n.reaction=0;n.path=[];n.nextFollow=0;
    e.notify('Patient released · stay close and lead them to the main entrance','clue');return true;
  }
  takePhoto(ray){
    const e=this.e,m=e.mission;if(m.type!=='evidence'||m.result)return false;
    const site=this.photoSites.find(s=>s.floor===e.floor&&!m.photos.includes(s.id)&&distance(s,e.playerPos)<11&&ray.distanceToPoint(new THREE.Vector3(s.x,s.y,s.z))<1.45&&ray.direction.dot(new THREE.Vector3(s.x,s.y,s.z).sub(ray.origin))>0&&e.lineOfSight(e.playerPos,s));
    if(!site){e.notify('Center an evidence subject in the camera · move closer for a clear image');return false;}
    const guard=e.npcs.find(n=>!n.dead&&!n.evacuated&&!n.reporting&&n.floor===e.floor&&['security','police'].includes(n.role)&&distance(n.pos,e.playerPos)<9&&seesDrawnWeapon(n.pos,e.playerPos,n.visual.root.rotation.y,e.lineOfSight(n.pos,e.playerPos)));
    if(guard){e.systems.witness(guard,'camera');return false;}
    m.photograph(site.id);if(e.renderer?.domElement){e.renderer.render(e.scene,e.camera);const photo=document.createElement('canvas');photo.width=320;photo.height=180;photo.getContext('2d')?.drawImage(e.renderer.domElement,0,0,320,180);m.photoImages[site.id]=photo.toDataURL('image/jpeg',.72);}
    e.audio.sound('clue');e.hooks.shot?.();e.notify(`Photograph saved · ${site.label} (${m.photos.length}/3)`,'clue');e.emitHUD();return true;
  }
  prepareNPC(n){
    if(this.china?.prepareNPC(n))return true;
    const e=this.e;if(n!==this.patient||e.mission.type!=='rescue'&&!n.lying)return false;
    if(!e.mission.patientReleased){n.path=[];return true;}
    const apart=n.floor!==e.floor,goal=apart?e.levels[n.floor].elevator:e.playerPos;
    if(apart&&distance(n.pos,goal)<2){const arrival=e.systems.arrivalSpot(e.floor,n);if(arrival){n.floor=e.floor;n.pos.set(arrival.x,0,arrival.z);n.path=[];n.nextFollow=0;}}
    else if(distance(n.pos,goal)>2&&e.mission.elapsed>=(n.nextFollow||0)){const nav=e.systems.navigationFor(n.floor);n.path=nav.routeTransient(n.pos,goal);n.cursor=n.path.length>1&&nav.clear(n.pos,{x:(n.path[1].x-11)*3,z:(n.path[1].z-11)*3})?1:0;n.nextFollow=e.mission.elapsed+1.25;n.activity=null;}
    else if(distance(n.pos,goal)<=2){n.path=[];n.visual.setAim?.(false);}
    return true;
  }
  patientPresent(){return !!this.patient&&this.patient.floor===0&&!this.patient.dead&&distance(this.patient.pos,this.e.levels[0].exit)<4.8;}
  update(dt=0){const e=this.e;this.china?.update(dt);if(this.cameraProp){this.cameraProp.visible=e.aiming;if(e.aiming&&e.player.hand){e.player.root.updateMatrixWorld(true);e.player.hand.getWorldPosition(this.cameraGrip);e.player.root.worldToLocal(this.cameraGrip);this.cameraProp.position.copy(this.cameraGrip);this.cameraProp.position.z+=.06;}}for(const item of this.items)item.root.visible=item.floor===e.floor&&!e.mission.keys.includes(item.id);for(const root of this.props.children)if(root.userData.floor!==undefined&& !this.items.some(i=>i.root===root))root.visible=root.userData.floor===e.floor;}
  hud(){const m=this.e.mission;return {type:m.type,photoOnly:m.photoOnly,infiltration:this.china?.hud()||null,label:this.china?m.china.objective:specialObjective(m),keys:m.keys,photos:m.photos,sites:this.photoSites.map(({id,floor,x,z,label})=>({id,floor,x,z,label})),patientReleased:m.patientReleased,patientFloor:this.patient?.floor,patientDistance:this.patient?Math.round(distance(this.patient.pos,this.e.playerPos)):null};}
  dispose(){this.china?.dispose();this.china=null;if(this.cameraProp){this.cameraProp.removeFromParent();disposeObjectResources(this.cameraProp);this.cameraProp=null;this.cameraGrip=null;}this.props.removeFromParent();disposeObjectResources(this.props);this.props.clear();this.items=[];this.photoSites=[];this.patient=this.escort=null;this.e=null;}
}
