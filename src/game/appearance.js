import * as THREE from 'three';

export const OUTFIT_STYLES = ['casual', 'jacket', 'tactical'];
export const HAIRSTYLES = ['original', 'cropped', 'ponytail'];
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
  const dark = clothMaterial(style === 'jacket' ? accent : '#283d48');
  const trim = clothMaterial(style === 'jacket' ? '#29353e' : '#536a72');
  if (style === 'jacket') {
    const zip = clothMaterial('#a5b7bf', { metalness: .6, roughness: .4 });
    reshape(top, model, p => { if (Math.abs(p.x) < .24) { p.x *= 1.055; p.z = (p.z - .02) * 1.06 + .02; if (p.y < waist + .11) p.y -= .035; } });
    for (const sign of [-1, 1]) {
      fittedPanel(model, chest, [[sign*.105, shoulder+.025],[sign*.04,shoulder+.005],[sign*.012,shoulder-.19],[sign*.095,shoulder-.085]], front, trim, 'KTD jacket lapel');
      fittedPanel(model, spine, [[sign*.055,waist+.13],[sign*.15,waist+.15],[sign*.15,waist+.06],[sign*.055,waist+.045]], front, dark, 'KTD jacket pocket');
    }
    fittedPanel(model, spine, [[-.004,waist],[.004,waist],[.004,shoulder-.18],[-.004,shoulder-.18]], front, zip, 'KTD jacket zipper');
    fittedPanel(model, spine, [[-.17,waist-.023],[.17,waist-.023],[.17,waist+.012],[-.17,waist+.012]], back, trim, 'KTD jacket back hem', true);
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
  const top = headBox.max.y, factor = hairstyle === 'cropped' ? .57 : .73;
  reshape(hair, model, p => {
    p.y = top + .018 - (hairBox.max.y - p.y) * factor;
    p.x *= hairstyle === 'cropped' ? .93 : .96;
    p.z = headBox.min.z + (p.z - hairBox.min.z) * (hairstyle === 'cropped' ? .84 : .9) - .008;
  });
  if (hairstyle !== 'ponytail') return;
  const start = new THREE.Vector3(0, top-.105, headBox.min.z-.008);
  const path = new THREE.CatmullRomCurve3([start, start.clone().add(new THREE.Vector3(0,-.025,-.065)),start.clone().add(new THREE.Vector3(.012,-.13,-.103)),start.clone().add(new THREE.Vector3(.018,-.255,-.073))]);
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
  if(top && ['jacket','tactical'].includes(person.outfit))fitOutfit(model,top,person.outfit,person.accent || '#526778');
  const hair=find('Hair'), skin=find('Skin');
  if(hair && ['cropped','ponytail'].includes(person.hairstyle))fitHair(model,hair,skin,person.hairstyle,person.hair || '#342b25');
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
