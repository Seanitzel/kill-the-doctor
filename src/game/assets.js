import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
const geometries = {
  box: new THREE.BoxGeometry(1, 1, 1), sphere: new THREE.SphereGeometry(1, 16, 12),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12), capsule: new THREE.CapsuleGeometry(.5, 1, 5, 12),
};
export function material(color, options = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .72, ...options }); }
function texture(draw, size = 512) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size); const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function hospitalMaterials() {
  const floorTexture = texture((ctx, s) => {
    ctx.fillStyle = '#a5b2ba'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 14000; i++) { const a = Math.random() * .045; ctx.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '20,40,50'},${a})`; ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
    for (let i = 0; i <= 4; i++) { ctx.strokeStyle = '#7f909b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(i * s / 4, 0); ctx.lineTo(i * s / 4, s); ctx.moveTo(0, i * s / 4); ctx.lineTo(s, i * s / 4); ctx.stroke(); }
  });
  const ceilingTexture = texture((ctx, s) => {
    ctx.fillStyle = '#adb9c0'; ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { ctx.fillStyle = '#c9d0d3'; ctx.fillRect(x * s / 4 + 2, y * s / 4 + 2, s / 4 - 4, s / 4 - 4); }
    for (let i = 0; i < 6000; i++) { ctx.fillStyle = 'rgba(60,80,90,.06)'; ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1); }
  });
  return {
    wall: material('#d6e0e5'), ceiling: material('#dce4e9', { map: ceilingTexture }), floor: material('#dce5e9', { map: floorTexture, roughness: .32, metalness: .12 }),
    blue: material('#355e77'), stripe: material('#52768a'), trim: material('#253e4b'), steel: material('#8b9aa4', { metalness: .72, roughness: .29 }),
    white: material('#edf1f2'), linen: material('#dce5e8', { roughness: .95 }), dark: material('#192e3c'), black: material('#152029'),
    chair: material('#284353'), wood: material('#74838d'), monitor: material('#112f44', { emissive: '#367d9d', emissiveIntensity: .35 }),
    light: material('#e7f6ff', { emissive: '#b9dcff', emissiveIntensity: 1.5 }),
    glass: material('#92c5dd', { transparent: true, opacity: .18, roughness: .13, metalness: .15, depthWrite: false }),
    red: material('#aa4344', { emissive: '#501010', emissiveIntensity: .1 }), green: material('#609ea4', { emissive: '#20474a', emissiveIntensity: .3 }),
  };
}
export class Batcher {
  constructor(group) { this.group = group; this.buckets = new Map(); }
  add(kind, mat, x, y, z, sx, sy, sz, ry = 0, rz = 0) {
    const id = `${kind}-${mat.uuid}`; let bucket = this.buckets.get(id);
    if (!bucket) { bucket = { geometry: geometries[kind], material: mat, matrices: [] }; this.buckets.set(id, bucket); }
    const o = new THREE.Object3D(); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(0, ry, rz); o.updateMatrix(); bucket.matrices.push(o.matrix);
  }
  box(...args) { this.add('box', ...args); }
  cylinder(...args) { this.add('cylinder', ...args); }
  sphere(...args) { this.add('sphere', ...args); }
  finish() {
    const meshes = [];
    for (const bucket of this.buckets.values()) {
      const mesh = new THREE.InstancedMesh(bucket.geometry, bucket.material, bucket.matrices.length);
      bucket.matrices.forEach((m, i) => mesh.setMatrixAt(i, m)); mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); this.group.add(mesh); meshes.push(mesh);
    }
    return meshes;
  }
}
export function mesh(kind, mat, size, pos, parent) {
  const m = new THREE.Mesh(geometries[kind], mat); m.scale.set(...size); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; parent?.add(m); return m;
}
export function sign(text, subtitle, width = 2.6, height = .65, options = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = Math.round(1024 * height / width);
  const ctx = canvas.getContext('2d'); ctx.fillStyle = options.background || '#21485f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#b7d5e8'; ctx.fillRect(0, 0, 9, canvas.height);
  ctx.textBaseline = 'middle'; ctx.fillStyle = options.color || '#eef7fd'; ctx.font = `600 ${subtitle ? 68 : 85}px Arial`; ctx.fillText(text, 48, subtitle ? canvas.height * .35 : canvas.height / 2, 925);
  if (subtitle) { ctx.font = '400 38px Arial'; ctx.fillStyle = '#afd1e5'; ctx.fillText(subtitle, 50, canvas.height * .73, 920); }
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: .6, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: .12, side: THREE.DoubleSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}
export function bed(b, m, x, z, rot = 0, patient = false) {
  const p = (a, c) => [x + Math.cos(rot) * a + Math.sin(rot) * c, z - Math.sin(rot) * a + Math.cos(rot) * c];
  const box = (mat, a, y, c, sx, sy, sz) => { const [px, pz] = p(a, c); b.box(mat, px, y, pz, sx, sy, sz, rot); };
  box(m.steel, 0, .55, 0, 1.1, .18, 2.2); box(m.linen, 0, .78, 0, 1.02, .24, 2.12);
  box(m.white, 0, .92, -.77, .69, .17, .4); box(m.blue, 0, .93, .26, 1.04, .055, 1.2);
  for (const side of [-.59, .59]) { box(m.steel, side, 1.03, .18, .045, .07, 1.55); for (const zz of [-.5, .8]) box(m.steel, side, .83, zz, .045, .44, .045); }
  for (const zz of [-1.05, 1.05]) { box(m.white, 0, .9, zz, 1.17, .47, .07); box(m.steel, 0, 1.17, zz, 1.17, .045, .1); }
  for (const side of [-.45, .45]) for (const zz of [-.8, .8]) { box(m.steel, side, .35, zz, .06, .45, .06); const [px, pz] = p(side, zz); b.sphere(m.dark, px, .13, pz, .09, .09, .09); }
  if (patient) { const [px, pz] = p(0, -.64); b.sphere(material('#bd9478'), px, 1.01, pz, .16, .15, .2); box(m.linen, 0, 1.03, .2, .67, .18, 1.16); }
}
export function chair(b, m, x, z, rot = 0) {
  const p = (a, c) => [x + Math.cos(rot) * a + Math.sin(rot) * c, z - Math.sin(rot) * a + Math.cos(rot) * c];
  const box = (mat, a, y, c, sx, sy, sz) => { const [px, pz] = p(a, c); b.box(mat, px, y, pz, sx, sy, sz, rot); };
  box(m.chair, 0, .47, 0, .65, .09, .6); box(m.chair, 0, .82, -.27, .65, .65, .07);
  for (const a of [-.26, .26]) for (const c of [-.22, .22]) box(m.steel, a, .25, c, .035, .46, .035);
  for (const a of [-.35, .35]) { box(m.dark, a, .68, 0, .065, .05, .52); box(m.steel, a, .56, .1, .035, .22, .035); }
}
export function desk(b, m, x, z, rot = 0) {
  b.box(m.white, x, .85, z, 2.3, .09, .9, rot); b.box(m.blue, x, .42, z, 2.1, .78, .8, rot);
  b.box(m.dark, x, 1.22, z, .62, .4, .07, rot); b.box(m.monitor, x, 1.22, z + .045, .54, .32, .01, rot);
  b.box(m.steel, x, 1, z, .05, .18, .05); b.box(m.dark, x, .92, z + .3, .55, .03, .19, rot);
}
export function monitor(b, m, x, z) {
  b.box(m.steel, x, .9, z, .04, 1.6, .04); b.box(m.dark, x, 1.6, z, .58, .38, .12); b.box(m.monitor, x, 1.6, z + .07, .5, .31, .015);
  b.box(m.steel, x, .12, z, .5, .045, .5);
}
export function portrait(person) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
  ctx.fillStyle = '#bdd0db'; ctx.fillRect(0, 0, 256, 256);
  const gradient = ctx.createLinearGradient(0, 0, 256, 256); gradient.addColorStop(0, '#e3eef3'); gradient.addColorStop(1, '#7e9eaf'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = person.accent || '#375367'; ctx.beginPath(); ctx.ellipse(128, 253, 93, 87, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9eeee'; ctx.beginPath(); ctx.moveTo(69, 192); ctx.lineTo(90, 174); ctx.lineTo(118, 254); ctx.lineTo(59, 256); ctx.fill(); ctx.beginPath(); ctx.moveTo(187, 192); ctx.lineTo(166, 174); ctx.lineTo(138, 254); ctx.lineTo(201, 256); ctx.fill();
  ctx.fillStyle = person.skin || '#d2a080'; ctx.fillRect(110, 156, 36, 42);
  ctx.fillStyle = person.hair || '#322721'; ctx.beginPath(); ctx.ellipse(128, 107, 52, person.gender === 'female' ? 73 : 58, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = person.skin || '#d2a080'; ctx.beginPath(); ctx.ellipse(128, 119, 44, 57, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = person.hair || '#322721'; ctx.beginPath(); ctx.ellipse(124, 74, 46, 25, -.12, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#45362f'; ctx.fillRect(100, 113, 15, 4); ctx.fillRect(142, 113, 15, 4);
  ctx.fillStyle = '#182b36'; ctx.beginPath(); ctx.arc(109, 123, 3, 0, Math.PI * 2); ctx.arc(149, 123, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#926c59'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(129, 127); ctx.lineTo(124, 144); ctx.lineTo(134, 144); ctx.stroke();
  ctx.strokeStyle = '#835249'; ctx.beginPath(); ctx.moveTo(114, 157); ctx.quadraticCurveTo(128, 162, 142, 157); ctx.stroke();
  if (person.glasses) { ctx.strokeStyle = '#1b2c37'; ctx.lineWidth = 4; ctx.strokeRect(91, 116, 31, 18); ctx.strokeRect(135, 116, 31, 18); ctx.beginPath(); ctx.moveTo(122, 123); ctx.lineTo(135, 123); ctx.stroke(); }
  ctx.fillStyle = 'rgba(13,37,54,.1)'; ctx.fillRect(0, 0, 256, 256); return c.toDataURL();
}
export function makeHuman(person, role = 'doctor') {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = material(person.skin || '#c79776'); const hair = material(person.hair || '#2b2725');
  const outfit = material(role === 'patient' ? '#8098a2' : role === 'security' || role === 'police' ? '#263c51' : person.accent || '#568195');
  const coat = material(role === 'doctor' ? '#dde3e2' : outfit.color);
  const pants = material(role === 'patient' ? '#a1b2b8' : '#324654'); const shoes = material('#15212a');
  const torso = mesh('capsule', coat, [.54, .42, .32], [0, 1.15, 0], body); // capsule base height = 2
  const head = mesh('sphere', skin, [.155, .215, .17], [0, 1.77, 0], body);
  mesh('cylinder', skin, [.065, .15, .065], [0, 1.54, 0], body);
  mesh('sphere', hair, [.162, .12, .18], [0, 1.89, -.016], body);
  if (person.gender === 'female') { mesh('sphere', hair, [.13, .19, .12], [0, 1.77, -.13], body); mesh('sphere', hair, [.1, .1, .13], [0, 1.68, -.24], body); }
  for (const side of [-1, 1]) {
    mesh('sphere', skin, [.035, .061, .035], [side * .153, 1.77, 0], body);
    mesh('sphere', material('#2d2824'), [.015, .011, .012], [side * .055, 1.8, .159], body);
    if (person.glasses) { const glass = mesh('box', material('#203441'), [.075, .052, .016], [side * .054, 1.795, .17], body); mesh('box', material('#92b6ca', { transparent: true, opacity: .5 }), [.056, .035, .018], [side * .054, 1.795, .183], body); }
  }
  mesh('sphere', skin, [.027, .035, .037], [0, 1.76, .167], body);
  mesh('box', material('#956e60'), [.065, .009, .012], [0, 1.69, .156], body);
  if (role === 'doctor') {
    mesh('box', outfit, [.15, .48, .03], [0, 1.16, .175], body);
    mesh('box', material('#cbd9df'), [.11, .1, .03], [.16, 1.27, .2], body);
    mesh('box', material('#456c84'), [.065, .03, .04], [.16, 1.28, .219], body);
    mesh('box', material('#324552'), [.014, .25, .02], [-.14, 1.39, .184], body);
  }
  const limbs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .31, 1.43, 0); body.add(arm);
    mesh('capsule', coat, [.15, .27, .16], [0, -.26, 0], arm); mesh('sphere', skin, [.068, .10, .065], [0, -.56, 0], arm);
    const leg = new THREE.Group(); leg.position.set(side * .15, .82, 0); body.add(leg);
    mesh('capsule', pants, [.21, .34, .22], [0, -.36, 0], leg); mesh('box', shoes, [.22, .13, .35], [0, -.75, .055], leg);
    limbs.push({ arm, leg, side });
  }
  return { root, body, limbs, animate(time, speed) {
    const swing = Math.sin(time * (speed > 3 ? 10 : 6)) * Math.min(.65, speed * .16);
    for (const l of limbs) { l.arm.rotation.x = swing * l.side; l.leg.rotation.x = -swing * l.side; }
    body.position.y = speed > .1 ? Math.abs(Math.sin(time * 6)) * .025 : Math.sin(time * 1.8) * .005;
  } };
}
export async function loadCharacters() {
  const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const results = await Promise.allSettled([
    gltfLoader.loadAsync('/models/adrian.glb'), gltfLoader.loadAsync('/models/alex.glb'),
    new FBXLoader().loadAsync('/models/idle.fbx'), new FBXLoader().loadAsync('/models/walk.fbx'), new FBXLoader().loadAsync('/models/run.fbx'),
  ]);
  const male = results[0].status === 'fulfilled' ? results[0].value.scene : null;
  const female = results[1].status === 'fulfilled' ? results[1].value.scene : null;
  const animations = {}, sources = {};
  ['Idle', 'Walk', 'Run'].forEach((name, i) => { if (results[i + 2].status === 'fulfilled') { animations[name] = results[i + 2].value.animations[0]; sources[name] = results[i + 2].value; } });
  return { male, female, animations, sources, clipCache: {} };
}
export function makePlayer(assets, gender, person = null, role = 'civilian') {
  const source = assets?.[gender];
  if (!source) return makeHuman(person || { gender, accent: '#2d3f4a', hair: '#312b26', skin: '#ca9b7a' }, role);
  const model = clone(source); const root = new THREE.Group(); root.add(model);
  const bound = new THREE.Box3().setFromObject(model); const height = bound.max.y - bound.min.y;
  const scale = 1.82 / height; model.scale.setScalar(scale); model.position.y = -bound.min.y * scale;
  model.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      if (o.material) {
        o.material = o.material.clone(); o.material.roughness = .88; o.material.metalness = 0;
        const name = o.material.name;
        if (person) {
          if (name.includes('Outfit_Top')) { const color = role === 'doctor' ? '#d9e4ea' : ['security','police'].includes(role) ? '#344b62' : person.accent || '#718e9c'; o.material.map = recolorCloth(o.material.map, color); o.material.color.set('#ffffff'); }
          if (name.includes('Outfit_Bottom')) { o.material.map = recolorCloth(o.material.map, role === 'patient' ? '#acbcc4' : '#455b70'); o.material.color.set('#ffffff'); }
          if (name.includes('Hair')) o.material.color.set(person.hair || '#3b302c');
          if (name.includes('Skin') || name.includes('Body')) o.material.color.set(person.skin || '#e0ad87');
          if (name.includes('Glasses')) o.visible = !!person.glasses;
        } else if (name.includes('Outfit_Top')) o.material.color.set(gender === 'male' ? '#667683' : '#697b88');
        if (name.includes('Outfit_Footwear')) o.material.color.set('#4a5b66');
      }
    }
  });
  const mixer = new THREE.AnimationMixer(model); const actions = {};
  for (const name of ['Idle', 'Walk', 'Run']) {
    const clip = assets.animations[name];
    if (clip) {
      const cacheKey = `${gender}-${name}`;
      if (!assets.clipCache[cacheKey]) assets.clipCache[cacheKey] = retargetBaked(assets.sources[name], clip, source, name);
      actions[name] = mixer.clipAction(assets.clipCache[cacheKey]);
    }
  }
  let current = '', aim = false;
  const arms = ['Right','Left'].map(side => { const arm = model.getObjectByName(`${side}Arm`), fore = model.getObjectByName(`${side}ForeArm`); if (!arm || !fore) return null; const direction = new THREE.Vector3(side === 'Right' ? .03 : -.1, -.1, .4).normalize(); return { arm, q: new THREE.Quaternion().setFromUnitVectors(fore.position.clone().normalize(), direction) }; }).filter(Boolean);
  if (person && !['security','police','patient'].includes(role)) {
    const badge = mesh('box', material('#dcebf2'), [.095,.13,.012], [.14,1.28,.21], root);
    mesh('box', material(person.accent || '#5288a2'), [.07,.03,.016], [.14,1.31,.22], root);
  }
  return { root, model, mixer, setAim(value) { aim = value; }, hand: model.getObjectByName('RightHand'), animate(time, speed, dt) {
    const next = speed > 3.7 ? 'Run' : speed > .15 ? 'Walk' : 'Idle';
    if (next !== current && actions[next]) { actions[current]?.fadeOut(.18); actions[next].reset().fadeIn(.18).play(); current = next; }
    if (actions[next]) actions[next].timeScale = speed > .15 ? Math.max(.65, speed / (next === 'Run' ? 5.4 : 2.5)) : 1;
    mixer.update(dt);
    if (aim) for (const item of arms) item.arm.quaternion.copy(item.q);
  } };
}
export function renderPortrait(renderer, assets, person, role = 'doctor') {
  const subject = makePlayer(assets, person.gender || 'male', person, role);
  subject.animate(0, 0, 0.1);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#7293a8'); scene.add(subject.root);
  scene.add(new THREE.HemisphereLight('#e5f3ff', '#6b7a89', 2.5));
  const key = new THREE.DirectionalLight('#fff4e7', 3); key.position.set(2, 3, 4); scene.add(key);
  const fill = new THREE.DirectionalLight('#b8dcfa', 1.5); fill.position.set(-3, 2, 2); scene.add(fill);
  const camera = new THREE.PerspectiveCamera(30, 1, .01, 10); camera.position.set(0, 1.56, 1.02); camera.lookAt(0, 1.56, 0);
  const size = renderer.getSize(new THREE.Vector2()); const ratio = renderer.getPixelRatio();
  renderer.setPixelRatio(1); renderer.setSize(256, 256, false); renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png'); renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false);
  return url;
}

function retargetBaked(sourceModel, sourceClip, targetModel, name) {
  // RPM has baked bind rotations; FBX has oriented joints. Convert through world
  // bind space, then back to each target joint's parent space.
  const source = clone(sourceModel), target = clone(targetModel);
  source.updateMatrixWorld(true); target.updateMatrixWorld(true);
  const sourceBones = new Map(), targetBones = [];
  source.traverse(b => { if (b.isBone) sourceBones.set(b.name.replace(/mixamorig:?/g, ''), b); });
  target.traverse(b => { if (b.isBone && sourceBones.has(b.name)) targetBones.push(b); });
  const bindSource = new Map(), bindTarget = new Map();
  for (const b of targetBones) { bindSource.set(b.name, sourceBones.get(b.name).getWorldQuaternion(new THREE.Quaternion()).invert()); bindTarget.set(b.name, b.getWorldQuaternion(new THREE.Quaternion())); }
  const times = [], values = new Map(targetBones.map(b => [b.name, []]));
  const mixer = new THREE.AnimationMixer(source); mixer.clipAction(sourceClip).play();
  const frames = Math.ceil(sourceClip.duration * 24);
  for (let i = 0; i <= frames; i++) {
    const time = Math.min(sourceClip.duration - .000001, i / 24); times.push(time); mixer.setTime(time); source.updateMatrixWorld(true);
    const posedWorld = new Map();
    for (const b of targetBones) {
      const worldQ = sourceBones.get(b.name).getWorldQuaternion(new THREE.Quaternion()).multiply(bindSource.get(b.name)).multiply(bindTarget.get(b.name)); posedWorld.set(b.name, worldQ);
    }
    for (const b of targetBones) {
      const parentWorld = posedWorld.get(b.parent?.name) || b.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion();
      const local = parentWorld.clone().invert().multiply(posedWorld.get(b.name)); values.get(b.name).push(local.x, local.y, local.z, local.w);
    }
  }
  mixer.stopAllAction(); mixer.uncacheRoot(source);
  return new THREE.AnimationClip(name, sourceClip.duration, targetBones.map(b => new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, values.get(b.name))));
}

const clothCache = new Map();
function recolorCloth(source, hex) {
  if (!source?.image) return source;
  const key = `${source.uuid}:${hex}`; if (clothCache.has(key)) return clothCache.get(key);
  const image = source.image, canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height); const d = pixels.data;
  const base = new THREE.Color(hex); const rgb = [base.r, base.g, base.b].map(v => Math.round(THREE.MathUtils.clamp(v,0,1)*255));
  for (let i=0;i<d.length;i+=4) { const lum = (d[i]+d[i+1]+d[i+2])/765; const shade = .68 + lum * .32; d[i]=rgb[0]*shade;d[i+1]=rgb[1]*shade;d[i+2]=rgb[2]*shade; }
  ctx.putImageData(pixels, 0, 0); const t = new THREE.CanvasTexture(canvas); t.flipY = source.flipY; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = source.wrapS; t.wrapT = source.wrapT; clothCache.set(key,t);return t;
}
