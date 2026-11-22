import {test,expect,devices} from '@playwright/test';
const phone=!!process.env.KTD_VISUAL_PHONE;
if(phone){const {defaultBrowserType,...device}=devices['iPhone 12 Pro Max landscape'];test.use({...device,browserName:'webkit',launchOptions:{}});}
async function boot(page,character='male'){
 await page.goto('/favicon.svg');await page.evaluate(character=>localStorage.setItem('ktd-northline-v1',JSON.stringify({character,appearance:character==='custom'?{name:'Test character',gender:'female'}:undefined,internationalVersion:3,playMode:'story',storyReplayId:'china',guidanceMilestones:{story:true},settings:{quality:'high',volume:0,speech:false}})),character);
 await page.goto('/');await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);
 await page.evaluate(()=>{const e=window.__ktd.engine,o=e.objectives.china;e.renderer.setAnimationLoop(null);e.setFloor(o.officeFloor);o.hasSpoon=true;o.doctor.pos.set(o.bathroomGoal.x,0,o.bathroomGoal.z);o.phase='bathroom';o.returnAt=Infinity;for(const n of e.npcs)if(n!==o.doctor)n.dead=true;o.glassPrivacy.set(true);o.case.glassPrivacy=true;});
}
async function use(page){if(phone)await page.locator('.phone-use').tap();else await page.keyboard.press('KeyE');}
async function place(page,dx,dz,crouch=false){return page.evaluate(({dx,dz,crouch})=>{const e=window.__ktd.engine,o=e.objectives.china;e.keys.clear();e.resetTouch();e.yaw=0;e.playerPos.set(o.cupPoint.x+dx,0,o.cupPoint.z+dz);e.player.root.position.copy(e.playerPos);e.player.root.rotation.y=0;if(crouch)e.keys.add('KeyC');e.updatePlayer(.05);e.emitHUD();return{clear:e.canStand(e.playerPos.x,e.playerPos.z,.3,e.floor),type:e.nearestInteractable()?.type,position:e.playerPos.toArray()};},{dx,dz,crouch});}
async function step(page,seconds){return page.evaluate(seconds=>{
 const e=window.__ktd.engine,o=e.objectives.china,samples=[];
 for(let t=0;t<seconds&&!e.mission.result;t+=.05){const old=e.playerPos.clone();e.mission.tick(.05);e.time+=.05;e.updatePlayer(.05);e.objectives.update(.05);e.updateNPCs(.05);e.updateEnvironment(.05);o.syncCupGrip();o.mixing.update(!!o.poisonAction);samples.push({step:e.playerPos.distanceTo(old),clear:e.canStand(e.playerPos.x,e.playerPos.z,.3,e.floor),mixing:!!o.poisonAction,error:o.mixing.lastError,reachable:o.mixing.lastReachable});}
 e.updateCamera(.05,true);e.renderScene();e.emitHUD();return{samples,mixing:!!o.poisonAction,approaching:!!o.mixingApproach,progress:o.case.mixedSeconds,started:o.patients.started,result:e.mission.result,crouched:e.crouched,character:e.playerProfile.gender};
 },seconds);}

for(const character of ['male','female','custom'])test(`${character}: ordinary positions beside the cup start mixing using the real ${phone?'phone USE button':'E key'}`,async({page},info)=>{
 await boot(page,character);const reports=[];
 for(const [dx,dz,crouch] of [[0,-.45,false],[-.3,-.55,false],[0,-.75,false],[.6,-.8,false],[-.8,-.9,false],[0,-1.5,true]]){
  const before=await place(page,dx,dz,crouch);expect(before.clear).toBe(true);expect(before.type).toBe('china-poison');await use(page);
  const immediate=await page.evaluate(()=>{const e=window.__ktd.engine,o=e.objectives.china;return{pending:!!o.mixingApproach,mixing:!!o.poisonAction,pos:e.playerPos.toArray()};});expect(immediate.pending||immediate.mixing).toBe(true);expect(immediate.pos).toEqual(before.position);
  const report=await step(page,2);reports.push({dx,dz,crouch,...report});expect(report.result).toBeNull();expect(report.mixing).toBe(true);expect(report.approaching).toBe(false);expect(report.progress).toBeGreaterThan(0);expect(report.crouched).toBe(false);
  expect(report.samples.every(s=>s.step<=.090001&&s.clear&&(!s.mixing||s.reachable&&s.error<.02))).toBe(true);
  await use(page);expect(await page.evaluate(()=>!!window.__ktd.engine.objectives.china.poisonAction)).toBe(false);
 }
 await page.screenshot({path:`artifacts/revision335/mixing-${character}-${phone?'iphone':'desktop'}.png`});await info.attach('normal-coffee-approaches',{body:JSON.stringify(reports),contentType:'application/json'});console.log('Coffee approaches',character,JSON.stringify(reports.map(({samples,...r})=>r)));
});

test('pending coffee approach cancels immediately with USE or movement, without starting progress or visitors',async({page})=>{
 await boot(page);for(const input of ['use','move']){
  await place(page,0,-1.5);await use(page);expect(await page.evaluate(()=>!!window.__ktd.engine.objectives.china.mixingApproach)).toBe(true);
  if(input==='use')await use(page);else await page.evaluate(()=>window.__ktd.engine.keys.add('KeyW'));
  const report=await step(page,.1);expect(report.approaching).toBe(false);expect(report.mixing).toBe(false);expect(report.progress).toBe(0);expect(report.started).toBeNull();expect(report.result).toBeNull();
 }
});
