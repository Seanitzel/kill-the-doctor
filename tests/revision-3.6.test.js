import test from 'node:test';import assert from 'node:assert/strict';import*as T from'three';
import{GameEngine}from'../src/game/engine.js';import{PHONE_TRACKS,nextPhoneTrack,isOutsideHospital,canTakeBreak,PhoneAudio}from'../src/game/phone-playlist.js';import{WaitBreak}from'../src/game/wait-break.js';import{addNightSky,updateNightSky}from'../src/game/night-sky.js';import{prepareAssignment}from'../src/game/assignment.js';import{readSave}from'../src/game/mission.js';import{storyVisual}from'../src/game/stories.js';import{TargetAppointment}from'../src/game/appointments.js';

test('phone playlist contains only the three supplied songs and wraps without recommendations',()=>{assert.deepEqual(PHONE_TRACKS.map(s=>s.id),['nju7N4ez4zo','EZ8hIZpRaMw','08uSLSoOsRc']);assert.equal(nextPhoneTrack(2),0);assert.equal(nextPhoneTrack(0),1);assert.ok(Object.isFrozen(PHONE_TRACKS));});

test('phone opening holsters weapons and clears stale controls without pausing appointment time; smoke is exterior only',()=>{
 const doc=globalThis.document;globalThis.document={exitPointerLock(){}};
 try{const e=Object.create(GameEngine.prototype);Object.assign(e,{mission:{state:'investigate'},audio:{},keys:new Set(['KeyW']),weapon:{visible:true},weaponDrawn:true,aiming:true,paused:false,floor:0,playerPos:new T.Vector3(0,0,30),resetTouch(){this.touchInput={forward:0,strafe:0};}});
 const appointment=new TargetAppointment(()=>0);appointment.start(0);assert.equal(e.setPhoneOpen(true),true);assert.equal(e.paused,false);assert.equal(e.keys.size,0);assert.equal(e.weapon.visible,false);assert.equal(e.weaponDrawn,false);assert.equal(e.aiming,false);assert.equal(e.toggleSmokeBreak(),false);
 appointment.update(60);assert.equal(appointment.remaining(60),120);e.playerPos.z=39;assert.equal(e.toggleSmokeBreak(),true);assert.equal(e.smoking,true);e.audio.phoneMusic=true;e.setPhoneOpen(false);assert.equal(e.smoking,false);assert.equal(e.audio.phoneMusic,false);
 for(const changes of[{paused:true},{mission:{result:{}}},{mission:{targetDown:true}},{mission:{policeAlert:true}},{mission:{state:'escape'}}])assert.equal(canTakeBreak({...e,...changes}),false);
 assert.equal(isOutsideHospital(1,{z:39}),false);assert.equal(isOutsideHospital(0,{z:35}),false);assert.equal(isOutsideHospital(0,{z:39}),true);
 }finally{globalThis.document=doc;}
});

test('repeated phone and smoke cycles reuse fixed resources and dispose every owned resource exactly once',()=>{
 const root=new T.Group(),hand=new T.Object3D();hand.position.set(.2,1.3,.2);root.add(hand);const prop=new WaitBreak({root,hand});const arrays=prop.positions,geometry=prop.smokeGeometry,resources=new Set();prop.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});let releases=0;resources.forEach(r=>r.addEventListener('dispose',()=>releases++));
 for(let i=0;i<500;i++){prop.update(true,i%2===0,i*.03);assert.equal(prop.positions,arrays);assert.equal(prop.smokeGeometry,geometry);assert.ok([...arrays].every(Number.isFinite));prop.update(false,false,i*.03);}
 prop.update(true,true,1);assert.equal(prop.cigarette.visible,true);assert.equal(prop.phone.visible,false);prop.dispose();prop.dispose();prop.update(true,true,2);assert.equal(releases,resources.size);assert.equal(prop.root.parent,null);
});

