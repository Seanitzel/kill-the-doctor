import {bathroomMirror} from './mirrors.js';
import * as THREE from 'three';
import {Batcher,mesh,material,sign,bed,monitor} from './assets.js';
import {footprint} from './collision.js';

// Factory handles own only their instance buffers, explicitly created geometry,
// signs and fallback materials. Supplied materials and the shared primitive pool
// remain available to the rest of the hospital after a handle is disposed.
function propKit(parent,{x=0,z=0,rotation=0}={},supplied={}) {
  const root=new THREE.Group();root.position.set(x,0,z);root.rotation.y=rotation;parent?.add(root);
  const ownedMaterials=new Set(),ownedGeometries=new Set(),ownedTextures=new Set(),cache=new Map();
  const batch=new Batcher(root),colliders=[],c=Math.cos(rotation),s=Math.sin(rotation);
  const point=(lx,lz,yaw=0)=>({x:x+c*lx+s*lz,z:z-s*lx+c*lz,yaw:rotation+yaw});
  const obstacle=(lx,lz,w,d,h,ry=0,type='furniture',minY=0)=>{
    const p=point(lx,lz),bounds=footprint(p.x,p.z,w,d,h,rotation+ry,type);bounds.minY=minY;colliders.push(bounds);return bounds;
  };
  batch.collider=(lx,lz,w,d,h,ry,type)=>obstacle(lx,lz,w,d,h,ry,type);
  const use=(name,color,options={})=>{
    if(supplied[name])return supplied[name];if(cache.has(name))return cache.get(name);
    const value=material(color,options);cache.set(name,value);ownedMaterials.add(value);return value;
  };
  const label=(title,subtitle,lx,y,lz,ry=0,w=2.2,h=.48)=>{
    const value=sign(title,subtitle,w,h);value.position.set(lx,y,lz);value.rotation.y=ry;root.add(value);
    ownedGeometries.add(value.geometry);ownedMaterials.add(value.material);
    if(value.material.map)ownedTextures.add(value.material.map);return value;
  };
  let statics=[],disposed=false;
  return {root,batch,colliders,point,obstacle,use,label,ownedGeometries,finish(){statics=batch.finish();return statics;},dispose(){
    if(disposed)return;disposed=true;root.removeFromParent();
    for(const value of statics)value.dispose();
    for(const value of ownedGeometries)value.dispose();
    for(const value of ownedTextures)value.dispose();
    for(const value of ownedMaterials)value.dispose();
    root.clear();
  }};
}

