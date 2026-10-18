export const TILE = 3;
export const SIZE = 23;
export const FLOORS = ['Ground floor', 'First floor', 'Second floor', 'Basement'];
export const FLOOR_CODES = ['G','1','2','B'];
export const FLOOR_THEMES = ['Clinical & diagnostics','Specialist care','Advanced care & research','Restricted operating suite'];
const roomSpecs = [
  [4, 5, 3, 5], [7, 5, 3, 5], [12, 5, 3, 5], [15, 5, 3, 5],
  [4, 12, 3, 6], [7, 12, 3, 6], [12, 12, 3, 6], [15, 12, 3, 6],
];
const departments = [
  ['Emergency', 'Triage & treatment', 'emergency'], ['Radiology', 'Imaging & diagnostics', 'imaging'],
  ['Laboratory', 'Specimen processing', 'lab'], ['Pharmacy', 'Dispensing & storage', 'pharmacy'],
  ['Outpatient', 'Consultation rooms', 'clinic'], ['Records', 'Administration & schedules', 'office'],
  ['Cafeteria', 'Staff & visitor lounge', 'cafe'], ['Maintenance', 'Utilities & electrical', 'utility'],
  ['Surgery', 'Operating & recovery', 'surgery'], ['Intensive Care', 'Critical care unit', 'icu'],
  ['Cardiology', 'Heart & vascular', 'cardio'], ['Neurology', 'Neuroscience clinic', 'clinic'],
  ['Maternity', 'Maternity & newborn care', 'maternity'], ['Pediatrics', 'Children’s ward', 'pediatric'],
  ['Patient Ward', 'Inpatient recovery', 'ward'], ['Pathology', 'Morgue & pathology', 'morgue'],
  ['Oncology', 'Cancer care & recovery', 'ward'], ['Research', 'Clinical research & consent', 'lab'],
  ['Renal Care', 'Kidney & transplant care', 'ward'], ['Endoscopy', 'Digestive diagnostics', 'clinic'],
  ['Rehabilitation', 'Mobility & recovery', 'clinic'], ['Patient Advocacy', 'Rights & language services', 'office'],
  ['Transplant Ward', 'Transplant recovery', 'ward'], ['Isolation Unit', 'Protected patient care', 'icu'],
];
export const key = (x, z) => `${x},${z}`;
export const edgeKey = (a, b) => [a, b].sort().join('|');
export const world = (x, z) => ({ x: (x - 11) * TILE, z: (z - 11) * TILE });
export const tileAt = (x, z) => ({ x: Math.round(x / TILE + 11), z: Math.round(z / TILE + 11) });
export function makeLayout(floor = 0) {
  const cells = new Map();
  const fill = (x, z, w, h, room = 'hall') => {
    for (let i = x; i < x + w; i++) for (let j = z; j < z + h; j++) cells.set(key(i, j), { x: i, z: j, room });
  };
  if(floor===3)fill(10,3,2,4);
  else {
  fill(10, 3, 2, 20); fill(2, 10, 18, 2);
  fill(2, 3, 2, 17); fill(18, 3, 2, 17);
  fill(2, 3, 18, 2); fill(2, 18, 18, 2);
  fill(8, 20, 7, 3); // entrance atrium
  if(floor===0)fill(11,23,2,2); // exterior forecourt beyond the real exit doors
  }
  const specs=floor===3?[[7,7,7,6]]:floor===0?[...roomSpecs,[4,20,3,3]]:roomSpecs;
  const rooms = specs.map(([x, z, w, h], i) => {
    const [name, subtitle, kind] = floor===3?['Restricted theatre','Authorized personnel only','rescue-theater']:i===8?['Bathroom','Toilets & washbasins','bathroom']:departments[floor * 8 + i];
    const room = { id: `f${floor}-r${i}`, index: i, x, z, w, h, name, subtitle, kind, floor, number: floor===3?'B01':`${floor + 1}${String(i + 1).padStart(2, '0')}`, wing: i < 2 || (i >= 4 && i < 6) ? 'West' : 'East' };
    room.center = world(x + (w - 1) / 2, z + (h - 1) / 2);
    fill(x, z, w, h, room.id);
    return room;
  });
  const doors = [];
  for (const room of rooms) {
    const x = floor===3?10:room.x+1, z = floor===3?room.z:room.z < 10 ? room.z + room.h - 1 : room.z;
    const otherZ = z + (floor!==3&&room.z < 10 ? 1 : -1);
    doors.push({ id: `${room.id}-door`, a: key(x, z), b: key(x, otherZ), room: room.id, floor, x: world(x, z).x, z: (world(x, z).z + world(x, otherZ).z) / 2, axis: 'x', open: false, locked: false });
    // A second door to the perimeter ring lets departments connect through the hospital.
    if(floor===3||room.kind==='bathroom')continue;
    const backZ = room.z < 10 ? room.z : room.z + room.h - 1;
    const outZ = backZ + (room.z < 10 ? -1 : 1);
    doors.push({ id: `${room.id}-back`, a: key(x, backZ), b: key(x, outZ), room: room.id, floor, x: world(x, backZ).x, z: (world(x, backZ).z + world(x, outZ).z) / 2, axis: 'x', open: true, locked: false });
  }
  const doorEdges = new Map(doors.map(d => [edgeKey(d.a, d.b), d]));
  const walls = [];
  const seen = new Set();
  for (const [k, cell] of cells) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighbor = cells.get(key(cell.x + dx, cell.z + dz));
      if (neighbor && neighbor.room === cell.room) continue;
      const e = edgeKey(k, key(cell.x + dx, cell.z + dz));
      if (seen.has(e)) continue;
      seen.add(e);
      const pos = world(cell.x + dx / 2, cell.z + dz / 2);
      const door = doorEdges.get(e);
      walls.push({ ...pos, axis: dx ? 'z' : 'x', door, exterior: !neighbor });
    }
  }
  const directory=floor===3?{x:-4,z:-21}:{...world(9,20)},schedule=floor===3?{x:-4,z:-18}:{...world(17,11)};
  return { floor, cells, rooms, doors, doorEdges, walls,
    exit: { ...world(11, floor===0?24:22), floor: 0 },
    elevator: { ...world(11, 3), floor, label: 'Elevator / stairs' },
    directory: { ...directory, floor, label: floor ? `${FLOORS[floor]} directory` : 'Staff directory' },
    schedule: { ...schedule, floor, label: 'Staff schedule' },
  };
}
export function neighbors(layout, cell, allowClosed = true) {
  const k = key(cell.x, cell.z), current = layout.cells.get(k);
  if (!current) return [];
  const result = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const n = layout.cells.get(key(cell.x + dx, cell.z + dz));
    if (!n || layout.blockedEdges?.has(edgeKey(k, key(n.x,n.z)))) continue;
    if (n.room !== current.room) {
      const d = layout.doorEdges.get(edgeKey(k, key(n.x, n.z)));
      if (!d || d.locked || (!allowClosed && !d.open)) continue;
    }
    result.push(n);
  }
  return result;
}
export function findPath(layout, start, end, allowClosed = true) {
  const a = typeof start.x === 'number' ? start : tileAt(start.x, start.z);
  const destination = key(end.x, end.z), first = key(a.x, a.z);
  const queue = [a], prev = new Map([[first, null]]);
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i], k = key(cell.x, cell.z);
    if (k === destination) {
      const result = [];
      let cursor = destination;
      while (cursor) { const [x, z] = cursor.split(',').map(Number); result.push({ x, z }); cursor = prev.get(cursor); }
      return result.reverse();
    }
    for (const n of neighbors(layout, cell, allowClosed)) {
      const nk = key(n.x, n.z);
      if (!prev.has(nk)) { prev.set(nk, k); queue.push(n); }
    }
  }
  return [];
}
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
