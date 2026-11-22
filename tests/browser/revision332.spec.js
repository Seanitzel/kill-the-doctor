import {test,expect,devices} from '@playwright/test';
const phone=!!process.env.KTD_VISUAL_PHONE;
if(phone){const {defaultBrowserType,...device}=devices['iPhone 12 Pro Max landscape'];test.use({...device,browserName:'webkit',launchOptions:{}});}
async function boot(page,country){
 await page.goto('/favicon.svg');await page.evaluate(country=>localStorage.setItem('ktd-northline-v1',JSON.stringify({internationalVersion:3,playMode:'story',storyReplayId:country,guidanceMilestones:{story:true},settings:{quality:'high',volume:0,speech:false}})),country);
 await page.goto('/');await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);
}
for(const country of ['france','china'])test(`${country}: elevator floor changes show the destination directly without a blue screen`,async({page},info)=>{
 test.setTimeout(120000);await boot(page,country);
 await page.evaluate(()=>{const e=window.__ktd.engine;e.__floorFrames=[];const render=e.renderScene.bind(e);e.renderScene=()=>{render();e.__floorFrames.push({floor:e.floor,at:performance.now(),mask:!!document.querySelector('.floor-transition')});};});
 const timings=[];
 for(const floor of [2,1,0]){
  await page.evaluate(()=>{const e=window.__ktd.engine,l=e.hospitals[e.floor].lift;l.open=true;l.selectionUsed=false;e.playerPos.set(l.x,0,l.faceZ-1.1);e.player.root.position.copy(e.playerPos);e.updateEnvironment(.1);});
  await expect(page.locator('.lift-floors')).toBeVisible();
  const before=await page.evaluate(()=>performance.now());await page.locator('.lift-floors button').nth(floor).dispatchEvent('pointerdown',{pointerId:81,button:0});
  await page.waitForFunction(({floor,before})=>{const e=window.__ktd.engine;return e.floor===floor&&!e.paused&&e.__floorFrames.some(f=>f.floor===floor&&f.at>=before);},{floor,before});
  const state=await page.evaluate(({floor,before})=>{const e=window.__ktd.engine;return{floor:e.floor,firstFrame:e.__floorFrames.find(f=>f.floor===floor&&f.at>=before)?.at-before,mask:!!document.querySelector('.floor-transition'),lost:!!e.contextLost,camera:e.camera.position.toArray()};},{floor,before});
  expect(state.mask).toBe(false);expect(state.lost).toBe(false);expect(state.camera.every(Number.isFinite)).toBe(true);expect(state.firstFrame).toBeLessThan(1000);timings.push(state);
  await expect(page.locator('.lift-floors')).toHaveCount(0);
 }
 expect(await page.evaluate(()=>window.__ktd.engine.__floorFrames.some(f=>f.mask))).toBe(false);
 await page.screenshot({path:`artifacts/revision332/${country}-lift-${phone?'iphone':'desktop'}.png`});await info.attach('floor-frames',{body:JSON.stringify(timings),contentType:'application/json'});console.log('Direct lift frames',country,JSON.stringify(timings));
});

test('a real consultation delivers warnings five seconds apart and walking out before the second deadline prevents security',async({page},info)=>{
 test.setTimeout(90000);await boot(page,'france');
 await page.evaluate(()=>{
  const e=window.__ktd.engine,life=e.life,item=life.cases.find(item=>{e.floor=item.room.floor;return life.privacyWitness(item.room);}),room=item.room,door=e.levels[room.floor].doors.find(d=>d.room===room.id),side=Math.sign(room.center.z-door.z);
  e.setFloor(room.floor);door.open=true;door.manualClosed=false;door.angle=door.openAngle;door.pivot.rotation.y=door.angle;e.playerPos.set(door.x,0,door.z+side*.65);e.player.root.position.copy(e.playerPos);e.yaw=side>0?Math.PI:0;e.updateCamera(.1,true);
  e.nextBlackout=e.coughCooldown=e.nextPA=Infinity;e.introPending=false;life.nextAmbient=life.nextPain=life.nextClinical=Infinity;life.privacy.leave();life.privacyActor=null;life.__warnings=[];life.__exit={room:room.id,side,doorZ:door.z};
  const respond=life.privacyResponse.bind(life);life.privacyResponse=(actor,action)=>{if(actor&&action)life.__warnings.push({action,time:e.mission.elapsed});return respond(actor,action);};
 });
 await page.waitForFunction(()=>window.__ktd.engine.life.__warnings.length===1,null,{timeout:10000});
 await page.waitForFunction(()=>window.__ktd.engine.life.__warnings.length===2,null,{timeout:10000});
 const initial=await page.evaluate(()=>({events:window.__ktd.engine.life.__warnings,result:window.__ktd.engine.mission.result}));expect(initial.events.map(w=>w.action)).toEqual(['request','warning']);expect(initial.events[1].time-initial.events[0].time).toBeGreaterThanOrEqual(5);expect(initial.events[1].time-initial.events[0].time).toBeLessThan(5.3);expect(initial.result).toBe(null);
 await page.waitForTimeout(4400);await page.keyboard.down('KeyW');
 await page.waitForFunction(()=>{const e=window.__ktd.engine,p=e.life.__exit;return(e.playerPos.z-p.doorZ)*p.side<-.1;},null,{timeout:2500});await page.keyboard.up('KeyW');
 await page.waitForTimeout(1100);const report=await page.evaluate(()=>({events:window.__ktd.engine.life.__warnings,active:window.__ktd.engine.life.privacy.active,result:window.__ktd.engine.mission.result,pos:window.__ktd.engine.playerPos.toArray()}));
 expect(report.active).toBe(null);expect(report.result).toBe(null);expect(report.events.map(w=>w.action)).toEqual(['request','warning']);
 await page.screenshot({path:`artifacts/revision332/left-consultation-${phone?'iphone':'desktop'}.png`});await info.attach('warning-departure',{body:JSON.stringify(report),contentType:'application/json'});
});
