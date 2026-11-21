import * as T from 'three';
import {identityHash} from './population.js';

// Cultural dress is one part of a varied contemporary cast, never a staff uniform.
export function culturalAttire(mission,person,role,id,options={}){
 if(mission?.playMode!=='story'||mission.terror||mission.mode==='terror'||role!=='patient'||options.lying||options.visual)return null;
 const country=mission.country?.id;if(!['nigeria','india'].includes(country))return null;
 const variant=identityHash(`${mission.seed}:${id}:dress`);if(variant%3===0)return null;
 return {country,style:country==='nigeria'?(person.gender==='female'?'gele-wrapper':'embroidered-shirt'):(person.gender==='female'?'sari':'kurta'),variant};
}
function fabric(colour,variant,nigerian){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=colour;c.fillRect(0,0,128,128);c.strokeStyle=variant%2?'#e0c48a':'#e7ddbd';c.fillStyle=c.strokeStyle;c.lineWidth=1.3;
 if(!nigerian){for(let x=8;x<128;x+=32)c.fillRect(x,0,1,128);}
 else for(let y=0;y<128;y+=32)for(let x=0;x<128;x+=32){c.beginPath();c.moveTo(x+16,y+4);c.lineTo(x+27,y+16);c.lineTo(x+16,y+28);c.lineTo(x+5,y+16);c.closePath();c.stroke();c.fillRect(x+14,y+14,4,4);}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;return map;
}
export function applyCulturalAttire(model,person,{bonePoint,attachGeometry,clothMaterial,inverseSkinMatrix,coordinates}){
 const outfit=person.culturalAttire;if(!outfit)return;
 let source,skin;model.traverse(o=>{if(o.material?.name.includes('Outfit_Top'))source=o;if(o.material?.name.includes('Wolf3D_Skin'))skin=o;});
 if(!source?.skeleton||!skin)return;model.updateMatrixWorld(true);
 const {country,style,variant}=outfit,female=person.gender==='female',nigerian=country==='nigeria',neck=bonePoint(model,'Neck'),hips=bonePoint(model,'Hips'),shoulder=bonePoint(model,'LeftArm'),head=model.getObjectByName('Head');
 const palette=nigerian?['#286c68','#70364f','#735394','#a67b28']:['#9d354b','#287d74','#b06728','#653f89'],colour=palette[variant%palette.length],map=fabric(colour,variant,nigerian),cloth=clothMaterial(map?'#ffffff':colour,{map}),gold=clothMaterial('#dbc187',{roughness:.58,metalness:.18});
 const own=o=>{o.userData.appearanceOwnedTexture=!!map;o.userData.culturalAttire=style;return o;};
 function skinned(geometry,weights,material,name){
  const si=[],sw=[];for(let i=0;i<geometry.attributes.position.count;i++){const p=new T.Vector3().fromBufferAttribute(geometry.attributes.position,i),w=weights(p),total=w.reduce((s,a)=>s+a[1],0);for(let j=0;j<4;j++){si.push(j<w.length?Math.max(0,source.skeleton.bones.findIndex(b=>b.name===w[j][0])):0);sw.push(j<w.length?w[j][1]/total:0);}}
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name=name;mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.skeleton=source.skeleton;mesh.bindMode=source.bindMode;mesh.bindMatrix.copy(source.bindMatrix);mesh.bindMatrixInverse.copy(source.bindMatrixInverse);source.parent.add(mesh);mesh.updateWorldMatrix(true,false);
  const inverse=mesh.matrixWorld.clone().invert().multiply(model.matrixWorld),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(inverse).applyMatrix4(inverseSkinMatrix(mesh,i));p.setXYZ(i,v.x,v.y,v.z);}
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.appearanceOwned=true;return own(mesh);
 }
 function rings(rows){const v=[],uv=[],index=[],count=32;for(let row=0;row<rows.length;row++)for(let i=0;i<=count;i++){const [y,rx,rz]=rows[row],a=i/count*Math.PI*2,pleat=1+.025*Math.cos(a*16);v.push(Math.cos(a)*rx*pleat,y,neck.z+.016+Math.sin(a)*rz*pleat);uv.push(i/count*3,row/(rows.length-1)*3);if(row&&i){const b=row*(count+1)+i;index.push(b,b-1,b-count-2,b,b-count-2,b-count-1);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);return g;}
 const torso=p=>{const t=T.MathUtils.clamp((p.y-hips.y)/(shoulder.y-hips.y),0,1);return [['Spine2',t],['Hips',1-t]];};
 source.visible=false;
 let originalBottom;model.traverse(o=>{if(o.material?.name.includes('Outfit_Bottom'))originalBottom=o;});if(originalBottom)originalBottom.visible=false;
 if(!female)for(const side of ['Left','Right']){
  const thigh=bonePoint(model,side+'UpLeg'),knee=bonePoint(model,side+'Leg'),ankle=bonePoint(model,side+'Foot'),rows=[[hips.y+.035,.112],[thigh.y-.08,.112],[knee.y+.05,.095],[knee.y-.08,.086],[ankle.y+.025,.071]],verts=[],uvs=[],idx=[],count=20;
  for(let row=0;row<rows.length;row++)for(let i=0;i<=count;i++){const [y,r]=rows[row],a=i/count*Math.PI*2,t=T.MathUtils.clamp((thigh.y-y)/(thigh.y-ankle.y),0,1),center=thigh.clone().lerp(ankle,t);verts.push(center.x+Math.cos(a)*r,y,center.z+Math.sin(a)*r);uvs.push(i/count,row/4);if(row&&i){const b=row*(count+1)+i;idx.push(b,b-1,b-count-2,b,b-count-2,b-count-1);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(idx);
  skinned(geo,p=>{const lower=1-T.MathUtils.smoothstep(p.y,knee.y-.1,knee.y+.12),hip=T.MathUtils.smoothstep(p.y,thigh.y,hips.y+.035);return [['Hips',hip],[side+'UpLeg',(1-hip)*(1-lower)],[side+'Leg',(1-hip)*lower]];},clothMaterial('#e2d8bb'),'Traditional tailored trousers '+side);
 }
 const radius=Math.abs(shoulder.x)+.018,hem=female?hips.y+.06:hips.y-.27;
 skinned(rings([[hem,female?radius*1.12:Math.max(.255,radius*1.3),female?.155:.195],[hips.y+.13,female?radius*1.07:Math.max(.23,radius*1.16),female?.15:.175],[shoulder.y-.12,radius*1.07,.145],[shoulder.y+.015,radius*1.03,.112],[neck.y+.016,.060,.054]]),torso,cloth,nigerian?'Nigerian embroidered blouse or long shirt':'Indian blouse or kurta');
 // Borders and placket are real rigged surfaces, with no emissive decoration.
 const stripe=new T.PlaneGeometry(.028,neck.y-hem-.04,1,8);stripe.translate(0,(neck.y+hem)/2-.025,neck.z+.165);skinned(stripe,torso,gold,'Traditional garment embroidered placket');
 const remove=[];model.traverse(o=>{if(o.userData.appearanceOwned&&/KTD scrub short sleeve|KTD exposed upper arm|KTD exposed forearm|KTD complete elbow/.test(o.name))remove.push(o);});for(const o of remove){o.geometry.dispose();o.material.dispose();o.removeFromParent();}
 function tube(start,end,ra,rb,bone,mat,name){const g=new T.CylinderGeometry(rb,ra,start.distanceTo(end),16,1,true);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(start).normalize()));g.translate(...start.clone().lerp(end,.5).toArray());return own(attachGeometry(model,bone,g,mat,name));}
 for(const side of ['Left','Right']){const a=bonePoint(model,side+'Arm'),b=bonePoint(model,side+'ForeArm'),c=bonePoint(model,side+'Hand'),arm=model.getObjectByName(side+'Arm'),fore=model.getObjectByName(side+'ForeArm');
  const long=nigerian||!female,end=long?b:a.clone().lerp(b,.5);tube(a.clone().lerp(b,-.08),end,.078,.064,arm,cloth,'Cultural blouse sleeve '+side);
  if(long){tube(b.clone().lerp(a,.06),c,.064,.040,fore,cloth,'Traditional long sleeve '+side);const elbow=new T.SphereGeometry(.064,12,8);elbow.translate(...b.toArray());own(attachGeometry(model,fore,elbow,cloth,'Traditional sleeve elbow '+side));tube(c.clone().lerp(b,.12),c,.043,.042,fore,gold,'Embroidered wrist cuff '+side);}
  else{const skinMat=clothMaterial(person.skin||'#bd8b65');tube(a.clone().lerp(b,.46),b,.047,.041,arm,skinMat,'Cultural blouse exposed upper arm '+side);tube(b.clone().lerp(a,.04),c,.043,.027,fore,skinMat,'Cultural blouse exposed forearm '+side);}
 }
 if(female){
  const hemY=.13,waist=hips.y+.09,knee=bonePoint(model,'LeftLeg').y,skirtRows=[];for(let i=0;i<=10;i++){const t=i/10;skirtRows.push([hemY+(waist-hemY)*t,.27-.065*t,.16-.028*t]);}
  const skirtWeights=p=>{const left=T.MathUtils.smoothstep(p.x,-.065,.065),hip=T.MathUtils.smoothstep(p.y,hips.y-.19,hips.y+.04),lower=1-T.MathUtils.smoothstep(p.y,knee-.02,knee+.25);return [['Hips',hip],['LeftUpLeg',(1-hip)*left*(1-lower*.45)],['RightUpLeg',(1-hip)*(1-left)*(1-lower*.45)],[left>.5?'LeftLeg':'RightLeg',(1-hip)*lower*.45]];};
  skinned(rings(skirtRows),skirtWeights,cloth,nigerian?'Nigerian iro wrapper skirt':'Indian sari pleated skirt');
  skinned(rings([[hemY,.275,.165],[hemY+.035,.273,.164]]),skirtWeights,gold,'Traditional skirt hem border');
  if(!nigerian){
   // Pallu crosses the front to the left shoulder and continues down the back.
   const vertices=[],uv=[],indices=[];for(let i=0;i<=12;i++){const t=i/12,y=hips.y+.06+(shoulder.y-hips.y+.045)*t,x=-.11+.245*t;for(const edge of [-1,1]){vertices.push(x+edge*.075,y,neck.z+.177);uv.push(edge<0?0:1,t*2);}if(i){const a=i*2;indices.push(a,a-1,a-2,a,a+1,a-1);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);skinned(g,torso,clothMaterial('#d5a34f'),'Indian sari diagonal pallu');
   const drape=new T.PlaneGeometry(.17,.49,2,8);drape.translate(.13,shoulder.y-.18,neck.z-.145);skinned(drape,torso,clothMaterial('#d5a34f'),'Indian sari shoulder drape');
   const box=new T.Box3().setFromPoints(coordinates(skin,model).points),y=box.max.y-.075,front=Math.max(...coordinates(skin,model).points.filter(p=>Math.abs(p.x)<.025&&Math.abs(p.y-y)<.018).map(p=>p.z));
   const dot=new T.SphereGeometry(.007,12,8);dot.scale(1,1,.4);dot.translate(0,y,Number.isFinite(front)?front+.003:box.max.z);attachGeometry(model,head,dot,clothMaterial('#a51e24'),'Red forehead bindi');
  }
 }
 if(nigerian){
  const box=new T.Box3().setFromPoints(coordinates(skin,model).points),top=box.max.y,cz=(box.min.z+box.max.z)/2;
  model.traverse(o=>{if(o.material?.name.includes('Hair')||o.userData.appearanceOwned&&/hair$|ponytail$/.test(o.name))o.visible=false;});
  const cap=female?new T.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI*.56):new T.CylinderGeometry(1,.99,1,24);
  cap.scale(.113,female?.105:.083,.108);if(!female)cap.rotateZ(.10);cap.translate(0,top-(female?.022:.006),cz);own(attachGeometry(model,head,cap,cloth,female?'Nigerian gele head tie base':'Nigerian fila cap'));
  if(female){
   // A continuous pleated fan of folded cloth, rather than separate pointed lobes.
   const vertices=[],uv=[],indices=[],segments=40,rows=6;
   for(let row=0;row<=rows;row++)for(let i=0;i<=segments;i++){const t=row/rows,a=-1.35+i/segments*2.7;vertices.push(Math.sin(a)*.18*t,top+.012+Math.cos(a)*.16*t,cz+.035+Math.cos(a*14)*.012*t-.02*t*t);uv.push(i/segments*2,t*1.4);if(row&&i){const b=row*(segments+1)+i;indices.push(b,b-1,b-segments-2,b,b-segments-2,b-segments-1);}}
   const fan=new T.BufferGeometry();fan.setAttribute('position',new T.Float32BufferAttribute(vertices,3));fan.setAttribute('uv',new T.Float32BufferAttribute(uv,2));fan.setIndex(indices);fan.computeVertexNormals();own(attachGeometry(model,head,fan,cloth,'Nigerian gele folded fan'));
  }
 }
 model.userData.culturalAttire={...outfit};
}
