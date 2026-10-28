import {PREMIUM_OUTFITS} from './loadout.js';
import * as THREE from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

export const NURSE_UNIFORM='#8bbbd8';
export const OUTFIT_STYLES = ['casual','jacket','tactical','suit'];
export const HAIRSTYLES = ['original','cropped','slick','ponytail','ponytail-front','ponytail-side','afro','braids','straight','curls-short','curls-long'];
const irisCache = new Map();
const appearanceCaches=new WeakMap();

// Ready Player Me's eye atlas has one central iris. Keep the pupil, sclera,
// catchlights and existing iris shading rather than tinting the entire eye.
export function recolorIrisPixels(data, width, height, hex) {
  const rgb = new THREE.Color(hex).convertLinearToSRGB().toArray().map(v => v * 255);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const radius = Math.hypot((x + .5) / width - .5, (y + .5) / height - .5);
    if (radius < .09 || radius > .203) continue;
    const i = (y * width + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const light = (r + g + b) / 3;
    if (light < 17 || (light > 190 && Math.max(r,g,b) - Math.min(r,g,b) < 25)) continue;
    const shade = THREE.MathUtils.clamp(light / 93, .20, 1.2);
    const rim = radius > .183 ? .65 : 1;
    for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, rgb[c] * shade * rim);
  }
  return data;
}

function trimIrisCache(cache) {
  for(const [key,entry] of cache){if(cache.size<=32)break;if(entry.users===0){entry.texture.dispose();cache.delete(key);}}
}
function eyeTexture(source, hex, cache, leases) {
  const key = `${source?.uuid || 'fallback'}:${hex}`;
  if (cache.has(key)) { const entry=cache.get(key);if(!leases.has(entry)){entry.users++;leases.add(entry);}return entry.texture; }
  if (typeof document === 'undefined') return source;
  const canvas = document.createElement('canvas'), image = source?.image;
  canvas.width = image?.width || 128; canvas.height = image?.height || 128;
  const ctx = canvas.getContext('2d');
  if (image) ctx.drawImage(image, 0, 0);
  else {
    ctx.fillStyle = '#f4eee5'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const x = canvas.width / 2, y = canvas.height / 2, radius = canvas.width * .203;
    ctx.fillStyle = '#775540'; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111417'; ctx.beginPath(); ctx.arc(x, y, canvas.width * .09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - radius * .34, y - radius * .42, radius * .16, 0, Math.PI * 2); ctx.fill();
  }
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  recolorIrisPixels(pixels.data, canvas.width, canvas.height, hex); ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = source?.flipY ?? false; texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = source?.wrapS ?? THREE.ClampToEdgeWrapping; texture.wrapT = source?.wrapT ?? THREE.ClampToEdgeWrapping;
  texture.anisotropy = source?.anisotropy || 1;
  const entry={texture,users:1,cache};cache.set(key,entry);leases.add(entry);
  trimIrisCache(cache);
  return texture;
}

