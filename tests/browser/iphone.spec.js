import {test,expect,devices} from '@playwright/test';
const {defaultBrowserType,...iphone}=devices['iPhone 17 Pro Max landscape'];
test.use({...iphone,browserName:'webkit',launchOptions:{}});
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('ktd-northline-v1',JSON.stringify({settings:{quality:'low',volume:0,speech:false}})));
  await page.goto('/');await page.waitForFunction(()=>window.__northline?.ready);
});
async function start(page){
  await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).tap();await page.getByRole('button',{name:'Skip story',exact:true}).click();
  await page.waitForFunction(()=>window.__northline.screen==='game'&&!window.__northline.loading);
  await page.evaluate(()=>{const e=window.__ktd.engine;e.nextBlackout=e.nextPA=99999;e.coughCooldown=99999;e.npcs.filter(n=>['security','police'].includes(n.role)).forEach(n=>{n.path=[];n.wait=9999;n.pos.set(-24,0,21);});});
}
test('iPhone menu fits browser toolbars and screen cutouts without overlapping controls',async({page})=>{
  await page.addStyleTag({content:'.mobile-mode {--safe-left:62px;--safe-right:62px;--safe-bottom:21px}'});
  for(const [width,height] of [[838,390],[956,440],[956,360],[956,310],[844,330],[667,280]]){
    await page.setViewportSize({width,height});
    const boxes=await page.evaluate(()=>Object.fromEntries(['.menu-header','.menu-intro','.character-select','.start-button','.menu-links','.menu-footer'].map(s=>[s,document.querySelector(s).getBoundingClientRect().toJSON()])));
    expect(boxes['.character-select'].left).toBeGreaterThan(boxes['.menu-intro'].right);
    expect(boxes['.start-button'].top).toBeGreaterThan(boxes['.character-select'].bottom);
    expect(boxes['.menu-links'].bottom).toBeLessThan(boxes['.menu-footer'].top);
    expect(boxes['.start-button'].right).toBeLessThanOrEqual(width);
    expect(boxes['.menu-intro'].top).toBeGreaterThan(boxes['.menu-header'].bottom);
  }
});
test('Mobile exploration frames the whole character and keeps camera height steady when looking up or down',async({page})=>{
  await start(page);
  const views=await page.evaluate(()=>{const e=window.__ktd.engine;e.pause(true);return [-.2,-.06,.2].map(pitch=>{e.pitch=pitch;e.aiming=false;e.updateCamera(.1,true);e.camera.updateMatrixWorld(true);const head=e.playerPos.clone(),feet=e.playerPos.clone();head.y=1.82;feet.y=.06;return{height:e.camera.position.y,distance:e.camera.position.distanceTo(e.playerPos),head:head.project(e.camera).toArray(),feet:feet.project(e.camera).toArray()};});});
  for(const v of views){expect(v.height).toBeGreaterThan(1.6);expect(v.height).toBeLessThanOrEqual(1.85);expect(v.distance).toBeGreaterThan(4);expect(Math.abs(v.head[1])).toBeLessThan(1);expect(Math.abs(v.feet[1])).toBeLessThan(1);}
});
for(const height of [.2,1.1,1.78]){
  test(`FIRE hits the crosshair at height ${height} without moving the camera into aim mode`,async({page})=>{
    await start(page);
    await page.evaluate(height=>{const e=window.__ktd.engine;e.playerPos.set(0,0,24);e.yaw=Math.PI;e.pitch=-.06;e.aiming=false;e.updateCamera(.1,true);e.npcs.filter(n=>n.floor===0).forEach(n=>{n.pos.set(24,0,30);n.path=[];n.wait=9999;});const n=e.npcs.find(n=>n.id==='target');n.floor=0;n.pos.set(0,0,18);n.hitOffset=null;n.visual.root.visible=true;e.mission.identify();e.camera.lookAt(0,height,18);e.camera.updateMatrixWorld(true);window.__expectedShot={origin:e.camera.position.toArray(),direction:e.camera.getWorldDirection(e.playerPos.clone()).toArray()};e.requestTouchShot();e.yaw+=.15;},height);
    await page.waitForFunction(()=>window.__ktd.engine.lastShot);
    const shot=await page.evaluate(()=>{const e=window.__ktd.engine;return {hit:e.lastShot.hitId,origin:e.lastShot.origin.toArray(),direction:e.lastShot.direction.toArray(),expected:window.__expectedShot,aiming:e.aiming,down:e.mission.targetDown};});
    expect(shot.hit).toBe('target');expect(shot.down).toBe(true);expect(shot.aiming).toBe(false);expect(shot.origin).toEqual(shot.expected.origin);
    shot.direction.forEach((v,i)=>expect(v).toBeCloseTo(shot.expected.direction[i],6));
  });
}
test('Phone help and notifications describe touch buttons and contain no visible keyboard shortcuts',async({page})=>{
  await page.getByRole('button',{name:'How to play',exact:true}).tap();
  await expect(page.locator('.field-guide')).toContainText('tap USE');expect(await page.locator('kbd:visible').count()).toBe(0);
  await page.getByRole('button',{name:'Close dialog'}).tap();await start(page);
  await page.evaluate(()=>window.__ktd.engine.triggerBlackout(2));await expect(page.locator('.toast')).toContainText('Tap LIGHT');
  await page.evaluate(()=>{const e=window.__ktd.engine;e.blackout=0;e.ammo=0;e.shotCooldown=0;});
  await page.getByRole('button',{name:'Fire weapon',exact:true}).tap();await expect(page.locator('.toast')).toContainText('Tap RELOAD');
  await page.evaluate(()=>{const e=window.__ktd.engine;e.mission.clue('directory');e.playerPos.set(-5.8,0,28.5);e.emitHUD();});
  await page.getByRole('button',{name:'Interact',exact:true}).tap();await expect(page.locator('.toast')).toContainText('Tap the journal icon');
  expect(await page.locator('kbd:visible').count()).toBe(0);
});
test('A phone viewport resize releases the active joystick gesture',async({page})=>{
  await start(page);const stick=await page.getByTestId('touch-move').boundingBox();
  await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2-30,{steps:5});
  await page.waitForFunction(()=>window.__ktd.engine.touchInput.forward>0);
  await page.setViewportSize({width:838,height:330});await page.waitForFunction(()=>window.__ktd.engine.touchInput.forward===0);await page.mouse.up();
});