test('night sky stays hidden indoors, animates outdoors without allocation, and retains bounded geometry',()=>{
 const root=new T.Group(),sky=addNightSky(root),{stars,haze}=root.userData.nightSky,positions=stars.geometry.attributes.position;assert.equal(sky.visible,false);assert.equal(positions.count,400);assert.equal(sky.children.length,3);assert.ok(stars.material.fog===false);updateNightSky(root,true,1);assert.equal(sky.visible,true);const scale=haze.scale.x;
 for(let i=0;i<100;i++)updateNightSky(root,true,i);assert.equal(stars.geometry.attributes.position,positions);assert.notEqual(haze.scale.x,scale);updateNightSky(root,false,100);assert.equal(sky.visible,false);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});

test('Nigerian first two slides use the corrected Black doctor, while the final two and other countries retain their existing art',()=>{
 const save=readSave({getItem(){return null;}});save.completedCountryIds=['france'];save.assignmentType='standard';save.currentAssignment=null;const assignment=prepareAssignment(save);assert.equal(assignment.countryId,'nigeria');assert.equal(storyVisual(assignment.story,0).artId,'pamela-nigeria-v36');assert.equal(storyVisual(assignment.story,1).artId,'pamela-nigeria-v36');for(const i of[2,3])assert.equal(storyVisual(assignment.story,i).artId,'case-pamela-v25');
});

test('one streaming audio element handles playback, next track, seeking, volume, rejection and teardown without duplicate listeners',async()=>{
 class FakeAudio extends EventTarget{constructor(){super();this.duration=206;this.currentTime=0;this.playCalls=0;this.pauseCalls=0;this.loads=0;this.removed=[];}play(){this.playCalls++;if(this.reject)return Promise.reject(this.reject);this.dispatchEvent(new Event('playing'));return Promise.resolve();}pause(){this.pauseCalls++;this.dispatchEvent(new Event('pause'));}removeAttribute(name){this.removed.push(name);}load(){this.loads++;}}
 const audio=new FakeAudio(),states=[];let creates=0;const p=new PhoneAudio({volume:.5,createAudio:()=>{creates++;return audio;},onChange:s=>states.push(s)});assert.equal(creates,1);assert.equal(audio.preload,'metadata');assert.match(audio.src,/nju7N4ez4zo.mp3$/);assert.equal(audio.playCalls,0);
 await p.play();assert.equal(p.state.playing,true);assert.equal(p.state.buffering,false);p.pause();assert.equal(p.state.playing,false);p.select(2);await Promise.resolve();assert.match(audio.src,/08uSLSoOsRc.mp3$/);audio.dispatchEvent(new Event('ended'));assert.equal(p.state.selected,0);assert.equal(creates,1);
 audio.dispatchEvent(new Event('loadedmetadata'));p.seek(999);assert.equal(audio.currentTime,206);p.setVolume(2);assert.equal(audio.volume,1);p.select(9);assert.equal(p.state.selected,0);
 p.pause();audio.reject={name:'NotAllowedError'};await p.play();assert.match(p.state.error,/Tap play/);assert.equal(p.state.playing,false);p.dispose();const changes=states.length,plays=audio.playCalls;audio.dispatchEvent(new Event('playing'));audio.dispatchEvent(new Event('ended'));p.select(1);await p.play();p.dispose();assert.equal(states.length,changes);assert.equal(audio.playCalls,plays);assert.deepEqual(audio.removed,['src']);assert.equal(audio.loads,1);
});

test('closing the phone ignores a late playback rejection',async()=>{let reject;const audio=new EventTarget();Object.assign(audio,{play:()=>new Promise((_,r)=>reject=r),pause(){},removeAttribute(){},load(){}});let changes=0;const p=new PhoneAudio({createAudio:()=>audio,onChange:()=>changes++});const pending=p.play();p.dispose();const before=changes;reject(new Error('late'));await pending;assert.equal(changes,before);});