function coordinates(mesh, model) {
  mesh.updateWorldMatrix(true,false);
  const matrix = model.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
  const position = mesh.geometry.getAttribute('position'), points = [];
  for (let i = 0; i < position.count; i++) { const point = new THREE.Vector3(); mesh.getVertexPosition(i, point); points.push(point.applyMatrix4(matrix)); }
  return { points, matrix };
}
function inverseSkinMatrix(mesh, index) {
  const indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
  const matrix=new THREE.Matrix4();matrix.elements.fill(0);
  for(let component=0;component<4;component++){const weight=weights.getComponent(index,component);if(!weight)continue;const boneIndex=indices.getComponent(index,component);const bone=mesh.skeleton.bones[boneIndex];const transform=bone.matrixWorld.clone().multiply(mesh.skeleton.boneInverses[boneIndex]);for(let j=0;j<16;j++)matrix.elements[j]+=weight*transform.elements[j];}
  return mesh.bindMatrixInverse.clone().multiply(matrix).multiply(mesh.bindMatrix).invert();
}
function reshape(mesh, model, change) {
  const { points, matrix } = coordinates(mesh, model), inverse = matrix.clone().invert();
  // GLB positions are normalized Int16. A new Float32 attribute avoids clamping
  // a changed silhouette while keeping the original skin indices and weights.
  const geometry = mesh.geometry.clone(), values = new Float32Array(points.length * 3);
  points.forEach((point, i) => { change(point); point.applyMatrix4(inverse); if(mesh.isSkinnedMesh)point.applyMatrix4(inverseSkinMatrix(mesh,i));point.toArray(values, i * 3); });
  geometry.setAttribute('position', new THREE.BufferAttribute(values, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  mesh.geometry = geometry; mesh.userData.appearanceGeometryOwned = true;
}
function attachGeometry(model, bone, geometry, mat, name) {
  const modelToBone = bone.matrixWorld.clone().invert().multiply(model.matrixWorld);
  geometry.applyMatrix4(modelToBone);
  const mesh = new THREE.Mesh(geometry, mat); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.appearanceOwned = true;mesh.frustumCulled=false; bone.add(mesh); return mesh;
}
function clothMaterial(hex, options = {}) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: .91, metalness: 0, side: THREE.DoubleSide, ...options });
}
function panel(points, depth = .008) {
  const shape = new THREE.Shape(); points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
}
function fittedPanel(model, bone, points, surface, mat, name, back = false, depth = .008) {
  const geometry = panel(points, depth), p = geometry.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, surface(x, y) + p.getZ(i) * (back ? -1 : 1)); }
  geometry.computeVertexNormals(); return attachGeometry(model, bone, geometry, mat, name);
}
function surfaceAt(points, back) {
  return (x, y) => {
    const nearby = points.filter(p => Math.abs(p.x - x) < .055 && Math.abs(p.y - y) < .065);
    const values = (nearby.length ? nearby : points.filter(p => Math.abs(p.x) < .16)).map(p => p.z);
    return (back ? Math.min(...values) : Math.max(...values)) + (back ? -.012 : .012);
  };
}
function fitOutfit(model, top, style, accent) {
  const spine = model.getObjectByName('Spine1'), chest = model.getObjectByName('Spine2'), neck = model.getObjectByName('Neck');
  if (!spine || !chest || !neck) return;
  const { points } = coordinates(top, model), box = new THREE.Box3().setFromPoints(points);
  const neckPoint = model.worldToLocal(neck.getWorldPosition(new THREE.Vector3()));
  const waist = box.min.y + .025, shoulder = neckPoint.y - .09;
  const front = surfaceAt(points, false), back = surfaceAt(points, true);
  const suit=style==='suit';
  // Reuse the torso's completed fabric color path. A fresh accent material is
  // noticeably brighter than the existing sRGB recolored canvas on the body.
  const dark=suit&&top.material.map?top.material.clone():clothMaterial(style==='jacket'||suit?accent:'#283d48');
  const trim=suit?dark.clone():clothMaterial(style==='jacket'?'#29353e':'#536a72');
  if(suit){dark.name='KTD suit fabric';trim.name='KTD suit lapel fabric';trim.roughness=.84;}
  if (style === 'jacket' || style === 'suit') {
    const zip = clothMaterial('#a5b7bf', { metalness: .6, roughness: .4 });
    reshape(top, model, p => { if (Math.abs(p.x) < .24) { p.x *= suit?1.015:1.055; p.z = (p.z - .02) * (suit?1.025:1.06) + .02; if (p.y < waist + .11) p.y -= suit?.06:.035; } });
    for (const sign of [-1, 1]) {
      const lapel=suit?[[sign*.081,shoulder+.012],[sign*.037,shoulder-.005],[sign*.019,shoulder-.17],[sign*.065,shoulder-.095]]:[[sign*.105,shoulder+.025],[sign*.04,shoulder+.005],[sign*.012,shoulder-.19],[sign*.095,shoulder-.085]];
      fittedPanel(model,chest,lapel,front,trim,suit?'KTD suit lapel':'KTD jacket lapel',false,suit?.004:.008);
      const pocket=suit?[[sign*.072,waist+.11],[sign*.145,waist+.115],[sign*.145,waist+.109],[sign*.072,waist+.104]]:[[sign*.055,waist+.13],[sign*.15,waist+.15],[sign*.15,waist+.06],[sign*.055,waist+.045]];
      fittedPanel(model,spine,pocket,front,dark,suit?'KTD suit welt pocket':'KTD jacket pocket',false,suit?.003:.008);
    }
    if(suit){
      fittedPanel(model,chest,[[-.035,shoulder+.012],[.035,shoulder+.012],[.015,shoulder-.19],[-.015,shoulder-.19]],(x,y)=>front(x,y)+.004,clothMaterial('#e7e4df'),'KTD suit shirt');
      fittedPanel(model,chest,[[0,shoulder-.025],[.011,shoulder-.052],[.009,shoulder-.19],[0,shoulder-.215],[-.009,shoulder-.19],[-.011,shoulder-.052]],(x,y)=>front(x,y)+.014,clothMaterial('#222c3b'),'KTD suit tie');
      const button=new THREE.SphereGeometry(.005,8,5);button.scale(1,1,.5);button.translate(.025,waist+.16,front(.025,waist+.16)+.012);attachGeometry(model,spine,button,zip,'KTD suit button');
      fitSuitSleeves(model,top,dark);
    }else fittedPanel(model, spine, [[-.004,waist],[.004,waist],[.004,shoulder-.18],[-.004,shoulder-.18]], front, zip, 'KTD jacket zipper');
    if(!suit)fittedPanel(model, spine, [[-.17,waist-.023],[.17,waist-.023],[.17,waist+.012],[-.17,waist+.012]], back, trim, 'KTD jacket back hem', true);
  } else {
    const outline = [[-.105,shoulder+.015],[-.18,shoulder-.085],[-.165,waist],[.165,waist],[.18,shoulder-.085],[.105,shoulder+.015],[.065,shoulder-.06],[-.065,shoulder-.06]];
    fittedPanel(model, spine, outline, front, dark, 'KTD tactical vest front', false, .018);
    fittedPanel(model, spine, outline, back, dark, 'KTD tactical vest back', true, .018);
    // Narrow webbing and two fitted pouches make the vest readable from front
    // and behind without obscuring the avatar's shoulders or animated arms.
    for (const isBack of [false, true]) {
      const surface = isBack ? (x,y)=>back(x,y)-.022 : (x,y)=>front(x,y)+.022;
      for (let row = 0; row < 4; row++) { const y = waist + .065 + row * .06; fittedPanel(model, spine, [[-.15,y],[.15,y],[.15,y+.012],[-.15,y+.012]],surface,trim,'KTD vest webbing',isBack,.004); }
    }
    for (const sign of [-1,1]) {
      const surface=(x,y)=>front(x,y)+.035;
      fittedPanel(model, spine, [[sign*.025,waist+.035],[sign*.135,waist+.035],[sign*.135,waist+.135],[sign*.025,waist+.135]],surface,dark,'KTD vest pouch',false,.025);
    }
  }
}
function hairMaterial(model,hex){
  const cache=appearanceCaches.get(model)||irisCache,leases=model.userData.appearanceTextureLeases,key='hair-fibers-v1';let entry=cache.get(key);
  if(!entry){const width=64,height=128,data=new Uint8Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const value=Math.round(128+42*Math.cos(x*Math.PI/4+.15*Math.sin(y*.035))+12*Math.sin(x*1.8+y*.013)),index=(y*width+x)*4;data[index]=data[index+1]=data[index+2]=value;data[index+3]=255;}const texture=new THREE.DataTexture(data,width,height);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.repeat.set(8,1);texture.needsUpdate=true;entry={texture,users:0,cache};cache.set(key,entry);}
  if(leases&&!leases.has(entry)){entry.users++;leases.add(entry);}return clothMaterial(hex,{roughness:.64,bumpMap:entry.texture,bumpScale:.0007});
}
function scalpPoint(box,phi,t,sweep=false){
  const top=box.max.y,centerZ=(box.min.z+box.max.z)/2,front=Math.sin(phi),limit=1.48-.50*front+.20*front*front,theta=t*limit;
  return new THREE.Vector3(Math.cos(phi)*Math.sin(theta)*.092+(sweep?.003*Math.sin(theta)*Math.max(0,front):0),top-.091+Math.cos(theta)*.109,centerZ+Math.sin(phi)*Math.sin(theta)*.106);
}
function fittedScalp(headBox,{sweep=false}={}){
  const vertices=[],uvs=[],indices=[],columns=64,rows=20;
  for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){scalpPoint(headBox,column/columns*Math.PI*2,row/rows,sweep).toArray(vertices,vertices.length);uvs.push(column/columns+row/rows*.10,row/rows);}
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){const a=row*(columns+1)+column,b=a+columns+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function scalpPart(model,head,box,hex){
  const top=box.max.y,centerZ=(box.min.z+box.max.z)/2,center=new THREE.Vector3(0,top-.091,centerZ),points=[];
  const path=new THREE.CatmullRomCurve3([new THREE.Vector3(-.026,top-.041,centerZ+.102),new THREE.Vector3(-.022,top+.016,centerZ+.022),new THREE.Vector3(-.006,top+.004,centerZ-.046),new THREE.Vector3(.027,top-.054,centerZ-.101)]);
  for(let i=0;i<=22;i++){const v=path.getPoint(i/22).sub(center),length=Math.sqrt((v.x/.092)**2+(v.y/.109)**2+(v.z/.106)**2);v.divideScalar(length).add(center);points.push(v.toArray());}
  attachGeometry(model,head,tubePiece(points,.0011,22,4),clothMaterial(new THREE.Color(hex).multiplyScalar(.45)),'KTD swept hair part');
}
function fitHair(model,hair,skin,hairstyle,hex){
  const head=model.getObjectByName('Head');if(!head||!skin)return;
  const headBox=new THREE.Box3().setFromPoints(coordinates(skin,model).points),hairBox=new THREE.Box3().setFromPoints(coordinates(hair,model).points),top=headBox.max.y,pony=hairstyle.startsWith('ponytail');
  if(pony){
    hair.visible=false;attachGeometry(model,head,fittedScalp(headBox,{sweep:true}),hairMaterial(model,hex),'KTD swept ponytail base hair');scalpPart(model,head,headBox,hex);
  }else{
    const slick=hairstyle==='slick',factor=hairstyle==='cropped'?.57:slick?.47:.73;
    reshape(hair,model,p=>{p.y=top+(slick?.012:.018)-(hairBox.max.y-p.y)*factor;p.x*=hairstyle==='cropped'?.93:.96;if(slick){const front=THREE.MathUtils.clamp((p.z-(headBox.min.z+headBox.max.z)/2)/.09,0,1),crown=THREE.MathUtils.clamp((p.y-(top-.12))/.132,0,1);p.x+=front*crown*.016;p.z-=.010*crown+.005*front;}p.z=headBox.min.z+(p.z-hairBox.min.z)*(hairstyle==='cropped'?.84:.9)-.008;});
  }
  if(!pony)return;
  const frontPony=hairstyle==='ponytail-front',start=new THREE.Vector3(0,top-(frontPony?.083:.105),headBox.min.z-.012);
  const points=frontPony?[start,new THREE.Vector3(.003,top-.18,headBox.min.z-.053),new THREE.Vector3(.012,top-.31,headBox.min.z-.066),new THREE.Vector3(.020,top-.46,headBox.min.z-.044)]:hairstyle==='ponytail-side'?[start,start.clone().add(new THREE.Vector3(.10,-.035,-.02)),start.clone().add(new THREE.Vector3(.145,-.19,.015)),start.clone().add(new THREE.Vector3(.125,-.35,.06))]:[start,start.clone().add(new THREE.Vector3(0,-.035,-.047)),start.clone().add(new THREE.Vector3(.012,-.18,-.078)),start.clone().add(new THREE.Vector3(.014,-.36,-.045))];
  const path=new THREE.CatmullRomCurve3(points),segments=28,radial=16,geometry=new THREE.TubeGeometry(path,segments,.0185,radial,false),position=geometry.getAttribute('position');
  for(let segment=0;segment<=segments;segment++){const center=path.getPointAt(segment/segments),taper=.97-.78*Math.pow(segment/segments,1.8);for(let ring=0;ring<=radial;ring++){const i=segment*(radial+1)+ring,groove=1+.055*Math.cos(ring/radial*Math.PI*12),point=new THREE.Vector3().fromBufferAttribute(position,i).sub(center).multiplyScalar(taper*groove).add(center);position.setXYZ(i,point.x,point.y,point.z);}}
  const uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++){const u=uv.getX(i);uv.setXY(i,uv.getY(i),u);}geometry.computeVertexNormals();attachGeometry(model,head,geometry,hairMaterial(model,hex),'KTD tied ponytail');
  const tie=new THREE.TorusGeometry(.018,.0026,6,16),tiePoint=path.getPointAt(.035);tie.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),path.getTangentAt(.035)));tie.translate(...tiePoint.toArray());attachGeometry(model,head,tie,clothMaterial('#1e2b34'),'KTD hair tie');
}
function drapedHair(box,style){
  const top=box.max.y,centerZ=(box.min.z+box.max.z)/2,curly=style.startsWith('curls'),short=style==='curls-short',length=short?.225:curly?.385:.39,columns=80,crownRows=12,rows=44,vertices=[],uvs=[],indices=[],edge=.86;
  for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){
    const phi=column/columns*Math.PI*2,frontAngle=Math.min(phi,Math.PI*2-phi),open=frontAngle<edge,joinTheta=1.18+.37*Math.min(1,frontAngle/edge);
    const crownT=Math.min(1,row/crownRows),theta=crownT*joinTheta;
    let x=Math.sin(phi)*Math.sin(theta)*.094,y=top-.087+Math.cos(theta)*.108,z=centerZ+Math.cos(phi)*Math.sin(theta)*.111;
    if(row>crownRows&&!open){const t=(row-crownRows)/(rows-crownRows),edgeWeight=Math.max(0,1-Math.abs(frontAngle-edge)/.42),wave=curly?Math.sin(t*Math.PI*6+phi*1.3)*.013*Math.sin(t*Math.PI*.8):0,layer=Math.cos(phi*19+t*1.1)*.0027*Math.sin(t*Math.PI*.8);
      const radius=.094+.020*Math.sin(t*Math.PI/2)+layer+wave;x=Math.sin(phi)*radius;y=top-.087+Math.cos(joinTheta)*.108-t*(length+.009*Math.cos(phi*3));z=centerZ+Math.cos(phi)*(.111+layer+wave)-.024*t*t+edgeWeight*.080*Math.sin(t*Math.PI/2);
    }
    vertices.push(x,y,z);uvs.push(column/columns,row/rows);
  }
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){const phi=(column+.5)/columns*Math.PI*2;if(row>=crownRows&&Math.min(phi,Math.PI*2-phi)<edge)continue;const a=row*(columns+1)+column,b=a+columns+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();const pieces=[geometry];
  for(const side of [-1,1]){
    const points=[];for(let step=0;step<=24;step++){const t=step/24,turn=t*Math.PI*4.5,wave=curly?Math.sin(turn)*.011*Math.sin(t*Math.PI*.82):0;points.push([side*(.080+.018*t+wave),top-.135-t*(short?.195:.335),box.max.z-.016+.029*t+(curly?Math.cos(turn)*.009*Math.sin(t*Math.PI):0)]);}
    const path=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point))),lock=new THREE.TubeGeometry(path,24,.016,10,false),position=lock.getAttribute('position'),uv=lock.getAttribute('uv');
    for(let segment=0;segment<=24;segment++){const center=path.getPointAt(segment/24),taper=1-.68*Math.pow(segment/24,3);for(let ring=0;ring<=10;ring++){const index=segment*11+ring,point=new THREE.Vector3().fromBufferAttribute(position,index).sub(center);point.x*=taper;point.z*=.48*taper;point.add(center);position.setXYZ(index,point.x,point.y,point.z);}}
    for(let i=0;i<uv.count;i++){const u=uv.getX(i);uv.setXY(i,uv.getY(i),u);}lock.computeVertexNormals();pieces.push(lock);
  }
  return mergePieces(pieces,true);
}

