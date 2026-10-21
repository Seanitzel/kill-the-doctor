import test from 'node:test';import assert from 'node:assert/strict';
import {GameEngine} from '../src/game/engine.js';
import {FlightClock,FLIGHT_TIMING,flightView,earthPoint} from '../src/game/flight-view.js';
import {COUNTRIES,pendingFlight,nextFlight,countryFor} from '../src/game/international.js';
import {defaultSave,Mission} from '../src/game/mission.js';
import {HospitalIncidents} from '../src/game/incidents.js';
import {makeLayout} from '../src/game/layout.js';
import * as T from 'three';

test('Space toggles pause once per press and never fires or captures typing/menu controls',()=>{
 const previous={window:globalThis.window,document:globalThis.document};const target={addEventListener(){}};globalThis.window=target;globalThis.document=target;
 try{const e=Object.create(GameEngine.prototype);let shots=0,pauses=0;Object.assign(e,{renderer:{domElement:target},keys:new Set(),mission:{},paused:false,hooks:{pause(){pauses++;e.paused=!e.paused;}},shoot(){shots++;}});e.bindEvents();
 const event=(extra={})=>({code:'Space',target:{tagName:'BODY'},repeat:false,preventDefault(){this.prevented=true;},...extra});
 const first=event();e.handlers.keydown(first);assert.equal(e.paused,true);assert.equal(first.prevented,true);e.handlers.keydown(event({repeat:true}));assert.equal(pauses,1);assert.equal(e.keys.has('Space'),false);
 e.handlers.keydown(event());assert.equal(e.paused,false);assert.equal(pauses,2);assert.equal(shots,0);
 for(const details of [{tagName:'INPUT'},{tagName:'DIV',isContentEditable:true},{tagName:'BUTTON',closest:()=>true}])e.handlers.keydown(event({target:details}));assert.equal(pauses,2);
 for(const state of [{starting:true},{presentationOnly:true},{mission:{result:{}}}]){Object.assign(e,{starting:false,presentationOnly:false,mission:{}},state);e.handlers.keydown(event());assert.equal(pauses,2);}
 }finally{Object.assign(globalThis,previous);}
});

test('flight clock emits one arrival then one completion, and does not skip the journey while hidden',()=>{
 const clock=new FlightClock(),total=Object.values(FLIGHT_TIMING).reduce((a,b)=>a+b,0);clock.step(0);assert.equal(clock.step(FLIGHT_TIMING.lead).progress,0);assert.equal(clock.step(FLIGHT_TIMING.lead+FLIGHT_TIMING.travel/2).progress,.5);
 clock.step(50000,false);clock.step(60000,false);assert.equal(clock.state().progress,.5);assert.equal(clock.step(70000).progress,.5);
 const arrival=clock.step(70000+FLIGHT_TIMING.travel/2);assert.equal(arrival.progress,1);assert.equal(arrival.arrive,true);assert.equal(arrival.finish,false);assert.equal(clock.state().arrive,false);
 assert.equal(clock.step(70000+FLIGHT_TIMING.travel/2+FLIGHT_TIMING.arrival).finish,true);assert.equal(clock.step(total+90000).finish,false);
});

test('every adjacent campaign route (and Nigeria to France) pins the correct geography and reaches exactly the next pin',()=>{
 const pairs=[...COUNTRIES.slice(0,-1).map((c,i)=>[c,COUNTRIES[i+1]]),[COUNTRIES[1],COUNTRIES[0]]];
 for(const [from,to]of pairs){const view=flightView(from,to);assert.ok(!view.path.includes('NaN'));for(const c of [from,to]){const p=earthPoint(c).applyQuaternion(view.orientation);assert.ok(p.z>0,'both countries visible');assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1);}
 assert.deepEqual(view.point(0),{x:view.departure.x,y:view.departure.y});assert.deepEqual(view.point(1),{x:view.arrival.x,y:view.arrival.y});
 for(let i=0;i<=100;i++){const p=view.point(i/100);assert.ok(p.x>30&&p.x<970&&p.y>30&&p.y<970);assert.ok(Number.isFinite(view.bearing(i/100)));}
 }
});

test('stale stored flight destinations are corrected; completed missions advance once and retries remain in country',()=>{
 const save=defaultSave();for(let i=0;i<20;i++){const mission=new Mission(save,200+i,i);const result=mission.finish(true,'escaped');const route=nextFlight(result,save);if(i<19){save.pendingTravel.to=COUNTRIES[i].id;const recovered=pendingFlight(save);assert.equal(recovered.from.id,COUNTRIES[i].id);assert.equal(recovered.to.id,COUNTRIES[i+1].id);assert.equal(route.to.id,countryFor(save).id);save.pendingTravel=null;const retry=new Mission(save,1000+i,i);retry.finish(false,'caught');assert.equal(pendingFlight(save),null);assert.equal(countryFor(save).id,COUNTRIES[i+1].id);}else assert.equal(route,null);}
 save.pendingTravel={from:'not-a-country',to:'france'};assert.equal(pendingFlight(save),null);
});

