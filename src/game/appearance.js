import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const OUTFIT_STYLES = ['casual','jacket','tactical','suit'];
export const HAIRSTYLES = ['original','cropped','slick','ponytail','ponytail-front','ponytail-side','afro','braids','straight','curls-short','curls-long'];
const irisCache = new Map();

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
function fitHair(model, hair, skin, hairstyle, hex) {
  const head = model.getObjectByName('Head'); if (!head || !skin) return;
  const headBox = new THREE.Box3().setFromPoints(coordinates(skin,model).points);
  const hairBox = new THREE.Box3().setFromPoints(coordinates(hair,model).points);
  const top=headBox.max.y,pony=hairstyle.startsWith('ponytail'),slick=hairstyle==='slick'||pony,factor=hairstyle==='cropped'?.57:slick?.47:.73;
  reshape(hair, model, p => {
    p.y=top+(slick?.012:.018)-(hairBox.max.y-p.y)*factor;
    p.x*=hairstyle==='cropped'?.93:.96;
    if(slick){const front=THREE.MathUtils.clamp((p.z-(headBox.min.z+headBox.max.z)/2)/.09,0,1),crown=THREE.MathUtils.clamp((p.y-(top-.12))/.132,0,1);p.x+=front*crown*.016;p.z-=.010*crown+.005*front;}
    p.z = headBox.min.z + (p.z - hairBox.min.z) * (hairstyle === 'cropped' ? .84 : .9) - .008;
  });
  if (!hairstyle.startsWith('ponytail')) return;
  const start = new THREE.Vector3(0, top-.105, headBox.min.z-.008);
  const points=hairstyle==='ponytail-front'?[start,start.clone().add(new THREE.Vector3(.10,-.07,.015)),new THREE.Vector3(.14,top-.27,headBox.max.z+.045),new THREE.Vector3(.11,top-.43,headBox.max.z+.03)]:hairstyle==='ponytail-side'?[start,start.clone().add(new THREE.Vector3(.11,-.025,-.03)),start.clone().add(new THREE.Vector3(.17,-.17,.015)),start.clone().add(new THREE.Vector3(.15,-.35,.06))]:[start,start.clone().add(new THREE.Vector3(0,-.025,-.065)),start.clone().add(new THREE.Vector3(.012,-.13,-.103)),start.clone().add(new THREE.Vector3(.018,-.30,-.073))];
  const path = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(path, 18, .034, 10, false), p = geometry.getAttribute('position');
  for (let segment = 0; segment <= 18; segment++) {
    const center = path.getPointAt(segment / 18), taper = .95 - .74 * Math.pow(segment / 18, 2);
    for (let ring = 0; ring <= 10; ring++) { const i=segment*11+ring; const point = new THREE.Vector3().fromBufferAttribute(p,i).sub(center).multiplyScalar(taper).add(center); p.setXYZ(i,point.x,point.y,point.z); }
  }
  geometry.computeVertexNormals();
  attachGeometry(model, head, geometry, clothMaterial(hex), 'KTD tied ponytail');
  const tie = new THREE.TorusGeometry(.029,.005,6,16); tie.rotateX(Math.PI/2); tie.translate(start.x,start.y-.018,start.z-.045);
  attachGeometry(model,head,tie,clothMaterial('#1e2b34'),'KTD hair tie');
}