function mergePieces(pieces,keepUV=false){
  const ready=pieces.map(geometry=>{const result=geometry.index?geometry.toNonIndexed():geometry.clone();for(const key of Object.keys(result.attributes))if(!['position','normal',...(keepUV?['uv']:[])].includes(key))result.deleteAttribute(key);return result;});
  const merged=mergeGeometries(ready,false);for(const geometry of [...pieces,...ready])geometry.dispose();return merged;
}
function spherePiece(center,size,segments=8){const geometry=new THREE.SphereGeometry(1,segments,6);geometry.scale(...size);geometry.translate(...center);return geometry;}
function tubePiece(points,radius=.008,segments=12,radial=6){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point))),segments,radius,radial,false);}
function bonePoint(model,name){const bone=model.getObjectByName(name);return bone?model.worldToLocal(bone.getWorldPosition(new THREE.Vector3())):null;}
function fitSuitSleeves(model,top,mat){
  for(const side of ['Left','Right']){
    const arm=model.getObjectByName(`${side}Arm`),fore=model.getObjectByName(`${side}ForeArm`),hand=model.getObjectByName(`${side}Hand`);if(!arm||!fore||!hand)continue;
    const a=bonePoint(model,`${side}Arm`),b=bonePoint(model,`${side}ForeArm`),c=bonePoint(model,`${side}Hand`),direction=c.clone().sub(a).normalize();
    const upper=new THREE.CylinderGeometry(.067,.062,a.distanceTo(b)+.035,9,1,true);upper.rotateZ(Math.PI/2);upper.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-1,0,0),b.clone().sub(a).normalize()));upper.translate(...a.clone().lerp(b,.5).toArray());attachGeometry(model,arm,upper,mat,'KTD suit upper sleeve');
    const lower=new THREE.CylinderGeometry(.054,.039,b.distanceTo(c)-.025,9,1,true);lower.rotateZ(Math.PI/2);lower.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-1,0,0),c.clone().sub(b).normalize()));lower.translate(...b.clone().lerp(c,.46).toArray());attachGeometry(model,fore,lower,mat,'KTD suit lower sleeve');
    const cuff=new THREE.TorusGeometry(.039,.0035,5,12);cuff.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),direction));cuff.translate(...c.clone().addScaledVector(direction,-.026).toArray());attachGeometry(model,fore,cuff,clothMaterial('#e7e4df'),'KTD suit cuff');
  }
}
function extendedHair(model,hair,skin,style,hex){
  if(!skin)return;const head=model.getObjectByName('Head');if(!head)return;
  const box=new THREE.Box3().setFromPoints(coordinates(skin,model).points),top=box.max.y,z=(box.min.z+box.max.z)/2;
  if(style==='straight'||style.startsWith('curls')){hair.visible=false;attachGeometry(model,head,drapedHair(box,style),hairMaterial(model,hex),'KTD '+style+' hair');return;}
  fitHair(model,hair,skin,'cropped',hex);
  const pieces=[];
  if(style==='afro'){
    const radii=[.126,.145,.122],centerY=top-.077;
    // A fitted, continuous volume closes the gaps between tight curls. The
    // front hairline stays above the brows; the back naturally covers the nape.
    const surface=(phi,t)=>{const front=Math.sin(phi),limit=1.85-.53*Math.max(0,front)+.20*Math.max(0,-front),theta=t*limit;
      const irregularity=1+.018*Math.sin(phi*7+theta*4)*Math.sin(theta*6);
      return new THREE.Vector3(Math.cos(phi)*Math.sin(theta)*radii[0]*irregularity,centerY+Math.cos(theta)*radii[1]*irregularity,z+Math.sin(phi)*Math.sin(theta)*radii[2]*irregularity);
    };
    const vertices=[],indices=[],columns=28,rows=14;
    for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++)surface(column/columns*Math.PI*2,row/rows).toArray(vertices,vertices.length);
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){const a=row*(columns+1)+column,b=a+columns+1;indices.push(a,a+1,b,b,a+1,b+1);}
    const base=new THREE.BufferGeometry();base.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));base.setIndex(indices);base.computeVertexNormals();pieces.push(base);
    const rings=10;
    for(let ring=0;ring<rings;ring++){const t=(ring+.2)/(rings-.5),count=6+ring*3;for(let i=0;i<count;i++){
      const phi=i/count*Math.PI*2+ring*.31,point=surface(phi,Math.min(1,t));
      const normal=new THREE.Vector3(point.x/(radii[0]*radii[0]),(point.y-centerY)/(radii[1]*radii[1]),(point.z-z)/(radii[2]*radii[2])).normalize();
      point.addScaledVector(normal,.003);
      const curl=.0095+.0018*(.5+.5*Math.sin(i*2.37+ring));
      const detail=new THREE.SphereGeometry(1,6,4);detail.scale(curl,curl*.9,curl);detail.translate(...point.toArray());pieces.push(detail);
    }}
  }else if(style==='braids'){
    for(let i=0;i<14;i++){const angle=(i/14)*Math.PI*2,x=Math.cos(angle)*.086,zz=Math.sin(angle)*.08;if(zz>.03&&Math.abs(x)<.06)continue;const points=[];for(let step=0;step<=18;step++){const t=step/18,spiral=step*2.5;points.push([x+Math.cos(spiral)*.0035,top-.035-t*(.37+(i%3)*.025),z+zz-.018+Math.sin(spiral)*.0035]);}pieces.push(tubePiece(points,.010,36,5));}
  }
  if(pieces.length)attachGeometry(model,head,mergePieces(pieces),clothMaterial(hex),'KTD '+style+' hair');
}
function colorHair(mesh,model,hex,highlights){
  if(!/^#[\da-f]{6}$/i.test(highlights||''))return;
  if(!mesh.userData.appearanceGeometryOwned&&!mesh.userData.appearanceOwned){mesh.geometry=mesh.geometry.clone();mesh.userData.appearanceGeometryOwned=true;}
  const {points}=coordinates(mesh,model),base=new THREE.Color(hex),light=new THREE.Color(highlights),colors=new Float32Array(points.length*3);
  for(let i=0;i<points.length;i++){const p=points[i],streak=Math.sin(p.x*205+p.z*47);base.clone().lerp(light,streak>.65?.83:0).toArray(colors,i*3);}
  mesh.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));mesh.material.color.set('#ffffff');mesh.material.vertexColors=true;mesh.material.needsUpdate=true;
}
function tattooTexture(style){
  const size=128,pixels=new Uint8Array(size*size*4);
  const distance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);};
  const lines=style==='botanical'?[[[.48,.12],[.48,.88]],[[.48,.35],[.25,.22]],[[.48,.48],[.72,.34]],[[.48,.64],[.26,.52]],[[.48,.77],[.72,.63]]]:[[[.5,.10],[.76,.32]],[[.76,.32],[.5,.54]],[[.5,.54],[.24,.32]],[[.24,.32],[.5,.10]],[[.5,.44],[.74,.65]],[[.74,.65],[.5,.88]],[[.5,.88],[.26,.65]],[[.26,.65],[.5,.44]]];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size;let d=Math.min(...lines.map(([a,b])=>distance(u,v,a,b)));
    if(style==='botanical')for(const [cx,cy,angle] of [[.27,.25,-.7],[.69,.36,.7],[.28,.55,-.7],[.69,.66,.7]]){const px=(u-cx)*Math.cos(angle)+(v-cy)*Math.sin(angle),py=-(u-cx)*Math.sin(angle)+(v-cy)*Math.cos(angle),ellipse=Math.abs(Math.hypot(px/.095,py/.039)-1)*.039;d=Math.min(d,ellipse);}
    const alpha=THREE.MathUtils.clamp((.018-d)*size,0,1)*.92,index=(y*size+x)*4;pixels[index]=24;pixels[index+1]=33;pixels[index+2]=39;pixels[index+3]=Math.round(alpha*255);
  }
  const texture=new THREE.DataTexture(pixels,size,size);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
