import * as T from 'three';

// These additions are entered only for an explicitly selected premium outfit.
// Source meshes and the four regular outfit constructors are never modified.
export function fitPremium(model,person,item,h){
 const {bonePoint:point,attachGeometry:attach,clothMaterial:mat,coordinates,reshape,inverseSkinMatrix,fitOutfit,fitSuitSleeves,fittedGlasses}=h;
 let top,bottom,footwear,skin;const meshes=[];model.traverse(o=>{if(o.isMesh){meshes.push(o);if(o.material?.name.includes('Outfit_Top'))top=o;if(o.material?.name.includes('Outfit_Bottom'))bottom=o;if(o.material?.name.includes('Footwear'))footwear=o;if(o.material?.name==='Wolf3D_Skin')skin=o;}});
 if(!top?.skeleton)return;
 const female=item.gender==='female',id=item.id,hips=point(model,'Hips'),neck=point(model,'Neck'),shoulder=point(model,'LeftArm'),radius=Math.abs(shoulder.x)+.012;
 const colour=person.accent||item.color,black=mat('#151920'),fabric=mat(colour,{roughness:id==='latex'?.15:id==='biker'?.38:.86,metalness:id==='latex'?.12:0}),silver=mat('#aeb8bf',{metalness:.88,roughness:.26}),cream=mat('#d8c8a6',{roughness:1}),cloth=mat(item.trim),pelvis=model.getObjectByName('Hips'),chest=model.getObjectByName('Spine2'),head=model.getObjectByName('Head');
 const own=o=>{o.userData.premiumOutfit=id;return o;};
 function add(g,b,m,name){return own(attach(model,model.getObjectByName(b),g,m,'Premium '+name));}
 function box(size,pos,b,m,name){const g=new T.BoxGeometry(...size);g.translate(...pos);return add(g,b,m,name);}
 function tube(a,b,r1,r2,bone,m,name){const g=new T.CylinderGeometry(r2,r1,a.distanceTo(b),16,1,true);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize()));g.translate(...a.clone().lerp(b,.5).toArray());return add(g,bone,m,name);}
 function skinned(geo,weights,m,name){const si=[],sw=[];for(let i=0;i<geo.attributes.position.count;i++){const p=new T.Vector3().fromBufferAttribute(geo.attributes.position,i),w=weights(p),sum=w.reduce((n,v)=>n+v[1],0)||1;for(let j=0;j<4;j++){si.push(j<w.length?Math.max(0,top.skeleton.bones.findIndex(b=>b.name===w[j][0])):0);sw.push(j<w.length?w[j][1]/sum:0);}}
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));const o=new T.SkinnedMesh(geo,m);o.name='Premium '+name;o.position.copy(top.position);o.quaternion.copy(top.quaternion);o.scale.copy(top.scale);o.skeleton=top.skeleton;o.bindMode=top.bindMode;o.bindMatrix.copy(top.bindMatrix);o.bindMatrixInverse.copy(top.bindMatrixInverse);top.parent.add(o);o.updateWorldMatrix(true,false);const inverse=o.matrixWorld.clone().invert().multiply(model.matrixWorld),p=geo.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(inverse).applyMatrix4(inverseSkinMatrix(o,i));p.setXYZ(i,v.x,v.y,v.z);}geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();o.castShadow=o.receiveShadow=true;o.frustumCulled=false;o.userData.appearanceOwned=true;return own(o);
 }
 const torsoWeights=p=>{const t=T.MathUtils.clamp((p.y-hips.y)/(shoulder.y-hips.y),0,1);return [['Spine2',t],['Hips',1-t]];};
 function rings(rows,{start=0,end=Math.PI*2,centerZ=neck.z+.015,slit=false}={}){const v=[],uv=[],idx=[],count=40;for(let row=0;row<rows.length;row++)for(let i=0;i<=count;i++){const[y,rx,rz]=rows[row],a=start+i/count*(end-start);v.push(Math.cos(a)*rx,y,centerZ+Math.sin(a)*rz);uv.push(i/count,row/(rows.length-1));if(row&&i&&!(slit&&row<3&&i>=9&&i<=12)){const b=row*(count+1)+i;idx.push(b,b-1,b-count-2,b,b-count-2,b-count-1);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;}
 for(const o of [top,bottom])if(o){for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])o.material[key]=null;o.material.color.set(o===bottom?person.pants||item.pants:colour);o.material.roughness=fabric.roughness;o.material.metalness=fabric.metalness;}
 if(['black-tie','navy-pantsuit','black-skirt-suit'].includes(id)){
  fitOutfit(model,top,'suit',colour);
  if(female){const remove=[];model.traverse(o=>{if(o.name==='KTD suit tie')remove.push(o);});for(const o of remove){o.geometry.dispose();o.material.dispose();o.removeFromParent();}if(id==='black-skirt-suit'){model.getObjectByName('KTD suit shirt')?.material.color.set('#20232c');}}
 }else{
  // Continuous, weighted body shell; an actual fitted suit rather than a flat overlay.
  top.visible=false;
  const waist=female?radius*.80:radius*.94;
  skinned(rings([[hips.y-.04,radius*.99,.120],[hips.y+.11,waist,.116],[shoulder.y-.13,radius*1.01,.138],[shoulder.y+.01,radius,.109],[neck.y+.025,.060,.055]]),torsoWeights,['shearling','biker','camel-coat'].includes(id)?mat(id==='shearling'?'#d8ccb8':'#12161e'):fabric,'fitted '+item.base);
  fitSuitSleeves(model,top,fabric);
  const collar=rings([[neck.y-.035,.062,.060],[neck.y+.048,.059,.056]]);skinned(collar,()=>[['Neck',1]],['shearling','biker','camel-coat'].includes(id)?black:fabric,'turtleneck collar');
  if(['shearling','biker','camel-coat'].includes(id)){
   const hem=hips.y-(id==='camel-coat'?.46:.10),rows=[[hem,radius*(id==='camel-coat'?1.2:1.03),id==='camel-coat'?.20:.145],[hips.y+.10,radius*1.04,.15],[shoulder.y-.12,radius*1.08,.16],[shoulder.y+.03,radius*1.05,.12]],coat=rings(rows,{start:Math.PI*.5+.21,end:Math.PI*2.5-.21});skinned(coat,torsoWeights,fabric,id==='camel-coat'?'open camel overcoat':'open '+id+' jacket');
   for(const side of[-1,1]){const points=[[side*.04,neck.y-.025],[side*.12,shoulder.y+.03],[side*.09,shoulder.y-.14],[side*.035,shoulder.y-.22]];const shape=new T.Shape(points.map(p=>new T.Vector2(...p))),g=new T.ShapeGeometry(shape);g.translate(0,0,neck.z+.175);add(g,'Spine2',id==='shearling'?cream:fabric,id+' folded lapel');if(id==='biker'){tube(new T.Vector3(side*.04,hips.y+.03,neck.z+.17),new T.Vector3(side*.11,shoulder.y-.11,neck.z+.17),.003,.003,'Spine2',silver,'diagonal metal zipper');box([.08,.005,.007],[side*.095,hips.y+.17,neck.z+.17],'Spine1',silver,'zip pocket');}}
   if(id==='shearling'){
    skinned(rings([[hem-.005,radius*1.04,.15],[hem+.04,radius*1.04,.15]]),torsoWeights,cream,'cream shearling hem');
    const skinBox=new T.Box3().setFromPoints(coordinates(skin,model).points),cap=new T.SphereGeometry(1,32,18,0,Math.PI*2,0,Math.PI*.54);cap.scale(.105,.098,.105);cap.translate(0,skinBox.max.y-.015,(skinBox.min.z+skinBox.max.z)/2);add(cap,'Head',mat('#25262c'),'ribbed black beanie');
    const scarf=rings([[neck.y-.06,.09,.075],[neck.y+.015,.082,.07]]);skinned(scarf,()=>[['Neck',1]],mat('#34363c'),'charcoal knitted scarf collar');box([.075,.34,.018],[-.055,neck.y-.23,neck.z+.19],'Spine2',mat('#34363c'),'hanging knitted scarf');
   }
  }
 }
 // Premium trousers use a close, anatomically weighted leg cut. The original
 // regular collection's trouser meshes are retained byte-for-byte elsewhere.
 if(bottom)bottom.visible=false;
 const legFabric=id==='black-skirt-suit'?mat('#302c31',{roughness:.9}):mat(person.pants||item.pants,{roughness:id==='latex'?.15:.82,metalness:id==='latex'?.12:0});
 for(const side of ['Left','Right']){
  const thigh=point(model,side+'UpLeg'),knee=point(model,side+'Leg'),ankle=point(model,side+'Foot'),heel=female&&['navy-pantsuit','black-skirt-suit'].includes(id),end=heel?ankle.y+.12:ankle.y+.025;
  const rows=[[hips.y+.025,female?.106:.118],[thigh.y-.09,female?.098:.108],[knee.y+.075,female?.077:.087],[knee.y-.075,female?.068:.077],[end,female?.048:.061]],v=[],uv=[],idx=[],count=24;
  for(let row=0;row<rows.length;row++)for(let i=0;i<=count;i++){const [y,r]=rows[row],t=T.MathUtils.clamp((thigh.y-y)/(thigh.y-ankle.y),0,1),center=thigh.clone().lerp(ankle,t),a=i/count*Math.PI*2;v.push(center.x+Math.cos(a)*r,y,center.z+Math.sin(a)*r*.94);uv.push(i/count,row/4);if(row&&i){const b=row*(count+1)+i;idx.push(b,b-1,b-count-2,b,b-count-2,b-count-1);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
  const weights=p=>{const hip=T.MathUtils.smoothstep(p.y,thigh.y-.04,hips.y+.025),lower=1-T.MathUtils.smoothstep(p.y,knee.y-.08,knee.y+.10);return [['Hips',hip],[side+'UpLeg',(1-hip)*(1-lower)],[side+'Leg',(1-hip)*lower]];};
  skinned(g,weights,legFabric,id==='black-skirt-suit'?'fitted hosiery '+side:'tailored trousers '+side);
  if(heel){const a=ankle.clone().setY(end+.01),b=ankle.clone().setY(.075);tube(a,b,.040,.034,side+'Foot',id==='black-skirt-suit'?legFabric:mat(person.skin||'#d4ad8d'),'visible ankle '+side);}
 }
 if(id==='black-skirt-suit'){

  const rows=[];for(let i=0;i<=8;i++){const t=i/8;rows.push([hips.y-.47+t*.54,radius*(1.02-.10*t),.132]);}
  skinned(rings(rows,{slit:true}),p=>{const left=T.MathUtils.smoothstep(p.x,-.10,.10),hip=T.MathUtils.smoothstep(p.y,hips.y-.18,hips.y+.05);return [['Hips',hip],['LeftUpLeg',(1-hip)*left],['RightUpLeg',(1-hip)*(1-left)]];},fabric,'tailored skirt with side slit');
 }
 if(['white-jumpsuit','latex'].includes(id)){
  // Source trousers preserve their full leg skinning and match the upper shell.
  const zipStart=new T.Vector3(0,hips.y+.1,neck.z+.147),zipEnd=new T.Vector3(0,neck.y+.02,neck.z+.063);tube(zipStart,zipEnd,.0022,.0022,'Spine2',silver,'front zip');
 }
 if(['midnight-chain','white-jumpsuit','black-tie','camel-coat'].includes(id)){
  skinned(rings([[hips.y+.025,radius*1.015,.13],[hips.y+.061,radius*1.015,.13]]),()=>[['Hips',1]],black,'waist belt');box([.045,.04,.012],[0,hips.y+.044,neck.z+.153],'Hips',silver,'belt buckle');
 }
 if(id==='midnight-chain'){const curve=new T.CatmullRomCurve3([new T.Vector3(-.07,hips.y+.05,neck.z+.15),new T.Vector3(-.14,hips.y-.11,neck.z+.18),new T.Vector3(-.19,hips.y-.08,neck.z+.12),new T.Vector3(-.20,hips.y+.03,neck.z+.045)]);add(new T.TubeGeometry(curve,32,.003,6,false),'Hips',silver,'silver waist chain');}
 if(id==='white-jumpsuit')for(const side of['Left','Right']){const thigh=point(model,side+'UpLeg'),knee=point(model,side+'Leg'),y=thigh.y-.18,x=thigh.x;const strap=rings([[y-.012,.116,.115],[y+.012,.116,.115]],{centerZ:thigh.z});const attr=strap.attributes.position;for(let i=0;i<attr.count;i++)attr.setX(i,attr.getX(i)+x);skinned(strap,()=>[[side+'UpLeg',1]],black,'empty thigh holster strap '+side);box([.068,.17,.04],[x+(side==='Left'?1:-1)*.095,y+.025,thigh.z],side+'UpLeg',black,'empty thigh holster '+side);}
 if(['shearling','black-skirt-suit','latex'].includes(id))model.traverse(o=>{if(o.userData.nativeHand){o.material.color.set(id==='shearling'?'#553d2d':'#17191e');o.userData.premiumGlove=id;}});
 if(id==='biker'){
  for(const o of meshes)if(o.material?.name.includes('Glasses'))o.visible=false;
  const eyes=meshes.filter(o=>o.material?.name.includes('Wolf3D_Eye')).flatMap(o=>coordinates(o,model).points),centers=[];
  if(eyes.length){for(const side of[-1,1]){const box=new T.Box3().setFromPoints(eyes.filter(p=>p.x*side>0)),c=box.getCenter(new T.Vector3());c.z=box.max.z+.013;centers.push(c);const rim=new T.TorusGeometry(.025,.0018,6,28);rim.scale(1.15,.96,1);rim.translate(...c.toArray());add(rim,'Head',silver,'aviator metal frame');const lens=new T.CircleGeometry(.024,28);lens.scale(1.15,.96,1);lens.translate(c.x,c.y,c.z+.001);add(lens,'Head',mat('#101820',{roughness:.18,metalness:.18}),'aviator dark lens');tube(c.clone().add(new T.Vector3(side*.029,0,0)),c.clone().add(new T.Vector3(side*.055,-.008,-.10)),.0018,.0018,'Head',silver,'aviator temple');}tube(centers[0].clone().add(new T.Vector3(.026,.008,0)),centers[1].clone().add(new T.Vector3(-.026,.008,0)),.0017,.0017,'Head',silver,'aviator bridge');}
 }
 if(id==='latex'){
  const chain=new T.TorusGeometry(.069,.0028,8,40);chain.rotateX(Math.PI/2);chain.translate(neck.x,neck.y-.035,neck.z+.01);add(chain,'Neck',silver,'chain necklace');
  // Deliberately retain the existing regular female boot geometry.
  if(footwear){footwear.material.color.set(person.shoes||item.shoes);footwear.material.roughness=.30;}
 }else{
  if(footwear)footwear.visible=false;
  for(const side of ['Left','Right']){
   const ankle=point(model,side+'Foot'),knee=point(model,side+'Leg'),shoe=mat(person.shoes||item.shoes,{roughness:.42}),heel=female&&id!=='white-jumpsuit';
   const shape=new T.SphereGeometry(1,24,12);shape.scale(heel?.052:.068,heel?.043:.060,heel?.145:.15);shape.translate(ankle.x,.08,ankle.z+.055);add(shape,side+'Foot',shoe,heel?'pointed pump '+side:'leather boot foot '+side);
   if(heel){box([.018,.085,.020],[ankle.x,.045,ankle.z-.035],side+'Foot',shoe,'slender high heel '+side);}
   else{
    const high=id==='white-jumpsuit',height=high?knee.y-ankle.y-.025:.15,shaft=new T.CylinderGeometry(high?.074:.063,.067,height,24,3,true);shaft.translate(ankle.x,ankle.y+height/2,ankle.z);add(shaft,side+'Leg',shoe,(high?'tall lace-up platform boot ':'lace-up ankle boot ')+side);
    box([.136,high?.055:.028,.29],[ankle.x,high?.034:.018,ankle.z+.05],side+'Foot',mat('#11151a'),'lug sole '+side);
    for(let i=0;i<(high?12:4);i++){const y=ankle.y+.025+i*(high?.026:.028);for(const sign of[-1,1]){tube(new T.Vector3(ankle.x+sign*.025,y,ankle.z+.070),new T.Vector3(ankle.x-sign*.025,y+.016,ankle.z+.070),.0017,.0017,side+'Leg',silver,'boot lace '+side);}}
   }
   if(id==='camel-coat'){const cuff=new T.CylinderGeometry(.080,.081,.043,20,1,true);cuff.translate(ankle.x,ankle.y+.16,ankle.z);add(cuff,side+'Leg',mat('#a7bac4'),'cuffed denim '+side);}
  }
 }
 model.userData.premiumOutfit=id;
}
