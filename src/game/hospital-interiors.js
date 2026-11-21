import * as T from 'three';
import {finishTexture} from './interior-surfaces.js';
import {interiorArt,addCountryDecor} from './interior-decor.js';
import {sign,mesh} from './assets.js';
import {nativeSign} from './hospital-signs.js';
import {tileAt,key} from './layout.js';
export const INTERIORS=Object.freeze({
 france:{wall:'#eeeae2',lower:'#e2dfd5',floor:'#c4c7c2',grout:'#acb0ab',accent:'#526c73',chair:'#c9a773',metal:'#adb7b7',wood:'#bca17a',ceiling:'slats',style:'French timber and daylight'},
 nigeria:{ceilingColor:'#dbdedb',ceilingGrout:'#b7bcb9',lowerHeight:1.65,wall:'#d9b096',lower:'#7b9877',floor:'#a29b88',grout:'#817d6c',accent:'#486957',chair:'#696e59',metal:'#8a897c',wood:'#796950',worn:true,style:'Nigerian peach and green wards'},
 china:{flooring:'marble',groutWidth:3.8,glassHalls:true,wall:'#eef1ef',lower:'#e0e8e8',floor:'#d6deda',grout:'#c1cdca',accent:'#2877b3',chair:'#a6c5ce',metal:'#c3d1d6',wood:'#c2cbd0',technology:true,style:'Chinese clinical robotics'},
 india:{ceilingColor:'#a58d6d',ceilingGrout:'#82725c',wall:'#d7c4aa',lower:'#986949',floor:'#a8a395',grout:'#8a897b',accent:'#786449',chair:'#81765e',metal:'#9c9b8b',wood:'#775138',worn:true,ornament:'lotus',style:'Indian brown and framed craft'},
 russia:{ceilingColor:'#b9cbd3',ceilingGrout:'#9baeb8',wall:'#e9eeec',lower:'#d5e0e3',floor:'#3677ad',grout:'#2e6191',accent:'#426d96',chair:'#5285a6',metal:'#b6c8d2',wood:'#bec8cf',style:'Russian blue clinical tiles'},
 venezuela:{grainy:true,ceilingColor:'#929292',ceilingGrout:'#717171',wall:'#e9dec7',lower:'#d4c6ad',floor:'#797979',grout:'#585858',accent:'#657b75',chair:'#7b9186',metal:'#9ca7a4',wood:'#b9aa92',style:'Venezuelan cream and grey'},
 america:{wall:'#e6e0d4',lower:'#d6cebb',floor:'#bf9562',grout:'#937044',accent:'#657c83',chair:'#537188',metal:'#afb8b8',wood:'#a77b4d',flooring:'wood',style:'American warm wood care'},
 egypt:{ceilingColor:'#d2ac4d',ceilingGrout:'#8e6a23',floral:true,wall:'#e8e1d4',lower:'#d5c8b3',floor:'#14191b',grout:'#74603e',accent:'#8a7652',chair:'#686c70',metal:'#bba16a',wood:'#a88b5e',flooring:'black-gold-marble',ornament:'geometry',style:'Egyptian marble and gold'},
 somalia:{ceilingColor:'#987c5b',ceilingGrout:'#735f48',lowerHeight:2.0,wall:'#e7ddbf',lower:'#c5ab46',floor:'#b9ab89',grout:'#9b8f71',accent:'#8d824c',chair:'#8c896c',metal:'#9b9784',wood:'#8c7956',worn:true,style:'Somali yellow and cream wards'},
});
export function interiorFor(mission){return mission?.playMode==='story'&&!mission.terror&&mission.mode!=='terror'?INTERIORS[mission.country?.id]||null:null;}
// Own only clones and newly created maps; the default pool survives mode switches.
export function createInterior(base,mission){
 const profile=interiorFor(mission);if(!profile)return null;
 const materials=Object.fromEntries(Object.entries(base).map(([key,value])=>[key,value.clone()])),maps=[];
 materials.wall.color.set(profile.wall);materials.stripe.color.set(profile.accent);materials.blue.color.set(profile.accent);materials.trim.color.set(profile.accent).multiplyScalar(.48);materials.chair.color.set(profile.chair);materials.steel.color.set(profile.metal);materials.wood.color.set(profile.wood);materials.linen.color.set(profile.worn?'#c9c3a6':'#e4e9e5');
 if(profile.glassHalls){materials.hallGlass=new T.MeshStandardMaterial({color:'#badbe2',transparent:true,opacity:.23,roughness:.2,metalness:.08,depthWrite:false});materials.hallFrost=new T.MeshStandardMaterial({color:'#d9e7e8',transparent:true,opacity:.74,roughness:.85,depthWrite:false});}
 materials.lowerWall=materials.wall.clone();materials.lowerWall.color.set(profile.lower);
 const map=finishTexture(profile);maps.push(map);materials.floor.map=map;materials.floor.color.set('#ffffff');materials.floor.roughness=profile.worn||profile.grainy?.84:profile.flooring?.includes('marble')?.28:.46;materials.floor.metalness=0;if(profile.grainy){materials.floor.bumpMap=map;materials.floor.bumpScale=.012;}
 if(profile.ceiling||profile.ceilingColor){const ceiling=finishTexture(profile,true);maps.push(ceiling);materials.ceiling.map=ceiling;materials.ceiling.color.set('#ffffff');}
 if(profile.country==='egypt'||mission.country.id==='egypt'){materials.ceiling.metalness=.38;materials.ceiling.roughness=.3;materials.ceiling.emissive.set('#78561c');materials.ceiling.emissiveIntensity=.13;}
 const art=interiorArt(materials,mission.country.id,maps);
 materials.light.emissive.set(mission.country.id==='egypt'?'#ffe3b5':profile.worn?'#f4e7ce':'#d5e9f4');
 let disposed=false;return{loadArt:art.load,profile:{...profile,country:mission.country.id},materials,dispose(){if(disposed)return;disposed=true;art.dispose();for(const map of maps)map.dispose();for(const value of Object.values(materials))value.dispose();}};
}
export function localizeSigns(root,profile){
 if(!profile)return;const signs=[];root.traverse(o=>{if(o.userData.signText&&!o.userData.localizedCountry)signs.push(o);});
 for(const original of signs){const info=original.userData.signText,native=nativeSign(info.text,profile.country)||nativeSign(info.subtitle,profile.country);if(!native)continue;const nativeBelowSubtitle=!nativeSign(info.text,profile.country);
 const replacement=sign(info.text,info.subtitle,info.width,info.height,{...info.options,native,nativeBelowSubtitle,rtl:profile.country==='egypt',background:profile.accent});
 original.material.map?.dispose();original.material.dispose();original.material=replacement.material;replacement.geometry.dispose();original.userData.localizedCountry=profile.country;original.userData.native=native;
 }
}
export function addInteriorDetails(group,batch,m,layout,profile,options={}){
 if(!profile||layout.floor===3)return;group.userData.interiorProfile=profile;addCountryDecor(group,batch,m,layout,profile,options);
 // Accents sit on existing wall faces above reach; no door, route or collider moves.
 if(profile.ornament){const walls=layout.walls.filter(w=>{if(w.axis!=='x'||w.door||w.exterior||Math.round(w.x+w.z)%4===0)return false;return[-1,1].some(side=>{const p=tileAt(w.x,w.z+side*.3);return layout.cells.get(key(p.x,p.z))?.room==='hall';});});for(const wall of walls.filter((_,i)=>i%Math.max(1,Math.floor(walls.length/4))===0).slice(0,4)){
  const side=[-1,1].find(side=>{const p=tileAt(wall.x,wall.z+side*.3);return layout.cells.get(key(p.x,p.z))?.room==='hall';});
  const ornament=new T.Group();ornament.name=profile.ornament==='lotus'?'Framed Indian lotus craft':'Egyptian geometric wall panel';ornament.position.set(wall.x,2.2,wall.z+side*.14);ornament.rotation.y=side<0?Math.PI:0;group.add(ornament);
  mesh('box',m.wood,[1.25,.94,.035],[0,0,0],ornament);mesh('box',m.linen,[1.12,.81,.045],[0,0,.025],ornament);
  for(let i=0;i<8;i++){const angle=i*Math.PI/4,shape=mesh(profile.ornament==='lotus'?'sphere':'box',m.steel,profile.ornament==='lotus'?[.085,.20,.012]:[.23,.23,.015],[Math.sin(angle)*.22,Math.cos(angle)*.22,.06],ornament);shape.rotation.z=-angle+(profile.ornament==='geometry'?Math.PI/4:0);}
 }}
 if(profile.worn&&profile.country!=='india'){group.userData.fanRotors=[];for(const z of[0,27]){const fan=new T.Group();fan.name='Hospital ceiling fan';fan.position.set(0,3.35,z);group.add(fan);mesh('cylinder',m.steel,[.035,.24,.035],[0,.13,0],fan);const rotor=new T.Group();fan.add(rotor);mesh('sphere',m.steel,[.13,.065,.13],[0,0,0],rotor);for(let i=0;i<3;i++){const blade=mesh('box',m.linen,[.18,.025,.85],[Math.sin(i*Math.PI*2/3)*.43,0,Math.cos(i*Math.PI*2/3)*.43],rotor);blade.rotation.y=i*Math.PI*2/3;}group.userData.fanRotors.push(rotor);}}
 if(profile.technology){
  // A compact delivery robot charges beneath the existing reception counter.
  const robot=new T.Group();robot.name='Autonomous hospital delivery robot · charging';robot.position.set(-4.5,0,26.8);group.add(robot);
  mesh('cylinder',m.dark,[.27,.12,.27],[0,.11,0],robot);mesh('box',m.white,[.42,.72,.38],[0,.52,0],robot);mesh('box',m.blue,[.35,.19,.025],[0,.71,.205],robot);mesh('box',m.monitor,[.22,.1,.028],[0,.72,.224],robot);
  for(const side of[-1,1])mesh('sphere',m.light,[.018,.018,.018],[side*.075,.74,.245],robot);
  mesh('box',m.steel,[.6,.025,.55],[0,.025,0],robot);batch.collider?.(-4.5,26.8,.6,.55,.9,0,'charging-robot');
  for(const room of layout.rooms.filter(r=>r.kind==='clinic'||r.kind==='ward')){const x=room.center.x-2.1,z=room.center.z-2.5;batch.box(m.steel,x,2.2,z,.7,.52,.10);batch.box(m.monitor,x,2.2,z+.06,.61,.40,.025);batch.box(m.green,x,2.2,z+.08,.44,.015,.012);}
 }
}
