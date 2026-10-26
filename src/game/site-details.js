import {addEveningWeather} from './evening-weather.js';
import {addNightSky} from './night-sky.js';
import * as T from 'three';
import {material,mesh,sign} from './assets.js';
// Modular country identities alter the built environment without duplicating assets.
export function addSiteDetails(group,batch,m,layout,site){
 if(!site||layout.floor===3)return;
 const variant=site.index%5,ribs=0,accent=material(site.accent),warm=material(['#c4b8a3','#c6c7c0','#b6c6cb','#c8b8b0','#b5c6bc'][variant]);
 group.userData.architecture={country:site.id,variant,ribs,accent:site.accent};
 // Keep the atrium's country identification band completely clear. Accent
 // panels belong on the back faces above the skirting, not over text.
 for(const side of [-1,1])for(let i=0;i<2;i++){
  const x=side<0?-10.39:10.39,z=30+i*.85;
  batch.box(accent,x,.78,z,.06,.75,.30);
 }
 // Low relief department portal trim; it never narrows the walkable opening.
 for(const d of layout.doors.filter(d=>!d.id.endsWith('back'))){batch.box(accent,d.x,2.64,d.z,2.05,.06,.29);if(variant===1||variant===4)for(const side of [-1,1])batch.box(warm,d.x+side*1.04,1.34,d.z,.055,2.6,.23);}
}
export function addNightStreet(group,batch,m,site){
 addNightSky(group);addEveningWeather(group,site?.id);
 group.userData.exteriorFloors=3;const facade=material('#617887'),window=material('#243d4e',{roughness:.25,metalness:.35}),lit=material('#c7c2a2',{emissive:'#c9b277',emissiveIntensity:.38});batch.box(material('#111e27'),0,-.25,40,220,.15,200);
 for(const [x,width] of [[-15.75,28.5],[17.25,25.5]])batch.box(facade,x,1.8,34.25,width,3.6,.22);
 for(let floor=1;floor<3;floor++){const y=floor*3.6;batch.box(facade,0,y+1.8,34.25,60,3.6,.22);batch.box(m.steel,0,y,34.5,60,.16,.48);for(let x=-27;x<=27;x+=3){batch.box(m.steel,x,y+1.65,34.42,2.1,1.85,.08);batch.box((x+floor*3)%9===0?lit:window,x,y+1.65,34.48,1.95,1.7,.025);batch.box(m.steel,x,y+1.65,34.51,.05,1.75,.03);}}batch.box(m.steel,0,10.95,34.25,61,.3,1.1);
 for(const x of [-30,30])batch.box(facade,x,5.4,2,.25,10.8,64);

 const asphalt=material('#111820',{roughness:.95}),pavement=material('#657077',{roughness:.9}),yellow=material('#ffce68',{emissive:'#ffc44e',emissiveIntensity:2.8}),poles=material('#333e48',{metalness:.65}),line=material('#b7b4a4');
 batch.box(pavement,1.5,-.09,42.3,48,.14,8);batch.box(asphalt,1.5,-.13,53,65,.13,14);batch.box(m.steel,1.5,-.005,46.2,48,.14,.20);
 for(let x=-28;x<=30;x+=7)batch.box(line,x,-.055,53,3,.012,.14);
 for(let x=-21;x<=24;x+=3)batch.box(m.steel,x,-.012,42,.025,.01,7.9);
 for(const x of [-1.7,4.7]){
 batch.cylinder(poles,x,2.4,43,.075,4.8,.075);batch.box(poles,x,4.78,43.55,.15,.10,1.2);batch.box(poles,x,4.73,44.1,.58,.14,.82);batch.box(yellow,x,4.65,44.1,.48,.035,.70);
 const light=new T.PointLight('#ffd06c',22,17,2);light.position.set(x,4.4,44.1);light.name='Warm yellow streetlamp';group.add(light);
 }
 // Distant unlit facades remain cheap instanced silhouettes.
 for(let i=0;i<8;i++){const x=-25+i*8,height=5+(i%3)*2;batch.box(asphalt,x,height/2,64,6,height,3);for(let j=0;j<3;j++)batch.box(yellow,x-1.5+j*1.3,2.8,62.45,.30,.50,.035);}
 const label=sign('MAIN ENTRANCE / EXIT','AUTOMATIC DOORS',4.2,.58,{background:'#203b46'});label.name='Automatic entrance and exit header';label.position.set(1.5,3.28,34.35);label.rotation.y=Math.PI;group.add(label);
}