function skinTattoo(model,source,{center,width,height,minZ,style,name}){
  if(!source?.isSkinnedMesh)return;
  const {points}=coordinates(source,model),uv=new Float32Array(points.length*2),indices=[],sourceIndex=source.geometry.index;
  points.forEach((point,i)=>{uv[i*2]=(point.x-center.x)/width+.5;uv[i*2+1]=.5-(point.y-center.y)/height;});
  for(let i=0;i<(sourceIndex?.count||points.length);i+=3){const triangle=[0,1,2].map(offset=>sourceIndex?sourceIndex.getX(i+offset):i+offset),p=triangle.map(index=>points[index]),normal=new THREE.Vector3().subVectors(p[1],p[0]).cross(new THREE.Vector3().subVectors(p[2],p[0])).normalize();
    if(normal.z<.15||Math.max(...p.map(v=>v.x))<center.x-width*.65||Math.min(...p.map(v=>v.x))>center.x+width*.65||Math.max(...p.map(v=>v.y))<center.y-height*.65||Math.min(...p.map(v=>v.y))>center.y+height*.65||p.reduce((sum,v)=>sum+v.z,0)/3<minZ)continue;indices.push(...triangle);
  }
  if(!indices.length)return;
  const geometry=source.geometry.clone();geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(indices);
  const material=clothMaterial('#ffffff',{map:tattooTexture(style),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,roughness:.95,side:THREE.FrontSide});
  const decal=new THREE.SkinnedMesh(geometry,material);decal.name=name;decal.position.copy(source.position);decal.quaternion.copy(source.quaternion);decal.scale.copy(source.scale);decal.matrix.copy(source.matrix);decal.matrixAutoUpdate=source.matrixAutoUpdate;decal.bindMode=source.bindMode;decal.skeleton=source.skeleton;decal.bindMatrix.copy(source.bindMatrix);decal.bindMatrixInverse.copy(source.bindMatrixInverse);decal.userData.appearanceOwned=true;decal.userData.appearanceOwnedTexture=true;decal.frustumCulled=false;source.parent.add(decal);
}
function fittedGlasses(model,skin,eyeMeshes,sunglasses=false){
  const head=model.getObjectByName('Head'),points=eyeMeshes.flatMap(mesh=>coordinates(mesh,model).points);if(!head||!points.length)return;
  const eyeBox=new THREE.Box3().setFromPoints(points),centerX=(eyeBox.min.x+eyeBox.max.x)/2,skinBox=new THREE.Box3().setFromPoints(coordinates(skin,model).points),parts=[],lenses=[];
  const centers=[];for(const side of [-1,1]){const sidePoints=points.filter(point=>(point.x-centerX)*side>0),box=new THREE.Box3().setFromPoints(sidePoints),center=box.getCenter(new THREE.Vector3());center.z=box.max.z+.011;center.y-=.001;centers.push(center);
    if(sunglasses){
      const outline=new THREE.Shape();outline.moveTo(-.031,.020);outline.lineTo(.031,.020);outline.quadraticCurveTo(.034,.020,.032,.013);outline.lineTo(.026,-.015);outline.quadraticCurveTo(.025,-.020,.019,-.020);outline.lineTo(-.019,-.020);outline.quadraticCurveTo(-.025,-.020,-.026,-.015);outline.lineTo(-.032,.013);outline.quadraticCurveTo(-.034,.020,-.031,.020);
      const lensShape=new THREE.Shape();lensShape.moveTo(-.026,.015);lensShape.lineTo(.026,.015);lensShape.lineTo(.021,-.015);lensShape.lineTo(-.021,-.015);lensShape.closePath();const hole=new THREE.Path(lensShape.getPoints());outline.holes.push(hole);
      const rim=new THREE.ExtrudeGeometry(outline,{depth:.003,bevelEnabled:false,curveSegments:4});rim.translate(center.x,center.y,center.z-.0015);parts.push(rim);const lens=new THREE.ShapeGeometry(lensShape);lens.translate(center.x,center.y,center.z+.001);lenses.push(lens);
    }else{const rim=new THREE.TorusGeometry(.024,.0023,5,20);rim.scale(1.22,.88,1);rim.translate(...center.toArray());parts.push(rim);const lens=new THREE.CircleGeometry(.024,20);lens.scale(1.17,.83,1);lens.translate(center.x,center.y,center.z+.0005);lenses.push(lens);}
    const earX=side*(Math.max(Math.abs(skinBox.min.x),Math.abs(skinBox.max.x))+.001);parts.push(tubePiece([[center.x+side*.029,center.y,center.z],[earX,center.y-.003,(eyeBox.min.z+skinBox.min.z)/2],[earX,center.y-.012,skinBox.min.z+.022]],.0022,10,4));
  }
  const bridge=centers[0].clone().lerp(centers[1],.5);parts.push(tubePiece([[centers[0].x+.029,bridge.y+.002,bridge.z],[centerX,bridge.y+.006,bridge.z+.004],[centers[1].x-.029,bridge.y+.002,bridge.z]],.002,8,4));
  attachGeometry(model,head,mergePieces(parts),clothMaterial(sunglasses?'#080b10':'#202934',{roughness:.35}),sunglasses?'KTD sunglasses frames':'KTD optical frames');attachGeometry(model,head,mergePieces(lenses),sunglasses?clothMaterial('#080c13',{roughness:.19,metalness:.12}):clothMaterial('#abc5d4',{transparent:true,opacity:.11,depthWrite:false,roughness:.2}),sunglasses?'KTD sunglasses lenses':'KTD optical lenses');
}
function accessories(model,person,skin,glasses,meshes){
  if(!person.cap&&!person.watch&&!person.purse&&(!person.tattoos||person.tattoos==='none')&&!person.glasses&&!person.sunglasses)return;
  if(!skin)return;const head=model.getObjectByName('Head'),spine=model.getObjectByName('Spine1'),hips=model.getObjectByName('Hips');if(!head)return;
  const box=new THREE.Box3().setFromPoints(coordinates(skin,model).points),top=box.max.y,front=box.max.z-.009,z=(box.min.z+box.max.z)/2;
  if(glasses)glasses.visible=false;
  if(person.glasses||person.sunglasses)fittedGlasses(model,skin,meshes.filter(mesh=>mesh.material?.name.includes('Wolf3D_Eye')),!!person.sunglasses);
  if(person.cap){
    for(const mesh of meshes)if(mesh.material?.name.includes('Wolf3D_Hair'))mesh.visible=false;
    const headPoints=coordinates(skin,model).points,headBox=new THREE.Box3().setFromPoints(headPoints),cx=(headBox.min.x+headBox.max.x)/2,cz=(headBox.min.z+headBox.max.z)/2+.004;
    const rx=(headBox.max.x-headBox.min.x)*.60,rz=(headBox.max.z-headBox.min.z)*.59,baseY=top-.085;
    const crown=new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2);crown.scale(rx,.113,rz);crown.translate(cx,baseY,cz);
    const band=new THREE.CylinderGeometry(1,1,.018,32,1,true);band.scale(rx,1,rz);band.translate(cx,baseY+.002,cz);
    const shape=new THREE.Shape();shape.moveTo(-rx*.90,0);shape.quadraticCurveTo(-rx*1.15,.080,-rx*.72,.112);shape.quadraticCurveTo(0,.145,rx*.72,.112);shape.quadraticCurveTo(rx*1.15,.080,rx*.90,0);shape.closePath();
    const peak=new THREE.ExtrudeGeometry(shape,{depth:.004,bevelEnabled:true,bevelThickness:.001,bevelSize:.001,bevelSegments:1,steps:1,curveSegments:14}),positions=peak.attributes.position;
    // The bill points toward +Z (the avatar's face), with a gentle curved drop.
    for(let i=0;i<positions.count;i++){const x=positions.getX(i),forward=positions.getY(i),thickness=positions.getZ(i);positions.setXYZ(i,cx+x,baseY-.008-thickness-.013*(x/rx)**2-forward*.12,cz+rz*.72+forward);}
    peak.computeVertexNormals();attachGeometry(model,head,mergePieces([crown,band,peak]),clothMaterial('#0b0f15',{roughness:.86}),'KTD sport cap');
    const stitches=[];for(const angle of [0,Math.PI/3,Math.PI*2/3,Math.PI,Math.PI*4/3,Math.PI*5/3]){const points=[];for(let i=1;i<=10;i++){const t=i/10*Math.PI/2;points.push([cx+Math.cos(angle)*Math.sin(t)*(rx+.001),baseY+Math.cos(t)*.114,cz+Math.sin(angle)*Math.sin(t)*(rz+.001)]);}stitches.push(tubePiece(points,.0007,12,3));}
    const button=new THREE.SphereGeometry(.008,8,6);button.scale(1,.5,1);button.translate(cx,baseY+.114,cz);stitches.push(button);attachGeometry(model,head,mergePieces(stitches),clothMaterial('#20242a'),'KTD cap seams and button');
    if(person.hairstyle==='afro')model.getObjectByName('KTD afro hair')?.traverse(mesh=>{mesh.visible=false;});
  }
  if(person.watch){const hand=model.getObjectByName('LeftHand'),fore=model.getObjectByName('LeftForeArm');if(hand&&fore){const wrist=bonePoint(model,'LeftHand'),elbow=bonePoint(model,'LeftForeArm'),direction=wrist.clone().sub(elbow).normalize(),center=wrist.clone().addScaledVector(direction,-.035);const band=new THREE.TorusGeometry(.031,.0065,6,14);band.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),direction));band.translate(...center.toArray());attachGeometry(model,fore,band,clothMaterial('#222b32'),'KTD wristwatch band');const face=new THREE.BoxGeometry(.032,.027,.012);face.translate(center.x,center.y,center.z+.034);attachGeometry(model,fore,face,clothMaterial('#bdc8cc',{metalness:.7,roughness:.3}),'KTD wristwatch');const dial=new THREE.BoxGeometry(.023,.018,.002);dial.translate(center.x,center.y,center.z+.041);attachGeometry(model,fore,dial,clothMaterial('#1a3441'),'KTD watch dial');}}
  if(person.purse&&hips&&spine){const waist=bonePoint(model,'Hips').y,shoulder=bonePoint(model,'Neck')?.y||waist+.5;const bag=new THREE.BoxGeometry(.175,.17,.065,1,1,1);bag.translate(.245,waist-.10,.035);attachGeometry(model,hips,bag,clothMaterial('#6b413a'),'KTD crossbody purse');const flap=new THREE.BoxGeometry(.16,.07,.008);flap.translate(.245,waist-.055,.072);attachGeometry(model,hips,flap,clothMaterial('#8a5a4b'),'KTD purse flap');const strap=tubePiece([[-.14,shoulder-.02,.02],[-.04,waist+.31,.16],[.13,waist+.12,.15],[.245,waist-.05,.06]],.008,18,5);attachGeometry(model,spine,strap,clothMaterial('#51332e'),'KTD purse strap');}
  if(person.tattoos&&person.tattoos!=='none'){
    skinTattoo(model,skin,{center:new THREE.Vector3(-.018,top-.238,0),width:.043,height:.057,minZ:.015,style:person.tattoos,name:'KTD '+person.tattoos+' neck tattoo'});
    const wrist=bonePoint(model,'RightHand'),body=meshes.find(mesh=>mesh.material?.name.includes('Wolf3D_Body'));
    if(wrist&&body)skinTattoo(model,body,{center:new THREE.Vector3(wrist.x+.035,wrist.y,0),width:.047,height:.035,minZ:wrist.z+.008,style:person.tattoos,name:'KTD '+person.tattoos+' wrist tattoo'});
  }

}

