import {test,expect,devices} from '@playwright/test';
import fs from 'node:fs';
const phone=!!process.env.KTD_VISUAL_PHONE;
if(phone){const {defaultBrowserType,...device}=devices['iPhone 12 Pro Max landscape'];test.use({...device,browserName:'webkit',launchOptions:{}});}
async function boot(page){
 await page.goto('/favicon.svg');await page.evaluate(()=>localStorage.setItem('ktd-northline-v1',JSON.stringify({internationalVersion:3,storyReplayId:'china',guidanceMilestones:{story:true},settings:{quality:'high',volume:0,speech:false,brightness:1}})));await page.goto('/');await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);await page.evaluate(()=>window.__ktd.engine.renderer.setAnimationLoop(null));
}
test('all six steady-light hospitals render bright halls, rooms and ceilings without player-triggered lighting; outages still go dark',async({page},info)=>{
 test.setTimeout(240000);await boot(page);const report=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const country of ['france','china','russia','america','romania','england']){
  const r=await page.evaluate(async country=>{
   const e=window.__ktd.engine,{Mission}=await import('/src/game/mission.js'),T=await import('/node_modules/.vite/deps/three.js');
   await e.start(new Mission({...window.__ktd.save,playMode:'story',storyReplayId:country,activeAssignment:null},999,1));e.renderer.setAnimationLoop(null);e.pause(false);
   const card=new T.Mesh(new T.PlaneGeometry(.8,.8),new T.MeshStandardMaterial({color:'#cccccc',roughness:1,side:T.DoubleSide}));e.scene.add(card);const playerVisible=e.player.root.visible;e.player.root.visible=false;const visible=e.npcs.map(n=>n.visual.root.visible);e.npcs.forEach(n=>n.visual.root.visible=false);
   const normal=new T.Vector3(),forward=new T.Vector3(0,0,1),gl=e.renderer.getContext(),p=new Uint8Array(8*8*4),read=()=>{e.renderScene();gl.readPixels(Math.floor(e.renderer.domElement.width/2)-4,Math.floor(e.renderer.domElement.height/2)-4,8,8,gl.RGBA,gl.UNSIGNED_BYTE,p);let sum=0;for(let i=0;i<p.length;i+=4)sum+=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];return sum/64;},floors=[];
   for(const floor of [0,1,2,3]){
    e.setFloor(floor);e.blackout=0;const samples=[];
    for(const position of [e.systems.navigationFor(floor).nearest({x:-1.5,z:0}).point,e.systems.navigationFor(floor).nearest({x:-24,z:0}).point]){
     e.playerPos.set(position.x,0,position.z);e.updateLights();
     for(const [name,xyz]of [['wall',[0,0,1]],['floor',[0,1,0]],['ceiling',[0,-1,0]]]){normal.set(...xyz);card.position.set(position.x,1.6,position.z);card.quaternion.setFromUnitVectors(forward,normal);e.camera.position.copy(card.position).addScaledVector(normal,.9);e.camera.up.set(0,1,0);if(name!=='wall')e.camera.up.set(0,0,1);e.camera.lookAt(card.position);e.camera.updateMatrixWorld(true);const bright=read();e.ambient.intensity=.95;e.ambient.groundColor.set('#3e5264');const previous=read();e.updateLights();const before=e.localLights.map(l=>l.position.toArray());e.playerPos.set(24,0,-18);e.time+=.17;e.life.triggerFlicker();e.updateLights();const moving=read();samples.push({name,bright,previous,moving,stationary:JSON.stringify(before)===JSON.stringify(e.localLights.map(l=>l.position.toArray()))});}
    }
    e.blackout=5;e.updateLights();const outage=read();e.blackout=0;e.updateLights();floors.push({floor,samples,outage});
   }
   card.removeFromParent();card.geometry.dispose();card.material.dispose();e.camera.up.set(0,1,0);e.player.root.visible=playerVisible;e.npcs.forEach((n,i)=>n.visual.root.visible=visible[i]);e.setFloor(0);e.playerPos.set(-1.5,0,18);e.player.root.position.copy(e.playerPos);e.yaw=Math.PI;e.updatePlayer(.1);e.camera.position.set(-1.5,1.65,21);e.camera.lookAt(-1.5,1.45,9);e.camera.updateMatrixWorld(true);e.updateLights();e.emitHUD();e.renderScene();return {country,floors,lightCount:e.localLights.length,brightness:e.settings.brightness};
  },country);
  for(const f of r.floors){for(const s of f.samples){expect(s.bright,`${country} floor ${f.floor} ${s.name}`).toBeGreaterThan(165);expect(s.moving).toBeCloseTo(s.bright,0);expect(s.stationary).toBe(true);}expect(f.outage).toBeLessThan(95);}
  expect(r.brightness).toBe(1);report.push(r);await page.locator('canvas[aria-label^="3D hospital"]').screenshot({path:`artifacts/revision3361/${country}-${phone?'iphone':'desktop'}.png`});
 }
 expect(errors).toEqual([]);fs.writeFileSync(`artifacts/revision3361/lighting-${phone?'iphone':'desktop'}.json`,JSON.stringify(report,null,2));await info.attach('rendered-lighting',{body:JSON.stringify(report),contentType:'application/json'});
});
