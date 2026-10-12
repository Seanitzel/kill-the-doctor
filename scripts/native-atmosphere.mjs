import {nativeExecute} from './native-access.mjs';
import {attach} from '../.runtime/mobile-tools/node_modules/webdriverio/build/node.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const kind=process.argv[2]||'ios',session=JSON.parse(await fs.readFile(`artifacts/native/${kind}-session.json`,'utf8'));
const d=await attach({hostname:'127.0.0.1',port:4725,path:'/',sessionId:session.id,capabilities:session.capabilities,logLevel:'error'});
const js=(fn,arg)=>nativeExecute(d,kind,null,fn,arg),checks=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
await d.pause(1200);
let ready;for(let i=0;i<40;i++){try{ready=await js(()=>window.__northline?.ready);if(ready)break;}catch{}await d.pause(300);}assert.ok(ready);
if(await js(()=>window.__northline.screen==='game')){await js(()=>{const e=window.__ktd.engine;e.pause(false);e.mission.finish(false,'Native atmosphere verification fixture');e.finish();});await d.pause(250);}
if(await js(()=>window.__northline.screen==='results')){await js(()=>document.querySelector('.result-actions button:last-child').click());await d.pause(250);}
const initial=await js(()=>({screen:window.__northline.screen,box:document.querySelector('.start-button')?.getBoundingClientRect().toJSON(),w:innerWidth,h:innerHeight}));
if(initial.screen==='menu'){
 await d.switchContext('NATIVE_APP');const el=await d.findElement('class name',kind==='ios'?'XCUIElementTypeWebView':'android.webkit.WebView'),frame=await d.getElementRect(el['element-6066-11e4-a52e-4f735466cecf']||el.ELEMENT);
 const x=Math.round(frame.x+(initial.box.x+initial.box.width/2)*frame.width/initial.w),y=Math.round(frame.y+(initial.box.y+initial.box.height/2)*frame.height/initial.h);
 await d.performActions([{type:'pointer',id:'finger',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',duration:0,x,y},{type:'pointerDown',button:0},{type:'pause',duration:100},{type:'pointerUp',button:0}]}]);await d.releaseActions();
}
for(let i=0;i<60;i++){if(await js(()=>window.__northline.screen==='game'&&!window.__northline.loading))break;await d.pause(300);}
await js(()=>window.__ktd.engine.pause(false));for(let i=0;i<25;i++){if(await js(()=>window.__northline.audio.state==='running'))break;await d.pause(200);}
const baseline=await js(()=>{const e=window.__ktd.engine;e.impairment=0;e.blackout=0;e.flashlight=false;e.nextPA=e.nextBlackout=99999;e.npcs.filter(n=>['security','police'].includes(n.role)).forEach(n=>{n.path=[];n.wait=9999;n.pos.set(-24,0,21);});return{audio:window.__northline.audio,rooms:e.levels.map(l=>l.rooms.length),model:!!e.player.model};});
check('Native character and all sixteen departments loaded',baseline.model&&baseline.rooms.reduce((a,b)=>a+b,0)===16);
check('Recorded hospital audio decoded in native WebView',baseline.audio.samples.length===3&&baseline.audio.state==='running');
const cafe=await js(()=>{const e=window.__ktd.engine,r=e.levels[0].rooms.find(r=>r.kind==='cafe');e.setFloor(0);e.playerPos.set(r.center.x,0,r.center.z+3);e.yaw=Math.PI;e.updateCamera(.1,true);const g=e.life.groups.find(g=>g.kind==='cafe');g.next=0;e.life.update(.1);return{diners:e.npcs.filter(n=>n.activity==='eat').length,groups:e.life.groups.map(g=>g.kind),text:e.life.history.at(-1)?.text};});
check('Cafeteria, nurses, and patients retain their conversations',cafe.diners===6&&cafe.groups.includes('nurses')&&cafe.groups.includes('patients')&&cafe.text);
const clinical=await js(()=>{const e=window.__ktd.engine,c=e.life.cases.find(c=>c.room.kind==='clinic'&&c.room.floor===0);e.playerPos.set(c.room.center.x,0,c.room.center.z+3);e.life.lastRoom=null;e.life.queue=[];e.life.nextAmbient=99999;e.life.update(.1);return{reaction:Math.max(...e.npcs.filter(n=>n.room?.id===c.room.id).map(n=>n.reaction||0)),text:e.life.history.at(-1)?.text,patient:c.patient.activity};});
console.log('Clinical',JSON.stringify(clinical));check('Entering a clinic interrupts the examination',clinical.reaction>0&&/Excuse|did not hear/.test(clinical.text)&&clinical.patient==='rest');
const maternity=await js(()=>{const e=window.__ktd.engine,r=e.levels[1].rooms.find(r=>r.kind==='maternity');e.setFloor(1);e.playerPos.set(r.center.x+1,0,r.center.z-2);e.yaw=-1.9;e.updateCamera(.1,true);e.life.nextMaternity=0;e.life.update(.1);e.emitHUD();return{pregnant:e.npcs.filter(n=>n.pregnant).length,babies:e.npcs.filter(n=>n.baby).length,channel:e.audio.ambientChannels.has('newborn'),active:[...e.audio.activeSamples].map(s=>({name:s.name,duration:s.source.buffer.duration}))};});
check('Maternity plays newborn cries, labor, and breathing recordings',maternity.pregnant===2&&maternity.babies===2&&maternity.channel&&['newborn','labor','breathing'].every(n=>maternity.active.some(s=>s.name===n&&s.duration>1)));
await d.switchContext('NATIVE_APP');await d.saveScreenshot(`artifacts/native/${kind}-native-maternity.png`);
const exposure=await js(()=>{const e=window.__ktd.engine;e.pause(true);e.setFloor(0);e.playerPos.set(0,0,25.4);e.coughCooldown=0;const a=e.npcs.find(n=>n.contamination===30&&n.floor===0&&!n.activity),b=e.npcs.find(n=>n.contamination===60&&n.floor===0&&!n.activity),clean=e.npcs.find(n=>n.role==='patient'&&!n.contamination&&n.floor===0);a.pos.set(0,0,24);a.path=[];a.wait=999;a.nextCough=0;e.life.update(.1);const thirty=e.impairment;e.updateEnvironment(10);const twenty=e.impairment;e.life.update(.1);const noRefresh=e.impairment;b.pos.set(0,0,26);b.path=[];b.wait=999;b.nextCough=0;e.coughCooldown=0;e.life.update(.1);const sixty=e.impairment;const cleanCloud=e.life.emitCloud(clean),cleanEffect=e.triggerCough(clean);e.triggerBlackout(5);e.toggleFlash();e.updateLights();const flashlight=e.flash.visible;e.blackout=0;e.impairment=60;e.emitHUD();return{thirty,twenty,noRefresh,sixty,cleanCloud,cleanEffect,clouds:e.life.clouds.length,flashlight};});
console.log('Exposure',JSON.stringify(exposure));check('Native contamination varies by patient and never comes from clean patients',exposure.thirty===30&&exposure.twenty===20&&exposure.noRefresh===20&&exposure.sixty===60&&exposure.cleanCloud===null&&!exposure.cleanEffect&&exposure.clouds>0);
let blur;for(let i=0;i<25;i++){await d.pause(250);blur=await js(()=>getComputedStyle(document.querySelector('.viewport')).filter);if(Number(blur.match(/blur\(([\d.]+)px\)/)?.[1])>.1)break;}check('Native vision shows actual CSS blur',Number(blur.match(/blur\(([\d.]+)px\)/)?.[1])>.1);
check('Native flashlight illuminates during blackouts',exposure.flashlight);
await d.switchContext('NATIVE_APP');await d.saveScreenshot(`artifacts/native/${kind}-native-contamination.png`);
await js(()=>{const e=window.__ktd.engine;e.impairment=0;e.blackout=0;e.flashlight=false;e.playerPos.set(0,0,30);e.yaw=Math.PI;e.pause(false);e.updateCamera(.1,true);e.emitHUD();});
await fs.writeFile(`artifacts/native/${kind}-atmosphere-report.json`,JSON.stringify({platform:kind,passed:checks,baseline,cafe,clinical,maternity,exposure,blur,at:new Date().toISOString()},null,2));process.exit(0);
