import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mesh,material} from './assets.js';
export const EVENING_WEATHER=Object.freeze({france:'rain',nigeria:'storm',china:'rain',japan:'rain',israel:'clear',india:'rain',italy:'clear',germany:'snow',congo:'rain',canada:'snow',england:'rain',america:'rain',spain:'clear',brazil:'storm',kenya:'rain',morocco:'clear',pakistan:'rain',ireland:'rain','south-africa':'clear',sudan:'clear'});
// All scenery belongs to the hospital scene: fixed buffers, no timers or own RAF.
export function addEveningWeather(parent,country='france'){
 const root=new T.Group();root.name='Evening traffic and weather';parent.add(root);const weather=EVENING_WEATHER[country]||'clear',cars=[];
 const glass=material('#182d40',{metalness:.5,roughness:.18}),lamp=new T.MeshBasicMaterial({color:'#ffe6ad'}),tail=new T.MeshBasicMaterial({color:'#c9392b'}),rubber=material('#182026');
 for(let i=0;i<4;i++){
  const car=new T.Group();car.name='Moving nighttime car';root.add(car);const paint=material(['#526b7d','#876357','#858d8f','#384e49'][i],{metalness:.5,roughness:.35});
  mesh('box',paint,[1.65,.6,3.4],[0,.58,0],car);mesh('box',paint,[1.45,.55,1.8],[0,1.05,-.1],car);mesh('box',glass,[1.36,.38,1.84],[0,1.12,-.1],car);
  for(const x of[-.73,.73])for(const z of[-1.03,1.03]){const wheel=mesh('cylinder',rubber,[.31,.14,.31],[x,.32,z],car);wheel.rotation.z=Math.PI/2;}
  for(const x of[-.53,.53]){mesh('box',lamp,[.35,.16,.035],[x,.67,1.72],car);mesh('box',tail,[.27,.12,.035],[x,.68,-1.72],car);
   const light=new T.Mesh(new T.PlaneGeometry(1.35,6),new T.MeshBasicMaterial({color:'#efce7c',transparent:true,opacity:.06,depthWrite:false}));light.rotation.x=-Math.PI/2;light.position.set(x,.015,4.5);car.add(light);}
  car.updateMatrixWorld(true);const groups=new Map();for(const part of [...car.children]){if(!part.isMesh||part.material.transparent)continue;const geometry=part.geometry.clone().applyMatrix4(part.matrix);if(!groups.has(part.material))groups.set(part.material,[]);groups.get(part.material).push(geometry);part.removeFromParent();}for(const [mat,geometries]of groups){const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());car.add(new T.Mesh(merged,mat));}
  cars.push({root:car,offset:i*19,direction:i%2?1:-1,speed:4.2+i*.45});
 }
 const snow=weather==='snow',count=weather==='clear'?0:weather==='storm'?190:snow?170:130,positions=new Float32Array(count*(snow?3:6)),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const particles=snow?new T.Points(geometry,new T.PointsMaterial({color:'#d6dfeb',size:.065,transparent:true,opacity:.65,depthWrite:false})):new T.LineSegments(geometry,new T.LineBasicMaterial({color:'#a0b8cb',transparent:true,opacity:.32,depthWrite:false}));particles.name=`Evening ${weather}`;particles.frustumCulled=false;particles.visible=false;root.add(particles);
 const banks=[];if(snow){const white=material('#d7e1e8',{roughness:1});const base=mesh('box',white,[52,.04,24],[0,.012,49],root);base.name='Existing ground snow';for(const x of [-11.4,11.4]){const bank=mesh('box',white,[2.7,.18,7.4],[x,.09,39],root);bank.name='Accumulating snow bank';banks.push(bank);}for(const x of [-20,20])banks.push(mesh('box',white,[9,.18,8],[x,.09,59],root));}
 const lightning=new T.LineSegments(new T.BufferGeometry().setFromPoints([new T.Vector3(-15,20,56),new T.Vector3(-13,14,56),new T.Vector3(-13,14,56),new T.Vector3(-16,10,56),new T.Vector3(-16,10,56),new T.Vector3(-12,4,56)]),new T.LineBasicMaterial({color:'#ca89ff',transparent:true,opacity:0,depthWrite:false}));lightning.name='Purple storm lightning';root.add(lightning);const flash=new T.PointLight('#bb72ef',0,85,1);flash.position.set(-12,12,48);root.add(flash);
 const state={root,cars,particles,positions,count,weather,banks,lightning,flash,nextThunder:35,lastThunder:-100,snowDepth:.18};parent.userData.evening=state;updateEveningWeather(parent,false,0);return state;
}
export function updateEveningWeather(parent,outside,time=0,audio){
 const state=parent?.userData.evening;if(!state)return;const{cars,particles,positions,count,weather}=state;
 for(const car of cars){const position=((time*car.speed+car.offset)%94)-47;car.root.position.set(position*car.direction,0,car.direction>0?50:55.5);car.root.rotation.y=car.direction*Math.PI/2;}
 let thunder=false;if(weather==='storm'&&outside&&time>=state.nextThunder){state.lastThunder=time;state.nextThunder=time+50+(Math.floor(time)%31);thunder=true;}const flash=outside?Math.max(0,1-(time-state.lastThunder)/.45):0;state.lightning.material.opacity=flash;state.flash.intensity=flash*24;
 audio?.weather?.(weather,outside,thunder);particles.visible=outside;if(weather==='snow'){state.snowDepth=Math.min(.48,.18+time*.00022);for(const bank of state.banks){bank.scale.y=state.snowDepth/.18;bank.position.y=state.snowDepth/2;}}
 if(!outside)return;
 const snow=weather==='snow';for(let i=0;i<count;i++){const x=-24+(i*7.391%48)+(snow?Math.sin(time*.45+i)*.45:((time*.32+i*.07)%1)*.6),y=((i*1.73-time*(snow?.6:6.5))%11+11)%11,z=35+(i*3.73%25);const at=i*(snow?3:6);positions[at]=x;positions[at+1]=y;positions[at+2]=z;if(!snow){positions[at+3]=x+.075;positions[at+4]=y+.34;positions[at+5]=z+.015;}}
 particles.geometry.attributes.position.needsUpdate=true;
}
