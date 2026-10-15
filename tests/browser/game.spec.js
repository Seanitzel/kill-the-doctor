import { test, expect } from '@playwright/test';
async function start(page, character='male') {
  await page.goto('/');
  if (character==='female') await page.getByRole('button',{name:'ALEX Female protagonist'}).click();
  await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();
  await expect(page.locator('.loading-screen')).toHaveCount(0,{timeout:20000});
  await page.waitForFunction(()=>window.__ktd?.engine.mission && !window.__ktd.engine.paused && window.__ktd.mission.elapsed > .25);
  await page.evaluate(()=>{window.__ktd.engine.nextBlackout=9999;window.__ktd.engine.coughCooldown=9999;});
}
async function position(page, x, z, floor=0) { await page.evaluate(({x,z,floor})=>{const e=window.__ktd.engine;e.setFloor(floor);e.playerPos.set(x,0,z);e.updateCamera(.1,true);e.emitHUD();},{x,z,floor}); }
async function aimAt(page, id) {
  await page.evaluate(id=>{const e=window.__ktd.engine,n=e.npcs.find(n=>n.id===id);n.path=[];n.wait=1000;e.setFloor(n.floor);e.playerPos.set(n.pos.x,0,n.pos.z+3);e.yaw=Math.PI;e.pitch=-.08;e.aiming=true;e.updateCamera(.1,true);e.camera.lookAt(n.pos.x,1.15,n.pos.z);e.shotCooldown=0;e.pause(false);e.aiming=true;},id);
}
test.beforeEach(async ({page})=> { await page.addInitScript(()=>{if(!localStorage.getItem('ktd-northline-v1'))localStorage.setItem('ktd-northline-v1', JSON.stringify({settings:{quality:'low',volume:0,speech:false}}));}); });
test('Both protagonists load; keyboard motion, collisions, and animations work', async ({page})=>{
  await start(page,'female');
  expect(await page.evaluate(()=>window.__ktd.save.character)).toBe('female');
  expect(await page.evaluate(()=>!!window.__ktd.engine.player.model)).toBe(true);
  await page.keyboard.down('w');await page.waitForFunction(()=>window.__ktd.engine.playerPos.z<29.5);await page.keyboard.up('w');
  expect(await page.evaluate(()=>window.__ktd.engine.playerPos.z)).toBeLessThan(29.5);
  const result=await page.evaluate(()=>{const e=window.__ktd.engine;e.pause(true);e.playerPos.set(0,0,15);e.move(20,0);return {x:e.playerPos.x,stand:e.canStand(e.playerPos.x,e.playerPos.z),clips:Object.keys(e.assets.clipCache)};});
  expect(result.stand).toBe(true);expect(result.x).toBeLessThan(1.3);expect(result.clips).toContain('female-Walk');expect(result.clips).toContain('female-Run');
  await page.screenshot({path:'artifacts/female-game.png'});
});
test('Clues, journal, map, and lift are usable and pause correctly', async({page})=>{
  await start(page);await position(page,-5.8,28.5);await page.keyboard.press('e');
  await expect(page.getByRole('heading',{name:'Department confirmed.'})).toBeVisible();
  await page.getByRole('button',{name:'RECORD & CONTINUE'}).click();
  await page.keyboard.press('j');await expect(page.getByRole('heading',{name:'Follow the evidence.'})).toBeVisible();
  expect(await page.evaluate(()=>window.__ktd.engine.paused)).toBe(true);await page.keyboard.press('j');
  await page.keyboard.press('m');await expect(page.getByRole('heading',{name:'Know your way out.'})).toBeVisible();
  const time=await page.evaluate(()=>window.__ktd.mission.elapsed);await page.waitForTimeout(150);expect(await page.evaluate(()=>window.__ktd.mission.elapsed)).toBe(time);
  await page.screenshot({path:'artifacts/map.png'});await page.keyboard.press('m');
  expect(await page.evaluate(()=>!window.__ktd.engine.paused)).toBe(true);
  await position(page,0,-22);await page.keyboard.press('e');await page.getByRole('button',{name:'1 First floor Specialist care'}).click();expect(await page.evaluate(()=>window.__ktd.engine.floor)).toBe(1);
  await position(page,0,-22,1);await page.keyboard.press('e');await page.getByRole('button',{name:'G Ground floor Clinical & diagnostics'}).click();expect(await page.evaluate(()=>window.__ktd.engine.floor)).toBe(0);
});
test('Doors change collision state; blackouts, flashlight, and coughing recover',async({page})=>{
  await start(page);
  const checks=await page.evaluate(()=>{const e=window.__ktd.engine;e.pause(true);const d=e.levels[0].doors[0];d.open=false;d.angle=0;const closed=e.canStand(d.x,d.z);d.open=true;e.updateEnvironment(2);const open=e.canStand(d.x,d.z);e.triggerBlackout(1);e.toggleFlash();e.updateLights();e.coughCooldown=0;const p=e.npcs.find(n=>n.role==='patient'&&n.contamination&&n.floor===0);p.path=[];p.wait=1000;p.nextCough=0;e.playerPos.set(p.pos.x+.8,0,p.pos.z);e.life.update(.1);e.mission.elapsed+=.9;e.life.update(.1);const coughing=e.impairment>0;const flash=e.flash.visible;e.updateEnvironment(61);return {closed,open,coughing,flash,blackout:e.blackout,impairment:e.impairment};});
  expect(checks).toEqual({closed:false,open:true,coughing:true,flash:true,blackout:0,impairment:0});
});
test('Target identification, firing, emergency countdown, escape, rewards and upgrades',async({page})=>{
  await start(page);
  await page.evaluate(()=>{const e=window.__ktd.engine,t=e.npcs.find(n=>n.id==='target');t.path=[];t.wait=1000;e.setFloor(t.floor);e.playerPos.set(t.pos.x,0,t.pos.z+1);});
  await page.keyboard.press('e');await expect(page.locator('.badge-match')).toContainText('MATCHES YOUR ASSIGNMENT');await page.getByRole('button',{name:'CONTINUE',exact:true}).click();
  await aimAt(page,'target');await page.evaluate(()=>{const e=window.__ktd.engine,n=e.npcs.find(n=>n.id==='target');e.camera.lookAt(n.pos.x,1.15,n.pos.z);e.shoot();});
  await expect(page.locator('.countdown')).toBeVisible();expect(await page.evaluate(()=>window.__ktd.mission.targetDown)).toBe(true);
  await page.screenshot({path:'artifacts/emergency.png'});
  await position(page,0,33);await page.keyboard.press('e');await expect(page.getByRole('heading',{name:'OUT OF THE BUILDING.'})).toBeVisible();
  const coins=await page.evaluate(()=>window.__ktd.save.coins);expect(coins).toBeGreaterThan(240);
  await page.getByRole('button',{name:'Upgrade equipment'}).click();await page.locator('.upgrade-grid article').first().getByRole('button').click();
  expect(await page.evaluate(()=>window.__ktd.save.upgrades.shoes)).toBe(1);expect(await page.evaluate(()=>window.__ktd.save.coins)).toBe(coins-120);
  await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'NEXT ASSIGNMENT'}).click();await page.getByRole('button',{name:'Skip story'}).click();
  expect(await page.evaluate(()=>window.__ktd.save.upgrades.shoes)).toBe(1);await page.reload();
  await expect(page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false})).toBeVisible();expect(await page.evaluate(()=>window.__ktd.save.completed)).toBe(1);expect(await page.evaluate(()=>window.__ktd.save.upgrades.shoes)).toBe(1);
});
test('Patient hit fails immediately; depleted magazine reloads; timer expiry fails',async({page})=>{
  await start(page);const patient=await page.evaluate(()=>window.__ktd.engine.npcs.find(n=>n.role==='patient'&&n.floor===0).id);
  await page.evaluate(id=>{const e=window.__ktd.engine,n=e.npcs.find(n=>n.id===id);n.pos.set(0,0,24);},patient);await aimAt(page,patient);await page.evaluate(id=>{const e=window.__ktd.engine,n=e.npcs.find(n=>n.id===id);e.camera.lookAt(n.pos.x,1.15,n.pos.z);e.shoot();},patient);await expect(page.getByRole('heading',{name:'END OF THE LINE.'})).toBeVisible();await expect(page.locator('.result-reason')).toContainText('patient');
  expect(await page.evaluate(()=>window.__ktd.save.coins)).toBe(0);await page.getByRole('button',{name:'RETRY ASSIGNMENT'}).click();await page.getByRole('button',{name:'Skip story'}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);
  await page.evaluate(()=>{const e=window.__ktd.engine;e.ammo=0;e.reload();e.updateEnvironment(1.5);});expect(await page.evaluate(()=>window.__ktd.engine.ammo)).toBe(6);expect(await page.evaluate(()=>window.__ktd.engine.reserve)).toBe(24);
  await page.evaluate(()=>{const e=window.__ktd.engine;e.mission.eliminate({id:'target',role:'doctor'});e.mission.timer=.01;});
  await expect(page.getByRole('heading',{name:'END OF THE LINE.'})).toBeVisible();await expect(page.locator('.result-reason')).toContainText('Police sealed');
});
test('Pause releases control; settings and equipment survive reload; small screens fit',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('select').first().selectOption('balanced');await page.locator('select').last().selectOption('relaxed');
  await page.getByRole('button',{name:'Close dialog'}).click();await page.reload();expect(await page.evaluate(()=>window.__ktd.save.settings.quality)).toBe('balanced');
  await start(page);await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'Take a breath.'})).toBeVisible();expect(await page.evaluate(()=>window.__ktd.engine.paused)).toBe(true);await page.getByRole('button',{name:'RESUME MISSION'}).click();
  expect(await page.evaluate(()=>!window.__ktd.engine.paused)).toBe(true);await page.setViewportSize({width:390,height:844});await page.keyboard.press('Escape');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);await page.screenshot({path:'artifacts/mobile-pause.png'});
});
