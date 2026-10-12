import {attach} from '../.runtime/mobile-tools/node_modules/webdriverio/build/node.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {androidExecute,closeAndroidQA} from './android-native-rpc.mjs';
const kind=process.argv[2]||'ios';if(kind==='android')execFileSync(process.execPath,['scripts/native-touch.mjs','android'],{stdio:'inherit'});
const session=JSON.parse(await fs.readFile(`artifacts/native/${kind}-session.json`,'utf8'));
const d=await attach({hostname:'127.0.0.1',port:4725,path:'/',sessionId:session.id,capabilities:session.capabilities,logLevel:'error'});
await d.switchContext('NATIVE_APP');await d.activateApp('com.ktd.northline');await d.pause(1500);
if(kind==='ios')await d.setOrientation('LANDSCAPE');
if(kind==='android'){await d.saveScreenshot('artifacts/native/android-final-game.png');await d.pressKeyCode(4);await d.pause(500);const status=await androidExecute(()=>({status:window.__northline,mutable:!!window.__ktd}));assert.ok(status.status.paused&&status.status.overlay==='pause');assert.equal(status.mutable,false);await d.saveScreenshot('artifacts/native/android-final-pause.png');await fs.writeFile('artifacts/native/android-final-smoke-report.json',JSON.stringify({platform:kind,passed:['Production app loads local assets without mutable QA bridge','Native simultaneous movement and look','Native fire, flashlight, map pause/resume and audio','Android Back opens pause menu'],...status,at:new Date().toISOString()},null,2));closeAndroidQA();process.exit(0);}
const checks=[];
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);console.log('PASS',name);};
async function element(label){return d.findElement('xpath',`//*[@name="${label}" or @content-desc="${label}"]`);}
async function frame(label){const e=await element(label);return d.getElementRect(e['element-6066-11e4-a52e-4f735466cecf']||e.ELEMENT);}
async function tapPoint(x,y){await d.performActions([{type:'pointer',id:'finger',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',duration:0,x:Math.round(x),y:Math.round(y)},{type:'pointerDown',button:0},{type:'pause',duration:90},{type:'pointerUp',button:0}]}]);await d.releaseActions();await d.pause(200);}
async function tap(label){const r=await frame(label);await tapPoint(r.x+r.width/2,r.y+r.height/2);}
let source=await d.getPageSource();await fs.writeFile(`artifacts/native/${kind}-final-menu.xml`,source);
let starts=[];for(let i=0;i<60;i++){starts=await d.findElements('xpath','//*[@type="XCUIElementTypeButton" and contains(@name,"ENTER THE HOSPITAL") or @class="android.widget.Button" and contains(@text,"ENTER THE HOSPITAL")]');if(starts.length)break;await d.pause(500);}
assert.ok(starts.length,'Production native app shows start action');const start=starts[0],r=await d.getElementRect(start['element-6066-11e4-a52e-4f735466cecf']||start.ELEMENT);await tapPoint(r.x+r.width/2,r.y+r.height/2);
let ready=false;for(let i=0;i<35;i++){try{await element('Fire weapon');ready=true;break;}catch{}await d.pause(300);}check('Production app starts the full game with native touch UI',ready);
await d.pause(1800);
const stick=await frame('Movement joystick'),look=await frame('Drag to look around');
const a={x:Math.round(stick.x+stick.width/2),y:Math.round(stick.y+stick.height/2)},b={x:a.x,y:a.y-Math.round(stick.height*.35)},c={x:Math.round(look.x+look.width*.38),y:Math.round(look.y+look.height*.25)},e={x:c.x+Math.round(look.width*.17),y:c.y};
await d.performActions([{type:'pointer',id:'move',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',duration:0,...a},{type:'pointerDown',button:0},{type:'pointerMove',duration:700,...b},{type:'pause',duration:850},{type:'pointerUp',button:0}]},{type:'pointer',id:'look',parameters:{pointerType:'touch'},actions:[{type:'pointerMove',duration:0,...c},{type:'pointerDown',button:0},{type:'pointerMove',duration:700,...e},{type:'pause',duration:850},{type:'pointerUp',button:0}]}]);await d.releaseActions();
await tap('Fire weapon');await tap('Toggle flashlight');await d.saveScreenshot(`artifacts/native/${kind}-final-game.png`);source=await d.getPageSource();await fs.writeFile(`artifacts/native/${kind}-final-game.xml`,source);check('Final package renders gameplay and fires through native touch',source.includes('05')&&source.includes('Fire weapon'));
await tap('Hospital map');source=await d.getPageSource();check('Map opens in final package',source.includes('Know your way out'));
await tap('Close dialog');if(kind==='android')await d.pressKeyCode(4);else await tap('Pause mission');source=await d.getPageSource();check('Native pause or Android Back opens pause menu',source.includes('Take a breath'));
await d.saveScreenshot(`artifacts/native/${kind}-final-pause.png`);
await fs.writeFile(`artifacts/native/${kind}-final-smoke-report.json`,JSON.stringify({platform:kind,passed:checks,rect:await d.getWindowRect(),at:new Date().toISOString()},null,2));process.exit(0);
