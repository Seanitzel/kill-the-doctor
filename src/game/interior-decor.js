import * as T from 'three';
import {mesh} from './assets.js';
import {assetUrl} from './asset-url.js';
import {tileAt,key,floorOrdinal} from './layout.js';
import {floralWallBand} from './wall-surfaces.js';
export const NIGERIAN_PAINTINGS=[['artMarket','nigeria-market'],['artPottery','nigeria-pottery'],['artWeaving','nigeria-weaving'],['artBaskets','nigeria-baskets'],['artGarden','nigeria-garden'],['artLagoon','nigeria-lagoon'],['artTailor','nigeria-tailor'],['artCourtyard','nigeria-courtyard'],['artProduce','nigeria-produce'],['artTextiles','nigeria-textiles'],['artHarvest','nigeria-harvest'],['artCooking','nigeria-cooking']];
const ART={nigeria:NIGERIAN_PAINTINGS,egypt:[['floral','egypt-floral'],['floorMarble','egypt-marble']]};
async function decodeArt(blob){
 if(typeof createImageBitmap==='function')return createImageBitmap(blob,{imageOrientation:'flipY'});
 const url=URL.createObjectURL(blob),image=document.createElement('img');try{image.src=url;await image.decode();image.close=()=>image.removeAttribute('src');return image;}finally{URL.revokeObjectURL(url);}
}
// Each original painting has one owned map, shared by the floor assemblies.
export function interiorArt(materials,country,maps){
 let controller,disposed=false,loaded=false,pending=null;const images=new Set(),jobs=[];
 for(const [name,file]of ART[country]||[]){const floor=name==='floorMarble',map=floor?materials.floor.map:new T.Texture();map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;if(!floor){maps.push(map);materials[name]=new T.MeshStandardMaterial({color:'#ffffff',map,roughness:.85,emissive:'#ffffff',emissiveMap:map,emissiveIntensity:name==='floral'?.035:.13});}jobs.push({map,file,floor});}
 if(materials.floral){const band=floralWallBand({axis:'x',x:0,z:0}),map=materials.floral.map.clone();map.repeat.y=band.height/2.32;map.offset.y=(band.bottom-1.24)/2.32;maps.push(map);materials.floralHeader=materials.floral.clone();materials.floralHeader.map=materials.floralHeader.emissiveMap=map;}
 return {load(signal){
  if(disposed)return Promise.reject(Error('Interior retired'));if(loaded||!jobs.length)return Promise.resolve();if(pending)return pending;
  controller=new AbortController();const active=controller,cancel=()=>active.abort(signal?.reason),decoded=new Set();if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(()=>active.abort(Error('Interior artwork could not load. Please retry.')),15000);
  pending=(async()=>{try{const results=await Promise.all(jobs.map(async({map,file,floor})=>{const response=await fetch(assetUrl(`images/interiors/${file}.jpg`),{signal:active.signal});if(!response.ok&&response.status!==0)throw Error('Interior artwork could not load. Please retry.');const image=await decodeArt(await response.blob());if(disposed||active.signal.aborted){image.close();throw active.signal.reason||Error('Artwork cancelled');}decoded.add(image);return {map,image,floor};}));
   for(const {map,image,floor}of results){if(floor){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,512,512);ctx.fillStyle='#74603e';for(let i=0;i<=4;i++){ctx.fillRect(i*128-.6,0,1.2,512);ctx.fillRect(0,i*128-.6,512,1.2);}map.image=canvas;image.close();decoded.delete(image);}else{images.add(image);map.image=image;}map.needsUpdate=true;}loaded=true;
  }catch(error){active.abort(error);for(const image of decoded)image.close();throw error;}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);pending=null;}})();return pending;
 },dispose(){if(disposed)return;disposed=true;controller?.abort();for(const image of images)image.close();images.clear();}};
}
export function hallWallFaces(layout,{includeExterior=false}={}){
 const faces=[];for(const wall of layout.walls){if(wall.door||wall.exterior&&!includeExterior)continue;for(const side of [-1,1]){const dx=wall.axis==='z'?side*.30:0,dz=wall.axis==='x'?side*.30:0,p=tileAt(wall.x+dx,wall.z+dz);if(layout.cells.get(key(p.x,p.z))?.room==='hall')faces.push({wall,side,x:wall.x+dx*.4,z:wall.z+dz*.4,rotation:wall.axis==='x'?(side<0?Math.PI:0):(side<0?-Math.PI/2:Math.PI/2)});}}
 return faces;
}
export function nigerianGalleryPlan(layout){
 if(layout.floor===3)return[];
 const faces=hallWallFaces(layout,{includeExterior:true}).filter(f=>f.wall.exterior&&f.wall.axis==='z'),left=Math.min(...faces.map(f=>f.wall.x)),right=Math.max(...faces.map(f=>f.wall.x));
 const result=[],floor=floorOrdinal(layout.floor);
 for(const [side,x]of [left,right].entries()){
  const bays=faces.filter(f=>f.wall.x===x);
  for(const [slot,z]of [-18,-6,6,18].entries()){
   const face=bays.find(f=>f.wall.z===z);if(!face)continue;
   const painting=slot%2===0?NIGERIAN_PAINTINGS[floor*4+side*2+slot/2]:null;
   if(slot%2===0&&!painting)continue;
   result.push({face,hallway:side===0?'west-end':'east-end',kind:painting?'painting':'artifact',painting,artifact:['textile','trays','spoons'][(floor+side+slot)%3]});
  }
 }
 return result;
}
function panel(group,m,face,width,height,name,art){const root=new T.Group();root.name=name;root.position.set(face.x,2.45,face.z);root.rotation.y=face.rotation;group.add(root);mesh('box',m.wood,[width+.13,height+.13,.045],[0,0,0],root);mesh('plane',art,[width,height,1],[0,0,.026],root);return root;}
function textile(group,m,face){const root=new T.Group();root.name='Nigerian woven wall tray and indigo textile';root.position.set(face.x,2.25,face.z);root.rotation.y=face.rotation;group.add(root);mesh('box',m.wood,[.85,1.1,.035],[0,0,0],root);mesh('box',m.artIndigo,[.74,.98,.045],[0,0,.025],root);
 for(let i=0;i<5;i++)for(let j=0;j<4;j++){const shape=mesh('box',m.linen,[.035,.11,.01],[-.27+j*.18,-.36+i*.18,.054],root);shape.rotation.z=(i+j)%2?Math.PI/4:-Math.PI/4;}
 // A shallow woven domestic tray, rather than a sacred ceremonial object.
 const tray=mesh('cylinder',m.wood,[.27,.035,.27],[.55,.03,.06],root);tray.rotation.x=Math.PI/2;
 for(let i=0;i<7;i++){const line=mesh('box',m.linen,[.42,.012,.008],[.55,-.18+i*.06,.083],root);line.scale.x*=Math.sqrt(Math.max(.1,1-((i-3)/4)**2));}
}
function wallArtifact(group,m,face,kind){
 if(kind==='textile'){const before=group.children.length;textile(group,m,face);return group.children[before];}
 const root=new T.Group();root.name=kind==='trays'?'Nigerian woven domestic tray arrangement':'Nigerian carved wooden serving spoons';root.position.set(face.x,2.4,face.z);root.rotation.y=face.rotation;group.add(root);
 if(kind==='trays')for(let i=0;i<3;i++){
  const x=(i-1)*.43,y=i===1?.16:-.12,r=i===1?.31:.24,tray=mesh('cylinder',m.wood,[r,.035,r],[x,y,.035],root);tray.rotation.x=Math.PI/2;
  for(let row=-3;row<=3;row++)mesh('box',m.linen,[r*1.65*Math.sqrt(1-(row/4)**2),.012,.008],[x,y+row*r/4,.06],root);
 }else for(let i=0;i<3;i++){const x=(i-1)*.32;mesh('box',m.wood,[.055,.56,.035],[x,-.12,.02],root);mesh('sphere',m.wood,[.13,.19,.035],[x,.25,.02],root);mesh('sphere',m.lowerWall,[.095,.145,.012],[x,.27,.052],root);}
 return root;
}
function vase(group,batch,m,p){const root=new T.Group();root.name=p.triage?'Gold vase with white flowers · left of triage':'Gold vase with white flowers';root.position.set(p.x,0,p.z);group.add(root);mesh('cylinder',m.gold,[.14,.10,.18],[0,.1,0],root);mesh('sphere',m.gold,[.23,.34,.23],[0,.39,0],root);mesh('cylinder',m.gold,[.12,.19,.12],[0,.7,0],root);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=Math.sin(a)*.19,z=Math.cos(a)*.15,y=1.18+(i%2)*.15;const delta=new T.Vector3(x,y-.7,z),stem=mesh('cylinder',m.flowerStem,[.012,delta.length(),.012],[x*.5,(y+.7)/2,z*.5],root);stem.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());const flower=new T.Group();flower.position.set(x,y,z);root.add(flower);mesh('sphere',m.gold,[.04,.035,.04],[0,0,0],flower);for(let k=0;k<6;k++){const angle=k*Math.PI/3,petal=mesh('sphere',m.white,[.07,.025,.13],[Math.sin(angle)*.08,.012,Math.cos(angle)*.08],flower);petal.rotation.y=angle;petal.rotation.x=.25;}}
 batch.collider?.(p.x,p.z,.54,.54,1.45,0,'decorative-vase');batch.addObject(root);return root;
}
function vaseFits(p,layout,colliders){const cell=tileAt(p.x,p.z);if(layout.cells.get(key(cell.x,cell.z))?.room!=='hall')return false;if(layout.doors.some(d=>Math.hypot(d.x-p.x,d.z-p.z)<1.8||Math.hypot(d.x-.86-p.x,d.z-p.z)<2.1))return false;return !colliders.some(c=>(c.minY||0)<1.45&&(c.maxY??3)>0&&p.x+.29>c.minX&&p.x-.29<c.maxX&&p.z+.29>c.minZ&&p.z-.29<c.maxZ);}
export function addCountryDecor(group,batch,m,layout,profile,{colliders=[]}={}){
 const faces=hallWallFaces(layout);
 if(profile.country==='nigeria'){
  m.artIndigo||=new T.MeshStandardMaterial({color:'#263d62',roughness:.95});
  // Curated galleries occupy only the two far side corridors. Each painting
  // appears once in the entire hospital, with a domestic artifact between it
  // and the next painting; the central and cross corridors stay undecorated.
  group.userData.nigerianGallery=[];
  for(const item of nigerianGalleryPlan(layout)){
   const root=item.kind==='painting'?panel(group,m,item.face,1.6,1.2,'Nigerian daily-life painting',m[item.painting[0]]):wallArtifact(group,m,item.face,item.artifact);
   const info={hallway:item.hallway,kind:item.kind,artwork:item.painting?.[1]||null,artifact:item.kind==='artifact'?item.artifact:null,x:item.face.x,z:item.face.z};root.userData.gallery=info;group.userData.nigerianGallery.push(info);batch.addObject(root);
  }
 }
 if(profile.country==='egypt'){
  group.userData.floralPanels=faces.length;group.userData.floralPanelBounds=[];
  for(const face of faces){const band=floralWallBand(face.wall),plane=mesh('plane',band.window?m.floralHeader:m.floral,[2.94,band.height,1],[0,0,0]);plane.name='Ivory floral relief · solid hallway wall';plane.position.set(face.x,band.center,face.z);plane.rotation.y=face.rotation;group.add(plane);batch.addObject(plane);group.userData.floralPanelBounds.push({x:face.x,z:face.z,axis:face.wall.axis,side:face.side,...band});}
  m.gold||=new T.MeshStandardMaterial({color:'#d4ad4c',metalness:.62,roughness:.28,emissive:'#49300d',emissiveIntensity:.16});m.flowerStem||=new T.MeshStandardMaterial({color:'#556d47',roughness:.85});
  const candidates=[...(layout.floor===0?[{x:3.7,z:31.2,triage:true}]:[]),{x:-5.2,z:29.5},{x:7.8,z:27},{x:7.8,z:-21},{x:-5.1,z:-21},...faces.map(f=>({x:f.x+(f.wall.axis==='z'?f.side*.2:0),z:f.z+(f.wall.axis==='x'?f.side*.2:0)}))],placed=[];
  for(const p of candidates){if(placed.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<8)||!vaseFits(p,layout,colliders))continue;vase(group,batch,m,p);placed.push(p);if(placed.length===4)break;}group.userData.flowerVases=placed;
 }
}
