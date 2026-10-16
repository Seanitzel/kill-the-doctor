import * as THREE from 'three';
import {Batcher, material} from './assets.js';
import {footprint} from './collision.js';

// Each stand borrows the existing shared primitive pool and supplied materials.
// Its tube/hook geometry, fallback materials and instance buffers belong to the
// returned handle, so HospitalLife can release them on every mission reset.
export function addInfusion(parent, {x=0,z=0,rotation=0,endpoint=null}={}, supplied={}) {
  const root=new THREE.Group();root.name='bedside-infusion';root.position.set(x,0,z);root.rotation.y=rotation;
  parent?.add(root);
  const ownedMaterials=new Set(),ownedGeometries=new Set();
  const use=(name,color,options={})=>{
    if(supplied[name])return supplied[name];
    const value=material(color,options);ownedMaterials.add(value);return value;
  };
  const steel=use('steel','#a3b4be',{metalness:.75,roughness:.26});
  const dark=use('dark','#263945'),white=use('white','#e8f0f2');
  const glass=use('glass','#b5d6e2',{transparent:true,opacity:.4,depthWrite:false,roughness:.2});
  const fluid=use('green','#8ebdc4'),blue=use('blue','#477991');
  const batch=new Batcher(root);
  batch.cylinder(steel,0,1.10,0,.018,2.08,.018);
  batch.cylinder(steel,0,.35,0,.033,.5,.033);
  batch.cylinder(dark,0,.60,0,.044,.055,.044);
  batch.cylinder(dark,0,.12,0,.065,.10,.065);
  batch.box(steel,0,2.17,0,.45,.025,.025);
  for(let i=0;i<5;i++) {
    const angle=i*Math.PI*2/5,s=Math.sin(angle),c=Math.cos(angle);
    batch.box(steel,s*.16,.115,c*.16,.035,.04,.32,angle);
    batch.add('cylinder',dark,s*.31,.058,c*.31,.055,.035,.055,angle,Math.PI/2);
    batch.sphere(steel,s*.31,.105,c*.31,.028,.028,.028);
  }
  // An actual hanging bag, fluid level, label, nozzle and drip chamber.
  batch.box(glass,.16,1.92,0,.22,.35,.075);
  batch.box(fluid,.16,1.87,0,.185,.22,.048);
  batch.box(white,.16,1.98,.043,.16,.095,.012);
  batch.box(blue,.16,2.004,.051,.11,.025,.008);
  batch.cylinder(white,.16,1.723,0,.018,.065,.018);
  batch.cylinder(glass,.16,1.635,0,.028,.105,.028);
  batch.cylinder(fluid,.16,1.612,0,.02,.035,.02);
  const statics=batch.finish();
  const hookGeometry=new THREE.TorusGeometry(.047,.007,5,10,Math.PI*1.65);ownedGeometries.add(hookGeometry);
  for(const side of [-1,1]){
    const hook=new THREE.Mesh(hookGeometry,steel);hook.position.set(side*.16,2.12,0);hook.rotation.z=Math.PI*.2;root.add(hook);
  }
  // The optional endpoint is in stand-local coordinates, making it simple to
  // place the pole beside either bed orientation without allocating each frame.
  const end=endpoint?new THREE.Vector3(endpoint.x,endpoint.y,endpoint.z):new THREE.Vector3(.87,.88,.22);
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(.16,1.58,0),new THREE.Vector3(.19,1.33,.03),
    new THREE.Vector3(.25,.80,.12),new THREE.Vector3(end.x*.70,end.y-.08,end.z),end,
  ]);
  const tubeGeometry=new THREE.TubeGeometry(curve,18,.008,5,false);ownedGeometries.add(tubeGeometry);
  const tube=new THREE.Mesh(tubeGeometry,glass);tube.name='infusion-tube';root.add(tube);
  const collider=footprint(x,z,.56,.56,2.22,rotation,'infusion');
  let disposed=false;
  return {root,collider,tube,statics,dispose(){
    if(disposed)return;disposed=true;root.removeFromParent();
    for(const mesh of statics)mesh.dispose();
    for(const geometry of ownedGeometries)geometry.dispose();
    for(const value of ownedMaterials)value.dispose();
    root.clear();
  }};
}