export function addBathroom(parent,{x=0,z=0,width=9,depth=9,rotation=0}={},materials={}) {
  if(width<7||depth<7)throw new RangeError('Bathroom needs at least 7m width and depth for accessible circulation.');
  const kit=propKit(parent,{x,z,rotation},materials),{root,batch:b,obstacle,use,point}=kit;root.name='bathroom-props';
  const white=use('white','#e8eff0'),blue=use('blue','#416e80'),dark=use('dark','#253a42');
  const steel=use('steel','#9faeb5',{metalness:.75,roughness:.25});
  const mirrors=[];
  const left=-width/2+.9,right=width/2-.75,divider=-width/2+2.95;
  const centers=[-1.45,1.45],anchors={toilets:[],sinks:[],entry:point(0,-depth/2+1.2),center:point(0,0)};
  // Two private cubicles open onto the central circulation aisle.
  for(const pz of [-2.9,0,2.9]){
    const px=(-width/2+.15+divider)/2,w=divider-(-width/2+.15);
    b.box(blue,px,1.18,pz,w,2.12,.065);obstacle(px,pz,w,.065,2.24,0,'cubicle-partition');
    for(const end of [-width/2+.22,divider])b.cylinder(steel,end,1.12,pz,.025,2.24,.025);
  }
  const ringGeometry=new THREE.TorusGeometry(.255,.032,7,20);kit.ownedGeometries.add(ringGeometry);
  for(const pz of centers){
    // Toilet faces the aisle. The tank, bowl recess, seat and support rail read
    // clearly at game distance without plumbing textures or expensive mirrors.
    b.box(white,left-.3,.66,pz,.2,.62,.56);
    b.cylinder(white,left+.08,.22,pz,.18,.44,.18);
    b.sphere(white,left+.16,.41,pz,.42,.16,.31);
    b.sphere(dark,left+.19,.545,pz,.29,.022,.205);
    const ring=new THREE.Mesh(ringGeometry,white);ring.position.set(left+.17,.56,pz);ring.rotation.set(Math.PI/2,0,Math.PI/2);ring.scale.y=1.33;root.add(ring);
    b.box(steel,left-.29,.88,pz+.16,.03,.025,.12);
    obstacle(left+.08,pz,1.08,.68,1,0,'toilet');
    b.box(steel,-width/2+.24,.91,pz,.035,.035,1.1);
    b.cylinder(steel,-width/2+.24,.72,pz-.47,.018,.38,.018);
    // An open cubicle door lies inside the stall, leaving a 1.3m entrance.
    for(const side of [-1,1]){
      b.box(blue,divider,1.18,pz+side*1.075,.065,2.12,.75);
      obstacle(divider,pz+side*1.075,.065,.75,2.24,0,'cubicle-partition');
    }
    b.box(blue,divider-.52,1.18,pz-.65,1.05,2.05,.055);
    obstacle(divider-.52,pz-.65,1.05,.055,2.21,0,'cubicle-door');
    b.box(steel,divider-.15,1.17,pz-.61,.1,.025,.035);
    anchors.toilets.push(point(divider-.65,pz+.13,-Math.PI/2));
  }
  // Two washbasins with recessed bowls, faucets, soap and mirror panels.
  for(const pz of [-1.45,1.45]){
    b.box(blue,right,.43,pz,.67,.82,1.15);b.box(white,right,.88,pz,.85,.10,1.3);
    b.sphere(white,right-.08,.92,pz,.34,.095,.46);b.sphere(dark,right-.1,.995,pz,.24,.018,.34);
    b.cylinder(steel,right+.20,1.04,pz,.023,.27,.023);
    b.box(steel,right+.08,1.17,pz,.24,.035,.035);
    b.box(white,width/2-.17,1.2,pz+.8,.13,.24,.18);b.box(blue,width/2-.245,1.21,pz+.8,.018,.08,.10);
    b.box(steel,width/2-.12,1.68,pz,.055,1.12,1.24);const mirror=bathroomMirror();mirror.position.set(width/2-.17,1.68,pz);mirror.rotation.y=-Math.PI/2;root.add(mirror);mirrors.push(mirror);
    b.box(white,width/2-.19,2.3,pz,.09,.07,1.22);
    obstacle(right-.03,pz,.9,1.35,1.1,0,'washbasin');
    anchors.sinks.push(point(right-1.1,pz,Math.PI/2));
  }
  b.box(dark,width/2-.65,.31,depth/2-.8,.42,.62,.42);b.box(steel,width/2-.65,.64,depth/2-.8,.44,.05,.44);
  obstacle(width/2-.65,depth/2-.8,.46,.46,.67,0,'bathroom-bin');
  const dryer=new THREE.Group();dryer.name='Automatic hand dryer';dryer.position.set(width/2-.28,1.24,0);root.add(dryer);
  mesh('box',steel,[.10,.46,.55],[.16,0,0],dryer);mesh('box',steel,[.30,.46,.55],[0,0,0],dryer);mesh('box',white,[.32,.40,.51],[-.025,.025,0],dryer);
  mesh('sphere',white,[.17,.13,.255],[-.025,.20,0],dryer);
  mesh('box',dark,[.15,.055,.32],[-.09,-.22,0],dryer);mesh('box',steel,[.16,.018,.33],[-.09,-.25,0],dryer);
  mesh('sphere',blue,[.009,.012,.025],[-.19,-.08,0],dryer);
  obstacle(width/2-.30,0,.43,.60,1.60,0,'hand-dryer',.96);
  const statics=kit.finish();return {root,colliders:kit.colliders,anchors,statics,mirrors,dispose(){for(const mirror of mirrors)mirror.dispose();kit.dispose();}};
}

