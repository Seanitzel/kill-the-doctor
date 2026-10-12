import {nativeExecute} from './native-access.mjs';
import {attach} from '../.runtime/mobile-tools/node_modules/webdriverio/build/node.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const kind=process.argv[2]||'android',session=JSON.parse(await fs.readFile(`artifacts/native/${kind}-session.json`,'utf8'));
const driver=await attach({hostname:'127.0.0.1',port:4725,path:'/',sessionId:session.id,capabilities:session.capabilities,logLevel:'error'});
const web=null;
await driver.pause(1200);
const size=await nativeExecute(driver,kind,web,()=>({w:innerWidth,h:innerHeight}));
await driver.switchContext('NATIVE_APP');
const element=await driver.findElement('class name',kind==='android'?'android.webkit.WebView':'XCUIElementTypeWebView');const id=element['element-6066-11e4-a52e-4f735466cecf']||element.ELEMENT;const frame=await driver.getElementRect(id);
console.log('Native view',JSON.stringify({size,frame}));
async function box(selector){return await nativeExecute(driver,kind,web,s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};},selector);}
function point(p){return {x:Math.round(frame.x+p.x*frame.width/size.w),y:Math.round(frame.y+p.y*frame.height/size.h)};}
async function tap(selector){const p=point(await box(selector));await driver.switchContext('NATIVE_APP');await driver.performActions([{type:'pointer',id:'touch',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',duration:0,x:p.x,y:p.y},{type:'pointerDown',button:0},{type:'pause',duration:100},{type:'pointerUp',button:0}]}]);await driver.releaseActions();}
async function state(){return nativeExecute(driver,kind,web,()=>window.__northline);}
console.log('Before',JSON.stringify(await state()));if((await state()).screen==='menu')await tap('.start-button');await driver.pause(2500);for(let i=0;i<60;i++){const s=await state();if(s.screen==='game'&&!s.loading)break;await driver.pause(300);}
const before=await state();assert.equal(before.screen,'game');console.log('Started',JSON.stringify(before));
const stick=await box('[data-testid="touch-move"]'),look=await box('[data-testid="touch-look"]'),a=point(stick),b=point({x:stick.x,y:stick.y-42}),c=point({x:look.x,y:look.y-50}),d=point({x:look.x+85,y:look.y-50});
await driver.switchContext('NATIVE_APP');await driver.performActions([
 {type:'pointer',id:'move',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',duration:0,x:a.x,y:a.y},{type:'pointerDown',button:0},{type:'pointerMove',duration:700,x:b.x,y:b.y},{type:'pause',duration:1250},{type:'pointerUp',button:0}]},
 {type:'pointer',id:'look',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',duration:0,x:c.x,y:c.y},{type:'pointerDown',button:0},{type:'pointerMove',duration:700,x:d.x,y:d.y},{type:'pause',duration:1250},{type:'pointerUp',button:0}]}
]);await driver.releaseActions();const moved=await state();assert.ok(Math.hypot(moved.position[0]-before.position[0],moved.position[2]-before.position[2])>.5,'Native thumbstick moves player');assert.ok(Math.abs(moved.yaw-before.yaw)>.1,'Simultaneous drag turns camera');assert.equal(moved.controls.forward,0);console.log('Moved',JSON.stringify(moved));
await tap('button[aria-label="Toggle flashlight"]');await tap('button[aria-label="Hospital map"]');const mapped=await state();assert.equal(mapped.overlay,'map');assert.ok(mapped.paused&&mapped.flashlight);console.log('Map',JSON.stringify(mapped));await driver.switchContext('NATIVE_APP');await driver.saveScreenshot(`artifacts/native/${kind}-touch-map.png`);
await tap('button[aria-label="Close dialog"]');await tap('[data-testid="touch-aim"]');await tap('[data-testid="touch-fire"]');await driver.pause(500);const shot=await state();assert.equal(shot.ammo,before.ammo-1);assert.equal(shot.audio.state,'running');console.log('Shot',JSON.stringify(shot));await fs.writeFile(`artifacts/native/${kind}-touch-report.json`,JSON.stringify({platform:kind,before,moved,mapped,shot,at:new Date().toISOString()},null,2));await driver.switchContext('NATIVE_APP');await driver.saveScreenshot(`artifacts/native/${kind}-touch-game.png`);

process.exit(0);