function mergePieces(pieces){
  const ready=pieces.map(geometry=>{const result=geometry.index?geometry.toNonIndexed():geometry.clone();for(const key of Object.keys(result.attributes))if(!['position','normal'].includes(key))result.deleteAttribute(key);return result;});
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
  fitHair(model,hair,skin,'cropped',hex);
  const pieces=[];
  if(style==='afro'||style.startsWith('curls')){
    const long=style==='curls-long',afro=style==='afro';
    const radii=afro?[.126,.145,.122]:[.107,.121,.105],centerY=top-(afro?.077:.065);
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
    const rings=long?7:10;
    for(let ring=0;ring<rings;ring++){const t=(ring+.2)/(rings-.5),count=6+ring*3;for(let i=0;i<count;i++){
      const phi=i/count*Math.PI*2+ring*.31,point=surface(phi,Math.min(1,t));
      const normal=new THREE.Vector3(point.x/(radii[0]*radii[0]),(point.y-centerY)/(radii[1]*radii[1]),(point.z-z)/(radii[2]*radii[2])).normalize();
      point.addScaledVector(normal,.003);
      const curl=.0095+.0018*(.5+.5*Math.sin(i*2.37+ring));
      const detail=new THREE.SphereGeometry(1,6,4);detail.scale(curl,curl*.9,curl);detail.translate(...point.toArray());pieces.push(detail);
    }}
    if(long)for(let column=0;column<16;column++){
      const phi=column/16*Math.PI*2,x=Math.cos(phi)*.095,zz=Math.sin(phi)*.094;
      if(zz>.025&&Math.abs(x)<.075)continue;
      const strand=[];for(let step=0;step<=32;step++){const t=step/32,turn=step*Math.PI*.38,columnWave=Math.sin(column*1.7)*.012;
        strand.push([x*(1+.07*t)+Math.cos(turn)*.008,top-.105-t*(.30+columnWave),z+zz-.007+Math.sin(turn)*.008]);
      }
      pieces.push(tubePiece(strand,.0068,32,5));
    }
  }else if(style==='braids'){
    for(let i=0;i<14;i++){const angle=(i/14)*Math.PI*2,x=Math.cos(angle)*.086,zz=Math.sin(angle)*.08;if(zz>.03&&Math.abs(x)<.06)continue;const points=[];for(let step=0;step<=18;step++){const t=step/18,spiral=step*2.5;points.push([x+Math.cos(spiral)*.0035,top-.035-t*(.37+(i%3)*.025),z+zz-.018+Math.sin(spiral)*.0035]);}pieces.push(tubePiece(points,.010,36,5));}
  }else if(style==='straight'){
    for(let i=0;i<15;i++){const angle=i/14*Math.PI*2,x=Math.cos(angle)*.091,zz=Math.sin(angle)*.087;if(zz>.035&&Math.abs(x)<.07)continue;pieces.push(tubePiece([[x,top-.045,z+zz],[x*1.10,top-.15,z+zz-.012],[x*1.16,top-.31,z+zz-.015],[x*1.12,top-.43,z+zz-.009]],.018,14,6));}
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
function accessories(model,person,skin,glasses){
  if(!person.cap&&!person.watch&&!person.purse&&(!person.tattoos||person.tattoos==='none')&&(!person.glasses||glasses))return;
  if(!skin)return;const head=model.getObjectByName('Head'),spine=model.getObjectByName('Spine1'),hips=model.getObjectByName('Hips');if(!head)return;
  const box=new THREE.Box3().setFromPoints(coordinates(skin,model).points),top=box.max.y,front=box.max.z-.009,z=(box.min.z+box.max.z)/2;
  if(person.glasses&&!glasses){const pieces=[];for(const side of [-1,1]){const rim=new THREE.TorusGeometry(.025,.0028,5,16);rim.scale(1.24,.88,1);rim.translate(side*.035,top-.104,front);pieces.push(rim);pieces.push(tubePiece([[side*.068,top-.104,front],[side*.085,top-.104,z],[side*.079,top-.122,box.min.z+.015]],.0025,8,4));}pieces.push(tubePiece([[-.007,top-.10,front],[0,top-.096,front+.002],[.007,top-.10,front]],.0025,5,4));attachGeometry(model,head,mergePieces(pieces),clothMaterial('#242b34',{roughness:.4}),'KTD optical frames');}
  if(person.cap){const crown=new THREE.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI*.53);crown.scale(.111,.072,.114);crown.translate(0,top-.052,z-.008);const brim=spherePiece([0,top-.052,front+.036],[.113,.007,.077],12);attachGeometry(model,head,mergePieces([crown,brim]),clothMaterial(person.accent||'#34495a'),'KTD baseball cap');}
  if(person.watch){const hand=model.getObjectByName('LeftHand'),fore=model.getObjectByName('LeftForeArm');if(hand&&fore){const wrist=bonePoint(model,'LeftHand'),elbow=bonePoint(model,'LeftForeArm'),direction=wrist.clone().sub(elbow).normalize(),center=wrist.clone().addScaledVector(direction,-.035);const band=new THREE.TorusGeometry(.031,.0065,6,14);band.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),direction));band.translate(...center.toArray());attachGeometry(model,fore,band,clothMaterial('#222b32'),'KTD wristwatch band');const face=new THREE.BoxGeometry(.032,.027,.012);face.translate(center.x,center.y,center.z+.034);attachGeometry(model,fore,face,clothMaterial('#bdc8cc',{metalness:.7,roughness:.3}),'KTD wristwatch');const dial=new THREE.BoxGeometry(.023,.018,.002);dial.translate(center.x,center.y,center.z+.041);attachGeometry(model,fore,dial,clothMaterial('#1a3441'),'KTD watch dial');}}
  if(person.purse&&hips&&spine){const waist=bonePoint(model,'Hips').y,shoulder=bonePoint(model,'Neck')?.y||waist+.5;const bag=new THREE.BoxGeometry(.175,.17,.065,1,1,1);bag.translate(.245,waist-.10,.035);attachGeometry(model,hips,bag,clothMaterial('#6b413a'),'KTD crossbody purse');const flap=new THREE.BoxGeometry(.16,.07,.008);flap.translate(.245,waist-.055,.072);attachGeometry(model,hips,flap,clothMaterial('#8a5a4b'),'KTD purse flap');const strap=tubePiece([[-.14,shoulder-.02,.02],[-.04,waist+.31,.16],[.13,waist+.12,.15],[.245,waist-.05,.06]],.008,18,5);attachGeometry(model,spine,strap,clothMaterial('#51332e'),'KTD purse strap');}
  if(person.tattoos&&person.tattoos!=='none'){
    const ink=clothMaterial('#29323a',{roughness:1}),pieces=[],x=.092,y=top-.235,zz=z-.012;
    if(person.tattoos==='botanical'){pieces.push(tubePiece([[x,y-.025,zz],[x+.002,y,zz+.004],[x,y+.035,zz+.006]],.0015,8,4));for(let i=0;i<4;i++){const leaf=new THREE.SphereGeometry(1,6,4);leaf.scale(.0015,.009,.004);leaf.rotateX((i%2?1:-1)*.5);leaf.translate(x+.001,y-.01+i*.012,zz+(i%2?.006:-.002));pieces.push(leaf);}}
    else for(let i=0;i<3;i++){const ring=new THREE.TorusGeometry(.009+i*.001,.0014,4,8);ring.rotateY(Math.PI/2);ring.translate(x,y+i*.015,zz);pieces.push(ring);}
    attachGeometry(model,head,mergePieces(pieces),ink,'KTD '+person.tattoos+' neck tattoo');
    const fore=model.getObjectByName('RightForeArm'),wrist=bonePoint(model,'RightHand');if(fore&&wrist){const marks=[];for(let i=0;i<3;i++){const ring=new THREE.TorusGeometry(.027,.0017,4,14);ring.rotateY(Math.PI/2);ring.translate(wrist.x+(i*.009+.028),wrist.y,wrist.z);marks.push(ring);}attachGeometry(model,fore,mergePieces(marks),ink,'KTD '+person.tattoos+' wrist tattoo');}
  }
}

export function applyAppearance(model, person, role = 'civilian', cache = irisCache) {
  if (!person || role !== 'civilian') return;
  model.updateMatrixWorld(true);
  const leases=model.userData.appearanceTextureLeases=new Set();
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
  accessories(model,person,skin,find('Glasses'));
}

export function disposeAppearance(model) {
  if(!model)return;
  const leases=model.userData.appearanceTextureLeases;
  if(leases){for(const entry of leases){entry.users=Math.max(0,entry.users-1);trimIrisCache(entry.cache);}leases.clear();delete model.userData.appearanceTextureLeases;}
  const geometries=new Set(),materials=new Set(),remove=[];
  model.traverse(object=>{if(object.userData.appearanceOwned){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])if(material)materials.add(material);remove.push(object);}else if(object.userData.appearanceGeometryOwned){geometries.add(object.geometry);delete object.userData.appearanceGeometryOwned;}});
  for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const object of remove)object.removeFromParent();
}

// Generated iris atlases are shared by avatars and portraits. Clear only after
// every wearer has been disposed, when unloading the complete character set.
export function disposeAppearanceCache(cache = irisCache) {
  for(const [key,entry] of cache)if(entry.users===0){entry.texture.dispose();cache.delete(key);}
}
