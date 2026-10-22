import * as THREE from 'three';

function circle(ctx,x,y,r,color){ctx.fillStyle=color;if(ctx.arc){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}else ctx.fillRect(x-r,y-r,r*2,r*2);}
function polygon(ctx,points,color){ctx.fillStyle=color;if(!ctx.moveTo){ctx.fillRect(points[0][0],points[0][1],20,20);return;}ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();}
function line(ctx,points,width,color){if(!ctx.stroke){ctx.fillStyle=color;for(const [x,y]of points)ctx.fillRect(x-width/2,y-width/2,width,width);return;}ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.stroke();}
function person(ctx,x,y,female,color,scale=1){
 circle(ctx,x,y+21*scale,18*scale,color);
 if(female)polygon(ctx,[[x-22*scale,y+53*scale],[x+22*scale,y+53*scale],[x+44*scale,y+141*scale],[x-44*scale,y+141*scale]],color);
 else{ctx.fillStyle=color;ctx.fillRect(x-23*scale,y+50*scale,46*scale,91*scale);}
 for(const side of [-1,1]){line(ctx,[[x+side*23*scale,y+62*scale],[x+side*(female?48:42)*scale,y+118*scale]],13*scale,color);line(ctx,[[x+side*14*scale,y+135*scale],[x+side*14*scale,y+184*scale]],16*scale,color);}
}
function accessible(ctx,x,y,color){
 circle(ctx,x+20,y+24,18,color);line(ctx,[[x+16,y+61],[x+15,y+111],[x+65,y+111],[x+86,y+155]],17,color);line(ctx,[[x+20,y+79],[x+64,y+79]],13,color);
 if(ctx.arc&&ctx.stroke){ctx.beginPath();ctx.arc(x+9,y+137,45,.15,Math.PI*1.57);ctx.lineWidth=13;ctx.strokeStyle=color;ctx.stroke();}
 else{ctx.fillStyle=color;ctx.fillRect(x-30,y+105,80,70);}
}
function arrow(ctx,x,y,direction,color,scale=1){const s=direction==='left'?-1:1;polygon(ctx,[[x-s*60*scale,y-13*scale],[x+s*15*scale,y-13*scale],[x+s*15*scale,y-48*scale],[x+s*73*scale,y],[x+s*15*scale,y+48*scale],[x+s*15*scale,y+13*scale],[x-s*60*scale,y+13*scale]],color);}
function panel(canvas,width,height,name,transparent=false){
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.10,roughness:.65,transparent,alphaTest:transparent?.3:0});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.name=name;return mesh;
}

// Arrow and three familiar pictograms carry the hallway directions without text.
export function toiletPictogramSign(direction='left'){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.scale?.(.5,.5);
 ctx.fillStyle='#edf1ed';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#203d4f';ctx.fillRect(0,0,1024,8);ctx.fillRect(0,248,1024,8);
 const ink='#172b37';arrow(ctx,120,128,direction,ink,1.1);person(ctx,365,30,false,ink);person(ctx,535,30,true,ink);accessible(ctx,770,28,ink);
 const sign=panel(canvas,2.16,.54,'Toilet male and female pictograms');sign.userData.direction=direction;sign.userData.symbols=['male','female','accessible'];return sign;
}
function doorPlaque(direction){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=300;const ctx=canvas.getContext('2d');ctx.scale?.(.5,.5);
 const outline=()=>{ctx.beginPath();ctx.moveTo(180,20);ctx.lineTo(844,20);ctx.lineTo(844,42);ctx.lineTo(880,42);ctx.bezierCurveTo(1010,150,1010,450,880,558);ctx.lineTo(844,558);ctx.lineTo(844,580);ctx.lineTo(180,580);ctx.lineTo(180,558);ctx.lineTo(144,558);ctx.bezierCurveTo(14,450,14,150,144,42);ctx.lineTo(180,42);ctx.closePath();};
 ctx.fillStyle='#1c435b';if(ctx.bezierCurveTo){outline();ctx.fill();ctx.strokeStyle='#b7cbd5';ctx.lineWidth=7;ctx.stroke();ctx.save();ctx.translate(40,26);ctx.scale(.92,.91);outline();ctx.lineWidth=3;ctx.stroke();ctx.restore();}else ctx.fillRect(20,20,984,560);
 ctx.fillStyle='#c4d5dd';if(ctx.roundRect){ctx.beginPath();ctx.roundRect(305,95,390,325,28);ctx.fill();}else ctx.fillRect(305,95,390,325);
 person(ctx,405,121,true,'#1c435b',1.3);person(ctx,585,121,false,'#1c435b',1.3);ctx.fillStyle='#1c435b';ctx.fillRect(495,130,6,265);
 arrow(ctx,827,285,direction,'#cfdee3',.95);ctx.font='bold 76px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#cfdee3';ctx.fillText('TOILET',512,493);
 for(const x of [245,779])for(const y of [67,533]){circle(ctx,x,y,12,'#8b9da7');line(ctx,[[x-5,y-4],[x+5,y+4]],2,'#d5e1e6');}
 const sign=panel(canvas,1.12,.656,'Bathroom door pictogram plaque',true);sign.userData.direction=direction;return sign;
}

export function addHangingToiletSign(group,batch,materials,door){
 const root=new THREE.Group();root.name='Hanging toilet wayfinding';root.position.set(-6,3.08,door.z-.9);root.userData.destination={x:door.x,z:door.z};
 const front=toiletPictogramSign('left');front.position.z=.026;root.add(front);
 const back=toiletPictogramSign('right');back.name='Toilet pictograms reverse face';back.rotation.y=Math.PI;back.position.z=-.026;root.add(back);
 for(const side of [-1,1])batch.box(materials.steel,root.position.x+side*.80,3.48,root.position.z,.018,.28,.018);
 group.add(root);
 // Projecting, traditionally outlined plaque beside the actual bathroom door.
 const near=new THREE.Group();near.name='Bathroom projecting plaque';near.position.set(door.x+1.62,2.96,door.z-.64);near.rotation.y=Math.PI/2;
 const a=doorPlaque('left');a.position.z=.016;near.add(a);const b=doorPlaque('right');b.rotation.y=Math.PI;b.position.z=-.016;near.add(b);
 for(const y of [2.73,3.19])batch.box(materials.steel,near.position.x,y,door.z-.29,.035,.035,.64);
 group.add(near);return root;
}