export function staffBadgeTexture(person){
  const width=256,height=128,name=(person?.name||'Nhalewick nurse').replace(/^Nurse\s+/i,'');
  if(typeof document==='undefined'){const data=new Uint8Array(width*height*4);for(let i=0;i<data.length;i+=4){data[i]=238;data[i+1]=246;data[i+2]=250;data[i+3]=255;}const texture=new THREE.DataTexture(data,width,height);texture.needsUpdate=true;return texture;}
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#f2f8fb';ctx.fillRect(0,0,width,height);ctx.fillStyle='#386b91';ctx.fillRect(0,0,width,30);ctx.fillStyle='#ffffff';ctx.font='700 18px Arial';ctx.fillText('NHALEWICK',12,21);ctx.fillStyle='#20445d';ctx.font='700 21px Arial';ctx.fillText('NURSE',12,61);ctx.font='600 22px Arial';ctx.fillText(name,12,92,232);ctx.fillStyle='#7f9fb2';ctx.fillRect(12,108,144,5);ctx.fillStyle='#c3dce9';ctx.fillRect(188,45,54,62);ctx.fillStyle='#4b7995';ctx.beginPath();ctx.arc(215,63,10,0,Math.PI*2);ctx.fill();ctx.fillRect(202,77,26,22);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function attachNurseBadge(model,person){
  model.updateMatrixWorld(true);let top;model.traverse(mesh=>{if(mesh.material?.name.includes('Outfit_Top'))top=mesh;});const chest=model.getObjectByName('Spine2'),neck=bonePoint(model,'Neck');if(!top||!chest||!neck)return;
  const shoulder=bonePoint(model,'LeftArm');const {points}=coordinates(top,model),front=surfaceAt(points,false),x=Math.min(.10,Math.abs(shoulder?.x||.165)*.60),y=neck.y-.19,width=.105,height=.065,geometry=new THREE.PlaneGeometry(width,height),position=geometry.getAttribute('position');for(let i=0;i<position.count;i++){const px=position.getX(i)+x,py=position.getY(i)+y;position.setXYZ(i,px,py,front(px,py)+.002);}geometry.computeVertexNormals();
  const badge=attachGeometry(model,chest,geometry,clothMaterial('#ffffff',{map:staffBadgeTexture(person),roughness:.66}),'KTD nurse name badge');badge.userData.appearanceOwnedTexture=true;badge.userData.staffName=person?.name||'Nhalewick nurse';badge.userData.staffRole='NURSE';
  const clip=new THREE.BoxGeometry(.016,.013,.006);clip.translate(x,y+height/2+.005,front(x,y+height/2)+.002);attachGeometry(model,chest,clip,clothMaterial('#667c8b',{metalness:.6,roughness:.4}),'KTD nurse badge clip');
}

