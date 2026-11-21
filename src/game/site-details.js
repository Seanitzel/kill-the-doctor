import {world,TILE,tileAt,key} from './layout.js';
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
export function addNightStreet(group,batch,m,site,layout={}){
 const story=!!group.userData.storyInterior;
 addNightSky(group,{story,country:site?.id});addEveningWeather(group,site?.id,{story});
 const floorCount=layout.publicFloors?.length||3;group.userData.exteriorFloors=floorCount;const facade=material('#617887'),window=material('#243d4e',{roughness:.25,metalness:.35}),lit=material('#c7c2a2',{emissive:'#c9b277',emissiveIntensity:.38});batch.box(material('#111e27'),0,-.25,40,220,.15,200);
 const profile=group.userData.interiorProfile;
 // The old shell sat BEHIND interior wall rails and omitted the door lintel.
 // Put its outer skin beyond the interior envelope; keep the same 6m portal.
 const frontZ=story?34.76:34.25,depth=story?.24:.22;
 const indoor=[...(layout.cells?.values()||[])].filter(c=>c.z<23&&!(layout.expanded&&c.z<3&&c.x<10));
 const left=story?Math.min(-30,...indoor.map(c=>world(c.x,c.z).x-TILE/2-.2)):-30,right=30;
 const sharedBlue=!story||!profile||['france','england'].includes(site?.id),top=sharedBlue?facade:m.wall,lower=sharedBlue?facade:m.lowerWall||m.wall,split=sharedBlue?1.12:profile.lowerHeight||1.12;
 for(const [lo,hi]of [[left,-1.5],[4.5,right]]){const x=(lo+hi)/2,width=hi-lo;batch.box(lower,x,split/2,frontZ,width,split,depth);batch.box(top,x,(split+3.6)/2,frontZ,width,3.6-split,depth);if(story&&!sharedBlue){batch.box(m.stripe,x,1.03,frontZ+.135,width,.13,.025);batch.box(m.trim,x,.08,frontZ+.135,width,.16,.025);}}
 if(story)batch.box(top,1.5,3.32,frontZ,6,.96,depth);
 for(let floor=1;floor<floorCount;floor++){const y=floor*3.6;batch.box(facade,(left+right)/2,y+1.8,frontZ,right-left,3.6,depth);batch.box(m.steel,(left+right)/2,y,frontZ+.25,right-left,.16,.48);for(let x=Math.ceil((left+3)/3)*3;x<=right-3;x+=3){batch.box(m.steel,x,y+1.65,frontZ+.17,2.1,1.85,.08);batch.box((x+floor*3)%9===0?lit:window,x,y+1.65,frontZ+.23,1.95,1.7,.025);batch.box(m.steel,x,y+1.65,frontZ+.26,.05,1.75,.03);}}
 batch.box(m.steel,(left+right)/2,floorCount*3.6+.15,frontZ,right-left+1,.3,1.1);
 for(const x of [left,right])batch.box(facade,x,floorCount*1.8,2,.25,floorCount*3.6,story?65.6:64);
 if(story){
  const inside=(x,z)=>{const p=tileAt(x,z),cell=layout.cells.get(key(p.x,p.z));return !!cell&&cell.z<23&&!(layout.expanded&&cell.z<3&&cell.x<10);};
  let sections=0;for(const wall of layout.walls.filter(w=>w.exterior&&w.z<0)){const horizontal=wall.axis==='x';for(const side of[-1,1]){const dx=horizontal?0:side*.3,dz=horizontal?side*.3:0;if(inside(wall.x+dx,wall.z+dz)||!inside(wall.x-dx,wall.z-dz))continue;const x=wall.x+dx*.7,z=wall.z+dz*.7,w=horizontal?TILE:.18,d=horizontal?.18:TILE;batch.box(lower,x,split/2,z,w,split,d);batch.box(top,x,(split+3.8)/2,z,w,3.8-split,d);sections++;}}
  group.userData.exteriorReturnSections=sections;
 }
 if(story)group.userData.entranceFinish={country:site?.id,sharedBlue,wall:top.color.getHexString(),lower:lower.color.getHexString(),frontZ,lintelBottom:2.84,left,right};

 const asphalt=material('#111820',{roughness:.95}),pavement=material('#657077',{roughness:.9}),yellow=material('#ffce68',{emissive:'#ffc44e',emissiveIntensity:2.8}),poles=material('#333e48',{metalness:.65}),line=material('#b7b4a4');
 batch.box(pavement,1.5,-.09,42.3,48,.14,8);batch.box(asphalt,1.5,-.13,53,65,.13,14);batch.box(m.steel,1.5,-.005,46.2,48,.14,.20);
 for(let x=-28;x<=30;x+=7)batch.box(line,x,-.055,53,3,.012,.14);
 for(let x=-21;x<=24;x+=3)batch.box(m.steel,x,-.012,42,.025,.01,7.9);
 // Poles stand on the pavement edge, outside the ambulance's swept turning lane.
 for(const x of [-5,10]){const lampZ=38.5;
 batch.cylinder(poles,x,2.4,lampZ,.075,4.8,.075);batch.box(poles,x,4.78,lampZ+.55,.15,.10,1.2);batch.box(poles,x,4.73,lampZ+1.1,.58,.14,.82);batch.box(yellow,x,4.65,lampZ+1.1,.48,.035,.70);
 batch.collider?.(x,lampZ,.18,.18,4.8,0,'streetlamp');
 const light=new T.PointLight('#ffd06c',22,17,2);light.position.set(x,4.4,lampZ+1.1);light.name='Warm yellow streetlamp';group.add(light);
 }
 // Distant unlit facades remain cheap instanced silhouettes.
 for(let i=0;i<8;i++){const x=-25+i*8,height=5+(i%3)*2;batch.box(asphalt,x,height/2,64,6,height,3);for(let j=0;j<3;j++)batch.box(yellow,x-1.5+j*1.3,2.8,62.45,.30,.50,.035);}
 const label=sign('MAIN ENTRANCE / EXIT','AUTOMATIC DOORS',4.2,.58,{background:'#203b46'});label.name='Automatic entrance and exit header';label.position.set(1.5,3.28,story?frontZ+depth/2+.025:34.35);label.rotation.y=story?0:Math.PI;group.add(label);if(story){const inside=sign('MAIN ENTRANCE / EXIT','AUTOMATIC DOORS',4.2,.58,{background:'#203b46'});inside.name='Entrance header · inside';inside.position.set(1.5,3.28,34.32);inside.rotation.y=Math.PI;group.add(inside);}
}
