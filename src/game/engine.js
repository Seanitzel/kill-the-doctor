import {makeNavigation,segmentBox} from './navigation.js';
import {obstacleBounds,circleOverlaps,cameraFraction,segmentHit3D,blocksBody,interactionScore} from './collision.js';
import * as THREE from 'three';
import { makeLayout, TILE, world, tileAt, key, findPath, edgeKey, FLOORS, FLOOR_THEMES } from './layout.js';
import {profileFor,weaponInfo,maskProtects,STAFF_BONUS} from './loadout.js';
import {MissionSystems} from './systems.js';
import {weaponModel,playerAccessories} from './gear.js';
import { STAFF } from './mission.js';
import { hospitalMaterials, makeHuman, makePlayer, loadCharacters, mesh, material, renderPortrait } from './assets.js';
import { buildHospital } from './hospital.js';
import { HospitalLife } from './atmosphere.js';
import { exposureDuration, recoveryStrength } from './life-rules.js';
import { createTouchInput } from '../mobile/input.js';
import { touchDevice } from '../mobile/platform.js';
import { HospitalAudio } from './audio.js';
const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export class GameEngine {
  constructor(container, settings, hooks = {}) {
    this.cameraRevision='northline-v2';this.mobile=touchDevice();this.touchInput=createTouchInput();this.inputEvents={move:0,look:0,shot:0};this.performance={frames:0,fps:0,last:performance.now()};
    this.container = container; this.settings = settings; this.hooks = hooks; this.keys = new Set(); this.paused = true; this.mission = null;
    this.floor = 0; this.yaw = Math.PI; this.pitch = -.04; this.flashlight = false; this.aiming = false; this.crouched = false;
    this.ammo = 6; this.reserve = 30; this.reloading = 0; this.shotCooldown = 0; this.stamina = 100; this.impairment = 0; this.blackout = 0;
    this.playerPos = new THREE.Vector3(0, 0, 30); this.time = 0; this.hudClock = 0; this.menuTime = 0; this.npcs = []; this.effects = [];
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#182c3b'); this.scene.fog = new THREE.FogExp2('#182c3b', .009);
    this.camera = new THREE.PerspectiveCamera(58, 1, .08, 90);
    this.renderSize = new THREE.Vector2();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.16;
    this.renderer.domElement.setAttribute('aria-label', this.mobile ? '3D hospital game. Move with the joystick, drag to look, and tap USE to interact.' : '3D hospital game. Use WASD to move, E to interact, F for flashlight, and M for map.'); this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);
    this.materials = hospitalMaterials(); this.levels = FLOORS.map((_,i)=>makeLayout(i)); this.hospitals = this.levels.map(l => buildHospital(l, this.materials));
    this.hospitals.forEach((h, i) => { h.group.visible = i === 0; this.scene.add(h.group); });
    this.navLayouts=this.levels.map((layout,floor)=>makeNavigation(layout,this.hospitals[floor].colliders));
    this.ambient = new THREE.HemisphereLight('#dbe9f4', '#3e5264', 1.15); this.scene.add(this.ambient);
    this.localLights = Array.from({ length: this.mobile ? 3 : 6 }, () => { const light = new THREE.PointLight('#cfeaff', 10, 11, 1.5); this.scene.add(light); return light; });
    this.overhead = new THREE.SpotLight('#dcefff', 18, 14, Math.PI / 3, .7, 1.8); this.overhead.castShadow = true; this.overhead.shadow.mapSize.set(1024, 1024); this.overhead.shadow.bias = -.0002; this.overhead.shadow.normalBias = .035; this.scene.add(this.overhead); this.scene.add(this.overhead.target);
    this.rim = new THREE.PointLight('#98bed7', 3, 9, 1.8); this.scene.add(this.rim);
    this.flash = new THREE.SpotLight('#d9eeff', 50, 24, Math.PI / 7, .55, 1.5); this.flash.castShadow = true; this.flash.shadow.mapSize.set(1024, 1024); this.flash.shadow.bias = -.0004; this.flash.shadow.normalBias = .045; this.scene.add(this.flash); this.scene.add(this.flash.target); this.flash.visible = false;
    this.beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 10, 24, 1, true), new THREE.MeshBasicMaterial({color:'#bfdcff',transparent:true,opacity:.025,depthWrite:false,side:THREE.DoubleSide})); this.scene.add(this.beam); this.beam.visible=false;
    const emergencyMat = material('#a94242', { emissive: '#d73232', emissiveIntensity: 2 });
    this.beacon = mesh('sphere', emergencyMat, [.12, .12, .12], [0, 3.3, 0], this.scene); this.beacon.visible = false;
    this.audio = new HospitalAudio(settings);
    this.player = makeHuman({ gender: 'male', accent: '#263a4b' }, 'civilian'); this.scene.add(this.player.root); this.player.root.visible = false;
    this.weaponKind='pistol';this.weaponDrawn=false;this.weapon=weaponModel('pistol');this.player.root.add(this.weapon);this.weapon.visible=false;
    this.muzzle = new THREE.PointLight('#ddeaff', 0, 6); this.scene.add(this.muzzle);
    this.clock = new THREE.Clock(); this.ready = false; this.error = null;
    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    window.visualViewport?.addEventListener('resize',this.handlers.resize);
    this.resize(); this.applySettings(settings);
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
            if (k === 'KeyJ') { e.stopImmediatePropagation(); this.hooks.journal?.(); } if (k === 'KeyR') this.reload(); if (k === 'KeyV') this.toggleAim(); if(k==='KeyG')this.toggleWeapon(); if(k==='KeyQ')this.switchWeapon(); if(k==='KeyB')this.toggleMask();
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
        if (this.paused || !this.mission || this.mobile) return;
        if (e.button === 2) { this.setAiming(true); this.dragging = true; }
        if (e.button === 0) { if (this.aiming) this.shoot(); else this.capture(); }
      },
      mouseup: e => { if (e.button === 2) { this.setAiming(false); this.dragging = false; } },
      contextmenu: e => e.preventDefault(),
    };
    for (const [name, fn] of Object.entries(this.handlers)) {
      const target = ['mousedown', 'contextmenu'].includes(name) ? this.renderer.domElement : name === 'visibilitychange' || name === 'pointerlockchange' ? document : window;
      target.addEventListener(name, fn);
    }
  }
  capture() { if(this.mobile)return; try { this.renderer.domElement.focus(); const promise = this.renderer.domElement.requestPointerLock?.(); promise?.catch?.(() => {}); } catch {} }
  resize() {
    const w=this.container.clientWidth,h=this.container.clientHeight;
    if(!w||!h)return;
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    // CSS owns canvas size. Inline pixel heights become stale on iOS browser toolbars.
    this.renderer.setSize(w,h,false);
  }
  syncViewport() {
    const w=this.container.clientWidth,h=this.container.clientHeight;
    const size=this.renderer.getSize(this.renderSize);
    if(w&&h&&(size.x!==w||size.y!==h||Math.abs(this.camera.aspect-w/h)>.001))this.resize();
  }
  applySettings(settings) {
    this.settings = settings; this.audio.setSettings(settings);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.mobile ? settings.quality==='high'?1.3:settings.quality==='balanced'?1:.75 : settings.quality === 'high' ? 1.7 : settings.quality === 'balanced' ? 1.25 : 1));
    this.renderer.shadowMap.enabled = settings.quality !== 'low';if(this.mobile){this.flash.shadow.mapSize.set(512,512);this.overhead.shadow.mapSize.set(512,512);} this.resize();
  }
  async start(mission, gender) {
    await this.assetsPromise;
    this.clearNPCs(); this.playerGear?.dispose();this.scene.remove(this.player.root); const profile=profileFor(mission.save);this.player = makePlayer(this.assets,profile.gender,profile); this.scene.add(this.player.root);this.playerGear=playerAccessories(this.player);
    this.player.root.add(this.weapon); this.weapon.position.set(.33, 1.23, .15);
    this.mission = mission; this.playerPos.set(0, 0, 30); this.yaw = Math.PI; this.pitch = -.06;this.player.root.position.copy(this.playerPos);
    this.setFloor(0); this.paused = true; this.aiming = false;this.weaponDrawn=false;this.weaponSlots={};this.setWeapon(mission.save.loadout?.weapon||'pistol',true); this.keys.clear(); this.crouched = false;
    const info=weaponInfo(mission.save);this.ammo=info.capacity;this.reserve=info.reserve;this.reloading=0;this.shotCooldown=0;this.maxStamina=100+(mission.save.upgrades.vitals||0)*25;this.stamina=this.maxStamina;this.impairment=0;this.blackout=0;this.flashlight=false;
    this.nextBlackout = 28 + mission.random() * 25; this.nextPA = 18; this.coughCooldown = 3; this.impairmentTotal=0; this.exposureSource=null; this.policeSpawned = false; this.captureTime = 0;
    this.visited = new Set(); this.npcClock = 0;
    for(const layout of this.levels)for(const d of layout.doors){d.open=d.id.endsWith('-back');d.angle=d.open?d.openAngle:0;d.pivot.rotation.y=d.angle;}
    this.spawnNPCs(); this.life=new HospitalLife(this);this.systems=new MissionSystems(this);this.systems.prepare();this.playerGear.update(mission.save); this.player.root.visible = true;
    this.camera.position.set(.6, 2.4, 33.5); this.updateCamera(.1, true);
    await this.renderer.compileAsync(this.scene, this.camera); this.paused = false; this.clock.getDelta();
    await this.audio.start(); this.audio.settings.suppressor = !!mission.save.upgrades.suppressor;
    this.say('Welcome to Northline. Visitor services are located in the main atrium. Please keep all corridors clear.', 'PUBLIC ADDRESS');
    this.emitHUD();
  }
  setFloor(floor) {
    this.floor = floor; this.hospitals.forEach((h, i) => h.group.visible = i === floor);
    this.npcs.forEach(n => n.visual.root.visible = n.floor === floor && !n.dead && !n.evacuated);
    this.flash.shadow.needsUpdate = true;
  }
  pause(value) { this.paused = value; this.keys.clear(); this.resetTouch(); this.aiming = false; this.audio.pause(value); if (value) document.exitPointerLock?.(); }
  stop() { this.pause(true); this.mission = null;this.systems=null;this.weaponDrawn=false; this.player.root.visible = false; this.clearNPCs(); this.flashlight = false; this.blackout = 0; this.setFloor(0); }
  clearNPCs() { this.life?.dispose(); this.life=null; for (const n of this.npcs) this.scene.remove(n.visual.root); this.npcs = []; }
  spawnNPC(person, role, floor, pos, room, id, options = {}) {
      const visual = options.visual || makePlayer(this.assets, person.gender || 'male', person, role);
      const candidates = [...this.navLayouts[floor].cells.values()].filter(c => !room || c.room === room.id);
      const nearest = candidates.map(c => world(c.x,c.z)).sort((a,b) => distance(a,pos)-distance(b,pos))[0];
      const spawnPos = options.fixed ? pos : nearest || pos; visual.root.position.set(spawnPos.x, 0, spawnPos.z); this.scene.add(visual.root);
      const npc = { id, name: person.name || (role === 'patient' ? 'Visitor / patient' : 'Hospital security'), role, person, floor, pos: visual.root.position, visual, room, path: [], cursor: 0, wait: this.mission.random() * 6, dead: false, speed: role === 'security' ? 1.35 : .8 + this.mission.random() * .4, nextCough: this.mission.random() * 20, home: { x: pos.x, z: pos.z }, routine: 0 };
      visual.root.visible = floor === this.floor; this.npcs.push(npc); return npc;
  }
  spawnNPCs() {
    const mission = this.mission;
    const spawn = (...args) => this.spawnNPC(...args);
    for (let floor = 0; floor < this.levels.length; floor++) {
      const layout = this.levels[floor];
      for (const room of layout.rooms) {
        const aliases = ['Dr. Simon Avery', 'Dr. Nina Walsh', 'Dr. Mateo Ruiz', 'Nurse Lina Park', 'Dr. Clara Moss', 'Nurse Owen Finch', 'Dr. Isaac Rowe', 'Nurse Zoe Lane'];
        const person = { ...STAFF[(room.index + floor * 2 + 1) % STAFF.length], name: aliases[room.index].replace(/Dr\.|Nurse/, STAFF[(room.index + floor * 2 + 1) % STAFF.length].name.startsWith('Nurse') ? 'Nurse' : 'Dr.') };
        if (floor) person.name = person.name.replace(/(Avery|Walsh|Ruiz|Park|Moss|Finch|Rowe|Lane)$/, 'Bennett');
        const isTarget = mission.target.floor === floor && mission.target.room.id === room.id;
        if (isTarget) spawn(mission.target, mission.target.name.startsWith('Nurse') ? 'nurse' : 'doctor', floor, { x: room.center.x, z: room.center.z + (room.kind === 'imaging' ? 4 : -1.5) }, room, 'target');
        else if (!['utility', 'morgue'].includes(room.kind)) spawn(person, person.name.startsWith('Nurse') ? 'nurse' : 'doctor', floor, { x: room.center.x, z: room.center.z + (room.kind === 'imaging' ? 4 : -1.5) }, room, `staff-${floor}-${room.index}`);
      }
      for (const [i, p] of [[0, { x: 4.7, z: 18 }], [1, { x: -20, z: 1.7 }], [2, { x: 22, z: -2 }], [3, { x: 7, z: 29 }]]) { const patient=spawn({ gender: i % 2 ? 'female' : 'male', skin: i % 2 ? '#bf8c6c' : '#d9b296', hair: '#62594e' }, 'patient', floor, p, null, `patient-${floor}-${i}`); patient.contamination = i === 1 ? 30 : i === 2 ? 60 : 0; }
      for (const [i, p] of [[0, world(10, 8)], [1, world(3, 14)]]) spawn({ skin: '#bd9275', hair: '#302b26' }, 'security', floor, p, null, `security-${floor}-${i}`);
    }
  }
  say(text, label = 'PUBLIC ADDRESS') { this.hooks.announcement?.({ text, label }); this.audio.announce(text); }
  notify(text, kind = 'info') { this.hooks.notify?.({ text, kind }); }
  toggleFlash() { this.flashlight = !this.flashlight; this.audio.tone(450, .04, .035); this.emitHUD(); }
  triggerBlackout(duration = 16) {
    this.blackout = duration; this.mission.blackoutCount++; this.audio.sound('blackout');
    this.say('A power fault has been reported. Emergency lighting is active. Please remain calm.', 'POWER INTERRUPTION'); this.notify(this.mobile ? 'Power interrupted · Tap LIGHT to use your flashlight' : 'Power interrupted · F to use your flashlight', 'warning');
  }
  triggerCough(patient = {name:'Sick patient',contamination:30}) {
    if(maskProtects(this.mission.save)){this.notify('Mask protected you from the gas','info');this.coughCooldown=5;return false;}
    const duration=exposureDuration(patient,this.mission.save.upgrades.filter);if(!duration)return false;
    this.impairment=Math.max(this.impairment,duration);this.impairmentTotal=Math.max(this.impairmentTotal||0,duration);this.exposureSource=patient.name;
    this.coughCooldown=5;this.notify(`Contamination exposure · ${Math.round(duration)}s recovery`, 'warning');return true;
  }
  nearestInteractable() {
    let best = null, score = Infinity;
    for (const i of this.hospitals[this.floor].interactables) {
      const candidate=interactionScore(this.playerPos,this.yaw,i);
      if(candidate<score&&this.interactionVisible(i)){best=i;score=candidate;}
    }
    for (const n of this.npcs) {
      if (n.floor !== this.floor || n.dead || n.evacuated) continue;
      if (best && ['directory','schedule','log','elevator'].includes(best.type)) continue;
      const candidate=interactionScore(this.playerPos,this.yaw,n.pos,2.3);
      if(candidate<score&&this.lineOfSight(this.playerPos,n.pos)){best={type:'npc',npc:n,x:n.pos.x,z:n.pos.z,label:'Inspect staff badge'};score=candidate;}
    }
    return best;
  }
  interactionVisible(i){
    const from={x:this.playerPos.x,y:1.5,z:this.playerPos.z},to={x:i.x,y:1.5,z:i.z};
    return !this.hospitals[this.floor].colliders.some(c=>{
      if(c.object===i.door||!['wall','door'].includes(c.type)&&!c.object)return false;
      const hit=segmentHit3D(from,to,obstacleBounds(c));return hit!==null&&hit<.97;
    });
  }
  interact() {
    const i = this.nearestInteractable(); if (!i || this.paused) return;
    if (i.type === 'door') {
      if(i.door.open&&!this.doorCanSwingTo(i.door,0))this.notify('Step clear of the doorway before closing it.');
      else{i.door.open=!i.door.open;this.audio.sound('door');}
    }
    if (['directory', 'schedule', 'log'].includes(i.type)) {
      const clue = this.mission.clue(i.type);
      if (clue) { this.audio.sound('clue'); this.hooks.clue?.(clue); this.notify(clue.title, 'clue'); }
      else this.notify(this.mobile ? 'Already recorded · Tap the journal icon to review it' : 'Already recorded in your evidence journal · J');
    }
    if (i.type === 'npc') {
      const n = i.npc;
      if (n.role === 'patient') this.notify('Patient / visitor · protected. Harming a patient ends the mission.', 'warning');
      else if (n.role === 'security' || n.role === 'police') this.notify('Security personnel · stay out of their sight.');
      else if (n.id === 'target') { this.mission.identify(); this.audio.sound('clue'); this.notify(`Identity confirmed · ${n.name}`, 'clue'); this.hooks.badge?.({ name: n.name, target: true, role: n.person.role }); }
      else this.hooks.badge?.({ name: n.name, target: false, role: n.person.role });
    }
    if(i.type==='elevator'){if(this.hooks.lift)this.hooks.lift(this.floor);else this.travelToFloor((this.floor+1)%this.levels.length);}
    if (i.type === 'exit') {
      if (this.mission.targetDown) this.completeEscape(); else this.notify('Your assignment is still active. Identify and eliminate the assigned target first.');
    }
    this.emitHUD();
  }
  travelToFloor(dest){
    if(!Number.isInteger(dest)||dest<0||dest>=this.levels.length||dest===this.floor)return false;
    this.setFloor(dest);this.playerPos.set(this.levels[dest].elevator.x,0,this.levels[dest].elevator.z+3);this.player.root.position.copy(this.playerPos);this.yaw=0;this.audio.sound('door');this.hooks.transition?.();this.updateCamera(.2,true);this.notify(`${FLOORS[dest]} · ${FLOOR_THEMES[dest]}`);this.emitHUD();return true;
  }
  setAiming(value){this.aiming=!!value;if(value)this.weaponDrawn=true;}
  toggleAim(){this.setAiming(!this.aiming);this.emitHUD();}
  toggleWeapon(){if(this.paused)return;this.weaponDrawn=!this.weaponDrawn;if(!this.weaponDrawn)this.aiming=false;this.notify(this.weaponDrawn?'Weapon drawn · stay out of sight':'Weapon holstered');this.emitHUD();}
  toggleMask(){if(!this.mission.save.upgrades.mask){this.notify('Buy the protective mask in Equipment first');return;}this.mission.save.loadout.mask=!this.mission.save.loadout.mask;this.hooks.persist?.();this.playerGear?.update(this.mission.save);this.emitHUD();}
  setWeapon(kind,initial=false){
    if(!this.mission)return;const info=weaponInfo(this.mission.save,kind);
    if(!initial&&this.reloading)return;
    if(!initial&&this.weaponSlots)this.weaponSlots[this.weaponKind]={ammo:this.ammo,reserve:this.reserve};
    this.weaponKind=info.id;this.mission.save.loadout.weapon=info.id;
    this.weapon?.removeFromParent();this.weapon=weaponModel(info.id);this.player.root.add(this.weapon);this.weapon.position.set(.33,1.23,.15);this.weapon.visible=this.weaponDrawn;
    const slot=this.weaponSlots?.[info.id];this.ammo=slot?.ammo??info.capacity;this.reserve=slot?.reserve??info.reserve;this.reloading=0;
  }
  switchWeapon(){if(this.paused)return;if(!this.mission.save.upgrades.sniper){this.notify('Unlock the scoped rifle in Equipment');return;}this.setWeapon(this.weaponKind==='sniper'?'pistol':'sniper');this.hooks.persist?.();this.emitHUD();}
  refreshLoadout(){if(!this.mission)return;if(this.mission.save.loadout.weapon!==this.weaponKind){this.reloading=0;this.setWeapon(this.mission.save.loadout.weapon);}this.playerGear?.update(this.mission.save);this.emitHUD();}
  reload(){const info=weaponInfo(this.mission.save,this.weaponKind);if(this.reloading||this.ammo===info.capacity||this.reserve<=0)return;this.reloading=info.reload;this.audio.sound('reload');}
  shoot({ touch = false, aimRay = null } = {}) {
    if ((!this.aiming && !touch) || this.paused || this.mission.result || this.shotCooldown || this.reloading) return;
    if (!this.ammo) { this.audio.sound('empty'); this.notify(this.mobile ? 'Magazine empty · Tap RELOAD' : 'Magazine empty · R to reload'); return; }
    this.weaponDrawn=true;const info=weaponInfo(this.mission.save,this.weaponKind);this.ammo--; this.shotCooldown=info.cooldown;this.audio.sound(this.weaponKind==='sniper'?'rifle':'shot'); this.muzzle.intensity = 12;
    this.muzzle.position.copy(this.playerPos).add(new THREE.Vector3(Math.sin(this.yaw) * .8, 1.5, Math.cos(this.yaw) * .8));
    this.hooks.shot?.();
    const ray = aimRay || this.aimRay();
    let best=null,closest=info.range;
    const far=ray.origin.clone().addScaledVector(ray.direction,info.range);
    for(const c of this.hospitals[this.floor].colliders){const hit=segmentHit3D(ray.origin,far,obstacleBounds(c));if(hit!==null)closest=Math.min(closest,hit*info.range);}
    for (const n of this.npcs) {
      if (n.floor !== this.floor || n.dead || n.evacuated) continue;
      const center = n.pos.clone().add(n.hitOffset || new THREE.Vector3(0, 1.1, 0));
      const hit = n.hitOffset
        ? ray.intersectSphere(new THREE.Sphere(center, n.hitRadius || .46), new THREE.Vector3())
        : ray.intersectBox(new THREE.Box3(n.pos.clone().add(new THREE.Vector3(-.35,.06,-.35)), n.pos.clone().add(new THREE.Vector3(.35,1.85,.35))), new THREE.Vector3());
      if (!hit) continue;
      const d = hit.distanceTo(ray.origin);
      if (d < closest && this.lineOfSight(this.playerPos, n.pos)) { closest = d; best = n; }
    }
    // A visible, short-lived tracer makes aim direction legible.
    const end = ray.origin.clone().addScaledVector(ray.direction, Math.min(closest,info.range));
    this.lastShot = { origin: ray.origin.clone(), direction: ray.direction.clone(), end: end.clone(), hitId: best?.id || null };
    const geometry = new THREE.BufferGeometry().setFromPoints([this.muzzle.position.clone(), end]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#ddefff', transparent: true, opacity: .65 })); this.scene.add(line); this.effects.push({ mesh: line, life: .085 });
    if (best) {
      const before = this.mission.state;
      const allowed=this.mission.eliminate(best);
      if(allowed===false){this.notify('Primary target first · other staff cannot be harmed yet','warning');this.emitHUD();return;}
      if(best.role!=='patient'){best.dead=true;best.falling=1;best.visual.root.rotation.z=0;best.reporting=null;this.hooks.hit?.();}
      if (before !== 'escape' && this.mission.state === 'escape') {
        this.say('Code blue. Security incident reported. All staff follow emergency protocol. Police units are responding.', 'EMERGENCY PROTOCOL');
        this.systems?.startEvacuation();this.notify(`Primary target down · staff now earn +${STAFF_BONUS} coins each · escape to bank them`,'danger'); this.hooks.emergency?.();
      } else if(!this.mission.result&&best.id!=='target')this.notify(best.role==='police'?'Police stopped':`Staff bonus +${STAFF_BONUS} coins · escape to bank it`,'clue');
      if (this.mission.result) this.finish();
    } else { this.mission.suspicion = Math.min(100, this.mission.suspicion + (this.mission.save.upgrades.suppressor ? 8 : 20)); }
    this.emitHUD();
  }
  lineOfSight(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z;
    for (const c of this.hospitals[this.floor].colliders) {
      const bounds=obstacleBounds(c);
      if((bounds.minY??0)>1.7)continue;
      const tiny=bounds.maxX-bounds.minX<.4||bounds.maxZ-bounds.minZ<.4;
      if(!tiny&&!c.object&&(c.maxY??0)<1.45)continue;
      if(segmentBox(a.x,a.z,dx,dz,bounds,.01)<1) return false;
    }
    return true;
  }
  canStand(x,z,radius=.3,floor=this.floor){
    const cell=tileAt(x,z);if(!this.levels[floor].cells.has(key(cell.x,cell.z)))return false;
    return !this.hospitals[floor].colliders.some(c=>{const b=obstacleBounds(c);return blocksBody(b)&&circleOverlaps(x,z,radius,b);});
  }
  canMoveTo(x,z){
    if(!this.canStand(x,z))return false;
    for(const n of this.npcs){
      if(n.floor!==this.floor||n.dead||n.evacuated||n.lying||n.baby)continue;
      const next=Math.hypot(x-n.pos.x,z-n.pos.z),current=distance(this.playerPos,n.pos);
      if(next<.56&&next<current-.001)return false;
    }
    return true;
  }
  npcCanMoveTo(n,x,z){
    if(!this.canStand(x,z,.22,n.floor))return false;
    const avoids=(p,r)=>Math.hypot(x-p.x,z-p.z)>=r||Math.hypot(x-p.x,z-p.z)>=distance(n.pos,p)-.001;
    if(n.floor===this.floor&&!avoids(this.playerPos,.56))return false;
    return this.npcs.every(other=>other===n||other.floor!==n.floor||other.dead||other.evacuated||other.lying||other.baby||avoids(other.pos,.48));
  }
  move(dx, dz) {
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / .12) || 1;
    for (let i = 0; i < steps; i++) {
      if (this.canMoveTo(this.playerPos.x + dx / steps, this.playerPos.z)) this.playerPos.x += dx / steps;
      if (this.canMoveTo(this.playerPos.x, this.playerPos.z + dz / steps)) this.playerPos.z += dz / steps;
    }
  }
  updatePlayer(dt) {
    if(this.systems?.magnet)return {moving:false,running:false};
    if (this.keys.has('ArrowLeft')) this.yaw += dt * 1.9; if (this.keys.has('ArrowRight')) this.yaw -= dt * 1.9;
    const f = this.touchInput.forward + Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const strafe = this.touchInput.strafe + Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    const moving = f !== 0 || strafe !== 0; this.crouched = this.keys.has('KeyC') || this.touchInput.crouch;
    const running = moving && !this.crouched && !this.aiming && this.stamina > 1 && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchInput.sprint);
    const modifier = 1 + this.mission.save.upgrades.shoes * .08;
    const speed = (running ? 5.5 : this.crouched ? 1.3 : this.aiming ? 1.65 : 2.8) * modifier * (this.impairment > 0 ? .53 : 1);
    const amount = Math.max(1,Math.hypot(f, strafe));
    const old = this.playerPos.clone();
    this.move((Math.sin(this.yaw) * f - Math.cos(this.yaw) * strafe) * speed * dt / amount, (Math.cos(this.yaw) * f + Math.sin(this.yaw) * strafe) * speed * dt / amount);
    const actual = this.playerPos.distanceTo(old) / dt;
    this.stamina = clamp(this.stamina + dt * (running ? -17 : 23), 0, this.maxStamina||100);
    this.player.root.position.copy(this.playerPos); this.player.root.position.y = this.crouched ? -.24 : 0;
    const desiredYaw = this.aiming || !moving ? this.yaw : Math.atan2(Math.sin(this.yaw) * f - Math.cos(this.yaw) * strafe, Math.cos(this.yaw) * f + Math.sin(this.yaw) * strafe);
    this.player.root.rotation.y += Math.atan2(Math.sin(desiredYaw - this.player.root.rotation.y), Math.cos(desiredYaw - this.player.root.rotation.y)) * Math.min(1, dt * 12);
    const weaponReady = this.weaponDrawn || this.aiming || this.shotCooldown > 0;
    this.player.setAim?.(this.aiming||this.shotCooldown>0); this.player.animate(this.time, actual, dt); this.weapon.visible = weaponReady;
    if (weaponReady && this.player.hand) { this.player.root.updateMatrixWorld(true); const grip = this.player.hand.getWorldPosition(new THREE.Vector3()); this.player.root.worldToLocal(grip); this.weapon.position.copy(grip).add(new THREE.Vector3(0,0,.04)); }
    this.playerGear?.update(this.mission.save);
    this.visited.add(`${this.floor}:${key(tileAt(this.playerPos.x, this.playerPos.z).x, tileAt(this.playerPos.x, this.playerPos.z).z)}`);
    this.audio.update(dt, this.proximity(), this.mission.state === 'escape', this.impairment > 0, actual > .1, running);
    if (this.floor === 0 && this.mission.targetDown && distance(this.playerPos, this.levels[0].exit) < 1.9) this.completeEscape();
    return { moving, running };
  }
  proximity() { const target = this.npcs.find(n => n.id === 'target'); return target && target.floor === this.floor && !target.dead ? clamp(1 - distance(this.playerPos, target.pos) / 24, 0, 1) : 0; }
  updateCamera(dt, snap = false) {
    const aiming = this.aiming;
    const back = this.mobile ? (aiming ? 3.8 : this.mission?.state === 'escape' ? 5 : 4.8) : (aiming ? 1.7 : this.mission?.state === 'escape' ? 3.7 : 3.25);
    const shoulder = this.mobile ? (aiming ? .85 : .95) : (aiming ? .65 : .62);
    const focus = this.playerPos.clone().add(new THREE.Vector3(0, this.crouched ? 1.2 : 1.6, 0));
    const desired = focus.clone().add(new THREE.Vector3(-Math.sin(this.yaw) * back + Math.cos(this.yaw) * shoulder, this.mobile ? (aiming ? .12 : .25) : (aiming ? .18 : .72) - this.pitch * 2.5, -Math.cos(this.yaw) * back - Math.sin(this.yaw) * shoulder));
    if(snap||!Number.isFinite(this.cameraYaw)){this.cameraYaw=this.yaw;this.cameraBack=back;}
    else{this.cameraYaw+=Math.atan2(Math.sin(this.yaw-this.cameraYaw),Math.cos(this.yaw-this.cameraYaw))*(1-Math.exp(-dt*12));this.cameraBack+=(back-this.cameraBack)*(1-Math.exp(-dt*12));}
    const orbitYaw=this.cameraYaw,side=this.mobile?-shoulder:shoulder;
    const orbital=focus.clone().add(new THREE.Vector3(-Math.sin(orbitYaw)*this.cameraBack+Math.cos(orbitYaw)*side,desired.y-focus.y,-Math.cos(orbitYaw)*this.cameraBack-Math.sin(orbitYaw)*side));
    const obstacles=this.hospitals[this.floor].colliders.map(obstacleBounds);
    obstacles.push({minX:-100,maxX:100,minZ:-100,maxZ:100,minY:3.62,maxY:3.8},{minX:-100,maxX:100,minZ:-100,maxZ:100,minY:-.2,maxY:0});
    const fraction=cameraFraction(focus,orbital,obstacles,.2);
    // Contract immediately against geometry. Recover gently once space is clear.
    this.cameraClearance=snap?fraction:Math.min(fraction,(this.cameraClearance??fraction)+(1-Math.exp(-dt*6))*.12);
    this.camera.position.copy(focus).lerp(orbital,this.cameraClearance);
    const horizontal=Math.hypot(this.camera.position.x-focus.x,this.camera.position.z-focus.z);
    const close=THREE.MathUtils.clamp((2.4-horizontal)/1.5,0,1);
    const scoped=aiming&&this.weaponKind==='sniper';
    const ahead=scoped?60:this.mobile&&!aiming?THREE.MathUtils.lerp(1.6,6,close):(aiming?12:4);
    const lookHeight=this.mobile&&!aiming?THREE.MathUtils.lerp((this.crouched?1.2:1.6)-.45,focus.y,close):focus.y;
    const look=focus.clone().setY(lookHeight+this.pitch*(this.mobile&&!aiming?THREE.MathUtils.lerp(2,6,close):ahead)).add(new THREE.Vector3(Math.sin(orbitYaw)*ahead+Math.cos(orbitYaw)*side,0,Math.cos(orbitYaw)*ahead-Math.sin(orbitYaw)*side));
    this.camera.lookAt(look); this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, scoped?19:this.mobile ? (aiming ? 52 : 60)+close*12 : (aiming ? 48 : 58)+close*10, Math.min(1, dt * 9)); this.camera.updateProjectionMatrix();
    this.flash.position.copy(focus).add(new THREE.Vector3(Math.sin(this.yaw) * .35, -.15, Math.cos(this.yaw) * .35)); this.flash.target.position.copy(look);
    this.rim.position.copy(focus).add(new THREE.Vector3(0, 1, 0));
    this.player.root.traverse(o => { if (o.isMesh && o.material) o.visible = horizontal > 1.1&&!scoped; });
  }
  updateNPCs(dt) {
    const mission = this.mission;
    for (const n of this.npcs) {
      if(n.evacuated)continue;
      if (n.dead) { if (n.falling > 0) { n.falling = Math.max(0, n.falling - dt * 2); n.visual.root.rotation.z = (1 - n.falling) * Math.PI / 2; n.visual.root.position.y = -.4 * (1 - n.falling); } continue; }
      const layout = this.navLayouts[n.floor]; const local = n.floor === this.floor; const d = local ? distance(this.playerPos, n.pos) : 100;
      n.visual.root.visible = local && d < 34;
      let speed = 0;
      const hostile=n.role==='police'||n.role==='security'&&!n.evacuating&&(mission.state==='escape'||mission.suspicion>80);
      n.wait -= dt;n.reaction=Math.max(0,(n.reaction||0)-dt);
      const directed=this.systems?.prepareNPC(n);if(mission.result)return;
      if(!directed&&hostile && local && n.wait < 0) {
        n.path = findPath(layout, tileAt(n.pos.x, n.pos.z), tileAt(this.playerPos.x, this.playerPos.z)); n.cursor = 1; n.wait = .85;
      } else if (!directed && !hostile && !n.activity && !n.reaction && n.cursor >= n.path.length && n.wait < 0) {
        const start = tileAt(n.pos.x, n.pos.z); let end;
        if (n.room && (n.id === 'target' || n.routine % 3 !== 2)) {
          const candidates = [...layout.cells.values()].filter(c => c.room === n.room.id);
          const candidate = candidates[Math.floor(mission.random() * candidates.length)]; end = candidate || start;
        } else {
          const spots = [[10, 6], [11, 14], [3, 10], [18, 11], [10, 19], [3, 5], [18, 17]]; const p = spots[Math.floor(mission.random() * spots.length)]; end = { x: p[0], z: p[1] };
        }
        n.path = findPath(layout, start, end); n.cursor = 1; n.wait = mission.random() * 5 + 2; n.routine++;
      }
      let destination = n.activity || n.reaction ? null : n.path[n.cursor];
      if(directed&&destination){
        const opening=this.levels[n.floor].doors.find(leaf=>Math.hypot(n.pos.x-leaf.x,n.pos.z-leaf.z)<2.6&&Math.abs(leaf.angle-leaf.openAngle)>.02);
        if(opening){
          opening.open=true;destination=null;
          const dx=n.pos.x-opening.x,dz=n.pos.z-opening.z,d=Math.hypot(dx,dz);
          if(d<2.2){const retreat=Math.min(.12,2*dt),nx=n.pos.x+dx/Math.max(d,.01)*retreat,nz=n.pos.z+dz/Math.max(d,.01)*retreat;if(this.npcCanMoveTo(n,nx,nz)){n.pos.x=nx;n.pos.z=nz;}}
        }
      }
      if (destination) {
        const p = world(destination.x, destination.z), dist = distance(n.pos, p);
        const current = n.path[Math.max(0, n.cursor - 1)], door = layout.doorEdges.get(edgeKey(key(current.x, current.z), key(destination.x, destination.z)));
        if (door && dist < 4) door.open = true;
        if(directed)for(const leaf of this.levels[n.floor].doors)if(Math.hypot(n.pos.x-leaf.x,n.pos.z-leaf.z)<2.4)leaf.open=true;
        speed=n.evacuating?4+(n.id.length%5)*.12:n.reporting?4.1:hostile?mission.difficulty==='hard'?3.6:2.65:n.speed;
        const dx=p.x-n.pos.x,dz=p.z-n.pos.z,step=Math.min(dist,speed*dt),nx=n.pos.x+dx/Math.max(dist,.001)*step,nz=n.pos.z+dz/Math.max(dist,.001)*step;
        if(this.npcCanMoveTo(n,nx,nz)){n.pos.x=nx;n.pos.z=nz;n.blocked=0;if(dist<speed*dt+.04)n.cursor++;}
        else{
          speed=0;n.blocked=(n.blocked||0)+dt;
          if(n.blocked>.45){
            let sidestepped=false;
            for(const side of [1,-1]){const sx=n.pos.x-dz/Math.max(dist,.001)*step*side,sz=n.pos.z+dx/Math.max(dist,.001)*step*side;if(this.npcCanMoveTo(n,sx,sz)){n.pos.x=sx;n.pos.z=sz;sidestepped=true;break;}}
            if(!sidestepped&&!door){n.path=[];n.wait=.3;}
          }
        }
        n.visual.root.rotation.y=Math.atan2(dx,dz);
      }
      if(local && d<30) n.visual.animate(this.time + (n.routine || 0), speed, dt);
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
  doorCanSwingTo(d,angle,floor=this.floor){
    const bounds=obstacleBounds({object:{...d,angle}});
    if(floor===this.floor&&circleOverlaps(this.playerPos.x,this.playerPos.z,.31,bounds))return false;
    return !this.npcs.some(n=>n.floor===floor&&!n.dead&&!n.evacuated&&!n.lying&&!n.baby&&circleOverlaps(n.pos.x,n.pos.z,.24,bounds));
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
    if (this.reloading > 0) { this.reloading -= dt; if (this.reloading <= 0) { const refill = Math.min(weaponInfo(this.mission.save,this.weaponKind).capacity-this.ammo,this.reserve); this.ammo += refill; this.reserve -= refill; this.reloading = 0; } }
    this.shotCooldown = Math.max(0, this.shotCooldown - dt); this.muzzle.intensity = Math.max(0, this.muzzle.intensity - dt * 100);
    for(const level of this.levels)for(const d of level.doors){const angle=THREE.MathUtils.damp(d.angle,d.open?d.openAngle:0,9,dt);if(this.doorCanSwingTo(d,angle,level.floor))d.angle=angle;d.pivot.rotation.y=d.angle;}
  }
  updateLights() {
    const dark = this.blackout > 0, emergency = this.mission?.state === 'escape';
    const flicker=this.life?.flickerLevel() || 1;
    this.ambient.intensity = dark ? .14 : .95; this.ambient.color.set(dark ? '#50647e' : '#d3e3f0'); this.rim.intensity = dark ? .3 : 2.5;
    this.materials.light.emissiveIntensity = dark ? .015 : 1.6;
    const lightAnchor = this.mission ? this.playerPos : this.camera.position;
    const near = this.hospitals[this.floor].fixtures.map(p => ({ p, d: p.distanceToSquared(lightAnchor) })).sort((a, b) => a.d - b.d);
    this.localLights.forEach((light, i) => {
      light.position.copy(near[i]?.p || this.playerPos); light.intensity = dark ? .05 : emergency && i % 3 === 0 ? 7 + Math.sin(this.time * 5) * 3 : 10;
      if(this.life?.flicker?.floor === this.floor && this.life.flicker.fixture.distanceTo(light.position)<.5) light.intensity*=flicker;
      light.color.set(emergency && i % 3 === 0 ? '#ef7373' : '#d5edff');
    });
    this.overhead.position.copy(near[0]?.p || lightAnchor); this.overhead.target.position.copy(lightAnchor); this.overhead.target.position.y = 0; this.overhead.intensity = dark ? 0 : 18*(this.life?.flicker?.fixture.distanceTo(this.overhead.position)<.5?flicker:1);
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
    this.hooks.hud?.({ state: this.mission.state, objective, location: room?.name || (this.playerPos.z > 26 ? 'Main atrium' : this.playerPos.x < -6 ? 'West passage' : this.playerPos.x > 9 ? 'East passage' : 'Central concourse'), floor: this.floor, x: this.playerPos.x, z: this.playerPos.z, yaw: this.yaw, timer: this.mission.timer, elapsed: this.mission.elapsed, stamina:this.stamina/(this.maxStamina||100)*100,weaponName:weaponInfo(this.mission.save,this.weaponKind).name,weaponKind:this.weaponKind,weaponDrawn:this.weaponDrawn,scoped:this.aiming&&this.weaponKind==='sniper',masked:maskProtects(this.mission.save),hasMask:!!this.mission.save.upgrades.mask,reports:this.systems?.reports()||[],bonus:Math.max(0,this.mission.staffKills-1)*STAFF_BONUS,evacuated:this.npcs.filter(n=>n.evacuated).length,magnet:!!this.systems?.magnet,suspicion: this.mission.suspicion, flashlight: this.flashlight, blackout: this.blackout, impairment: this.impairment, impairmentStrength: recoveryStrength(this.impairment,this.impairmentTotal), exposureSource:this.exposureSource, dialogues:this.life?.dialogueHUD()||[], aiming: this.aiming, ammo: this.ammo, reserve: this.reserve, reloading: this.reloading > 0, prompt, proximity: this.proximity(), crouched: this.crouched, targetConfirmed: this.mission.identified, clues: this.mission.clues.length });
  }
  frame() {
    this.syncViewport();
    const dt = Math.min(this.clock.getDelta(), .05); this.time += dt;this.performance.frames++;const now=performance.now();if(now-this.performance.last>1000){this.performance.fps=this.performance.frames*1000/(now-this.performance.last);this.performance.frames=0;this.performance.last=now;}
    if (this.mission && !this.paused && !this.mission.result) {
      this.mission.tick(dt); if (this.mission.result) this.finish();
      else { this.updatePlayer(dt);this.systems?.update(dt); if (!this.mission.result) { this.updateNPCs(dt); this.life?.update(dt); this.updateEnvironment(dt); this.updateCamera(dt);if(this.touchInput.shot){const aimRay=this.queuedTouchRay;this.touchInput.shot=false;this.queuedTouchRay=null;this.shoot({touch:true,aimRay});} } }
      this.hudClock += dt; if (this.hudClock > .07) { this.emitHUD(); this.hudClock = 0; }
    } else if (!this.mission) {
      this.menuTime += dt;if(this.storyMusic)this.audio.update(dt,0,false,false,false,false); this.camera.position.set(.3 + Math.sin(this.menuTime * .06) * .3, 1.72, 22); this.camera.lookAt(.2, 1.6, -10);
    }
    this.updateLights();
    for (let i = this.effects.length - 1; i >= 0; i--) { const e = this.effects[i]; e.life -= dt; if (e.life <= 0) { this.scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); this.effects.splice(i, 1); } }
    this.renderer.render(this.scene, this.camera);
  }
  setTouchMove(forward,strafe){if(this.paused)return;this.touchInput.forward=clamp(forward,-1,1);this.touchInput.strafe=clamp(strafe,-1,1);this.inputEvents.move++;}
  lookTouch(dx,dy){if(this.paused)return;this.yaw-=clamp(dx,-60,60)*.0032*this.settings.sensitivity;this.pitch=clamp(this.pitch-clamp(dy,-60,60)*.0016*this.settings.sensitivity,-.2,.2);this.inputEvents.look++;}
  aimRay() {
    // Raycasting must use the same camera transform as the rendered crosshair.
    this.camera.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    const canvas=this.renderer.domElement.getBoundingClientRect();
    const crosshair=this.container.parentElement.querySelector('.reticle')?.getBoundingClientRect();
    const point=crosshair?new THREE.Vector2(((crosshair.left+crosshair.width/2-canvas.left)/canvas.width)*2-1,1-((crosshair.top+crosshair.height/2-canvas.top)/canvas.height)*2):new THREE.Vector2(0,0);
    raycaster.setFromCamera(point,this.camera);
    return raycaster.ray.clone();
  }
  requestTouchShot(){if(this.paused)return;this.weaponDrawn=true;this.queuedTouchRay=this.aimRay();this.touchInput.shot=true;this.inputEvents.shot++;}
  resetTouch(){this.touchInput=createTouchInput();this.queuedTouchRay=null;}
  portrait(person, role = 'doctor') { return renderPortrait(this.renderer, this.assets, person, role); }
  dispose() {
    this.resizeObserver?.disconnect();window.visualViewport?.removeEventListener('resize',this.handlers.resize);
    this.renderer.setAnimationLoop(null);this.playerGear?.dispose(); this.life?.dispose(); this.audio.dispose();
    for (const [name, fn] of Object.entries(this.handlers)) { const target = ['mousedown', 'contextmenu'].includes(name) ? this.renderer.domElement : name === 'visibilitychange' || name === 'pointerlockchange' ? document : window; target.removeEventListener(name, fn); }
    this.scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material?.dispose(); } }); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
