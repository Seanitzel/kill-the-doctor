import * as T from 'three';
import {GameEngine} from '../../src/game/engine.js';
import {Mission,defaultSave} from '../../src/game/mission.js';
import {COUNTRIES} from '../../src/game/international.js';
import {makeLayout} from '../../src/game/layout.js';
import {buildHospital} from '../../src/game/hospital.js';
import {makeNavigation} from '../../src/game/navigation.js';
import {MissionSystems} from '../../src/game/systems.js';
import {AssignmentObjectives} from '../../src/game/objectives.js';
import {CovertAssignments} from '../../src/game/covert.js';
import {disposeHospital} from '../../src/game/hospital-disposal.js';
export function withCanvas(fn){const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})}),exitPointerLock(){}};try{return fn();}finally{globalThis.document=old;}}
export function hospitalSim(countryId='china'){
 const country=COUNTRIES.find(c=>c.id===countryId),save=defaultSave();save.completedCountryIds=COUNTRIES.slice(0,country.index).map(c=>c.id);save.settings.volume=0;const m=new Mission(save,123),e=Object.create(GameEngine.prototype),levels=[0,1,2,3].map(f=>makeLayout(f,country.index));
 const materials=Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(k=>[k,new T.MeshBasicMaterial()])),hospitals=withCanvas(()=>levels.map(l=>buildHospital(l,materials,country)));
 Object.assign(e,{mission:m,levels,materials,hospitals,navLayouts:levels.map((l,i)=>makeNavigation(l,hospitals[i].colliders)),npcs:[],scene:new T.Scene(),floor:0,playerPos:new T.Vector3(0,0,30),playerSpeed:0,player:{root:new T.Group()},keys:new Set(),captureTime:0,time:0,weaponDrawn:false,paused:false,effects:[],muzzle:{intensity:0},blackout:0,impairment:0,coughCooldown:999,shotCooldown:0,nextBlackout:Infinity,nextPA:Infinity,hooks:{},audio:{sound(){},dialogue(){},pause(){},gasp(){},cancelVoices(){}},notify(text){e.message=text;},emitHUD(){},finish(){e.finished=true;},resetTouch(){},applyDoctorDisguise(){e.disguised=true;}});
 e.spawnNPC=(person,role,floor,pos,room,id)=>{const root=new T.Group();root.position.set(pos.x,pos.y||0,pos.z);e.scene.add(root);const n={name:person.name,id,person,role,floor,pos:root.position,visual:{root,animate(){}},room,activity:null,path:[],cursor:0,wait:0,speed:1.3,routine:0};e.npcs.push(n);return n;};
 e.systems=new MissionSystems(e);if(m.china)e.objectives=withCanvas(()=>new AssignmentObjectives(e));else{const p=e.systems.navigationFor(m.target.floor).nearest(m.target.room.center).point;e.spawnNPC(m.target,'doctor',m.target.floor,p,m.target.room,'target');e.covert=withCanvas(()=>new CovertAssignments(e));}return e;
}
export function advanceSim(e,seconds,until=()=>false){for(let time=0;time<seconds&&!e.mission.result&&!until();time+=.05){e.time+=.05;e.mission.elapsed+=.05;e.objectives?.update(.05);e.covert?.update(.05);e.updateNPCs(.05);e.updateEnvironment(.05);}}
export function disposeSim(e){e.objectives?.dispose();e.covert?.dispose();for(const h of e.hospitals)disposeHospital(h,e.materials);Object.values(e.materials).forEach(m=>m.dispose());e.scene.clear();}