// Replace the source sweater/hoodie silhouette with a collarless scrub shell.
// It shares the original rig; exposed arm sections follow upper/forearm bones.
export function fitNurseScrubs(model,person){
  model.updateMatrixWorld(true);let top,head;model.traverse(m=>{if(m.material?.name.includes('Outfit_Top'))top=m;if(m.material?.name.includes('Wolf3D_Skin'))head=m;});
  if(!top||!top.skeleton)return;
  const neck=bonePoint(model,'Neck'),hip=bonePoint(model,'Hips'),shoulder=bonePoint(model,'LeftArm');if(!neck||!hip||!shoulder)return;
  const radius=Math.abs(shoulder.x)+.012,waist=hip.y+.045,shoulderY=shoulder.y+.035,centerZ=neck.z+.012;
  const vertices=[],uv=[],indices=[],segments=24;
  const rings=[{y:waist,rx:radius*.96,rz:.117},{y:waist+.12,rx:radius,rz:.126},{y:shoulderY-.12,rx:radius*1.05,rz:.137},{y:shoulderY,rx:radius*1.04,rz:.108},{y:neck.y-.035,rx:.066,rz:.057}];
  for(let ring=0;ring<rings.length;ring++)for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,r=rings[ring],x=Math.cos(a)*r.rx,z=Math.sin(a)*r.rz+centerZ;
    // V dips to the upper chest in front. Back is a simple round neckline.
    const y=r.y-(ring===rings.length-1&&Math.sin(a)>0?.085*(1-Math.abs(Math.cos(a))):0);
    vertices.push(x,y,z);uv.push(.12,.12);
    if(ring&&i){const b=ring*(segments+1)+i;indices.push(b,b-1,b-segments-2,b,b-segments-2,b-segments-1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const skinIndex=[],skinWeight=[],spine=top.skeleton.bones.findIndex(b=>b.name==='Spine2'),lower=top.skeleton.bones.findIndex(b=>b.name==='Spine');
  for(let i=0;i<vertices.length/3;i++){const y=vertices[i*3+1],blend=THREE.MathUtils.clamp((y-waist)/Math.max(.1,shoulderY-waist),0,1);skinIndex.push(Math.max(0,spine),Math.max(0,lower),0,0);skinWeight.push(blend,1-blend,0,0);}
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
  const original=top.geometry;top.geometry=geometry;const inverse=top.matrixWorld.clone().invert().multiply(model.matrixWorld),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(inverse).applyMatrix4(inverseSkinMatrix(top,i));p.setXYZ(i,v.x,v.y,v.z);}
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();top.userData.appearanceGeometryOwned=true;top.userData.scrubUniform=true;top.userData.originalTopGeometry=original;
  top.material.side=THREE.DoubleSide;model.traverse(m=>{if(m.material?.name.includes('Outfit_Top')||m.material?.name.includes('Outfit_Bottom')){for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])m.material[key]=null;m.material.color.set(NURSE_UNIFORM);m.material.needsUpdate=true;}});
  const skinColor=head?.material.color||new THREE.Color(person.skin||'#bd9479');
  fittedPanel(model,model.getObjectByName('Spine2'),[[-.066,neck.y-.025],[0,neck.y-.15],[.066,neck.y-.025]],()=>centerZ+.055,clothMaterial(skinColor),'KTD scrub V-neck skin',false,.002);
  for(const side of ['Left','Right']){
    const arm=model.getObjectByName(side+'Arm'),fore=model.getObjectByName(side+'ForeArm'),wrist=model.getObjectByName(side+'Hand');if(!arm||!fore||!wrist)continue;
    const a=bonePoint(model,side+'Arm'),b=bonePoint(model,side+'ForeArm'),c=bonePoint(model,side+'Hand'),direction=b.clone().sub(a).normalize();
    const sleeveStart=a.clone().addScaledVector(direction,-.018),sleeveEnd=a.clone().lerp(b,.53);
    const section=(start,end,ra,rb,bone,mat,name)=>{const geo=new THREE.CylinderGeometry(rb,ra,start.distanceTo(end),14,1,false);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize()));geo.translate(...start.clone().lerp(end,.5).toArray());return attachGeometry(model,bone,geo,mat,name);};
    const fabric=clothMaterial(NURSE_UNIFORM);section(sleeveStart,sleeveEnd,.077,.072,arm,fabric,'KTD scrub short sleeve '+side);
    section(a.clone().lerp(b,.45),b,.047,.041,arm,clothMaterial(skinColor),'KTD exposed upper arm '+side);
    section(b.clone().addScaledVector(direction,-.012),c,.043,.027,fore,clothMaterial(skinColor),'KTD exposed forearm '+side);
    const elbow=new THREE.SphereGeometry(.043,12,8);elbow.translate(...b.toArray());attachGeometry(model,fore,elbow,clothMaterial(skinColor),'KTD complete elbow '+side);
  }
}

