import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import * as T from 'three';
import {hospitalSim,disposeSim,withCanvas} from './helpers/hospital-sim.js';
import {Mission,defaultSave} from '../src/game/mission.js';import {COUNTRIES,migrateInternational,pendingFlight} from '../src/game/international.js';import {prepareAssignment} from '../src/game/assignment.js';
import {HospitalIncidents} from '../src/game/incidents.js';import {AntidoteStations} from '../src/game/antidotes.js';import {GameEngine} from '../src/game/engine.js';
const expected={france:['standard',1,0,0,0],nigeria:['standard',2,0,0,0],china:['infiltration',2,0,4,900],india:['rescue',2,2,0,0],russia:['infiltration',2,0,6,600],venezuela:['rescue',2,4,0,0],america:['standard',3,0,0,0],romania:['infiltration',3,0,8,420],uganda:['rescue',3,5,0,0],england:['standard',4,0,0,0]};
test('all ten Story assignments instantiate the requested real equipment choices and rescue casts',()=>{
 for(const c of COUNTRIES){const e=hospitalSim(c.id);try{const m=e.mission;assert.deepEqual([m.selectionType,expected[c.id][1],e.objectives.rescue?.entries.length||0,m.china?.instruments.length||0,m.china?.coverSeconds||0],expected[c.id]);
 if(m.china){const cc=m.china;assert.equal(e.objectives.china.tray.children.filter(o=>cc.instruments.some(t=>t.name===o.name)).length,cc.instruments.length);cc.entered=true;for(let i=0;i<100;i++){cc.order=null;const order=cc.request();assert.ok(cc.instruments.some(t=>t.id===order.id));}cc.order=null;m.elapsed=cc.coverSeconds-.001;cc.tick();assert.equal(m.result,null);m.elapsed=cc.coverSeconds;cc.tick();assert.equal(m.result.success,false);}
 if(m.type==='rescue'){e.floor=3;e.objectives.rescue.begin();assert.ok(e.objectives.rescue.entries.every(a=>a.resists));for(const a of e.objectives.rescue.entries)assert.equal(m.canDamage(a.n),true);}
 }finally{disposeSim(e);}}
});
test('both evidence doctors and every resisting rescue doctor accept real lethal damage, while innocents stay protected',()=>{
 for(const id of ['china','russia','romania','india','venezuela','uganda']){const e=hospitalSim(id);try{e.floor=3;if(e.mission.china)e.mission.china.recordings=['consent','procedure','equipment'];else e.objectives.rescue.begin();const doctors=e.npcs.filter(n=>n.operationDoctor);for(const n of doctors){assert.equal(e.damageNPC(n,{part:'chest',point:n.pos.clone()}),true,id);n.dead=true;assert.equal(e.mission.result,null,id);}assert.equal(e.mission.operationDoctors.length,doctors.length);assert.equal(e.mission.canDamage({id:'innocent',role:'patient'}),false);}finally{disposeSim(e);}}
});
test('specified Story visitor arrives at 30 seconds even if the entrance is visible; other chapters stay unchanged',()=>{
 for(const c of COUNTRIES){const e=hospitalSim(c.id);try{const i=new HospitalIncidents(e);i.setup();assert.equal(i.arrivalAt,[2,4,7,10].includes(c.index+1)?30:undefined);if(!i.arrivalAt)continue;e.assets={};e.mission.elapsed=29.999;assert.equal(i.arrive(),false);e.mission.elapsed=30;const spawn=e.spawnNPC;e.spawnNPC=(...args)=>spawn(...args);assert.equal(i.arrive(),true);assert.equal(i.contact.id,'unexpected-contact');assert.equal(i.arrive(),false);i.dispose();}finally{disposeSim(e);}}
});
test('country replacements migrate old progress and in-flight destinations without changing coins or unlocks',()=>{
 const save={...defaultSave(),coins:431,internationalVersion:3,completedCountryIds:['egypt','somalia'],storyReplayId:'egypt',pendingTravel:{from:'somalia',to:'egypt'}};const migrated=migrateInternational(save);assert.deepEqual(migrated.completedCountryIds,['romania','uganda']);assert.equal(migrated.storyReplayId,'romania');assert.deepEqual(migrated.pendingTravel,{from:'uganda',to:'romania'});assert.deepEqual(migrateInternational(migrated),migrated);
 for(const id of ['russia','romania']){const s={...defaultSave(),storyReplayId:id};const story=prepareAssignment(s).story;assert.match(story.panels.at(-1)[1],new RegExp(id==='russia'?'10 minutes':'7 minutes'));}
});
test('no target schedule notification or HUD timing appears before checking the board',()=>{
 for(const id of ['china','russia','romania']){const e=hospitalSim(id);try{const o=e.objectives.china;assert.equal(o.hud().doctorTiming,null);assert.doesNotMatch(o.objectiveLabel(),/returning|Office clear|Doctor leaving/);o.case.coffeePrepared=true;assert.doesNotMatch(o.objectiveLabel(),/return|Office clear/);o.case.coffeePrepared=false;e.npcs=[o.doctor];e.playerPos.set(0,0,30);o.breakAt=0;o.requiresDistraction=false;o.updateDoctor(.05);assert.equal(e.message,undefined);o.case.officeDiscovered=true;assert.ok(o.hud().doctorTiming);}finally{disposeSim(e);}}
});
test('every hospital gains only non-colliding visual corner cameras and antidotes on ground and second floors',()=>{
 for(const c of COUNTRIES){const e=hospitalSim(c.id);try{for(const h of e.hospitals){const cameras=h.group.getObjectByName('Hallway corner security cameras');assert.ok(cameras);assert.ok(cameras.children.length<=4);for(const camera of cameras.children)assert.ok(camera.position.y>=3);}
 const a=withCanvas(()=>new AntidoteStations(e));assert.deepEqual(a.stations.map(s=>s.interaction.floor),[0,2]);a.dispose();}finally{disposeSim(e);}}
});
test('the actual rifle shot traverses an office pane, while pistol fire, its metal mullion and solid wall still block',()=>{
 const e=hospitalSim('france');try{const n=e.npcs.find(n=>n.id==='target');e.npcs=[n];e.muzzle=new T.PointLight();e.playerPos.set(-24,0,-17.35);e.player.root.position.copy(e.playerPos);e.player.root.rotation.y=Math.PI/2;e.yaw=Math.PI/2;n.pos.set(-21,0,-17.35);e.weaponDrawn=e.aiming=true;e.mission.save.upgrades.sniper=1;
 const ray=z=>new T.Ray(new T.Vector3(-24,1.68,z),new T.Vector3(1,0,0));e.setWeapon('pistol',true);e.shoot({touch:true,aimRay:ray(-17.35)});assert.equal(e.lastShot.hitId,null);assert.equal(n.dead,undefined);
 e.setWeapon('sniper',true);e.shotCooldown=0;e.shoot({touch:true,aimRay:ray(-18)});assert.equal(e.lastShot.hitId,null,'the metal mullion remains solid');
 e.shotCooldown=0;e.shoot({touch:true,aimRay:new T.Ray(new T.Vector3(-24,.5,-17.35),new T.Vector3(1,0,0))});assert.equal(e.lastShot.hitId,null,'the lower solid wall remains solid');
 e.shotCooldown=0;e.shoot({touch:true,aimRay:ray(-17.35)});assert.equal(e.lastShot.hitId,'target');assert.equal(e.lastShot.region,'head');assert.equal(n.dead,true);assert.equal(e.mission.targetDown,true);assert.equal(e.mission.result,null);
 }finally{disposeSim(e);}
});



test('Preserve the 3.35 shoulder camera implementation exactly',()=>{const source=fs.readFileSync(new URL('../src/game/engine.js',import.meta.url),'utf8');const part=source.slice(source.indexOf('  updateCamera(dt, snap = false) {'),source.indexOf('  updateTorch(){',source.indexOf('  updateCamera(dt, snap = false) {'))).replace("const orbitYaw=this.cameraYaw,coverNormal=this.cover?.active?.kind==='wall'?this.cover.active.normal:null,side=coverNormal?(coverNormal.x*Math.cos(orbitYaw)-coverNormal.z*Math.sin(orbitYaw)>=0?shoulder:-shoulder):this.mobile?-shoulder:shoulder;","const orbitYaw=this.cameraYaw,side=this.mobile?-shoulder:shoulder;");assert.equal(crypto.createHash('sha256').update(part).digest('hex'),'d9c44c576afe522babcf3210db3ba97682b2cf68d2b0410fa66aa002ef1de06d');});
