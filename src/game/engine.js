import * as THREE from 'three';
import { makeLayout, TILE, world, tileAt, key, findPath, edgeKey } from './layout.js';
import { STAFF } from './mission.js';
import { hospitalMaterials, makeHuman, makePlayer, loadCharacters, mesh, material, renderPortrait } from './assets.js';
import { buildHospital } from './hospital.js';
import { HospitalAudio } from './audio.js';
const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export class GameEngine {
  constructor(container, settings, hooks = {}) {
    this.container = container; this.settings = settings; this.hooks = hooks; this.keys = new Set(); this.paused = true; this.mission = null;
    this.floor = 0; this.yaw = Math.PI; this.pitch = -.04; this.flashlight = false; this.aiming = false; this.crouched = false;
    this.ammo = 6; this.reserve = 30; this.reloading = 0; this.shotCooldown = 0; this.stamina = 100; this.impairment = 0; this.blackout = 0;
    this.playerPos = new THREE.Vector3(0, 0, 30); this.time = 0; this.hudClock = 0; this.menuTime = 0; this.npcs = []; this.effects = [];
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#182c3b'); this.scene.fog = new THREE.FogExp2('#182c3b', .009);
    this.camera = new THREE.PerspectiveCamera(58, 1, .08, 90);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.16;
    this.renderer.domElement.setAttribute('aria-label', '3D hospital game. Use WASD to move, E to interact, F for flashlight, and M for map.'); this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);
    this.materials = hospitalMaterials(); this.levels = [0, 1].map(makeLayout); this.hospitals = this.levels.map(l => buildHospital(l, this.materials));
    this.hospitals.forEach((h, i) => { h.group.visible = i === 0; this.scene.add(h.group); });
    this.navLayouts = this.levels.map((layout, floor) => ({ ...layout, cells: new Map([...layout.cells].filter(([, cell]) => { const p = world(cell.x, cell.z); return !this.hospitals[floor].colliders.some(c => !c.object && c.maxX-c.minX>.4 && c.maxZ-c.minZ>.4 && p.x+.26>c.minX && p.x-.26<c.maxX && p.z+.26>c.minZ && p.z-.26<c.maxZ); })) }));
    this.navLayouts.forEach((layout, floor) => {
      layout.blockedEdges = new Set();
      const furniture = this.hospitals[floor].colliders.filter(c => !c.object && c.maxX-c.minX>.4 && c.maxZ-c.minZ>.4);
      for (const cell of layout.cells.values()) for (const [dx,dz] of [[1,0],[0,1]]) {
        const neighbor=layout.cells.get(key(cell.x+dx,cell.z+dz)); if(!neighbor) continue;
        const a=world(cell.x,cell.z), b=world(neighbor.x,neighbor.z);
        if(furniture.some(c=>segmentBox(a.x,a.z,b.x-a.x,b.z-a.z,c,.28)<1)) layout.blockedEdges.add(edgeKey(key(cell.x,cell.z),key(neighbor.x,neighbor.z)));
      }
    });
    this.ambient = new THREE.HemisphereLight('#dbe9f4', '#3e5264', 1.15); this.scene.add(this.ambient);
    this.localLights = Array.from({ length: 6 }, () => { const light = new THREE.PointLight('#cfeaff', 10, 11, 1.5); this.scene.add(light); return light; });
    this.overhead = new THREE.SpotLight('#dcefff', 18, 14, Math.PI / 3, .7, 1.8); this.overhead.castShadow = true; this.overhead.shadow.mapSize.set(1024, 1024); this.overhead.shadow.bias = -.0002; this.overhead.shadow.normalBias = .035; this.scene.add(this.overhead); this.scene.add(this.overhead.target);
    this.rim = new THREE.PointLight('#98bed7', 3, 9, 1.8); this.scene.add(this.rim);
    this.flash = new THREE.SpotLight('#d9eeff', 50, 24, Math.PI / 7, .55, 1.5); this.flash.castShadow = true; this.flash.shadow.mapSize.set(1024, 1024); this.flash.shadow.bias = -.0004; this.flash.shadow.normalBias = .045; this.scene.add(this.flash); this.scene.add(this.flash.target); this.flash.visible = false;
    this.beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 10, 24, 1, true), new THREE.MeshBasicMaterial({color:'#bfdcff',transparent:true,opacity:.025,depthWrite:false,side:THREE.DoubleSide})); this.scene.add(this.beam); this.beam.visible=false;
    const emergencyMat = material('#a94242', { emissive: '#d73232', emissiveIntensity: 2 });
    this.beacon = mesh('sphere', emergencyMat, [.12, .12, .12], [0, 3.3, 0], this.scene); this.beacon.visible = false;
    this.audio = new HospitalAudio(settings);
    this.player = makeHuman({ gender: 'male', accent: '#263a4b' }, 'civilian'); this.scene.add(this.player.root); this.player.root.visible = false;
    this.weapon = new THREE.Group(); mesh('box', material('#25313c', { metalness: .5 }), [.075, .11, .32], [0, 0, .1], this.weapon); mesh('box', material('#1e2731'), [.07, .17, .1], [0, -.1, 0], this.weapon); this.player.root.add(this.weapon); this.weapon.position.set(.35, 1.2, .15); this.weapon.visible = false;
    this.muzzle = new THREE.PointLight('#ddeaff', 0, 6); this.scene.add(this.muzzle);
    this.clock = new THREE.Clock(); this.ready = false; this.error = null;
    this.bindEvents(); this.resize(); this.applySettings(settings);
    this.frame = this.frame.bind(this); this.renderer.setAnimationLoop(this.frame);
    this.assetsPromise = loadCharacters().then(assets => { this.assets = assets; this.ready = true; this.hooks.ready?.(); return assets; });
  }
  bindEvents() {
    this.handlers = {
      keydown: e => {
        if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
        const k = e.code;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(k)) e.preventDefault();
        if (!e.repeat) {
          if (k === 'Escape') { if (this.mission && !this.mission.result) this.hooks.pause?.(); }
          if (!this.paused && this.mission) {
            if (k === 'KeyE') this.interact(); if (k === 'KeyF') this.toggleFlash(); if (k === 'KeyM' || k === 'Tab') { e.stopImmediatePropagation(); this.hooks.map?.(); }
            if (k === 'KeyJ') { e.stopImmediatePropagation(); this.hooks.journal?.(); } if (k === 'KeyR') this.reload(); if (k === 'KeyV') this.aiming = !this.aiming;
            if (k === 'Space') this.shoot();
          }
        }
        this.keys.add(k);
      },
      keyup: e => this.keys.delete(e.code),
      blur: () => { this.keys.clear(); this.aiming = false; if (this.mission && !this.paused && !this.mission.result) this.hooks.pause?.(); },
      resize: () => this.resize(),
      mousemove: e => {
        if (this.paused || !this.mission) return;
        if (document.pointerLockElement === this.renderer.domElement || this.dragging) {
          this.yaw -= e.movementX * .0023 * this.settings.sensitivity; this.pitch = clamp(this.pitch - e.movementY * .002, -.47, .5);
        }
      },
      pointerlockchange: () => this.hooks.lock?.(document.pointerLockElement === this.renderer.domElement),
      visibilitychange: () => { if (document.hidden && this.mission && !this.paused && !this.mission.result) this.hooks.pause?.(); },
      mousedown: e => {
        if (this.paused || !this.mission) return;
        if (e.button === 2) { this.aiming = true; this.dragging = true; }
        if (e.button === 0) { if (this.aiming) this.shoot(); else this.capture(); }
      },
      mouseup: e => { if (e.button === 2) { this.aiming = false; this.dragging = false; } },
      contextmenu: e => e.preventDefault(),
    };
    for (const [name, fn] of Object.entries(this.handlers)) {
      const target = ['mousedown', 'contextmenu'].includes(name) ? this.renderer.domElement : name === 'visibilitychange' || name === 'pointerlockchange' ? document : window;
      target.addEventListener(name, fn);
    }
  }
  capture() { try { this.renderer.domElement.focus(); const promise = this.renderer.domElement.requestPointerLock?.(); promise?.catch?.(() => {}); } catch {} }
  resize() { const w = this.container.clientWidth, h = this.container.clientHeight; this.camera.aspect = w / Math.max(1, h); this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h); }
  applySettings(settings) {
    this.settings = settings; this.audio.setSettings(settings);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, settings.quality === 'high' ? 1.7 : settings.quality === 'balanced' ? 1.25 : 1));
    this.renderer.shadowMap.enabled = settings.quality !== 'low'; this.resize();
  }
  async start(mission, gender) {
    await this.assetsPromise;
    this.clearNPCs(); this.scene.remove(this.player.root); this.player = makePlayer(this.assets, gender); this.scene.add(this.player.root);
    this.player.root.add(this.weapon); this.weapon.position.set(.33, 1.23, .15);
    this.mission = mission; this.playerPos.set(0, 0, 30); this.yaw = Math.PI; this.pitch = -.06;
    this.setFloor(0); this.paused = true; this.aiming = false; this.keys.clear(); this.crouched = false;
    this.ammo = 6; this.reserve = 30; this.reloading = 0; this.shotCooldown = 0; this.stamina = 100; this.impairment = 0; this.blackout = 0; this.flashlight = false;
    this.nextBlackout = 28 + mission.random() * 25; this.nextPA = 18; this.coughCooldown = 12; this.policeSpawned = false; this.captureTime = 0;
    this.visited = new Set(); this.npcClock = 0;
    for (const layout of this.levels) for (const d of layout.doors) { d.open = d.id.endsWith('-back'); d.angle = d.open ? -Math.PI / 2 : 0; d.pivot.rotation.y = d.angle; }
    this.spawnNPCs(); this.player.root.visible = true;
    this.camera.position.set(.6, 2.4, 33.5); this.updateCamera(.1, true);
    await this.renderer.compileAsync(this.scene, this.camera); this.paused = false; this.clock.getDelta();
    await this.audio.start(); this.audio.settings.suppressor = !!mission.save.upgrades.suppressor;
    this.say('Welcome to Northline. Visitor services are located in the main atrium. Please keep all corridors clear.', 'PUBLIC ADDRESS');
    this.emitHUD();
  }
  setFloor(floor) {
    this.floor = floor; this.hospitals.forEach((h, i) => h.group.visible = i === floor);
    this.npcs.forEach(n => n.visual.root.visible = n.floor === floor && !n.dead);
    this.flash.shadow.needsUpdate = true;
  }
  pause(value) { this.paused = value; this.keys.clear(); this.aiming = false; this.audio.pause(value); if (value) document.exitPointerLock?.(); }
  stop() { this.pause(true); this.mission = null; this.player.root.visible = false; this.clearNPCs(); this.flashlight = false; this.blackout = 0; this.setFloor(0); }
  clearNPCs() { for (const n of this.npcs) this.scene.remove(n.visual.root); this.npcs = []; }
  spawnNPCs() {
    const mission = this.mission;
    const spawn = (person, role, floor, pos, room, id) => {
      const visual = makePlayer(this.assets, person.gender || 'male', person, role);
      const candidates = [...this.navLayouts[floor].cells.values()].filter(c => !room || c.room === room.id);
      const nearest = candidates.map(c => world(c.x,c.z)).sort((a,b) => distance(a,pos)-distance(b,pos))[0];
      const spawnPos = nearest || pos; visual.root.position.set(spawnPos.x, 0, spawnPos.z); this.scene.add(visual.root);
      const npc = { id, name: person.name || (role === 'patient' ? 'Visitor / patient' : 'Hospital security'), role, person, floor, pos: visual.root.position, visual, room, path: [], cursor: 0, wait: mission.random() * 6, dead: false, speed: role === 'security' ? 1.35 : .8 + mission.random() * .4, nextCough: mission.random() * 20, home: { x: pos.x, z: pos.z }, routine: 0 };
      visual.root.visible = floor === this.floor; this.npcs.push(npc); return npc;
    };
    for (let floor = 0; floor < 2; floor++) {
      const layout = this.levels[floor];
      for (const room of layout.rooms) {
        const aliases = ['Dr. Simon Avery', 'Dr. Nina Walsh', 'Dr. Mateo Ruiz', 'Nurse Lina Park', 'Dr. Clara Moss', 'Nurse Owen Finch', 'Dr. Isaac Rowe', 'Nurse Zoe Lane'];
        const person = { ...STAFF[(room.index + floor * 2 + 1) % STAFF.length], name: aliases[room.index].replace(/Dr\.|Nurse/, STAFF[(room.index + floor * 2 + 1) % STAFF.length].name.startsWith('Nurse') ? 'Nurse' : 'Dr.') };
        if (floor) person.name = person.name.replace(/(Avery|Walsh|Ruiz|Park|Moss|Finch|Rowe|Lane)$/, 'Bennett');
        const isTarget = mission.target.floor === floor && mission.target.room.id === room.id;
        if (isTarget) spawn(mission.target, mission.target.name.startsWith('Nurse') ? 'nurse' : 'doctor', floor, { x: room.center.x, z: room.center.z + (room.kind === 'imaging' ? 4 : -1.5) }, room, 'target');
        else if (!['utility', 'morgue'].includes(room.kind)) spawn(person, person.name.startsWith('Nurse') ? 'nurse' : 'doctor', floor, { x: room.center.x, z: room.center.z + (room.kind === 'imaging' ? 4 : -1.5) }, room, `staff-${floor}-${room.index}`);
      }
      for (const [i, p] of [[0, { x: 4.7, z: 18 }], [1, { x: -20, z: 1.7 }], [2, { x: 22, z: -2 }], [3, { x: 7, z: 29 }]]) spawn({ gender: i % 2 ? 'female' : 'male', skin: i % 2 ? '#bf8c6c' : '#d9b296', hair: '#62594e' }, 'patient', floor, p, null, `patient-${floor}-${i}`);
      for (const [i, p] of [[0, world(10, 8)], [1, world(3, 14)]]) spawn({ skin: '#bd9275', hair: '#302b26' }, 'security', floor, p, null, `security-${floor}-${i}`);
    }
  }
  say(text, label = 'PUBLIC ADDRESS') { this.hooks.announcement?.({ text, label }); this.audio.announce(text); }
  notify(text, kind = 'info') { this.hooks.notify?.({ text, kind }); }
  toggleFlash() { this.flashlight = !this.flashlight; this.audio.tone(450, .04, .035); this.emitHUD(); }
  triggerBlackout(duration = 16) {
    this.blackout = duration; this.mission.blackoutCount++; this.audio.sound('blackout');
    this.say('A power fault has been reported. Emergency lighting is active. Please remain calm.', 'POWER INTERRUPTION'); this.notify('Power interrupted · F to use your flashlight', 'warning');
  }
  triggerCough() {
    if (this.impairment > 0) return;
    this.impairment = 4.5 * Math.pow(.75, this.mission.save.upgrades.filter); this.coughCooldown = 22; this.audio.sound('cough');
    this.notify('Patient coughing · temporary sensory disturbance', 'warning');
  }
  nearestInteractable() {
    let best = null, dist = 2.45;
    for (const i of this.hospitals[this.floor].interactables) {
      const d = distance(this.playerPos, i); if (d < dist) { best = i; dist = d; }
    }
    for (const n of this.npcs) {
      if (n.floor !== this.floor || n.dead) continue;
      const d = distance(this.playerPos, n.pos); if (d < 2.3 && (d < dist || best?.type === 'door' && best.door.open) && this.lineOfSight(this.playerPos, n.pos)) { best = { type: 'npc', npc: n, x: n.pos.x, z: n.pos.z, label: 'Inspect staff badge' }; dist = d; }
    }
    return best;
  }
  interact() {
    const i = this.nearestInteractable(); if (!i || this.paused) return;
    if (i.type === 'door') { i.door.open = !i.door.open; this.audio.sound('door'); }
    if (['directory', 'schedule', 'log'].includes(i.type)) {
      const clue = this.mission.clue(i.type);
      if (clue) { this.audio.sound('clue'); this.hooks.clue?.(clue); this.notify(clue.title, 'clue'); }
      else this.notify('Already recorded in your evidence journal · J');
    }
    if (i.type === 'npc') {
      const n = i.npc;
      if (n.role === 'patient') this.notify('Patient / visitor · protected. Harming a patient ends the mission.', 'warning');
      else if (n.role === 'security' || n.role === 'police') this.notify('Security personnel · stay out of their sight.');
      else if (n.id === 'target') { this.mission.identify(); this.audio.sound('clue'); this.notify(`Identity confirmed · ${n.name}`, 'clue'); this.hooks.badge?.({ name: n.name, target: true, role: n.person.role }); }
      else this.hooks.badge?.({ name: n.name, target: false, role: n.person.role });
    }
    if (i.type === 'elevator') {
      const dest = 1 - this.floor; this.setFloor(dest); this.playerPos.set(this.levels[dest].elevator.x, 0, this.levels[dest].elevator.z + 3); this.yaw = 0; this.audio.sound('door'); this.hooks.transition?.(); this.updateCamera(.2, true); this.notify(`${dest ? 'First' : 'Ground'} floor · ${dest ? 'Specialist care' : 'Clinical & diagnostics'}`);
    }
    if (i.type === 'exit') {
      if (this.mission.targetDown) this.completeEscape(); else this.notify('Your assignment is still active. Identify and eliminate the assigned target first.');
    }
    this.emitHUD();
  }
  reload() { if (this.reloading || this.ammo === 6 || this.reserve <= 0) return; this.reloading = 1.4; this.audio.sound('reload'); }
  shoot() {
    if (!this.aiming || this.paused || this.mission.result || this.shotCooldown || this.reloading) return;
    if (!this.ammo) { this.audio.sound('empty'); this.notify('Magazine empty · R to reload'); return; }
    this.ammo--; this.shotCooldown = .32; this.audio.sound('shot'); this.muzzle.intensity = 12;
    this.muzzle.position.copy(this.playerPos).add(new THREE.Vector3(Math.sin(this.yaw) * .8, 1.5, Math.cos(this.yaw) * .8));
    this.hooks.shot?.();
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    let best = null, closest = 28;
    for (const n of this.npcs) {
      if (n.floor !== this.floor || n.dead) continue;
      const center = n.pos.clone().add(new THREE.Vector3(0, 1.1, 0));
      const sphere = new THREE.Sphere(center, .64), hit = ray.ray.intersectSphere(sphere, new THREE.Vector3());
      if (!hit) continue;
      const d = hit.distanceTo(this.camera.position);
      if (d < closest && this.lineOfSight(this.playerPos, n.pos)) { closest = d; best = n; }
    }
    // A visible, short-lived tracer makes aim direction legible.
    const end = ray.ray.origin.clone().addScaledVector(ray.ray.direction, best ? closest : 18);
    const geometry = new THREE.BufferGeometry().setFromPoints([this.muzzle.position.clone(), end]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#ddefff', transparent: true, opacity: .65 })); this.scene.add(line); this.effects.push({ mesh: line, life: .085 });
    if (best) {
      const before = this.mission.state;
      this.mission.eliminate(best);
      if (!['security', 'police', 'patient'].includes(best.role)) { best.dead = true; best.falling = 1; best.visual.root.rotation.z = 0; this.hooks.hit?.(); }
      if (before !== 'escape' && this.mission.state === 'escape') {
        this.say('Code blue. Security incident reported. All staff follow emergency protocol. Police units are responding.', 'EMERGENCY PROTOCOL');
        this.notify('Target eliminated · reach the main entrance', 'danger'); this.hooks.emergency?.();
      } else if (!this.mission.result && best.id !== 'target') this.notify(best.role === 'patient' ? 'Patient harmed' : 'Incident reported · security is responding', 'danger');
      if (this.mission.result) this.finish();
    } else { this.mission.suspicion = Math.min(100, this.mission.suspicion + (this.mission.save.upgrades.suppressor ? 8 : 20)); }
    this.emitHUD();
  }
  lineOfSight(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z;
    for (const c of this.hospitals[this.floor].colliders) {
      if (c.object?.open) continue;
      const tiny = c.maxX - c.minX < .4 || c.maxZ - c.minZ < .4;
      if (!tiny && !c.object) continue;
      if (segmentBox(a.x, a.z, dx, dz, c, .01) < 1) return false;
    }
    return true;
  }
  canStand(x, z, radius = .27) {
    const cell = tileAt(x, z); if (!this.levels[this.floor].cells.has(key(cell.x, cell.z))) return false;
    for (const c of this.hospitals[this.floor].colliders) {
      if (c.object?.open) continue;
      if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) return false;
    }
    return true;
  }
  move(dx, dz) {
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / .12) || 1;
    for (let i = 0; i < steps; i++) {
      if (this.canStand(this.playerPos.x + dx / steps, this.playerPos.z)) this.playerPos.x += dx / steps;
      if (this.canStand(this.playerPos.x, this.playerPos.z + dz / steps)) this.playerPos.z += dz / steps;
    }
  }
  updatePlayer(dt) {
    if (this.keys.has('ArrowLeft')) this.yaw += dt * 1.9; if (this.keys.has('ArrowRight')) this.yaw -= dt * 1.9;
    const f = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const strafe = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    const moving = f !== 0 || strafe !== 0; this.crouched = this.keys.has('KeyC');
    const running = moving && !this.crouched && !this.aiming && this.stamina > 1 && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
    const modifier = 1 + this.mission.save.upgrades.shoes * .08;
    const speed = (running ? 5.5 : this.crouched ? 1.3 : this.aiming ? 1.65 : 2.8) * modifier * (this.impairment > 0 ? .53 : 1);
    const amount = Math.hypot(f, strafe) || 1;
    const old = this.playerPos.clone();
    this.move((Math.sin(this.yaw) * f - Math.cos(this.yaw) * strafe) * speed * dt / amount, (Math.cos(this.yaw) * f + Math.sin(this.yaw) * strafe) * speed * dt / amount);
    const actual = this.playerPos.distanceTo(old) / dt;
    this.stamina = clamp(this.stamina + dt * (running ? -17 : 23), 0, 100);
    this.player.root.position.copy(this.playerPos); this.player.root.position.y = this.crouched ? -.24 : 0;
    const desiredYaw = this.aiming || !moving ? this.yaw : Math.atan2(Math.sin(this.yaw) * f - Math.cos(this.yaw) * strafe, Math.cos(this.yaw) * f + Math.sin(this.yaw) * strafe);
    this.player.root.rotation.y += Math.atan2(Math.sin(desiredYaw - this.player.root.rotation.y), Math.cos(desiredYaw - this.player.root.rotation.y)) * Math.min(1, dt * 12);
    this.player.setAim?.(this.aiming); this.player.animate(this.time, actual, dt); this.weapon.visible = this.aiming;
    if (this.aiming && this.player.hand) { this.player.root.updateMatrixWorld(true); const grip = this.player.hand.getWorldPosition(new THREE.Vector3()); this.player.root.worldToLocal(grip); this.weapon.position.copy(grip).add(new THREE.Vector3(0,0,.04)); }
    this.visited.add(`${this.floor}:${key(tileAt(this.playerPos.x, this.playerPos.z).x, tileAt(this.playerPos.x, this.playerPos.z).z)}`);
    this.audio.update(dt, this.proximity(), this.mission.state === 'escape', this.impairment > 0, actual > .1, running);
    if (this.floor === 0 && this.mission.targetDown && distance(this.playerPos, this.levels[0].exit) < 1.9) this.completeEscape();
    return { moving, running };
  }
  proximity() { const target = this.npcs.find(n => n.id === 'target'); return target && target.floor === this.floor && !target.dead ? clamp(1 - distance(this.playerPos, target.pos) / 24, 0, 1) : 0; }
  updateCamera(dt, snap = false) {
    const aiming = this.aiming, back = aiming ? 1.7 : this.mission?.state === 'escape' ? 3.7 : 3.25;
    const shoulder = aiming ? .65 : .62;
    const focus = this.playerPos.clone().add(new THREE.Vector3(0, this.crouched ? 1.2 : 1.6, 0));
    const desired = focus.clone().add(new THREE.Vector3(-Math.sin(this.yaw) * back + Math.cos(this.yaw) * shoulder, (aiming ? .18 : .72) - this.pitch * 2.5, -Math.cos(this.yaw) * back - Math.sin(this.yaw) * shoulder));
    const dx = desired.x - focus.x, dz = desired.z - focus.z;
    let fraction = 1;
    for (const c of this.hospitals[this.floor].colliders) { if (c.object?.open || (!c.object && c.maxX - c.minX > .5 && c.maxZ - c.minZ > .5)) continue; fraction = Math.min(fraction, segmentBox(focus.x, focus.z, dx, dz, c, .12)); }
    if (fraction < 1) { desired.x = focus.x + dx * Math.max(.08, fraction - .045); desired.z = focus.z + dz * Math.max(.08, fraction - .045); }
    this.camera.position.lerp(desired, snap ? 1 : 1 - Math.exp(-dt * 11));
    const look = focus.clone().add(new THREE.Vector3(Math.sin(this.yaw) * (aiming ? 12 : 4), this.pitch * (aiming ? 12 : 4), Math.cos(this.yaw) * (aiming ? 12 : 4)));
    this.camera.lookAt(look); this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, aiming ? 48 : 58, Math.min(1, dt * 9)); this.camera.updateProjectionMatrix();
    this.flash.position.copy(focus).add(new THREE.Vector3(Math.sin(this.yaw) * .35, -.15, Math.cos(this.yaw) * .35)); this.flash.target.position.copy(look);
    this.rim.position.copy(focus).add(new THREE.Vector3(0, 1, 0));
    this.player.root.traverse(o => { if (o.isMesh && o.material) o.visible = this.camera.position.distanceTo(focus) > .7; });
  }
  updateNPCs(dt) {
    const mission = this.mission;
    for (const n of this.npcs) {
      if (n.dead) { if (n.falling > 0) { n.falling = Math.max(0, n.falling - dt * 2); n.visual.root.rotation.z = (1 - n.falling) * Math.PI / 2; n.visual.root.position.y = -.4 * (1 - n.falling); } continue; }
      const layout = this.navLayouts[n.floor]; const local = n.floor === this.floor; const d = local ? distance(this.playerPos, n.pos) : 100;
      n.visual.root.visible = local && d < 34;
      let speed = 0;
      const hostile = (n.role === 'police' || n.role === 'security') && (mission.state === 'escape' || mission.suspicion > 80);
      n.wait -= dt;
      if (hostile && local && n.wait < 0) {
        n.path = findPath(layout, tileAt(n.pos.x, n.pos.z), tileAt(this.playerPos.x, this.playerPos.z)); n.cursor = 1; n.wait = .85;
      } else if (!hostile && n.cursor >= n.path.length && n.wait < 0) {
        const start = tileAt(n.pos.x, n.pos.z); let end;
        if (n.room && (n.id === 'target' || n.routine % 3 !== 2)) {
          const candidates = [...layout.cells.values()].filter(c => c.room === n.room.id);
          const candidate = candidates[Math.floor(mission.random() * candidates.length)]; end = candidate || start;
        } else {
          const spots = [[10, 6], [11, 14], [3, 10], [18, 11], [10, 19], [3, 5], [18, 17]]; const p = spots[Math.floor(mission.random() * spots.length)]; end = { x: p[0], z: p[1] };
        }
        n.path = findPath(layout, start, end); n.cursor = 1; n.wait = mission.random() * 5 + 2; n.routine++;
      }
      const destination = n.path[n.cursor];
      if (destination) {
        const p = world(destination.x, destination.z), dist = distance(n.pos, p);
        const current = n.path[Math.max(0, n.cursor - 1)], door = layout.doorEdges.get(edgeKey(key(current.x, current.z), key(destination.x, destination.z)));
        if (door && dist < 4) door.open = true;
        speed = hostile ? mission.difficulty === 'hard' ? 3.6 : 2.65 : mission.state === 'escape' && n.role !== 'patient' ? 1.8 : n.speed;
        if (dist < speed * dt + .04) { n.pos.x = p.x; n.pos.z = p.z; n.cursor++; }
        else { const dx = p.x - n.pos.x, dz = p.z - n.pos.z; n.pos.x += dx / dist * speed * dt; n.pos.z += dz / dist * speed * dt; n.visual.root.rotation.y = Math.atan2(dx, dz); }
      }
      n.visual.animate(this.time + n.routine, speed, dt);
      if (local && n.role === 'patient' && d < 2.3 && this.coughCooldown <= 0 && n.nextCough <= mission.elapsed) { this.triggerCough(); n.nextCough = mission.elapsed + 30; }
      if (local && n.role === 'security' && d < 5 && this.keys.has('ShiftLeft') && mission.state !== 'escape') mission.suspicion = Math.min(100, mission.suspicion + dt * (this.mission.save.upgrades.shoes ? 2 : 4));
      if (hostile && local && d < .85 && this.lineOfSight(n.pos, this.playerPos)) this.captureTime += dt;
    }
    this.captureTime = Math.max(0, this.captureTime - dt * .3);
    if (this.captureTime > 1.1) { this.mission.finish(false, 'Security intercepted you before you reached safety.'); this.finish(); }
  }
  spawnPolice() {
    const visual = makePlayer(this.assets, 'male', { skin: '#c89a78', hair: '#232b30' }, 'police'); visual.root.position.set(-21, 0, 0); this.scene.add(visual.root);
    this.npcs.push({ id: 'police', role: 'police', name: 'Police response', floor: 0, pos: visual.root.position, visual, path: [], cursor: 0, wait: 0, dead: false, speed: 2.6 }); visual.root.visible = this.floor === 0;
    this.policeSpawned = true; this.say('Police response team entering the west wing. All exits will be secured shortly.', 'SECURITY RESPONSE');
  }
  updateEnvironment(dt) {
    this.blackout = Math.max(0, this.blackout - dt); this.impairment = Math.max(0, this.impairment - dt); this.coughCooldown -= dt;
    if (this.mission.elapsed > this.nextBlackout && this.mission.state !== 'escape') { this.triggerBlackout(); this.nextBlackout = this.mission.elapsed + 75 + this.mission.random() * 40; }
    if (this.mission.elapsed > this.nextPA && this.mission.state !== 'escape') {
      const name = this.mission.target.name;
      this.say(this.mission.clues.length ? `${name}, please return to ${this.mission.target.room.name}. Your next consultation is waiting.` : 'Visitors: the staff directory is available in the entrance atrium. Please check department signage before proceeding.');
      this.nextPA = this.mission.elapsed + 45;
    }
    if (this.mission.state === 'escape' && this.mission.timer < 45 && !this.policeSpawned) this.spawnPolice();
    if (this.reloading > 0) { this.reloading -= dt; if (this.reloading <= 0) { const refill = Math.min(6 - this.ammo, this.reserve); this.ammo += refill; this.reserve -= refill; this.reloading = 0; } }
    this.shotCooldown = Math.max(0, this.shotCooldown - dt); this.muzzle.intensity = Math.max(0, this.muzzle.intensity - dt * 100);
    for (const d of this.levels[this.floor].doors) { d.angle = THREE.MathUtils.damp(d.angle, d.open ? -Math.PI / 2 : 0, 9, dt); d.pivot.rotation.y = d.angle; }
  }
  updateLights() {
    const dark = this.blackout > 0, emergency = this.mission?.state === 'escape';
    this.ambient.intensity = dark ? .14 : .95; this.ambient.color.set(dark ? '#50647e' : '#d3e3f0'); this.rim.intensity = dark ? .3 : 2.5;
    this.materials.light.emissiveIntensity = dark ? .015 : 1.6;
    const lightAnchor = this.mission ? this.playerPos : this.camera.position;
    const near = this.hospitals[this.floor].fixtures.map(p => ({ p, d: p.distanceToSquared(lightAnchor) })).sort((a, b) => a.d - b.d);
    this.localLights.forEach((light, i) => {
      light.position.copy(near[i]?.p || this.playerPos); light.intensity = dark ? .05 : emergency && i % 3 === 0 ? 7 + Math.sin(this.time * 5) * 3 : 10;
      light.color.set(emergency && i % 3 === 0 ? '#ef7373' : '#d5edff');
    });
    this.overhead.position.copy(near[0]?.p || lightAnchor); this.overhead.target.position.copy(lightAnchor); this.overhead.target.position.y = 0; this.overhead.intensity = dark ? 0 : 18;
    this.flash.visible = this.flashlight; this.flash.intensity = 45 + (this.mission?.save.upgrades.light || 0) * 20; this.flash.distance = 24 + (this.mission?.save.upgrades.light || 0) * 5;
    this.beam.visible = this.flashlight && dark;
    const beamDirection=this.flash.target.position.clone().sub(this.flash.position).normalize(); this.beam.position.copy(this.flash.position).addScaledVector(beamDirection,5);this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),beamDirection);
    this.beacon.visible = emergency; this.beacon.position.copy(this.playerPos).add(new THREE.Vector3(0, 3.35, 6));
  }
  completeEscape() { if (!this.mission?.result) { this.mission.escape(); this.finish(); } }
  finish() { if (!this.mission?.result || this.paused) return; this.pause(true); this.hooks.result?.(this.mission.result); }
  emitHUD() {
    if (!this.mission) return;
    const i = this.nearestInteractable(), cell = this.levels[this.floor].cells.get(key(tileAt(this.playerPos.x, this.playerPos.z).x, tileAt(this.playerPos.x, this.playerPos.z).z));
    const room = this.levels[this.floor].rooms.find(r => r.id === cell?.room);
    const objective = this.mission.state === 'escape' ? 'Return to the main entrance' : this.mission.identified ? 'Eliminate the confirmed target' : this.mission.clues.length ? `Investigate ${this.mission.target.room.name}` : 'Find the staff directory';
    const prompt = !i ? null : { type: i.type, text: i.type === 'door' ? `${i.door.open ? 'Close' : 'Open'} · ${i.label}` : i.type === 'npc' ? i.npc.role === 'patient' ? 'Patient · protected' : 'Inspect badge' : i.label };
    this.hooks.hud?.({ state: this.mission.state, objective, location: room?.name || (this.playerPos.z > 26 ? 'Main atrium' : this.playerPos.x < -6 ? 'West passage' : this.playerPos.x > 9 ? 'East passage' : 'Central concourse'), floor: this.floor, x: this.playerPos.x, z: this.playerPos.z, yaw: this.yaw, timer: this.mission.timer, elapsed: this.mission.elapsed, stamina: this.stamina, suspicion: this.mission.suspicion, flashlight: this.flashlight, blackout: this.blackout, impairment: this.impairment, aiming: this.aiming, ammo: this.ammo, reserve: this.reserve, reloading: this.reloading > 0, prompt, proximity: this.proximity(), crouched: this.crouched, targetConfirmed: this.mission.identified, clues: this.mission.clues.length });
  }
  frame() {
    const dt = Math.min(this.clock.getDelta(), .05); this.time += dt;
    if (this.mission && !this.paused && !this.mission.result) {
      this.mission.tick(dt); if (this.mission.result) this.finish();
      else { this.updatePlayer(dt); if (!this.mission.result) { this.updateNPCs(dt); this.updateEnvironment(dt); this.updateCamera(dt); } }
      this.hudClock += dt; if (this.hudClock > .07) { this.emitHUD(); this.hudClock = 0; }
    } else if (!this.mission) {
      this.menuTime += dt; this.camera.position.set(.3 + Math.sin(this.menuTime * .06) * .3, 1.72, 22); this.camera.lookAt(.2, 1.6, -10);
    }
    this.updateLights();
    for (let i = this.effects.length - 1; i >= 0; i--) { const e = this.effects[i]; e.life -= dt; if (e.life <= 0) { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); this.effects.splice(i, 1); } }
    this.renderer.render(this.scene, this.camera);
  }
  portrait(person, role = 'doctor') { return renderPortrait(this.renderer, this.assets, person, role); }
  dispose() {
    this.renderer.setAnimationLoop(null); this.audio.dispose();
    for (const [name, fn] of Object.entries(this.handlers)) { const target = ['mousedown', 'contextmenu'].includes(name) ? this.renderer.domElement : name === 'visibilitychange' || name === 'pointerlockchange' ? document : window; target.removeEventListener(name, fn); }
    this.scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material?.dispose(); } }); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
function segmentBox(x, z, dx, dz, c, pad = 0) {
  let low = 0, high = 1;
  for (const [p, d, min, max] of [[x, dx, c.minX - pad, c.maxX + pad], [z, dz, c.minZ - pad, c.maxZ + pad]]) {
    if (Math.abs(d) < .000001) { if (p < min || p > max) return 1; }
    else { const a = (min - p) / d, b = (max - p) / d; low = Math.max(low, Math.min(a, b)); high = Math.min(high, Math.max(a, b)); if (low > high) return 1; }
  }
  return low > .005 && low < 1 ? low : 1;
}
