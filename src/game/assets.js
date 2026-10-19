import { assetUrl } from './asset-url.js';
import {applyAppearance,disposeAppearance,disposeAppearanceCache,NURSE_UNIFORM,staffBadgeTexture} from './appearance.js';
import {animationFootfalls} from './movement.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
const geometries = {
  box: new THREE.BoxGeometry(1, 1, 1), sphere: new THREE.SphereGeometry(1, 16, 12),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12), capsule: new THREE.CapsuleGeometry(.5, 1, 5, 12),
};
Object.values(geometries).forEach(geometry=>{geometry.userData.sharedPrimitive=true;});
// BufferGeometry.dispose releases renderer listeners/buffers, while retaining its
// CPU attributes. Another live renderer can upload this small pool again.
export function releasePrimitiveBuffers(){for(const geometry of Object.values(geometries))geometry.dispose();}

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
    return { bucket, index: bucket.matrices.length - 1 };
  }
  box(...args) { return this.add('box', ...args); }
  cylinder(...args) { this.add('cylinder', ...args); }
  sphere(...args) { this.add('sphere', ...args); }
  finish() {
    const meshes = [];
    for (const bucket of this.buckets.values()) {
      const mesh = new THREE.InstancedMesh(bucket.geometry, bucket.material, bucket.matrices.length);
      bucket.mesh = mesh; bucket.matrices.forEach((m, i) => mesh.setMatrixAt(i, m)); mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); this.group.add(mesh); meshes.push(mesh);
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
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: .6, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: .12, side: THREE.FrontSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}
export function bed(b,m,x,z,rot=0,patient=false) {
  b.collider?.(x,z,1.3,2.35,1.25,rot,'bed');
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
  b.collider?.(x,z,.8,.76,1.18,rot,'chair');
  const p = (a, c) => [x + Math.cos(rot) * a + Math.sin(rot) * c, z - Math.sin(rot) * a + Math.cos(rot) * c];
  const box = (mat, a, y, c, sx, sy, sz) => { const [px, pz] = p(a, c); b.box(mat, px, y, pz, sx, sy, sz, rot); };
  box(m.chair, 0, .47, 0, .65, .09, .6); box(m.chair, 0, .82, -.27, .65, .65, .07);
  for (const a of [-.26, .26]) for (const c of [-.22, .22]) box(m.steel, a, .25, c, .035, .46, .035);
  for (const a of [-.35, .35]) { box(m.dark, a, .68, 0, .065, .05, .52); box(m.steel, a, .56, .1, .035, .22, .035); }
}
export function desk(b, m, x, z, rot = 0) {
  b.collider?.(x,z,2.3,.95,1.45,rot,'desk');
  b.box(m.white, x, .85, z, 2.3, .09, .9, rot); b.box(m.blue, x, .42, z, 2.1, .78, .8, rot);
  b.box(m.dark, x, 1.22, z, .62, .4, .07, rot); b.box(m.monitor, x, 1.22, z + .045, .54, .32, .01, rot);
  b.box(m.steel, x, 1, z, .05, .18, .05); b.box(m.dark, x, .92, z + .3, .55, .03, .19, rot);
}
export function monitor(b, m, x, z) {
  b.collider?.(x,z,.55,.55,1.8,0,'monitor');
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
  const outfit = material(role === 'nurse' ? '#9bcce6' : role === 'patient' ? '#8098a2' : role === 'security' || role === 'police' ? '#263c51' : person.accent || '#568195');
  const coat = material(role === 'doctor' ? '#dde3e2' : outfit.color);
  const pants = material(role==='nurse'?'#9bcce6':role === 'patient' ? '#a1b2b8' : '#324654'); const shoes = material('#15212a');
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
  if(role==='nurse'){
    const card=new THREE.Mesh(new THREE.PlaneGeometry(.115,.067),material('#ffffff',{map:staffBadgeTexture(person)}));card.position.set(.12,1.28,.167);card.name='KTD nurse name badge';card.userData.appearanceOwned=true;card.userData.appearanceOwnedTexture=true;card.userData.staffName=person.name||'Nhalewick nurse';card.userData.staffRole='NURSE';body.add(card);
  }
  const limbs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .31, 1.43, 0); body.add(arm);
    if(role==='nurse'){mesh('capsule',coat,[.16,.12,.17],[0,-.12,0],arm);mesh('capsule',skin,[.11,.16,.12],[0,-.36,0],arm);}else mesh('capsule', coat, [.15, .27, .16], [0, -.26, 0], arm); mesh('sphere', skin, [.068, .10, .065], [0, -.56, 0], arm);
    const leg = new THREE.Group(); leg.position.set(side * .15, .82, 0); body.add(leg);
    mesh('capsule', pants, [.21, .34, .22], [0, -.36, 0], leg); mesh('box', shoes, [.22, .13, .35], [0, -.75, .055], leg);
    limbs.push({ arm, leg, side });
  }
  return { root, body, limbs, dispose: avatarDisposer(root,{model:body}), animate(time, speed) {
    const swing = Math.sin(time * (speed > 3 ? 10 : 6)) * Math.min(.65, speed * .16);
    for (const l of limbs) { l.arm.rotation.x = swing * l.side; l.leg.rotation.x = -swing * l.side; }
    body.position.y = speed > .1 ? Math.abs(Math.sin(time * 6)) * .025 : Math.sin(time * 1.8) * .005;
  } };
}
export async function loadCharacters({textureLimit=1024,clothTextureLimit=512}={}) {
  const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const results = await Promise.allSettled([
    gltfLoader.loadAsync(assetUrl('models/adrian.glb')), gltfLoader.loadAsync(assetUrl('models/alex.glb')),
    new FBXLoader().loadAsync(assetUrl('models/idle.fbx')), new FBXLoader().loadAsync(assetUrl('models/walk.fbx')), new FBXLoader().loadAsync(assetUrl('models/run.fbx')),
  ]);
  const male = results[0].status === 'fulfilled' ? results[0].value.scene : null;
  const female = results[1].status === 'fulfilled' ? results[1].value.scene : null;
  const animations = {}, sources = {};
  ['Idle', 'Walk', 'Run'].forEach((name, i) => { if (results[i + 2].status === 'fulfilled') { animations[name] = results[i + 2].value.animations[0]; sources[name] = results[i + 2].value; } });
  const assets={male,female,animations,sources,clipCache:{},clothCache:new Map(),appearanceCache:new Map(),clothTextureLimit:Math.min(512,Math.max(64,clothTextureLimit))};
  downsizeCharacterTextures(assets,textureLimit);
  return assets;
}
// Separate enter/leave speeds prevent a noisy collision-limited speed from
// resetting Walk/Run on alternate frames. A stop still selects Idle immediately.
export function locomotionForSpeed(speed,current='Idle') {
  if(!Number.isFinite(speed)||speed<=(current==='Idle'?.18:.12))return 'Idle';
  return speed>(current==='Run'?3.55:3.85)?'Run':'Walk';
}
export function makePlayer(assets, gender, person = null, role = 'civilian') {
  const source = assets?.[gender];
  if (!source) return makeHuman(person || { gender, accent: '#2d3f4a', hair: '#312b26', skin: '#ca9b7a' }, role);
  const model = clone(source); const root = new THREE.Group(); root.add(model);
  const bound = new THREE.Box3().setFromObject(model); const height = bound.max.y - bound.min.y;
  const scale = 1.82 / height; model.scale.setScalar(scale); model.position.y = -bound.min.y * scale;
  const clothLeases=new Set();
  model.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;o.frustumCulled=false;
      if (o.material) {
        o.material = o.material.clone();if(/Body|Skin|Outfit/.test(o.material.name))o.material.side=THREE.DoubleSide; o.material.roughness = .88; o.material.metalness = 0;
        const name = o.material.name;
        if (person) {
          if (name.includes('Outfit_Top')) { const color = role === 'nurse' ? NURSE_UNIFORM : role === 'doctor' ? '#d9e4ea' : ['security','police'].includes(role) ? '#344b62' : person.accent || '#718e9c'; o.material.map = recolorCloth(o.material.map,color,assets,clothLeases); o.material.color.set('#ffffff'); }
          if (name.includes('Outfit_Bottom')) { o.material.map = recolorCloth(o.material.map,role === 'nurse' ? NURSE_UNIFORM : role === 'patient' ? '#acbcc4' : role==='civilian'&&person.outfit==='suit' ? person.accent||'#485766' : '#455b70',assets,clothLeases); o.material.color.set('#ffffff'); }
          if (name.includes('Hair')) o.material.color.set(person.hair || '#3b302c');
          if (name.includes('Skin') || name.includes('Body')) o.material.color.set(person.skin || '#e0ad87');
          if (name.includes('Glasses')) o.visible = !!person.glasses;
        } else if (name.includes('Outfit_Top')) o.material.color.set(gender === 'male' ? '#667683' : '#697b88');
        if (name.includes('Outfit_Footwear')) o.material.color.set('#4a5b66');
      }
    }
  });
  applyAppearance(model,person,role,assets.appearanceCache);model.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
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
  if (person && role==='doctor') {
    const badge = mesh('box', material('#dcebf2'), [.095,.13,.012], [.14,1.28,.21], root);
    mesh('box', material(person.accent || '#5288a2'), [.07,.03,.016], [.14,1.31,.22], root);
  }
  const activityBones = {}; model.traverse(b => { if (b.isBone) activityBones[b.name] = b; });
  const orient = (name, child, direction) => {
    const bone=activityBones[name], tip=activityBones[child]; if(!bone || !tip) return;
    const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const modelWorld=model.getWorldQuaternion(new THREE.Quaternion());
    const relative=modelWorld.invert().multiply(parent);
    const rotation=new THREE.Quaternion().setFromUnitVectors(tip.position.clone().normalize(),new THREE.Vector3(...direction).normalize());
    bone.quaternion.copy(relative.invert().multiply(rotation));bone.updateMatrixWorld(true);
  };
  const pointInModel=bone=>model.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
  const reachHead=(time,offset=new THREE.Vector3(-.085,.055,.025))=>{
    const shoulder=activityBones.RightArm,elbow=activityBones.RightForeArm,hand=activityBones.RightHand,head=activityBones.Head;
    if(!shoulder||!elbow||!hand||!head)return;
    const start=pointInModel(shoulder),target=pointInModel(head).add(offset);
    // A small temple tap, with the elbow below and outside the hand. Solve the
    // two links rather than aiming a straight forearm through the face.
    target.x-=Math.max(0,Math.sin(time*7))*.018;
    const upper=elbow.position.length(),lower=hand.position.length(),toward=target.clone().sub(start),distance=Math.min(toward.length(),upper+lower-.002);
    toward.normalize();const bend=new THREE.Vector3(-1,-.4,.12).addScaledVector(toward,-new THREE.Vector3(-1,-.4,.12).dot(toward)).normalize();
    const along=(upper*upper-lower*lower+distance*distance)/(2*distance),out=Math.sqrt(Math.max(0,upper*upper-along*along));
    const elbowTarget=start.clone().addScaledVector(toward,along).addScaledVector(bend,out);
    orient('RightArm','RightForeArm',elbowTarget.sub(start).toArray());
    orient('RightForeArm','RightHand',target.sub(pointInModel(elbow)).toArray());
  };
  return { root, model, mixer, dispose:avatarDisposer(root,{model,mixer,clothLeases}), head: activityBones.Head, setAim(value) { aim = value; }, hand: model.getObjectByName('RightHand'), animate(time, speed, dt) {
    const next = locomotionForSpeed(speed,current);
    if (next !== current && actions[next]) { actions[current]?.fadeOut(.18); actions[next].reset().fadeIn(.18).play(); current = next; }
    if (actions[next]) actions[next].timeScale = speed > .15 ? Math.max(.24, speed / (next === 'Run' ? 5.4 : 2.5)) : 1;
    const action=actions[next],footfalls=speed>.15&&action?animationFootfalls(action.time,dt,action.timeScale,action.getClip().duration):0;
    mixer.update(dt);
    if (aim) for (const item of arms) item.arm.quaternion.copy(item.q);
    return {footfalls,animation:current};
  }, poseActivity(activity, time, { seated=false, reaction=0, look=0,restricted=false } = {}) {
    const b=activityBones;model.updateMatrixWorld(true);
    if(seated) for(const side of ['Left','Right']) { if(b[`${side}UpLeg`]) b[`${side}UpLeg`].quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2); if(b[`${side}Leg`]) b[`${side}Leg`].quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2); }
    if(b.Head) b.Head.rotation.y += look + Math.sin(time*.8)*.045;
    let mouth=0,brow=0,smile=0;
    const expressions=()=>model.traverse(o=>{if(o.morphTargetDictionary)for(const [name,index]of Object.entries(o.morphTargetDictionary)){
      if(/jawOpen|mouthOpen/i.test(name))o.morphTargetInfluences[index]=mouth;
      else if(/browInnerUp/i.test(name))o.morphTargetInfluences[index]=brow;
      else if(/mouthSmile/i.test(name))o.morphTargetInfluences[index]=smile;
    }});
    // Keep the safe idle/walk arms when a nearby wall or door leaves no room to gesture.
    if(restricted){expressions();return;}
    if(b.Spine) b.Spine.rotation.x += activity==='examine' ? .15 : activity==='labor' ? Math.sin(time*2.6)*.05 : 0;
    if(reaction>0) {
      orient('RightArm','RightForeArm',[.15,-.2,.6]); orient('RightForeArm','RightHand',[.1,.5,.3]);
      orient('LeftArm','LeftForeArm',[-.12,-.25,.5]); orient('LeftForeArm','LeftHand',[-.1,.3,.4]);
      if(b.Head) b.Head.rotation.x -= .10;
    } else if(['worried','panic','tremble','scream'].includes(activity)) {
      const panic=activity==='panic'||activity==='scream',tremble=Math.sin(time*(panic?19:13))*(panic?.045:.012);
      orient('RightArm','RightForeArm',[.12,-.35,.25]);orient('RightForeArm','RightHand',[-.05,.22+tremble,.32]);
      orient('LeftArm','LeftForeArm',[-.16,-.55,.07]);orient('LeftForeArm','LeftHand',[.02,-.12,.24]);
      if(b.Head){b.Head.rotation.y+=Math.sin(time*(panic?2.8:1.3))*(panic?.23:.10);b.Head.rotation.z+=tremble;b.Head.rotation.x-=panic?.07:.025;}
      if(b.Spine2)b.Spine2.rotation.x+=Math.sin(time*(panic?5.7:3.8))*(panic?.025:.008);
      if(activity==='scream'){mouth=.7;brow=.65;if(b.Head)b.Head.rotation.x-=.10;}
    } else if(activity==='headTap') {
      if(b.Head){b.Head.rotation.z-=.055;b.Head.rotation.x+=.04;}
      b.Head?.updateMatrixWorld(true);reachHead(time);
      orient('LeftArm','LeftForeArm',[-.12,-.6,.04]);orient('LeftForeArm','LeftHand',[.02,-.3,.1]);brow=.55;
    } else if(activity==='laugh') {
      const chuckle=Math.sin(time*9);
      orient('RightArm','RightForeArm',[.10,-.4,.12]);orient('RightForeArm','RightHand',[-.14,.14,.22]);
      orient('LeftArm','LeftForeArm',[-.12,-.5,.04]);orient('LeftForeArm','LeftHand',[.04,-.12,.18]);
      if(b.Spine2)b.Spine2.rotation.x+=.025+chuckle*.023;
      if(b.Head){b.Head.rotation.x-=.07+chuckle*.025;b.Head.rotation.z+=Math.sin(time*2)*.025;}
      mouth=.20+Math.max(0,chuckle)*.25;smile=.7;
    } else if(activity==='selftalk'||activity==='selfTalk') {
      const mutter=Math.sin(time*7);
      orient('RightArm','RightForeArm',[.08,-.45,.1]);orient('RightForeArm','RightHand',[-.02,.02,.2]);
      if(b.Head){b.Head.rotation.x+=.07;b.Head.rotation.y+=Math.sin(time*.8)*.13;}
      mouth=.05+Math.max(0,mutter)*.17;brow=.4;
    } else if(activity==='sneeze') {
      if(b.Head)b.Head.rotation.x+=.10;
      b.Head?.updateMatrixWorld(true);reachHead(time,new THREE.Vector3(-.018,.10,.145));
      orient('LeftArm','LeftForeArm',[-.12,-.6,.02]);brow=.3;mouth=.12;
    } else if(activity==='mobility') {
      // White-cane travel: measured pace, shortened stride and a stable forward grip.
      for(const name of ['LeftUpLeg','RightUpLeg','LeftLeg','RightLeg']){const bone=b[name];if(bone){bone.rotation.x*=.58;bone.rotation.z*=.45;}}
      orient('RightArm','RightForeArm',[.14,-.6,.18]);orient('RightForeArm','RightHand',[-.01,-.45,.28]);
      orient('LeftArm','LeftForeArm',[-.12,-.75,.03]);
      if(b.Spine2)b.Spine2.rotation.x+=.045;
    } else if(activity==='drink') {
      orient('RightArm','RightForeArm',[.12,-.33,.23]);orient('RightForeArm','RightHand',[-.04,.38,.18]);
      if(b.Head)b.Head.rotation.x-=.05;
    } else if(activity==='eat') {
      const bite=(Math.sin(time*1.25)+1)/2;
      orient('RightArm','RightForeArm',[.06,-.28,.4]); orient('RightForeArm','RightHand',[-.06,.1+bite*.45,.3-bite*.23]);
      orient('LeftArm','LeftForeArm',[-.13,-.25,.35]); orient('LeftForeArm','LeftHand',[.02,-.15,.45]);
    } else if(activity==='cpr') {
      orient('RightArm','RightForeArm',[.09,-.6,.35]);orient('RightForeArm','RightHand',[-.06,-.45,.28]);orient('LeftArm','LeftForeArm',[-.10,-.6,.35]);orient('LeftForeArm','LeftHand',[.05,-.45,.28]);if(b.Spine2)b.Spine2.rotation.x+=.5+Math.sin(time*6)*.06;if(b.Head)b.Head.rotation.x+=.2;
    } else if(activity==='examine') {
      orient('RightArm','RightForeArm',[.08,-.19,.65]); orient('RightForeArm','RightHand',[0,-.16,.75]);
      orient('LeftArm','LeftForeArm',[-.1,-.2,.4]); orient('LeftForeArm','LeftHand',[0,.05,.5]);
    } else if(activity==='labor') {
      orient('RightArm','RightForeArm',[.23,-.2,.2]); orient('RightForeArm','RightHand',[-.08,.22,.24]);
      orient('LeftArm','LeftForeArm',[-.23,-.2,.2]); orient('LeftForeArm','LeftHand',[.08,.22,.24]);
      if(b.Head) b.Head.rotation.z += Math.sin(time*2.4)*.055;
    } else if(activity==='chat') {
      const gesture=Math.sin(time*1.8)*.12;
      orient('RightArm','RightForeArm',[.15,-.45,.15]); orient('RightForeArm','RightHand',[.04,-.1+gesture,.4]);
    } else if(activity==='rest') {
      orient('RightArm','RightForeArm',[.15,-.6,.02]); orient('LeftArm','LeftForeArm',[-.15,-.6,.02]);
    }
    if(reaction){mouth=.4;brow=.4;}else if(activity==='labor'){mouth=.35+.15*Math.sin(time*2.4);brow=.5;}
    expressions();
  } };
}
const portraitBuffers=new WeakMap();
export function disposePortraitRenderer(renderer){const buffer=portraitBuffers.get(renderer);if(buffer){buffer.target.dispose();portraitBuffers.delete(renderer);}}
function portraitBuffer(renderer){
  let buffer=portraitBuffers.get(renderer);if(buffer)return buffer;
  const target=new THREE.WebGLRenderTarget(256,256,{depthBuffer:true,stencilBuffer:false});target.texture.colorSpace=THREE.SRGBColorSpace;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  buffer={target,canvas,pixels:new Uint8Array(256*256*4)};portraitBuffers.set(renderer,buffer);return buffer;
}
// Fit the actual posed geometry, including caps and tall hairstyles. Face
// framing ignores the lower length of ponytails; Outfit keeps the whole body.
export function portraitCamera(subject,options={}){
  subject.root.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3();
  subject.root.traverse(object=>{
    if(!object.isMesh)return;let parent=object;while(parent){if(!parent.visible)return;parent=parent.parent;}
    const headPart=/Skin|Hair|Eye|Glasses/.test(object.material?.name||'')||/hair|ponytail|cap|optical|sunglasses/i.test(object.name);
    if(options.fullBody||headPart)bounds.union(new THREE.Box3().setFromObject(object,true));
  });
  if(bounds.isEmpty())bounds.set(new THREE.Vector3(-.2,options.fullBody?0:1.48,-.18),new THREE.Vector3(.2,1.88,.18));
  if(!options.fullBody&&subject.head){const joint=subject.head.getWorldPosition(new THREE.Vector3());bounds.min.y=Math.max(bounds.min.y,joint.y-.09);}
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),side=options.view==='side',half=Math.max(size.y,side?size.z:size.x)/2;
  const camera=new THREE.PerspectiveCamera(30,1,.01,12),depth=side?size.x:size.z;
  const distance=half*(options.fullBody?1.14:1.28)/Math.tan(Math.PI/12)+depth/2;
  camera.position.copy(center);if(side)camera.position.x+=distance;else camera.position.z+=(options.view==='back'?-1:1)*distance;camera.lookAt(center);camera.updateMatrixWorld(true);return camera;
}
export function renderPortrait(renderer,assets,person,role='doctor',options={}) {
  const subject=makePlayer(assets,person.gender||'male',person,role);
  const previous={target:renderer.getRenderTarget(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),xr:renderer.xr?.enabled};
  try {
    subject.animate(0,0,.35);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#7293a8');scene.add(subject.root);
    scene.add(new THREE.HemisphereLight('#e5f3ff','#6b7a89',2.5));
    const key=new THREE.DirectionalLight('#fff4e7',3);key.position.set(2,3,4);scene.add(key);
    const fill=new THREE.DirectionalLight('#b8dcfa',1.5);fill.position.set(-3,2,2);scene.add(fill);
    const camera=portraitCamera(subject,options);
    const buffer=portraitBuffer(renderer);if(renderer.xr)renderer.xr.enabled=false;
    // Render-target viewport is in physical pixels. setViewport() multiplies by
    // device pixel ratio and used to crop portraits on Retina laptops.
    renderer.setRenderTarget(buffer.target);renderer.setScissorTest(false);renderer.clear();renderer.render(scene,camera);
    renderer.readRenderTargetPixels(buffer.target,0,0,256,256,buffer.pixels);
    const ctx=buffer.canvas.getContext('2d'),image=ctx.createImageData(256,256);
    for(let y=0;y<256;y++)image.data.set(buffer.pixels.subarray((255-y)*1024,(256-y)*1024),y*1024);
    ctx.putImageData(image,0,0);return buffer.canvas.toDataURL('image/png');
  } finally {
    renderer.setRenderTarget(previous.target);renderer.setViewport(previous.viewport);renderer.setScissor(previous.scissor);renderer.setScissorTest(previous.scissorTest);if(renderer.xr)renderer.xr.enabled=previous.xr;
    subject.dispose();
  }
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

function trimClothCache(cache){for(const [key,entry] of cache){if(cache.size<=32)break;if(entry.users===0){entry.texture.dispose();cache.delete(key);}}}
function releaseCloth(leases){for(const entry of leases){entry.users=Math.max(0,entry.users-1);trimClothCache(entry.cache);}leases.clear();}
function recolorCloth(source,hex,assets,leases) {
  if(!source?.image)return source;
  const cache=assets.clothCache||(assets.clothCache=new Map()),key=`${source.uuid}:${hex}`;
  if(cache.has(key)){const entry=cache.get(key);if(!leases.has(entry)){entry.users++;leases.add(entry);}return entry.texture;}
  const image=source.image,canvas=document.createElement('canvas'),limit=assets.clothTextureLimit||512;
  const scale=Math.min(1,limit/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
  const base=new THREE.Color(hex),rgb=[base.r,base.g,base.b].map(v=>Math.round(THREE.MathUtils.clamp(v,0,1)*255));
  for(let i=0;i<d.length;i+=4){const lum=(d[i]+d[i+1]+d[i+2])/765,shade=.68+lum*.32;d[i]=rgb[0]*shade;d[i+1]=rgb[1]*shade;d[i+2]=rgb[2]*shade;}
  ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.flipY=source.flipY;texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=source.wrapS;texture.wrapT=source.wrapT;
  const entry={texture,users:1,cache};cache.set(key,entry);leases.add(entry);trimClothCache(cache);return texture;
}

// Geometry and maps on GLTF clones belong to the loaded templates. Only cloned
// materials, skeleton GPU textures and explicitly owned appearance geometry go.
export function avatarDisposer(root,{model=null,mixer=null,clothLeases=new Set()}={}) {
  let disposed=false;
  return ()=>{
    if(disposed)return;disposed=true;
    mixer?.stopAllAction();if(mixer&&model)mixer.uncacheRoot(model);
    disposeAppearance(model);
    const materials=new Set(),skeletons=new Set();root.traverse(object=>{if(object.isMesh){for(const mat of Array.isArray(object.material)?object.material:[object.material])if(mat)materials.add(mat);if(object.skeleton)skeletons.add(object.skeleton);}});
    for(const skeleton of skeletons)skeleton.dispose();for(const mat of materials)mat.dispose();releaseCloth(clothLeases);
  };
}
function characterScenes(assets){return [assets.male,assets.female,...Object.values(assets.sources||{})].filter(Boolean);}
function resourcesOf(scenes){const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();for(const scene of scenes)scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.skeleton)skeletons.add(object.skeleton);for(const mat of Array.isArray(object.material)?object.material:[object.material])if(mat){materials.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}});return{geometries,materials,textures,skeletons};}
export function downsizeCharacterTextures(assets,limit=1024){
  if(typeof document==='undefined'||!Number.isFinite(limit))return;
  limit=Math.max(128,Math.min(2048,Math.round(limit)));
  const scenes=characterScenes(assets),{materials,textures}=resourcesOf(scenes),replacements=new Map(),oldImages=new Set();
  for(const texture of textures){const image=texture.image;if(!image?.width||!image?.height||Math.max(image.width,image.height)<=limit||texture.isDataTexture)continue;
    const ratio=limit/Math.max(image.width,image.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const replacement=texture.clone();replacement.source=new THREE.Source(canvas);replacement.needsUpdate=true;replacements.set(texture,replacement);oldImages.add(image);
  }
  for(const material of materials)for(const [key,value] of Object.entries(material))if(replacements.has(value))material[key]=replacements.get(value);
  for(const texture of replacements.keys())texture.dispose();
  const liveImages=new Set([...resourcesOf(scenes).textures].map(texture=>texture.image));
  for(const image of oldImages)if(!liveImages.has(image)&&typeof image.close==='function')image.close();
}
export function disposeCharacterAssets(assets,renderer){
  if(!assets||assets.disposed)return;assets.disposed=true;
  const {geometries,materials,textures,skeletons}=resourcesOf(characterScenes(assets));
  for(const skeleton of skeletons)skeleton.dispose();for(const geometry of geometries)if(!geometry.userData.sharedPrimitive)geometry.dispose();for(const material of materials)material.dispose();
  const images=new Set();for(const texture of textures){texture.dispose();if(texture.image)images.add(texture.image);}for(const image of images)if(typeof image.close==='function')image.close();
  for(const entry of assets.clothCache?.values()||[])entry.texture.dispose();assets.clothCache?.clear();disposeAppearanceCache(assets.appearanceCache);
  if(renderer)disposePortraitRenderer(renderer);assets.male=null;assets.female=null;assets.sources={};assets.animations={};assets.clipCache={};
}