test('Entering with a stale tall canvas recovers to the actual visible phone viewport',async({page})=>{
  await page.setViewportSize({width:956,height:384});await start(page);
  await page.evaluate(()=>{const e=window.__ktd.engine;e.renderer.setSize(956,640);e.camera.aspect=956/640;e.camera.updateProjectionMatrix();});
  await page.waitForFunction(()=>{const e=window.__ktd.engine,size=e.renderer.getSize(e.playerPos.clone()),rect=e.renderer.domElement.getBoundingClientRect();return size.y===384&&rect.height===384&&Math.abs(e.camera.aspect-956/384)<.001;});
  const offset=await page.evaluate(()=>{const canvas=window.__ktd.engine.renderer.domElement.getBoundingClientRect(),r=document.querySelector('.reticle').getBoundingClientRect();return Math.abs(canvas.y+canvas.height/2-r.y-r.height/2);});expect(offset).toBeLessThan(1);
  await page.evaluate(()=>document.querySelector('.viewport').style.height='330px');
  await page.waitForFunction(()=>{const e=window.__ktd.engine,size=e.renderer.getSize(e.playerPos.clone());return size.y===330&&Math.abs(e.camera.aspect-956/330)<.001;});
});
test('The shooting ray goes through the displayed crosshair in screen pixels',async({page})=>{
  await start(page);
  const distance=await page.evaluate(()=>{const e=window.__ktd.engine,r=document.querySelector('.reticle');r.style.left='56%';r.style.top='42%';const box=r.getBoundingClientRect(),canvas=e.renderer.domElement.getBoundingClientRect(),ray=e.aimRay(),point=ray.origin.clone().addScaledVector(ray.direction,8).project(e.camera);return Math.hypot(canvas.x+(point.x+1)*canvas.width/2-box.x-box.width/2,canvas.y+(1-point.y)*canvas.height/2-box.y-box.height/2);});
  expect(distance).toBeLessThan(1);
});
test('Fast turns keep the camera inside the hospital without hiding solid walls',async({page})=>{
  await start(page);
  const result=await page.evaluate(async()=>{
    const {obstacleBounds,segmentHit3D}=await import('/src/game/collision.js');
    const e=window.__ktd.engine;e.pause(true);const views=[];
    for(const [x,z] of [[0,30],[0,33.3],[.9,18],[-.8,6]]){
      e.playerPos.set(x,0,z);e.pitch=-.06;
      for(let i=0;i<60;i++){
        if(i%10===0)e.yaw+=Math.PI/2;e.updateCamera(1/60);
        const clear=e.hospitals[0].colliders.every(c=>segmentHit3D(e.camera.position,e.camera.position,obstacleBounds(c),.075)===null);
        views.push({clear,height:e.camera.position.y});
      }
    }
    return {views,wallsVisible:e.hospitals[0].statics.every(m=>m.visible),blocked:!e.lineOfSight({x:6,z:33},{x:6,z:36})};
  });
  expect(result.wallsVisible).toBe(true);expect(result.blocked).toBe(true);
  for(const view of result.views){expect(view.clear).toBe(true);expect(view.height).toBeGreaterThan(1);expect(view.height).toBeLessThan(3.4);}
});
