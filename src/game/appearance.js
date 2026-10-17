import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

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
  mesh.userData.appearanceOwned = true; bone.add(mesh); return mesh;
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
function fittedGlasses(model,skin,eyeMeshes){
  const head=model.getObjectByName('Head'),points=eyeMeshes.flatMap(mesh=>coordinates(mesh,model).points);if(!head||!points.length)return;
  const eyeBox=new THREE.Box3().setFromPoints(points),centerX=(eyeBox.min.x+eyeBox.max.x)/2,skinBox=new THREE.Box3().setFromPoints(coordinates(skin,model).points),parts=[],lenses=[];
  const centers=[];for(const side of [-1,1]){const sidePoints=points.filter(point=>(point.x-centerX)*side>0),box=new THREE.Box3().setFromPoints(sidePoints),center=box.getCenter(new THREE.Vector3());center.z=box.max.z+.011;center.y-=.001;centers.push(center);
    const rim=new THREE.TorusGeometry(.024,.0023,5,20);rim.scale(1.22,.88,1);rim.translate(...center.toArray());parts.push(rim);
    const lens=new THREE.CircleGeometry(.024,20);lens.scale(1.17,.83,1);lens.translate(center.x,center.y,center.z+.0005);lenses.push(lens);
    const earX=side*(Math.max(Math.abs(skinBox.min.x),Math.abs(skinBox.max.x))+.001);parts.push(tubePiece([[center.x+side*.029,center.y,center.z],[earX,center.y-.003,(eyeBox.min.z+skinBox.min.z)/2],[earX,center.y-.012,skinBox.min.z+.022]],.0022,10,4));
  }
  const bridge=centers[0].clone().lerp(centers[1],.5);parts.push(tubePiece([[centers[0].x+.029,bridge.y+.002,bridge.z],[centerX,bridge.y+.006,bridge.z+.004],[centers[1].x-.029,bridge.y+.002,bridge.z]],.002,8,4));
  attachGeometry(model,head,mergePieces(parts),clothMaterial('#202934',{roughness:.35}),'KTD optical frames');attachGeometry(model,head,mergePieces(lenses),clothMaterial('#abc5d4',{transparent:true,opacity:.11,depthWrite:false,roughness:.2}),'KTD optical lenses');
}
function accessories(model,person,skin,glasses,meshes){
  if(!person.cap&&!person.watch&&!person.purse&&(!person.tattoos||person.tattoos==='none')&&!person.glasses)return;
  if(!skin)return;const head=model.getObjectByName('Head'),spine=model.getObjectByName('Spine1'),hips=model.getObjectByName('Hips');if(!head)return;
  const box=new THREE.Box3().setFromPoints(coordinates(skin,model).points),top=box.max.y,front=box.max.z-.009,z=(box.min.z+box.max.z)/2;
  if(glasses)glasses.visible=false;
  if(person.glasses)fittedGlasses(model,skin,meshes.filter(mesh=>mesh.material?.name.includes('Wolf3D_Eye')));
  if(person.cap){
    for(const mesh of meshes)if(mesh.material?.name.includes('Wolf3D_Hair'))mesh.visible=false;
    const crown=new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI*.56);crown.scale(.105,.056,.111);crown.translate(0,top-.033,z-.008);
    const band=new THREE.TorusGeometry(1,.045,5,28);band.scale(.101,.109,.075);band.rotateX(Math.PI/2);band.translate(0,top-.041,z-.008);
    const peak=spherePiece([0,top-.041,front+.001],[.082,.004,.029],16);attachGeometry(model,head,mergePieces([crown,band,peak]),clothMaterial(person.accent||'#34495a'),'KTD plain cap');
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

export function applyAppearance(model, person, role = 'civilian', cache = irisCache) {
  if (!person || role !== 'civilian') return;
  model.updateMatrixWorld(true);
  const leases=model.userData.appearanceTextureLeases=new Set();appearanceCaches.set(model,cache);
  const meshes=[]; model.traverse(object=>{if(object.isMesh)meshes.push(object);});
  const find=name=>meshes.find(mesh=>mesh.material?.name.includes(name));
  if (/^#[\da-f]{6}$/i.test(person.eyes || '')) for(const mesh of meshes) if(mesh.material?.name.includes('Wolf3D_Eye')) {
    mesh.material.map=eyeTexture(mesh.material.map,person.eyes,cache,leases); mesh.material.color.set('#ffffff');mesh.material.needsUpdate=true;
  }
  const top=find('Outfit_Top');
  if(top && ['jacket','tactical','suit'].includes(person.outfit))fitOutfit(model,top,person.outfit,person.accent || '#526778');
  const hair=find('Hair'), skin=find('Skin');
  if(hair){const style=person.hairstyle||'original',hex=person.hair||'#342b25';if(['cropped','slick','ponytail','ponytail-front','ponytail-side'].includes(style))fitHair(model,hair,skin,style,hex);else if(['afro','braids','straight','curls-short','curls-long'].includes(style))extendedHair(model,hair,skin,style,hex);
    colorHair(hair,model,hex,person.highlights);model.traverse(object=>{if(object.userData.appearanceOwned&&/hair$|ponytail$/.test(object.name))colorHair(object,model,hex,person.highlights);});}
  if(person.refined&&skin){skin.material.roughness=.67;for(const mesh of meshes)if(mesh.material?.name.includes('Eye'))mesh.material.roughness=.24;}
  accessories(model,person,skin,find('Glasses'),meshes);
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