export function applyAppearance(model, person, role = 'civilian', cache = irisCache) {
  if(!person)return;
  completeHands(model,person,role);
  if(role==='nurse'){fitNurseScrubs(model,person);attachNurseBadge(model,person);}
  model.updateMatrixWorld(true);
  const leases=model.userData.appearanceTextureLeases=new Set();appearanceCaches.set(model,cache);
  const meshes=[]; model.traverse(object=>{if(object.isMesh)meshes.push(object);});
  const find=name=>meshes.find(mesh=>mesh.material?.name.includes(name));
  if (/^#[\da-f]{6}$/i.test(person.eyes || '')) for(const mesh of meshes) if(mesh.material?.name.includes('Wolf3D_Eye')) {
    mesh.material.map=eyeTexture(mesh.material.map,person.eyes,cache,leases); mesh.material.color.set('#ffffff');mesh.material.needsUpdate=true;
  }
  const top=find('Outfit_Top');
  const premium=PREMIUM_OUTFITS.find(o=>o.id===person.outfit);
  if(role==='civilian'&&premium&&top){for(const mesh of meshes)if(/Outfit_Top|Outfit_Bottom/.test(mesh.material?.name||'')){mesh.material.map=null;mesh.material.color.set(premium.color);}fitOutfit(model,top,premium.base,premium.color);premiumDetails(model,top,premium);}
  else if(['civilian','patient'].includes(role)&&top && ['jacket','tactical','suit'].includes(person.outfit))fitOutfit(model,top,person.outfit,person.accent || '#526778');
  const hair=find('Hair'), skin=find('Skin');
  if(hair){const style=person.hairstyle||'original',hex=person.hair||'#342b25';if(['cropped','slick','ponytail','ponytail-front','ponytail-side'].includes(style))fitHair(model,hair,skin,style,hex);else if(['afro','braids','straight','curls-short','curls-long'].includes(style))extendedHair(model,hair,skin,style,hex);
    colorHair(hair,model,hex,person.highlights);model.traverse(object=>{if(object.userData.appearanceOwned&&/hair$|ponytail$/.test(object.name))colorHair(object,model,hex,person.highlights);});}
  if(person.refined&&skin){skin.material.roughness=.67;for(const mesh of meshes)if(mesh.material?.name.includes('Eye'))mesh.material.roughness=.24;}
  shapeFace(model,person,skin,meshes);
  if(role==='civilian')accessories(model,person,skin,find('Glasses'),meshes);
  else if(person.glasses)fittedGlasses(model,skin,meshes.filter(mesh=>mesh.material?.name.includes('Wolf3D_Eye')));
}

export function disposeAppearance(model) {
  if(!model)return;appearanceCaches.delete(model);
  const leases=model.userData.appearanceTextureLeases;
  if(leases){for(const entry of leases){entry.users=Math.max(0,entry.users-1);trimIrisCache(entry.cache);}leases.clear();delete model.userData.appearanceTextureLeases;}
  const geometries=new Set(),materials=new Set(),textures=new Set(),remove=[];
  model.traverse(object=>{if(object.userData.appearanceOwned){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])if(material){materials.add(material);if(object.userData.appearanceOwnedTexture&&material.map)textures.add(material.map);}remove.push(object);}else if(object.userData.appearanceGeometryOwned){geometries.add(object.geometry);delete object.userData.appearanceGeometryOwned;}});
  for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();for(const object of remove)object.removeFromParent();
}

// Generated iris atlases are shared by avatars and portraits. Clear only after
// every wearer has been disposed, when unloading the complete character set.
export function disposeAppearanceCache(cache = irisCache) {
  for(const [key,entry] of cache)if(entry.users===0){entry.texture.dispose();cache.delete(key);}
}