test('Jamie can accept or refuse only once in private; refusing walks out without being armed or following again',()=>{
 for(const roll of [.01,.0499,.05,.1,.9]){const room=makeLayout(0).rooms.find(r=>r.kind==='bathroom'),root=new T.Group(),n={id:'jamie',name:'Jamie Cole',pos:new T.Vector3(room.center.x,0,room.center.z),floor:0,recruit:{state:'escort'},visual:{root},path:[],cursor:0},e={mission:{elapsed:0,random:()=>roll},playerPos:n.pos.clone(),floor:0,npcs:[n],levels:[makeLayout(0)],notify(){}};
 const incidents=new HospitalIncidents(e);incidents.contact=n;let routes=0;incidents.route=(actor,goal)=>{routes++;actor.path=[goal];actor.cursor=0;};
 assert.equal(incidents.choose('recruit'),true);assert.equal(incidents.choose('recruit'),false);assert.equal(incidents.choose('escort'),false);
 if(roll<.05){assert.equal(n.recruit.state,'refused');assert.equal(n.recruit.weapon,undefined);assert.equal(incidents.hud(),null);assert.equal(incidents.prepareNPC(n),true);assert.equal(routes,1);assert.equal(n.activity,null);incidents.prepareNPC(n);assert.equal(routes,1);n.cursor=1;incidents.prepareNPC(n);assert.equal(n.activity,'rest');}
 else{assert.equal(n.recruit.state,'accepted');assert.equal(n.recruit.weapon,undefined);assert.equal(incidents.choose('handover'),true);assert.equal(n.recruit.state,'recruited');assert.equal(n.recruit.weapon.visible,false);n.recruit.weapon.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
 }
});

test('a refusing visitor physically exits the bathroom through its door without crossing furniture or walls',async()=>{
 const {buildHospital}=await import('../src/game/hospital.js'),{makeNavigation}=await import('../src/game/navigation.js'),{disposeHospital}=await import('../src/game/hospital-disposal.js'),{MissionSystems}=await import('../src/game/systems.js');
 const previous=globalThis.document,materials=Object.fromEntries(['floor','ceiling','steel','light','dark','stripe','wall','glass','trim','blue','white','linen','chair','wood','monitor','red','green'].map(k=>[k,new T.MeshBasicMaterial()])),levels=[0,1,2].map(makeLayout);let hospitals,e;
 try{globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};hospitals=levels.map(layout=>buildHospital(layout,materials));}finally{globalThis.document=previous;}
 try{e=Object.create(GameEngine.prototype);const room=levels[0].rooms.find(r=>r.kind==='bathroom');Object.assign(e,{mission:new Mission(defaultSave(),123),levels,hospitals,navLayouts:levels.map((level,i)=>makeNavigation(level,hospitals[i].colliders)),scene:new T.Scene(),effects:[],npcs:[],floor:0,playerPos:new T.Vector3(room.center.x,0,room.center.z),player:{root:new T.Group()},keys:new Set(),time:0,hooks:{},muzzle:{intensity:0},blackout:0,impairment:0,coughCooldown:999,nextBlackout:Infinity,nextPA:Infinity,shotCooldown:0,audio:{sound(){},speak(){},gasp(){}},notify(){},say(){},emitHUD(){},finish(){}});
 e.systems=new MissionSystems(e);e.incidents=new HospitalIncidents(e);e.incidents.arrivalAt=1;e.mission.elapsed=2;e.incidents.arrive();const n=e.incidents.contact;n.pos.set(room.center.x+1,0,room.center.z);n.recruit.state='escort';const random=e.mission.random;e.mission.random=()=>.01;assert.equal(e.incidents.choose('recruit'),true);e.mission.random=random;
 for(let i=0;i<1800&&Math.hypot(n.pos.x-3,n.pos.z-29)>1;i++){e.time+=1/30;e.mission.elapsed+=1/30;e.updateNPCs(1/30);e.updateEnvironment(1/30);assert.equal(e.canStand(n.pos.x,n.pos.z,.21,0),true);}
 assert.ok(Math.hypot(n.pos.x-3,n.pos.z-29)<1);assert.equal(n.recruit.weapon,undefined);assert.equal(e.incidents.roomAt(n.pos,0)?.id===room.id,false);
 }finally{for(const n of e?.npcs||[])n.visual.dispose?.();for(const h of hospitals||[])disposeHospital(h,materials);for(const m of Object.values(materials))m.dispose();}
});
