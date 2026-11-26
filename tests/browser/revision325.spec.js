import {test,expect} from '@playwright/test';
const countries=['france','nigeria','china','india','russia','venezuela','america','romania','uganda','england'];
const initialized=new WeakSet();
async function boot(page,index=0,mode='story'){
 if(!initialized.has(page)){await page.addInitScript(()=>{const stored=sessionStorage.getItem('ktd325-save');localStorage.setItem('ktd-northline-v1',stored||JSON.stringify({settings:{quality:'low',volume:0,speech:false}}));});initialized.add(page);}
 await page.goto('/');await page.evaluate(save=>sessionStorage.setItem('ktd325-save',JSON.stringify(save)),{internationalVersion:3,completedCountryIds:mode==='freestyle'?countries:countries.slice(0,index),playMode:mode,countryId:countries[index],guidanceMilestones:{story:true,freeplay:true},settings:{quality:'low',volume:0,speech:false}});await page.reload();
 await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused,{},{timeout:30000});
}
test('every story interior has furnished floors, bilingual signs, reachable lifts and bounded actors; Freeplay and England keep default finishes',async({page})=>{
 test.setTimeout(360000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<countries.length;i++){
  console.log('Checking country',countries[i]);await boot(page,i);const result=await page.evaluate(()=>{const e=window.__ktd.engine;e.pause(true);const signs=[];e.hospitals[0].group.traverse(o=>{if(o.userData.native)signs.push({english:o.userData.signText.text,native:o.userData.native});});return{country:e.mission.country.id,count:e.levels.filter(l=>l.floor!==3).length,actors:e.npcs.length,style:e.interiorStyle?.profile.style||null,signs,upper:e.levels.filter(l=>l.floor>3).map(l=>({floor:l.floor,rooms:l.rooms.length,staff:e.npcs.filter(n=>n.floor===l.floor).length,reachable:e.systems.navigationFor(l.floor).route({x:0,z:18},{x:0,z:-24}).length})),robot:!!e.hospitals[0].group.getObjectByName('Autonomous hospital delivery robot · charging')};});
  expect(result.country).toBe(countries[i]);expect(result.count).toBe(i>=6?5:i>=3?4:3);expect(result.actors).toBeLessThan(155);expect(result.upper.every(l=>l.rooms===9&&l.staff>=6&&l.reachable>0)).toBe(true);if(i===9){expect(result.style).toBeNull();expect(result.signs).toHaveLength(0);}else{expect(result.style).toBeTruthy();if(i!==6)expect(result.signs.length).toBeGreaterThan(25);}expect(result.robot).toBe(i===2);
  await page.evaluate(()=>{const e=window.__ktd.engine;e.setFloor(0);e.playerPos.set(0,0,18);e.player.root.position.copy(e.playerPos);e.yaw=Math.PI;e.updateCamera(.2,true);e.updateLights();for(const n of e.npcs)n.visual.root.visible=n.floor===0&&!n.dead;e.renderScene();});await page.screenshot({path:`artifacts/revision325/${countries[i]}.png`});
 }
 await boot(page,4,'freestyle');expect(await page.evaluate(()=>window.__ktd.engine.interiorStyle)).toBeNull();expect(errors).toEqual([]);
});
test('Nigeria key and shelf search reveals a real document and shows appointment timing',async({page})=>{
 await boot(page,1);const r=await page.evaluate(()=>{const e=window.__ktd.engine;e.renderer.setAnimationLoop(null);e.pause(false);const c=e.covert;for(const n of e.npcs)n.pos.set(0,0,18);
 e.mission.recordsNotice=true;const waiting=c.hud();e.floor=0;e.playerPos.set(c.rotaKeyPoint.x,0,c.rotaKeyPoint.z);c.interact(c.interactions().find(i=>i.type==='covert-rota-key'));
 c.custodian.pos.set(0,0,18);e.floor=c.officeFloor;e.playerPos.set(c.desk.x,0,c.desk.z);for(let i=0;i<4&&!c.rotaFound;i++)c.interact(c.interactions().find(i=>i.type==='covert-rota-cupboard'));
 c.interact(c.interactions().find(i=>i.type==='covert-document'));e.mission.elapsed+=2.01;c.update(.01);
 return{wait:waiting.waitSeconds,storage:waiting.storage,key:c.rotaKey,found:c.rotaFound,taken:c.documentTaken,theatre:e.mission.keys.includes('theatre'),error:e.runtimeFailed};});expect(r).toMatchObject({key:true,found:true,taken:true,theatre:false,error:false});expect(r.wait).toBeGreaterThan(0);expect(r.storage).toContain('Maintenance');
});
test('all public lift buttons preserve the assignment and ground cabin stays indoors; chase map appears without a map action',async({page})=>{
 await boot(page,6);const r=await page.evaluate(()=>{const e=window.__ktd.engine;e.renderer.setAnimationLoop(null);e.pause(true);const m=e.mission;const trips=[];m.keys.push('test-preserved');m.clues.push({type:'test'});m.elapsed=42;e.captureTime=1;for(const floor of [...e.levels.filter(l=>l.floor!==3).map(l=>l.floor).slice(1),0]){e.keys.add('KeyW');const success=e.travelToFloor(floor);trips.push({floor,success,same:e.mission===m,elapsed:m.elapsed,key:m.keys.includes('test-preserved'),clues:m.clues.length,input:e.keys.size});}m.policeAlert=true;e.emitHUD();return{trips,ground:e.floor,outside:e.playerPos.z>35.9,capture:e.captureTime};});expect(r.trips.every(t=>t.success&&t.same&&t.elapsed===42&&t.key&&t.clues===1&&t.input===0)).toBe(true);expect(r.capture).toBe(0);expect(r.ground).toBe(0);await expect(page.locator('.minimap.security-chase')).toBeVisible();await page.locator('.minimap').click();await expect(page.locator('.floor-tabs button')).toHaveCount(6);
});