// Local, anatomical edits preserve the original skin weights and source assets.
export function shapeFace(model,person,skin,meshes=[]){
  if(!skin||!['eyeShape','noseShape','mouthShape'].some(k=>person[k]&&person[k]!=='natural'))return;
  const {points}=coordinates(skin,model),box=new THREE.Box3().setFromPoints(points),top=box.max.y,centerZ=(box.max.z+box.min.z)/2;
  const falloff=(x,y,cx,cy,rx,ry)=>Math.max(0,1-((x-cx)/rx)**2-((y-cy)/ry)**2);
  const transform=p=>{
    if(p.z<centerZ+.025)return;
    const eyeY=top-.112,mouthY=top-.211,noseY=top-.166,side=p.x<0?-1:1;
    const e=falloff(p.x,p.y,side*.035,eyeY,.033,.022),m=falloff(p.x,p.y,0,mouthY,.060,.026),n=falloff(p.x,p.y,0,noseY,.029,.041);
    if(person.eyeShape==='round')p.y+=(p.y-eyeY)*.23*e;
    if(person.eyeShape==='almond')p.y-=(p.y-eyeY)*.22*e;
    if(person.eyeShape==='lifted')p.y+=(Math.abs(p.x)-.020)*.20*e;
    if(person.noseShape==='slender')p.x*=1-.18*n;
    if(person.noseShape==='broad')p.x*=1+.25*n;
    if(person.noseShape==='defined')p.z+=.009*n;
    if(person.mouthShape==='full'){p.y+=(p.y-mouthY)*.33*m;p.z+=.003*m;}
    if(person.mouthShape==='soft'){p.y+=.003*Math.cos(p.x*65)*m;p.x*=1-.06*m;}
    if(person.mouthShape==='wide')p.x*=1+.16*m;
  };
  reshape(skin,model,transform);skin.userData.faceShapes={eye:person.eyeShape||'natural',nose:person.noseShape||'natural',mouth:person.mouthShape||'natural'};
  for(const mesh of meshes)if(/Wolf3D_Eye|Wolf3D_Teeth/.test(mesh.material?.name||''))reshape(mesh,model,transform);
}
function premiumDetails(model,top,item){
  const chest=model.getObjectByName('Spine2'),spine=model.getObjectByName('Spine1');if(!chest||!spine)return;
  const {points}=coordinates(top,model),box=new THREE.Box3().setFromPoints(points),front=surfaceAt(points,false),y=bonePoint(model,'Hips').y+.18;
  const trim=clothMaterial(item.trim,{roughness:.6});
  for(const side of [-1,1])for(let i=0;i<(item.id==='nocturne'?3:1);i++){const x=side*.045,by=y+i*.065,g=new THREE.SphereGeometry(.006,8,6);g.scale(1,1,.4);g.translate(x,by,front(x,by)+.01);attachGeometry(model,spine,g,trim,'KTD '+item.id+' tailored button');}
  if(item.id==='expedition'){const waist=bonePoint(model,'Hips').y+.06,geo=new THREE.CylinderGeometry(.18,.19,.16,24,1,true);geo.scale(1,1,.72);geo.translate(0,waist-.05,.01);attachGeometry(model,spine,geo,clothMaterial(item.color),'KTD expedition coat skirt');const belt=new THREE.TorusGeometry(.18,.012,5,24);belt.rotateX(Math.PI/2);belt.scale(1,.72,1);belt.translate(0,waist+.025,.01);attachGeometry(model,spine,belt,trim,'KTD expedition belt');}
  else{fittedPanel(model,chest,[[.085,box.max.y-.16],[.13,box.max.y-.16],[.13,box.max.y-.18],[.085,box.max.y-.18]],(x,y)=>front(x,y)+.014,trim,'KTD '+item.id+' pocket square');}
}

// Preserve the real finger skinning while replacing the source outfit’s glove
// atlas. Separating faces avoids z-fighting or a rigid mitten over the hand.
const handFaceCache=new WeakMap();
export function completeHands(model,person,role){
 model.updateMatrixWorld(true);const sources=[];model.traverse(o=>{if(o.isSkinnedMesh&&/Wolf3D_Body|Wolf3D_Outfit_Top/.test(o.material?.name||''))sources.push(o);});
 const chunks={Left:[],Right:[]};
 for(const sourceMesh of sources){
 const source=sourceMesh.geometry,skin=source.attributes.skinIndex,weight=source.attributes.skinWeight;if(!skin||!weight)continue;
 let faces=handFaceCache.get(source);
 if(!faces){
   const left=new Float32Array(skin.count),right=new Float32Array(skin.count);
   for(let index=0;index<skin.count;index++)for(let j=0;j<4;j++){const name=sourceMesh.skeleton.bones[skin.getComponent(index,j)]?.name||'',w=weight.getComponent(index,j);if(name.startsWith('LeftHand'))left[index]+=w;if(name.startsWith('RightHand'))right[index]+=w;}
   const indices=source.index?source.index.array:Array.from({length:source.attributes.position.count},(_,i)=>i),keep=[],selected={Left:[],Right:[]};
   for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2],side=left[a]+left[b]+left[c]>.15?'Left':right[a]+right[b]+right[c]>.15?'Right':null;(side?selected[side]:keep).push(a,b,c);}
   faces={keep,selected};handFaceCache.set(source,faces);
 }
 const {keep,selected}=faces;
 if(!selected.Left.length&&!selected.Right.length)continue;
 if(!(role==='nurse'&&sourceMesh.material.name.includes('Outfit_Top'))){const remaining=source.clone();remaining.setIndex(keep);remaining.clearGroups();sourceMesh.geometry=remaining;sourceMesh.userData.appearanceGeometryOwned=true;}
 for(const side of ['Left','Right'])if(selected[side].length)chunks[side].push({source,indices:selected[side],mesh:sourceMesh});
 }
 for(const side of ['Left','Right']){
 const parts=chunks[side];if(!parts.length)continue;const base=parts[0].mesh;
 const geometry=new THREE.BufferGeometry();
 // Meshopt quantization is baked into each mesh's inverse bind matrices.
 // Body and outfit vertices cannot share one skeleton until their bind spaces
 // agree, even when both meshes have identity transforms and identical bones.
 const baseBones=new Map(base.skeleton.bones.map((bone,index)=>[bone.name,index]));
 const conversions=parts.map(part=>{
   const remap=part.mesh.skeleton.bones.map(bone=>baseBones.get(bone.name));
   const conversion=base.skeleton.boneInverses[remap[0]].clone().invert().multiply(part.mesh.skeleton.boneInverses[0]);
   return {part,remap,conversion,normal:new THREE.Matrix3().getNormalMatrix(conversion)};
 });
 for(const name of ['position','normal','skinIndex','skinWeight']){
   const size=base.geometry.attributes[name].itemSize,length=parts.reduce((n,p)=>n+p.indices.length,0);
   const values=name==='skinIndex'?new Uint16Array(length*size):new Float32Array(length*size);let cursor=0;
   const point=new THREE.Vector3();
   for(const {part,remap,conversion,normal} of conversions){const attribute=part.source.attributes[name];
     for(const index of part.indices){
       if(name==='position'||name==='normal'){
         point.fromBufferAttribute(attribute,index);if(name==='position')point.applyMatrix4(conversion);else point.applyMatrix3(normal).normalize();
         values[cursor++]=point.x;values[cursor++]=point.y;values[cursor++]=point.z;
       }else for(let j=0;j<size;j++)values[cursor++]=name==='skinIndex'?remap[attribute.getComponent(index,j)]:attribute.getComponent(index,j);
     }
   }
   geometry.setAttribute(name,new THREE.BufferAttribute(values,size));
 }
 const indexed=mergeVertices(geometry,1e-6);geometry.dispose();indexed.computeBoundingBox();indexed.computeBoundingSphere();const hand=new THREE.SkinnedMesh(indexed,clothMaterial(person.skin||'#c69b7c',{side:THREE.DoubleSide}));hand.userData.bareHand=true;hand.userData.nativeHand=true;hand.name='KTD complete hand '+side;hand.position.copy(base.position);hand.quaternion.copy(base.quaternion);hand.scale.copy(base.scale);hand.bindMode=base.bindMode;hand.bindMatrix.copy(base.bindMatrix);hand.bindMatrixInverse.copy(base.bindMatrixInverse);hand.skeleton=base.skeleton;hand.normalizeSkinWeights();hand.castShadow=hand.receiveShadow=true;hand.frustumCulled=false;hand.userData.appearanceOwned=true;base.parent.add(hand);
 }
}
export function fitPregnancy(visual){
 const model=visual.model;if(!model)return;model.updateMatrixWorld(true);let top;model.traverse(o=>{if(o.material?.name.includes('Outfit_Top'))top=o;});if(!top)return;
 const hips=bonePoint(model,'Hips'),neck=bonePoint(model,'Neck'),centerY=hips.y+.15,centerZ=(hips.z+neck.z)/2;
 reshape(top,model,p=>{const r=(p.x/.29)**2+((p.y-centerY)/.31)**2;if(r>=1||p.z<centerZ-.015)return;const front=THREE.MathUtils.smoothstep(p.z,centerZ-.015,centerZ+.07);p.z+=.19*(1-r)**1.4*front;});
 top.userData.pregnancy=true;top.name='Continuous maternity gown silhouette';
}