export function attachMobilityCane(visual,{hand=null,side=1,length=1.2}={},materials={}) {
  const parent=visual.root||visual,kit=propKit(parent,{},materials),{root,use}=kit;root.name='white-mobility-cane';
  length=Math.max(.9,Math.min(1.5,length));
  const white=use('white','#f0f4f3'),red=use('red','#b54e47'),dark=use('dark','#27363d');
  mesh('cylinder',dark,[.024,.14,.024],[0,-.035,0],root);
  mesh('cylinder',white,[.012,length-.27,.012],[0,-(length-.13)/2,0],root);
  mesh('cylinder',red,[.015,.20,.015],[0,-length+.13,0],root);
  mesh('sphere',white,[.027,.027,.027],[0,-length+.015,0],root);
  mesh('cylinder',dark,[.022,.022,.022],[0,-length*.52,0],root);
  const grip=new THREE.Vector3(),tip=new THREE.Vector3(),direction=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0);
  const anchor=hand||((side<0&&visual.model?.getObjectByName('LeftHand'))||visual.hand);
  const handle={root,colliders:[],dispose:kit.dispose,update(time=0,speed=0){
    parent.updateMatrixWorld(true);
    if(anchor){anchor.getWorldPosition(grip);parent.worldToLocal(grip);}else grip.set(side*.30,.95,.12);
    const sweep=Math.sin(time*(speed>.1?1.55: .8))*(speed>.1?.29:.045);
    tip.set(grip.x+side*.10+sweep,.035,grip.z+.66);
    direction.copy(tip).sub(grip);const distance=direction.length();
    root.position.copy(grip);root.quaternion.setFromUnitVectors(down,direction.normalize());root.scale.set(1,distance/length,1);
  }};
  handle.update();return handle;
}

export function addOperatingSet(parent,{x=0,z=0,rotation=0}={},materials={}) {
  const kit=propKit(parent,{x,z,rotation},materials),{root,batch:b,obstacle,use,point}=kit;root.name='restricted-operating-set';
  const m={steel:use('steel','#a5b3bc',{metalness:.7,roughness:.3}),white:use('white','#e9eff1'),
    linen:use('linen','#d0dfe4'),blue:use('blue','#436c81'),dark:use('dark','#203440'),
    monitor:use('monitor','#194658',{emissive:'#518b9c',emissiveIntensity:.3}),light:use('light','#d9eff6',{emissive:'#b4d7e4',emissiveIntensity:.8})};
  bed(b,m,0,0,0,false);monitor(b,m,-1.65,-1.6);
  // Modest clothed-patient set dressing: no procedure, injury or organ is shown.
  b.box(m.steel,2.25,.85,-.7,.75,.08,1.12);b.box(m.steel,2.25,.32,-.7,.7,.045,1.05);
  for(const px of [1.94,2.56])for(const pz of [-1.15,-.25]){
    b.box(m.steel,px,.47,pz,.035,.8,.035);b.sphere(m.dark,px,.08,pz,.055,.055,.055);
  }
  b.box(m.white,2.25,.91,-.7,.57,.045,.83);
  for(let i=0;i<4;i++)b.box(m.steel,2.08+i*.10,.945,-.7,.025,.012,.3);
  b.cylinder(m.white,2.39,1.005,-1.0,.055,.16,.055);
  obstacle(2.25,-.7,.83,1.2,1.1,0,'medical-trolley');
  b.box(m.steel,0,3.25,0,.045,.55,.045);b.cylinder(m.steel,0,2.95,0,.6,.1,.6);
  b.cylinder(m.light,0,2.89,0,.53,.025,.53);obstacle(0,0,1.2,1.2,3.3,0,'operating-lamp',2.85);
  for(const px of [-4,4]){
    b.box(m.white,px,1.1,-3.1,1.2,2.2,.65);b.box(m.blue,px,1.3,-2.765,1.1,.06,.025);
    obstacle(px,-3.1,1.25,.7,2.2,0,'medical-cabinet');
  }
  const patient={...point(0,.85),y:1,bedRotation:rotation};
  const anchors={patient,doctor:point(-1.2,0,Math.PI/2),assistant:point(1.2,.1,-Math.PI/2),
    rescue:point(0,2.05,Math.PI),monitor:point(-1.65,-1.6),trolley:point(2.25,-.7),entry:point(0,-5)};
  const statics=kit.finish();return {root,colliders:kit.colliders,anchors,statics,dispose:kit.dispose};
}
