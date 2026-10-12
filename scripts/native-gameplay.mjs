import {nativeExecute} from './native-access.mjs';
import {attach} from '../.runtime/mobile-tools/node_modules/webdriverio/build/node.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const kind=process.argv[2]||'android',session=JSON.parse(await fs.readFile(`artifacts/native/${kind}-session.json`,'utf8'));
const d=await attach({hostname:'127.0.0.1',port:4725,path:'/',sessionId:session.id,capabilities:session.capabilities,logLevel:'error'});
const web=null;
await wait(()=>window.__northline?.ready);
const view=await nativeExecute(d,kind,web,()=>({w:innerWidth,h:innerHeight}));await d.switchContext('NATIVE_APP');const el=await d.findElement('class name',kind==='android'?'android.webkit.WebView':'XCUIElementTypeWebView');const frame=await d.getElementRect(el['element-6066-11e4-a52e-4f735466cecf']||el.ELEMENT);
const checks=[];
async function js(fn,arg){return nativeExecute(d,kind,web,fn,arg);}
async function status(){return js(()=>window.__northline);}
async function tap(sel){
 let r;
 for(let attempt=0;attempt<8;attempt++){
  r=await js(s=>{const r=document.querySelector(s)?.getBoundingClientRect();if(!r)throw Error(s+' missing');return{x:r.x+r.width/2,y:r.y+r.height/2,w:innerWidth,h:innerHeight};},sel);
  if(r.y>50&&r.y<r.h-45)break;
  await d.switchContext('NATIVE_APP');
  const x=Math.round(frame.x+frame.width*.45),from=Math.round(frame.y+frame.height*(r.y>=r.h-45?.8:.25)),to=Math.round(frame.y+frame.height*(r.y>=r.h-45?.25:.8));
  await d.performActions([{type:'pointer',id:'scroll',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',duration:0,x,y:from},{type:'pointerDown',button:0},{type:'pointerMove',duration:500,x,y:to},{type:'pointerUp',button:0}]}]);await d.releaseActions();await d.pause(250);
 }
 assert.ok(r.y>=0&&r.y<r.h,sel+' is reachable on phone');
 const p={x:Math.round(frame.x+r.x*frame.width/r.w),y:Math.round(frame.y+r.y*frame.height/r.h)};await d.switchContext('NATIVE_APP');await d.performActions([{type:'pointer',id:'finger',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',duration:0,...p},{type:'pointerDown',button:0},{type:'pause',duration:90},{type:'pointerUp',button:0}]}]);await d.releaseActions();await d.pause(140);
}
async function wait(fn){for(let i=0;i<70;i++){try{if(await js(fn))return;}catch(e){if(!/not ready|not running|undefined|JavaScript exception|ECONN|fetch failed/.test(e.message))throw e;}await d.pause(250);}throw Error('Native state wait timed out');}
async function photo(name){await d.switchContext('NATIVE_APP');await d.saveScreenshot(`artifacts/native/${kind}-${name}.png`);}
function check(name,value){assert.ok(value,name);checks.push(name);console.log('PASS',name);}
let state=await status();if(state.overlay){await tap('[aria-label="Close dialog"]');state=await status();}if(state.screen==='results'){await tap('.results-panel>.primary');await wait(()=>!window.__northline.loading&&window.__northline.screen==='game');}if(state.screen==='menu'){await tap('.start-button');await wait(()=>!window.__northline.loading&&window.__northline.screen==='game');}if((await status()).overlay)await tap('[aria-label="Close dialog"]');
await js(()=>{const e=window.__ktd.engine;e.nextBlackout=e.nextPA=99999;e.coughCooldown=99999;e.npcs.filter(n=>['security','police'].includes(n.role)).forEach(n=>{n.path=[];n.wait=9999;n.pos.set(-24,0,21);});e.impairment=0;e.playerPos.set(-5.8,0,28.5);e.yaw=Math.PI;e.updateCamera(.1,true);e.emitHUD();});
await tap('[data-testid="touch-use"]');check('Clue interaction opens evidence dialog',(await status()).overlay==='clue');await photo('native-clue');await tap('.modal .primary');check('Evidence collected',(await status()).clues>=1);
await tap('[aria-label="Evidence journal"]');check('Journal pauses native mission',(await status()).paused&&(await status()).overlay==='journal');await tap('[aria-label="Close dialog"]');
await js(()=>{const e=window.__ktd.engine;e.playerPos.set(0,0,-22);e.emitHUD();});await tap('[data-testid="touch-use"]');check('Lift reaches first floor',await js(()=>window.__ktd.engine.floor===1));
await js(()=>{const e=window.__ktd.engine;e.playerPos.set(0,0,-22);e.emitHUD();});await tap('[data-testid="touch-use"]');check('Lift returns to ground floor',await js(()=>window.__ktd.engine.floor===0));
await js(()=>{const e=window.__ktd.engine,t=e.npcs.find(n=>n.id==='target');t.path=[];t.wait=999;e.setFloor(t.floor);e.playerPos.set(t.pos.x,0,t.pos.z+1);e.life.lastRoom=t.room.id;e.emitHUD();});await tap('[data-testid="touch-use"]');check('Target badge verified by native USE',(await status()).overlay==='badge');await tap('.modal .primary');
await js(()=>{const e=window.__ktd.engine,n=e.npcs.find(n=>n.id==='target');const offsets=[[0,3],[3,0],[-3,0],[0,-3]],p=offsets.find(([x,z])=>e.canStand(n.pos.x+x,n.pos.z+z)&&e.lineOfSight({x:n.pos.x+x,z:n.pos.z+z},n.pos))||offsets[0];e.playerPos.set(n.pos.x+p[0],0,n.pos.z+p[1]);e.yaw=Math.atan2(n.pos.x-e.playerPos.x,n.pos.z-e.playerPos.z);e.pitch=-.15;e.aiming=false;e.updateCamera(.1,true);e.emitHUD();});
await tap('[data-testid="touch-aim"]');
await js(()=>{const e=window.__ktd.engine,n=e.npcs.find(n=>n.id==='target');for(let i=0;i<10;i++){e.updateCamera(.1,true);e.camera.updateMatrixWorld(true);const p=n.pos.clone();p.y+=1.1;p.project(e.camera);e.yaw-=p.x*.25;e.pitch+=p.y*.2;}e.updateCamera(.1,true);e.emitHUD();});
await tap('[data-testid="touch-fire"]');await wait(()=>window.__northline.state==='escape'||window.__northline.screen==='results');check('Native FIRE completes target and activates countdown',(await status()).state==='escape');await photo('native-emergency');
const beforeBackground=await js(()=>({timer:window.__ktd.mission.timer,elapsed:window.__ktd.mission.elapsed}));await d.background(2);await d.activateApp('com.ktd.northline');await wait(()=>window.__northline.paused);check('Backgrounding pauses countdown and releases input',(await status()).controls.forward===0&&(await status()).paused&&(await status()).screen==='game'&&(await status()).overlay==='pause');const afterBackground=await js(()=>({timer:window.__ktd.mission.timer,elapsed:window.__ktd.mission.elapsed}));check('Countdown freezes while app is in background',Math.abs(afterBackground.timer-beforeBackground.timer)<3);await tap('.modal .primary');
await js(()=>{const e=window.__ktd.engine;e.setFloor(0);e.playerPos.set(0,0,33);e.yaw=0;e.emitHUD();});await wait(()=>window.__northline.screen==='results');check('Native mission reaches successful results',await js(()=>window.__ktd.mission.result.success));let coins=(await status()).coins;check('Mission reward credited',coins>240);await photo('native-results');
const shoesBefore=(await status()).upgrades.shoes,upgradeCost=120*(shoesBefore+1);await tap('.result-actions button:first-child');await tap('.upgrade-grid article:first-child button');check('Equipment purchased on phone',(await status()).upgrades.shoes>=1);await tap('[aria-label="Close dialog"]');
await d.switchContext('NATIVE_APP');await d.terminateApp('com.ktd.northline');await d.activateApp('com.ktd.northline');await wait(()=>window.__northline.ready);check('Progress persists after native process restart',(await status()).coins===coins-upgradeCost&&(await status()).upgrades.shoes>=1);
await fs.writeFile(`artifacts/native/${kind}-gameplay-report.json`,JSON.stringify({platform:kind,passed:checks,status:await status(),at:new Date().toISOString()},null,2));console.log('Native gameplay checks complete',kind);process.exit(0);
