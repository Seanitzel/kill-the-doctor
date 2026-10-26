import {waitingBench} from './waiting-benches.js';
import {addHangingToiletSign} from './restroom-signage.js';
import {JoinedWalls} from './joined-walls.js';
import {chairFits} from './furniture-placement.js';
import {addSiteDetails,addNightStreet} from './site-details.js';
import {footprint} from './collision.js';
import * as THREE from 'three';
import { world, TILE, FLOORS, FLOOR_CODES } from './layout.js';
import { Batcher, mesh, sign, bed, chair, desk, monitor, material } from './assets.js';
import {addBathroom,addOperatingSet} from './accessibility-props.js';
export function liftWallPlacement(layout){
  const e=layout.elevator;
  return {x:e.x,wallZ:e.z-TILE/2,faceZ:e.z-TILE/2+.13};
}
export function buildLift(layout,m){
  const placement=liftWallPlacement(layout),{x,faceZ}=placement,group=new THREE.Group();
  group.name='Nhalewick wall-mounted lift';group.userData.liftPlacement=placement;
  const box=(name,mat,size,pos)=>{const object=mesh('box',mat,size,pos,group);object.name=name;return object;};
  // Recess the cabin behind the corridor portal, with physical sliding leaves.
  box('Lift cabin floor',m.dark,[2.5,.05,2.85],[x,.015,faceZ-1.4]);box('Lift cabin back wall',m.steel,[2.5,2.75,.10],[x,1.375,faceZ-2.78]);for(const side of [-1,1])box('Lift cabin side wall',m.steel,[.08,2.75,2.8],[x+side*1.28,1.375,faceZ-1.4]);box('Lift cabin light',m.light,[1.4,.035,1.6],[x,2.73,faceZ-1.35]);
  const leaves=[];
  for(const side of [-1,1]){
    box('Lift brushed-steel jamb',m.steel,[.10,2.80,.13],[x+side*1.31,1.40,faceZ+.065]);
    const leaf=box(side<0?'Lift left sliding door':'Lift right sliding door',m.steel,[1.24,2.63,.045],[x+side*.62,1.345,faceZ+.060]);leaf.userData.side=side;if(side<0){const seam=mesh('box',m.dark,[.008/1.24,1,.12],[.497,0,.53],leaf);seam.name='Lift central separation seam';leaf.userData.seam=seam;}leaf.userData.bodyBounds=footprint(x+side*.62,faceZ+.06,1.24,.07,2.7,0,'lift-door');leaves.push(leaf);
  }
  box('Lift door header',m.steel,[2.72,.115,.13],[x,2.745,faceZ+.065]);
  group.userData.lift={x,faceZ,leaves,open:false,amount:0,selectionUsed:false,choosing:false};
  box('Lift threshold',m.steel,[2.72,.035,.19],[x,.025,faceZ+.085]);
  box('Lift overhead sign backing',m.dark,[3.30,.50,.025],[x,3.08,faceZ-.015]);
  const header=sign('↑  LIFT / STAIRS  ↓',layout.floor===3?'B  RESTRICTED     G  MAIN HOSPITAL':'G  CLINICAL     1  SPECIALISTS     2  ADVANCED',3.3,.5);
  header.name='Lift floor directory';header.position.set(x,3.08,faceZ);group.add(header);
  box('Lift call panel',m.dark,[.24,.42,.035],[x+1.55,1.28,faceZ+.018]);
  box('Lift call button',m.steel,[.075,.075,.018],[x+1.55,1.24,faceZ+.043]);
  box('Lift call indicator',m.light,[.035,.018,.009],[x+1.55,1.39,faceZ+.042]);
  const floor=sign(FLOOR_CODES[layout.floor],'CALL',.25,.33);floor.name='Lift floor indicator';floor.position.set(x+1.55,1.77,faceZ);group.add(floor);const wallNumber=sign(layout.floor===3?'B':String(layout.floor),'FLOOR',.65,.92,{background:'#203b4a',color:'#e1edf0',center:true,fontSize:740,subFontSize:110});wallNumber.name='Large floor number left of elevator';wallNumber.position.set(x-1.92,1.72,faceZ+.03);group.add(wallNumber);
  return group;
}
export function buildHospital(layout, m, site=null) {
  const group = new THREE.Group(), batch = new Batcher(group), colliders = [], interactables = [], fixtures = [], wallMeshes = [], pharmacies = [], bathrooms = [], operatingSets = [], workstations = [];
  const cube = (...args) => batch.box(...args);
  const joinedWalls=new JoinedWalls(),seatRequests=[],seats=[];let waitingMaterials;
  const chairAt=(x,z,rotation=0,room=null)=>seatRequests.push({x,z,rotation,room});
  const collider = (x, z, w, d, object = null) => { const c = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, object }; colliders.push(c); return c; };
  batch.collider=(x,z,w,d,h,rot,type)=>{const c=footprint(x,z,w,d,h,rot,type);colliders.push(c);return c;};
  const deskAt=(room,x,z,rotation=0)=>{desk(batch,m,x,z,rotation);workstations.push({room:room.id,x,z,rotation,cup:{x:x+Math.cos(rotation)*.82,z:z-Math.sin(rotation)*.82},stand:{x:x-Math.sin(rotation)*.9,z:z-Math.cos(rotation)*.9}});};
  const placeSign = (text, sub, x, y, z, rot = 0, w = 2.6, h = .65, opts = {}) => { const s = sign(String(text).replaceAll('NHALEWICK',site?.hospital?.toUpperCase()||'NHALEWICK'),String(sub).replaceAll('NHALEWICK',site?.hospital?.toUpperCase()||'NHALEWICK'),w,h,opts); s.position.set(x, y, z); s.rotation.y = rot; group.add(s); return s; };
  for (const cell of layout.cells.values()) {
    const { x, z } = world(cell.x, cell.z);
    if(layout.floor===0&&cell.z>=23){cube(m.dark,x,-.075,z,TILE,.15,TILE);continue;}
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
    const wallCube = (...args)=>joinedWalls.box(...args);
    if (window) {
      wallCube(m.wall, x, .56, z, sx, 1.12, sz); wallCube(m.wall, x, 3.13, z, sx, 1.04, sz);
      wallCube(m.glass, x, 1.87, z, sx, 1.46, sz);
      wallCube(m.steel, x, 1.14, z, horizontal ? length : .21, .035, horizontal ? .21 : length);
      wallCube(m.steel, x, 2.62, z, horizontal ? length : .21, .035, horizontal ? .21 : length);
      wallCube(m.steel, x, 1.87, z, horizontal ? .04 : .2, 1.5, horizontal ? .2 : .04);
    } else wallCube(m.wall, x, 1.82, z, sx, 3.64, sz);
    wallCube(m.trim, x, .08, z, horizontal ? length : .22, .16, horizontal ? .22 : length);
    wallCube(m.stripe, x, 1.03, z, horizontal ? length : .22, .13, horizontal ? .22 : length);
    wallCube(m.steel, x, .94, z, horizontal ? length : .26, .045, horizontal ? .26 : length);
    Object.assign(collider(x,z,sx+.03,sz+.03),{minY:0,maxY:3.6,type:'wall'});
    const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 3.6, sz), new THREE.MeshBasicMaterial({ visible: false })); wall.position.set(x, 1.8, z); wall.updateMatrixWorld(); wallMeshes.push(wall);
  }
  for (const w of layout.walls) {
    if(layout.floor===0&&w.exterior&&w.z>34.5)continue; // Open view from the forecourt to the night street.
    if (!w.door) { wallSection(w.x, w.z, w.axis, TILE, !w.exterior && (Math.round(w.x + w.z) % 4 === 0)); continue; }
    const door = w.door;
    const width = 1.8, remainder = (TILE - width) / 2;
    wallSection(w.x - (width + remainder) / 2, w.z, 'x', remainder);
    wallSection(w.x + (width + remainder) / 2, w.z, 'x', remainder);
    joinedWalls.box(m.wall, w.x, 3.13, w.z, width, 1, .18);
    Object.assign(collider(w.x,w.z,1.93,.25),{minY:2.59,maxY:3.6,type:'header'});
    joinedWalls.box(m.steel, w.x - .93, 1.3, w.z, .08, 2.6, .25); joinedWalls.box(m.steel, w.x + .93, 1.3, w.z, .08, 2.6, .25); joinedWalls.box(m.steel, w.x, 2.63, w.z, 1.93, .08, .25);
    const pivot = new THREE.Group(); pivot.position.set(w.x - .86, 0, w.z); group.add(pivot);
    mesh('box', m.blue, [1.72, 2.58, .08], [.86, 1.29, 0], pivot);
    mesh('box', m.glass, [.6, .55, .095], [.86, 1.84, 0], pivot);
    mesh('box', m.steel, [.18, .035, .13], [1.49, 1.12, .07], pivot);
    mesh('box', m.steel, [.18, .035, .13], [1.49, 1.12, -.07], pivot);
    mesh('box', m.steel, [1.68, .27, .09], [.86, .23, 0], pivot);
    door.pivot=pivot;door.openAngle=layout.rooms.find(r=>r.id===door.room).center.z<door.z?Math.PI/2:-Math.PI/2;door.angle=door.open?door.openAngle:0;pivot.rotation.y=door.angle;
    collider(w.x, w.z, 1.8, .18, door);
    interactables.push({ type: 'door', label: layout.rooms.find(r => r.id === door.room).name, x: w.x, z: w.z, door });
    const room = layout.rooms.find(r => r.id === door.room);
    const label=placeSign(room.kind==='bathroom'?'BATHROOM':`${room.number}  ${room.name}`, room.subtitle, w.x, 2.94, w.z + (room.center.z < door.z ? .13 : -.13), room.center.z < door.z ? 0 : Math.PI, 2.5, .5);
    label.name='Department door label';label.userData.room=room.id;label.userData.title=room.kind==='bathroom'?'BATHROOM':`${room.number}  ${room.name}`;
    if(room.kind==='bathroom')addHangingToiletSign(group,batch,m,door);
  }
  for (const room of layout.rooms) {
    const min = world(room.x, room.z), max = world(room.x + room.w - 1, room.z + room.h - 1), cx = room.center.x, cz = room.center.z;
    const minX = min.x - 1.5, maxX = max.x + 1.5, minZ = min.z - 1.5, maxZ = max.z + 1.5;
    if(room.kind==='imaging')for(const d of layout.doors.filter(d=>d.room===room.id)){const side=room.center.z<d.z?1:-1;placeSign('MRI','NO METAL',d.x+1.17,1.75,d.z+side*.15,side===1?0:Math.PI,.48,.65,{background:'#763b36'});}
    if(room.kind!=='bathroom')placeSign(`${room.name.toUpperCase()}`, `NHALEWICK / ${room.wing.toUpperCase()} ${room.floor + 1}`, cx, 2.65, minZ + .15, 0, 4, .65);
    const furnitureCollider=(x,z,w,d,h=2.1)=>Object.assign(collider(x,z,w,d),{minY:0,maxY:h,type:'furniture'});
    if(room.kind==='bathroom'){
      const props=addBathroom(group,{x:cx,z:cz,width:maxX-minX,depth:maxZ-minZ},m);
      colliders.push(...props.colliders);bathrooms.push({room,floor:layout.floor,...props});
    } else if(room.kind==='rescue-theater'){
      const props=addOperatingSet(group,{x:cx,z:cz},m);
      colliders.push(...props.colliders);operatingSets.push({room,floor:layout.floor,...props});
    } else if (['emergency', 'icu', 'ward', 'maternity', 'pediatric', 'cardio'].includes(room.kind)) {
      for (let i = 0; i < 3; i++) {
        const x = minX + 1.55, z = minZ + 3 + i * 3.7;
        bed(batch,m,x,z,Math.PI/2,false);
        monitor(batch, m, x + 1.35, z - .9);
        cube(m.white, maxX - 1.1, 1.02, z, .85, 2.02, .7); furnitureCollider(maxX - 1.1, z, .9, .8);
        cube(m.blue, maxX - 1.1, 1.28, z + .36, .77, .06, .03);
      }
      deskAt(room,maxX-2.1,cz+1.8,Math.PI/2);
    } else if (room.kind === 'surgery') {
      bed(batch,m,cx,cz+1.5);
      monitor(batch, m, cx - 1.1, cz + .6);
      cube(m.steel, cx, 3.2, cz + 1.5, .06, .6, .06); batch.cylinder(m.light, cx, 2.84, cz + 1.5, .68, .11, .68);
      cube(m.white, maxX - 1, 1.3, minZ + 2, 1.2, 2.6, 1); furnitureCollider(maxX - 1, minZ + 2, 1.3, 1.1,2.6);
      deskAt(room,minX+1.6,cz+2,Math.PI/2);
    } else if (room.kind === 'imaging') {
      const machine = material('#bdccd4');
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, .55, 12, 32), machine); ring.position.set(cx, 1.95, cz - 1); group.add(ring); ring.castShadow = true;
      cube(m.white, cx, .35, cz - 1, 3.7, .65, 1.5); cube(m.blue, cx, .9, cz + .8, .8, .18, 3.5); cube(m.steel, cx, .4, cz + 1.5, .35, .65, 2.6);
      furnitureCollider(cx, cz - 1, 3.7, 1.4,3.5); furnitureCollider(cx, cz + .8, 1, 3.5,1.05);
      deskAt(room,minX+1.7,cz+2,Math.PI/2);
    } else if (room.kind === 'pharmacy') {
      // A dispensary with a real customer side, a staffed service side and two
      // clear side aisles. Both existing doors remain available for evacuation.
      const counterZ = cz - 1.15, counterWidth = 5.1, counterDepth = .95;
      cube(m.white, cx, .54, counterZ, counterWidth, 1.08, counterDepth);
      cube(m.blue, cx, .65, counterZ + .486, counterWidth - .12, .55, .035);
      cube(m.steel, cx, 1.115, counterZ, counterWidth + .08, .09, counterDepth + .06);
      Object.assign(furnitureCollider(cx, counterZ, counterWidth + .08, counterDepth + .06, 1.16), {type:'pharmacy-counter'});
      placeSign('PHARMACY', 'PRESCRIPTIONS / PATIENT SERVICE', cx, 2.7, counterZ + .08, 0, 4.5, .62);
      placeSign('+  PHARMACY', 'PRESCRIPTIONS', cx, .69, counterZ + .509, 0, 2.7, .39);
      // Checkout terminal, paper prescription tray and a bag ready for collection.
      cube(m.dark, cx + .95, 1.21, counterZ, .36, .11, .34);
      cube(m.steel, cx + .95, 1.35, counterZ - .06, .055, .3, .055);
      cube(m.dark, cx + .95, 1.49, counterZ - .06, .45, .32, .06);
      cube(m.monitor, cx + .95, 1.49, counterZ - .023, .39, .26, .012);
      Object.assign(collider(cx + .95, counterZ - .06, .46, .35), {minY:1.16,maxY:1.66,type:'pharmacy-terminal'});
      cube(m.steel, cx - 1.38, 1.19, counterZ, .53, .055, .38);
      cube(m.linen, cx - 1.38, 1.225, counterZ, .43, .02, .3);
      cube(m.linen, cx - .45, 1.34, counterZ, .25, .35, .16);
      cube(m.blue, cx - .45, 1.36, counterZ + .085, .12, .07, .012);
      let boxes = 0, bottles = 0;
      const packageColors = [m.blue, m.green, m.red, m.linen];
      for (const side of [-1, 1]) {
        const shelfX = side < 0 ? minX + .6 : maxX - .6;
        const productX = shelfX - side * .23;
        for (let bay = 0; bay < 4; bay++) {
          const shelfZ = minZ + 2.1 + bay * 3.05;
          // Open shelves: the back panel and end panels leave every product
          // visible from the aisle rather than burying stock in a solid cabinet.
          cube(m.dark, shelfX + side*.38, 1.4, shelfZ, .035, 2.66, 2.4);
          for(const end of [-1,1])cube(m.white,shelfX,1.4,shelfZ+end*1.23,.92,2.8,.055);
          cube(m.white,shelfX,2.77,shelfZ,.92,.06,2.5);
          cube(m.white,shelfX,.12,shelfZ,.92,.14,2.5);
          Object.assign(furnitureCollider(shelfX, shelfZ, 1.05, 2.5, 2.81), {type:'pharmacy-shelf'});
          for (let level = 0; level < 4; level++) {
            const shelfY = .4 + level * .57;
            cube(m.steel, shelfX, shelfY, shelfZ, .92, .045, 2.4);
            for (let item = 0; item < 6; item++) {
              const itemZ = shelfZ - .96 + item * .38;
              const colour = packageColors[(bay + level + item) % packageColors.length];
              if ((bay + level + item) % 4 === 0) {
                const bottleY = shelfY + .16;
                batch.cylinder(m.linen, productX, bottleY, itemZ, .087, .26, .087);
                batch.cylinder(colour, productX, bottleY + .15, itemZ, .07, .05, .07);
                cube(colour, productX - side * .088, bottleY, itemZ, .014, .09, .13);
                bottles++;
              } else {
                const height = .26 + ((item + bay) % 3) * .045;
                cube(m.linen, productX, shelfY + height / 2 + .025, itemZ, .23, height, .25);
                cube(colour, productX - side * .122, shelfY + height * .72, itemZ, .014, .075, .25);
                cube(m.white, productX - side * .126, shelfY + .10, itemZ, .017, .025, .15);
                boxes++;
              }
            }
          }
        }
      }
      const frontDoor = layout.doors.find(d => d.room === room.id && d.z > cz);
      pharmacies.push({
        room, floor:layout.floor,
        counter:{x:cx,z:counterZ,width:counterWidth,depth:counterDepth,height:1.16},
        clerk:{x:cx,z:counterZ-1.05,yaw:0},
        queue:[0,1,2].map(i=>({x:cx,z:counterZ+1.2+i*1.05,yaw:Math.PI})),
        exit:{x:frontDoor.x,z:frontDoor.z-1.45},
        stock:{boxes,bottles,shelfBays:8},
      });
    } else if (['lab', 'utility', 'morgue'].includes(room.kind)) {
      for (const x of [minX + .6, maxX - .6]) {
        cube(m.white, x, .49, cz, 1, .98, room.h * 3 - 3); cube(m.steel, x, 1.03, cz, 1.1, .08, room.h * 3 - 3); furnitureCollider(x, cz, 1.1, room.h * 3 - 3,room.kind==='morgue'?2.66:1.41);
        for (let i = 0; i < 4; i++) {
          const z = minZ + 2 + i * 2.7;
          if (room.kind === 'morgue') { cube(m.steel, x, 1.86, z, 1.03, 1.6, 2.4); for (let j = 0; j < 3; j++) cube(m.dark, x + (x < cx ? .54 : -.54), 1.22 + j * .48, z, .025, .03, 1.7); }
          else { cube(m.dark, x, 1.25, z, .56, .32, .75); cube(m.monitor, x, 1.28, z + .38, .43, .18, .02); for (let j = 0; j < 3; j++) batch.cylinder(m.glass, x, 1.16, z + 1 - j * .21, .055, .22, .055); }
        }
      }
    } else if (room.kind === 'cafe') {
      for (const z of [minZ + 3, cz, maxZ - 3]) for (const x of [minX + 2, maxX - 2]) {
        batch.cylinder(m.white, x, .82, z, 1, .065, 1); batch.cylinder(m.steel, x, .42, z, .09, .78, .09); Object.assign(furnitureCollider(x,z,2,2),{maxY:.86,type:'table'});
        chairAt(x,z-1.45,0,room.id);chairAt(x,z+1.45,Math.PI,room.id);
      }
    } else {
      for (const z of [minZ + 3, maxZ - 3]) { deskAt(room,minX+2,z,Math.PI/2); chairAt(minX+2,z+1.7,0,room.id); }
      if (room.kind === 'clinic') { bed(batch,m,maxX-1.9,cz); }
      else { cube(m.white, maxX - .7, 1.05, cz, .8, 2.1, 3); furnitureCollider(maxX - .7, cz, .85, 3); for (let i = 0; i < 4; i++) cube(m.blue, maxX - .25, .5 + i * .45, cz, .03, .025, 2.8); }
    }
    // Each wing carries a physical handover log, rather than a target marker.
    if (layout.floor!==3&&(room.index === 0 || room.index === 2)) {
      const x = cx+1.15, z = room.z < 10 ? maxZ + .35 : minZ - .35;
      cube(m.steel, x, 1.15, z, .075, 1.7, .075); cube(m.blue, x, 1.74, z, .65, .45, .12);
      placeSign('HANDOVER', 'READ / INSPECT', x, 1.73, z + .071, 0, .59, .38);
      Object.assign(collider(x,z,.1,.1),{maxY:1.95,type:'post'});
      interactables.push({ type: 'log', label: `${room.wing} wing handover log`, x, z });
    }
  }
  // The arrival atrium is a recognizable landmark with a reception desk and waiting seats.
  if(layout.floor!==3){
  for(const z of [29,31.3])chairAt(-6,z,Math.PI/2);
  for(const z of [31.3,33])chairAt(9,z,-Math.PI/2);
  cube(m.white, -3.8, .61, 27.8, 2.9, 1.22, .9); cube(m.blue, -3.8, .76, 28.27, 2.8, .43, .035); Object.assign(collider(-3.8,27.8,3,1),{maxY:1.23,type:'desk'});
  placeSign('+  NHALEWICK', 'MEDICAL CENTER', -3.8, 1.05, 28.29, 0, 2.1, .6);
  }
  for (const object of [layout.directory, layout.schedule]) {
    cube(m.dark, object.x, .57, object.z, .55, 1.14, .44); cube(m.steel, object.x, 1.15, object.z, .8, .07, .6); cube(m.blue, object.x, 1.54, object.z, .9, .65, .14);
    placeSign(object === layout.directory ? 'HOSPITAL INFORMATION' : 'ROUNDS / SCHEDULE', 'NHALEWICK • INFORMATION', object.x, 1.54, object.z + .075, 0, .84, .59);
    interactables.push({ type: object === layout.directory ? 'directory' : 'schedule', label: object===layout.directory?'Read hospital information':object.label, x: object.x, z: object.z }); Object.assign(collider(object.x,object.z,.9,.55),{maxY:1.9,type:'terminal'});
  }
  const e = layout.elevator;
  const lift=buildLift(layout,m);group.add(lift);
  const liftFace=lift.userData.liftPlacement.faceZ;
  interactables.push({ type: 'elevator', label:'Call lift · enter to choose floor', x: e.x, z: e.z + .9 });
  for(const leaf of lift.userData.lift.leaves)colliders.push(leaf.userData.bodyBounds);for(const side of [-1,1])Object.assign(collider(e.x+side*1.28,liftFace-1.4,.08,2.8),{minY:0,maxY:2.8,type:'lift-wall'});Object.assign(collider(e.x,liftFace-2.78,2.65,.1),{minY:0,maxY:2.8,type:'lift-wall'});
  if (layout.floor === 0) {
    for(const side of [-1,1]){
      const guide=placeSign(side<0?'←  EXIT':'EXIT  →','MAIN ENTRANCE',side*24,3.08,23.1,Math.PI,1.9,.5,{background:'#234553'});
      guide.name='Corridor exit direction';guide.userData.direction=side<0?'left':'right';guide.userData.toward={x:0,z:24};
      for(const dx of [-.65,.65])cube(m.steel,side*24+dx,3.48,23.1,.018,.28,.018);
    }
    // A real 6m portal joins the atrium to an exterior forecourt. The old
    // glass facade was drawn over a solid exterior wall and had no doors.
    const entry=new THREE.Group();entry.name='Main entrance sliding glass doors';group.add(entry);
    for(const x of [-1.5,4.5])mesh('box',m.steel,[.10,2.85,.19],[x,1.425,34.5],entry);
    mesh('box',m.steel,[6.1,.13,.25],[1.5,2.85,34.5],entry);
    const doorGlass=material('#91bbc9',{transparent:true,opacity:.36,roughness:.17,metalness:.15,depthWrite:false,side:THREE.DoubleSide});
    const leaves=[];for(const side of [-1,1]){const leaf=new THREE.Group();leaf.position.set(1.5+side*1.5,0,34.5);entry.add(leaf);mesh('box',doorGlass,[3,2.7,.06],[0,1.4,0],leaf);for(const x of [-1.5,1.5])mesh('box',m.steel,[.045,2.7,.075],[x,1.4,0],leaf);for(const y of [.07,1.1,2.73])mesh('box',m.steel,[3,.045,.075],[0,y,0],leaf);for(const face of [-1,1]){const decal=sign('←  AUTOMATIC  →','',1.85,.32,{background:'#456275',color:'#ecf6f7'});decal.position.set(0,1.55,face*.045);decal.rotation.y=face<0?Math.PI:0;leaf.add(decal);}leaf.userData.side=side;if(side<0){const seam=mesh('box',m.dark,[.008/1.24,1,.12],[.497,0,.53],leaf);seam.name='Lift central separation seam';leaf.userData.seam=seam;}leaf.userData.bodyBounds=Object.assign(collider(leaf.position.x,34.5,3,.06),{minY:0,maxY:2.78,type:'entrance-glass'});leaves.push(leaf);}
    group.userData.entrance={leaves,open:false,amount:0};
    cube(m.dark,1.5,.01,37,5.7,.015,4.8);
    // Triage stays in the entrance atrium, leaving the central exit route free.
    cube(m.white,5.25,.54,31.2,1.9,1.08,.72);cube(m.blue,5.25,.64,31.57,1.8,.42,.025);Object.assign(collider(5.25,31.2,2,.8),{maxY:1.12,type:'triage-desk'});
    const triage=placeSign('TRIAGE','INITIAL ASSESSMENT',5.25,1.38,31.6,0,1.65,.4);triage.name='Main entrance triage sign';group.userData.triage={clerk:{x:5.25,z:30.15,yaw:0},desk:{x:5.25,z:31.2}};interactables.push({type:'triage',label:'Main triage · initial assessment',x:5.25,z:32.15});
    addNightStreet(group,batch,m,site);
    interactables.push({ type: 'exit', label: 'Leave the hospital', x: layout.exit.x, z: layout.exit.z });
  } else if(layout.floor!==3)placeSign('PATIENT SERVICES', `${FLOORS[layout.floor].toUpperCase()} / NHALEWICK`, 3, 2.9, 33.25, Math.PI, 3.8, .68);
  for (const p of (layout.floor===3?[]:[[-1.5,0],[-1.5,18],[-21,0],[21,0],[-1.5,-18]])) {
    placeSign('↑  LIFT    /    WEST ←   → EAST','G: CLINICAL    1: SPECIALISTS    2: ADVANCED CARE',p[0],2.9,p[1]+.01,0,4.6,.57);
    placeSign('↓  MAIN ENTRANCE    /    EAST ←   → WEST','G: CLINICAL    1: SPECIALISTS    2: ADVANCED CARE',p[0],2.9,p[1]-.01,Math.PI,4.6,.57);
    Object.assign(collider(p[0],p[1],4.6,.06),{minY:2.615,maxY:3.185,type:'header'});
  }
  // Corridors include benches, service carts, hand sanitizers, notices and equipment.
  for (const z of (layout.floor===3?[]:[-15, 9, 18])) {
    for(let i=0;i<3;i++)chairAt(5.25,z+i*.9,-Math.PI/2);
    cube(m.steel, -1.1, .5, z, .7, .85, .8); cube(m.white, -1.1, .98, z, .74, .08, .85); Object.assign(collider(-1.1,z,.75,.9),{maxY:1.04,type:'cart'});
  }
  // A two-seat linked bench beside selected consultation doors, facing the hall.
  if(layout.floor<3)for(const room of layout.rooms.filter(r=>['clinic','emergency','imaging','cardio','ward','maternity','pediatric','surgery','icu'].includes(r.kind))){
    const door=layout.doors.find(d=>d.room===room.id&&!d.id.endsWith('-back'));
    const rot=room.z<10?0:Math.PI,z=door.z+(room.z<10?.70:-.70),x=door.x+2.9;
    const probes=[x-.42,x+.42];
    if(probes.every(px=>chairFits(px,z,rot,layout,colliders))){waitingMaterials||={...m,steel:material('#b5c2cb',{metalness:.55,roughness:.35}),chair:material('#3c7494',{roughness:.86})};const row=waitingBench(batch,waitingMaterials,x,z,rot,2);seats.push(...row.map(seat=>({...seat,room:null,department:room.id})));}
  }
  addSiteDetails(group,batch,m,layout,site);
  for(const seat of seatRequests)if(chairFits(seat.x,seat.z,seat.rotation,layout,colliders)){chair(batch,m,seat.x,seat.z,seat.rotation);seats.push(seat);}
  const statics = [...batch.finish(),...joinedWalls.finish(group)];
  return { seats,lift:lift.userData.lift,workstations,entrances:group.userData.entrance?[group.userData.entrance]:[], group, colliders, interactables, fixtures, wallMeshes, statics, pharmacy:pharmacies[0]||null, pharmacies,bathrooms,operatingSets,
    disposeProps(){for(const props of [...bathrooms,...operatingSets])props.dispose();} };
}
