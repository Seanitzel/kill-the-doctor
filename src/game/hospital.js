import * as THREE from 'three';
import { world, TILE } from './layout.js';
import { Batcher, mesh, sign, bed, chair, desk, monitor, material } from './assets.js';
export function buildHospital(layout, m) {
  const group = new THREE.Group(), batch = new Batcher(group), colliders = [], interactables = [], fixtures = [], wallMeshes = [];
  const cube = (...args) => batch.box(...args);
  const collider = (x, z, w, d, object = null) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, object });
  const placeSign = (text, sub, x, y, z, rot = 0, w = 2.6, h = .65, opts = {}) => { const s = sign(text, sub, w, h, opts); s.position.set(x, y, z); s.rotation.y = rot; group.add(s); return s; };
  for (const cell of layout.cells.values()) {
    const { x, z } = world(cell.x, cell.z);
    cube(m.floor, x, -.075, z, TILE, .15, TILE); cube(m.ceiling, x, 3.68, z, TILE, .12, TILE);
    if ((cell.x + cell.z) % 3 === 0) {
      cube(m.steel, x, 3.58, z, 1.35, .09, .67); cube(m.light, x, 3.52, z, 1.23, .025, .56);
      cube(m.steel, x, 3.5, z, 1.24, .03, .02);
      fixtures.push(new THREE.Vector3(x, 3.24, z));
    } else if ((cell.x * 3 + cell.z) % 11 === 0) {
      cube(m.dark, x, 3.59, z, .65, .03, .65);
      for (let i = 0; i < 7; i++) cube(m.steel, x, 3.56, z - .27 + i * .09, .59, .025, .022);
    }
    if (cell.room === 'hall' && ((cell.x === 10 && cell.z > 5 && cell.z < 19) || (cell.z === 10 && cell.x > 4 && cell.x < 18))) cube(m.stripe, x, .012, z, .035, .013, TILE);
  }
  function wallSection(x, z, axis, length, window = false) {
    const horizontal = axis === 'x', sx = horizontal ? length : .18, sz = horizontal ? .18 : length;
    if (window) {
      cube(m.wall, x, .56, z, sx, 1.12, sz); cube(m.wall, x, 3.13, z, sx, 1.04, sz);
      cube(m.glass, x, 1.87, z, sx, 1.46, sz);
      cube(m.steel, x, 1.14, z, horizontal ? length : .21, .035, horizontal ? .21 : length);
      cube(m.steel, x, 2.62, z, horizontal ? length : .21, .035, horizontal ? .21 : length);
      cube(m.steel, x, 1.87, z, horizontal ? .04 : .2, 1.5, horizontal ? .2 : .04);
    } else cube(m.wall, x, 1.8, z, sx, 3.6, sz);
    cube(m.trim, x, .08, z, horizontal ? length : .22, .16, horizontal ? .22 : length);
    cube(m.stripe, x, 1.03, z, horizontal ? length : .22, .13, horizontal ? .22 : length);
    cube(m.steel, x, .94, z, horizontal ? length : .26, .045, horizontal ? .26 : length);
    collider(x, z, sx + .03, sz + .03);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 3.6, sz), new THREE.MeshBasicMaterial({ visible: false })); wall.position.set(x, 1.8, z); wall.updateMatrixWorld(); wallMeshes.push(wall);
  }
  for (const w of layout.walls) {
    if (!w.door) { wallSection(w.x, w.z, w.axis, TILE, !w.exterior && (Math.round(w.x + w.z) % 4 === 0)); continue; }
    const door = w.door;
    const width = 1.8, remainder = (TILE - width) / 2;
    wallSection(w.x - (width + remainder) / 2, w.z, 'x', remainder);
    wallSection(w.x + (width + remainder) / 2, w.z, 'x', remainder);
    cube(m.wall, w.x, 3.12, w.z, width, .96, .18);
    cube(m.steel, w.x - .93, 1.3, w.z, .08, 2.6, .25); cube(m.steel, w.x + .93, 1.3, w.z, .08, 2.6, .25); cube(m.steel, w.x, 2.63, w.z, 1.93, .08, .25);
    const pivot = new THREE.Group(); pivot.position.set(w.x - .86, 0, w.z); group.add(pivot);
    mesh('box', m.blue, [1.72, 2.58, .08], [.86, 1.29, 0], pivot);
    mesh('box', m.glass, [.6, .55, .095], [.86, 1.84, 0], pivot);
    mesh('box', m.steel, [.18, .035, .13], [1.49, 1.12, .07], pivot);
    mesh('box', m.steel, [.18, .035, .13], [1.49, 1.12, -.07], pivot);
    mesh('box', m.steel, [1.68, .27, .09], [.86, .23, 0], pivot);
    door.pivot = pivot; door.angle = door.open ? -Math.PI / 2 : 0; pivot.rotation.y = door.angle;
    collider(w.x, w.z, 1.8, .18, door);
    interactables.push({ type: 'door', label: layout.rooms.find(r => r.id === door.room).name, x: w.x, z: w.z, door });
    const room = layout.rooms.find(r => r.id === door.room);
    placeSign(`${room.number}  ${room.name}`, room.subtitle, w.x, 2.94, w.z + (room.z < 10 ? .13 : -.13), room.z < 10 ? 0 : Math.PI, 2.5, .5);
  }
  for (const room of layout.rooms) {
    const min = world(room.x, room.z), max = world(room.x + room.w - 1, room.z + room.h - 1), cx = room.center.x, cz = room.center.z;
    const minX = min.x - 1.5, maxX = max.x + 1.5, minZ = min.z - 1.5, maxZ = max.z + 1.5;
    placeSign(`${room.name.toUpperCase()}`, `NORTHLINE / ${room.wing.toUpperCase()} ${room.floor + 1}`, cx, 2.65, minZ + .15, 0, 4, .65);
    const furnitureCollider = (x, z, w, h) => collider(x, z, w, h);
    if (['emergency', 'icu', 'ward', 'maternity', 'pediatric', 'cardio'].includes(room.kind)) {
      for (let i = 0; i < 3; i++) {
        const x = minX + 1.55, z = minZ + 3 + i * 3.7;
        bed(batch, m, x, z, Math.PI / 2, i < 2); furnitureCollider(x, z, 2.3, 1.35);
        monitor(batch, m, x + 1.35, z - .9);
        cube(m.white, maxX - 1.1, 1.02, z, .85, 2.02, .7); furnitureCollider(maxX - 1.1, z, .9, .8);
        cube(m.blue, maxX - 1.1, 1.28, z + .36, .77, .06, .03);
      }
      desk(batch, m, cx, maxZ - 1.6); furnitureCollider(cx, maxZ - 1.6, 2.3, .95);
    } else if (room.kind === 'surgery') {
      bed(batch, m, cx, cz + 1.5); furnitureCollider(cx, cz + 1.5, 1.35, 2.4);
      monitor(batch, m, cx - 1.1, cz + .6);
      cube(m.steel, cx, 3.2, cz + 1.5, .06, .6, .06); batch.cylinder(m.light, cx, 2.84, cz + 1.5, .68, .11, .68);
      cube(m.white, maxX - 1, 1.3, minZ + 2, 1.2, 2.6, 1); furnitureCollider(maxX - 1, minZ + 2, 1.3, 1.1);
      desk(batch, m, minX + 1.6, maxZ - 1.5);
    } else if (room.kind === 'imaging') {
      const machine = material('#bdccd4');
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, .55, 12, 32), machine); ring.position.set(cx, 1.95, cz - 1); group.add(ring); ring.castShadow = true;
      cube(m.white, cx, .35, cz - 1, 3.7, .65, 1.5); cube(m.blue, cx, .9, cz + .8, .8, .18, 3.5); cube(m.steel, cx, .4, cz + 1.5, .35, .65, 2.6);
      furnitureCollider(cx, cz - 1, 3.7, 1.4); furnitureCollider(cx, cz + .8, 1, 3.5);
      desk(batch, m, minX + 1.7, maxZ - 1.5);
    } else if (['lab', 'pharmacy', 'utility', 'morgue'].includes(room.kind)) {
      for (const x of [minX + .6, maxX - .6]) {
        cube(m.white, x, .49, cz, 1, .98, room.h * 3 - 3); cube(m.steel, x, 1.03, cz, 1.1, .08, room.h * 3 - 3); furnitureCollider(x, cz, 1.1, room.h * 3 - 3);
        for (let i = 0; i < 4; i++) {
          const z = minZ + 2 + i * 2.7;
          if (room.kind === 'morgue') { cube(m.steel, x, 1.86, z, 1.03, 1.6, 2.4); for (let j = 0; j < 3; j++) cube(m.dark, x + (x < cx ? .54 : -.54), 1.22 + j * .48, z, .025, .03, 1.7); }
          else if (room.kind === 'pharmacy') { cube(m.white, x, 1.96, z, .75, 1.8, 2.2); for (let j = 0; j < 3; j++) { cube(m.blue, x, 1.3 + j * .56, z + .2, .79, .03, 2.2); for (let k = 0; k < 5; k++) cube(m.linen, x, 1.48 + j * .56, z - .8 + k * .4, .38, .27, .25); } }
          else { cube(m.dark, x, 1.25, z, .56, .32, .75); cube(m.monitor, x, 1.28, z + .38, .43, .18, .02); for (let j = 0; j < 3; j++) batch.cylinder(m.glass, x, 1.16, z + 1 - j * .21, .055, .22, .055); }
        }
      }
    } else if (room.kind === 'cafe') {
      for (const z of [minZ + 3, cz + 2, maxZ - 3]) for (const x of [minX + 2, maxX - 2]) {
        batch.cylinder(m.white, x, .82, z, 1, .065, 1); batch.cylinder(m.steel, x, .42, z, .09, .78, .09); furnitureCollider(x, z, 1.7, 1.7);
        chair(batch, m, x, z - 1.45); chair(batch, m, x, z + 1.45, Math.PI);
      }
    } else {
      for (const z of [minZ + 3, maxZ - 3]) { desk(batch, m, minX + 2, z, Math.PI / 2); furnitureCollider(minX + 2, z, 2.4, 1); chair(batch, m, minX + 2, z + 1); }
      if (room.kind === 'clinic') { bed(batch, m, maxX - 1.9, cz); furnitureCollider(maxX - 1.9, cz, 1.35, 2.4); }
      else { cube(m.white, maxX - .7, 1.05, cz, .8, 2.1, 3); furnitureCollider(maxX - .7, cz, .85, 3); for (let i = 0; i < 4; i++) cube(m.blue, maxX - .25, .5 + i * .45, cz, .03, .025, 2.8); }
    }
    // Each wing carries a physical handover log, rather than a target marker.
    if (room.index === 0 || room.index === 2) {
      const x = cx, z = room.z < 10 ? maxZ + .35 : minZ - .35;
      cube(m.steel, x, 1.15, z, .075, 1.7, .075); cube(m.blue, x, 1.74, z, .65, .45, .12);
      placeSign('HANDOVER', 'E  /  INSPECT', x, 1.73, z + .071, 0, .59, .38);
      interactables.push({ type: 'log', label: `${room.wing} wing handover log`, x, z });
    }
  }
  // The arrival atrium is a recognizable landmark with a reception desk and waiting seats.
  for (const z of [29, 31.3]) { chair(batch, m, -6, z, Math.PI / 2); chair(batch, m, 9, z, -Math.PI / 2); }
  cube(m.white, -3.8, .61, 27.8, 2.9, 1.22, .9); cube(m.blue, -3.8, .76, 28.27, 2.8, .43, .035); collider(-3.8, 27.8, 3, 1);
  placeSign('+  NORTHLINE', 'MEDICAL CENTER', -3.8, 1.05, 28.29, 0, 2.1, .6);
  for (const object of [layout.directory, layout.schedule]) {
    cube(m.dark, object.x, .57, object.z, .55, 1.14, .44); cube(m.steel, object.x, 1.15, object.z, .8, .07, .6); cube(m.blue, object.x, 1.54, object.z, .9, .65, .14);
    placeSign(object === layout.directory ? 'STAFF DIRECTORY' : 'ROUNDS / SCHEDULE', 'NORTHLINE  •  E TO READ', object.x, 1.54, object.z + .075, 0, .84, .59);
    interactables.push({ type: object === layout.directory ? 'directory' : 'schedule', label: object.label, x: object.x, z: object.z }); collider(object.x, object.z, .9, .55);
  }
  const e = layout.elevator;
  cube(m.steel, e.x, 1.55, e.z - .65, 2.5, 3.1, .14); cube(m.dark, e.x, 1.45, e.z - .55, .025, 2.7, .02);
  placeSign('↑  LIFT / STAIRS  ↓', `G   EMERGENCY     1   SPECIALISTS`, e.x, 3.07, e.z - .53, 0, 3.3, .5);
  placeSign(layout.floor ? '1' : 'G', 'E  /  CHANGE FLOOR', e.x + 1.47, 1.68, e.z - .5, 0, .45, .65);
  interactables.push({ type: 'elevator', label: layout.floor ? 'Go to ground floor' : 'Go to first floor', x: e.x, z: e.z + .9 }); collider(e.x, e.z - .65, 2.5, .16);
  if (layout.floor === 0) {
    placeSign('EXIT  ↓', 'MAIN ENTRANCE', 3, 2.9, 33.25, Math.PI, 2.7, .68, { background: '#315a68' });
    cube(m.glass, -.05, 1.4, 34.35, 3, 2.8, .1); cube(m.glass, 5.05, 1.4, 34.35, 3, 2.8, .1);
    for (const x of [-1.5, 1.5, 4.5, 6.5]) cube(m.steel, x, 1.4, 34.35, .04, 2.8, .15);
    interactables.push({ type: 'exit', label: 'Leave the hospital', x: layout.exit.x, z: layout.exit.z });
  } else placeSign('PATIENT SERVICES', 'FIRST FLOOR / NORTHLINE', 3, 2.9, 33.25, Math.PI, 3.8, .68);
  for (const p of [[3, 0], [3, 18], [-21, 0], [21, 0], [3, -18]]) {
    placeSign(p[1] < 0 ? '↓  MAIN ENTRANCE' : '↑  LIFT    /    WEST ←   → EAST', `G: CLINICAL & DIAGNOSTICS    1: SPECIALIST CARE`, p[0], 2.9, p[1], p[1] < 0 ? Math.PI : 0, 4.6, .57);
  }
  // Corridors include benches, service carts, hand sanitizers, notices and equipment.
  for (const z of [-15, 9, 18]) {
    for (let i = 0; i < 3; i++) chair(batch, m, 5.25, z + i * .74, -Math.PI / 2);
    cube(m.steel, -1.1, .5, z, .7, .85, .8); cube(m.white, -1.1, .98, z, .74, .08, .85); collider(-1.1, z, .75, .9);
  }
  const statics = batch.finish();
  return { group, colliders, interactables, fixtures, wallMeshes, statics };
}
