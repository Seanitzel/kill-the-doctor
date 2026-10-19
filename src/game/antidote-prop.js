import * as THREE from 'three';
import {Batcher,mesh,material,sign} from './assets.js';
import {TILE} from './layout.js';
import {footprint} from './collision.js';

// One shallow cabinet on each upper floor. Local +Z faces out of the cabinet;
// rotating west mounts its back against the central hall's east wall.
export function buildAntidoteCabinet(layout,materials={}){
  if(![0,1,2].includes(layout?.floor))return null;
  const targetZ=layout.elevator.z+8;
  const wall=layout.walls.filter(w=>w.axis==='z'&&!w.door&&w.x>layout.elevator.x&&w.x<=layout.elevator.x+TILE&&w.z>=layout.elevator.z+3&&w.z<=layout.elevator.z+12)
    .filter(w=>w.exterior||Math.round(w.x+w.z)%4!==0)
    .sort((a,b)=>Math.abs(a.z-targetZ)-Math.abs(b.z-targetZ))[0];
  if(!wall)return null;
  const z=THREE.MathUtils.clamp(targetZ,wall.z-TILE/2+.58,wall.z+TILE/2-.58),wallFace=wall.x-.09;
  const root=new THREE.Group();root.name='Contamination antidote cabinet';root.position.set(wallFace,0,z);root.rotation.y=-Math.PI/2;
  root.userData.antidote=true;root.userData.available=true;root.userData.wallAnchor={x:wall.x,z:wall.z};
  const green=material('#2d7058',{emissive:'#143d2a',emissiveIntensity:.09,roughness:.48});
  const white=materials.white||material('#edf1f2'),steel=materials.steel||material('#8b9aa4',{metalness:.72,roughness:.29});
  const glass=materials.glass||material('#a3d4cb',{transparent:true,opacity:.18,roughness:.15,depthWrite:false});
  const shell=new Batcher(root);
  shell.box(green,0,1.62,.025,.92,1.04,.05);
  for(const side of [-1,1])shell.box(green,side*.435,1.62,.14,.05,1.04,.23);
  for(const y of [1.125,2.115])shell.box(green,0,y,.14,.92,.05,.23);
  shell.box(white,0,1.835,.225,.82,.035,.045);
  shell.box(white,0,1.315,.13,.82,.035,.22);
  // The front window leaves the contents visible behind a white medical cross.
  shell.box(glass,0,1.575,.245,.81,.47,.012);
  shell.box(white,-.285,1.57,.258,.055,.18,.012);shell.box(white,-.285,1.57,.258,.18,.055,.012);
  shell.box(steel,.385,1.575,.258,.025,.14,.025);
  shell.finish();
  const label=sign('ANTIDOTE','CONTAMINATION RELIEF',.84,.25,{background:'#245a45',color:'#f1fff8'});
  label.name='ANTIDOTE cabinet label';label.position.set(0,1.975,.257);root.add(label);
  const contents=new THREE.Group();contents.name='Sealed antidote vials';root.add(contents);
  const bottles=new Batcher(contents),liquid=material('#8bbf99',{emissive:'#386c48',emissiveIntensity:.17,roughness:.34});
  for(const x of [-.20,-.04,.12,.28]){
    bottles.cylinder(glass,x,1.465,.155,.043,.255,.043);
    bottles.cylinder(liquid,x,1.425,.155,.036,.16,.036);
    bottles.cylinder(white,x,1.605,.155,.046,.045,.046);
    bottles.box(white,x,1.50,.198,.058,.065,.009);
  }
  bottles.finish();
  const indicatorMaterial=material('#b2e5b6',{emissive:'#76ce89',emissiveIntensity:.6,roughness:.3});
  const indicator=mesh('sphere',indicatorMaterial,[.018,.018,.012],[.365,1.975,.269],root);indicator.name='Antidote availability light';
  const collider=footprint(wallFace-.14,z,.29,.96,2.15,0,'antidote-cabinet');collider.minY=1.09;
  const interaction={type:'antidote',x:wallFace-.86,z,floor:layout.floor,label:'Use contamination antidote'};
  let available=true;
  return {root,collider,interaction,setAvailable(value){available=!!value;contents.visible=available;indicatorMaterial.color.set(available?'#b2e5b6':'#63736a');indicatorMaterial.emissiveIntensity=available?.6:0;root.userData.available=available;},get available(){return available;}};
}
