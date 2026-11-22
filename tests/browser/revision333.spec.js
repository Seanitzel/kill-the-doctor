import {test,expect,devices} from '@playwright/test';
const phone=!!process.env.KTD_VISUAL_PHONE;
if(phone){const {defaultBrowserType,...device}=devices['iPhone 12 Pro Max landscape'];test.use({...device,browserName:'webkit',launchOptions:{}});}
async function boot(page){
 await page.goto('/favicon.svg');await page.evaluate(()=>localStorage.setItem('ktd-northline-v1',JSON.stringify({internationalVersion:3,playMode:'story',storyReplayId:'china',guidanceMilestones:{story:true},settings:{quality:'high',volume:0,speech:false}})));
 await page.goto('/');await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);await page.evaluate(()=>window.__ktd.engine.renderer.setAnimationLoop(null));
}
test('China spoon checkbox ticks immediately when E collects the cafeteria spoon',async({page})=>{
 await boot(page);const spoon=page.locator('.china-checks span').filter({hasText:'Spoon'});await expect(spoon).toHaveAttribute('aria-label','Spoon collected: not yet complete');await expect(spoon).not.toHaveClass('done');
 await page.evaluate(()=>{const e=window.__ktd.engine,o=e.objectives.china;e.setFloor(0);e.playerPos.set(o.spoonPoint.x,0,o.spoonPoint.z);e.player.root.position.copy(e.playerPos);e.emitHUD();});
 await page.keyboard.press('KeyE');await expect(spoon).toHaveClass('done');await expect(spoon).toHaveAttribute('aria-label','Spoon collected: complete');await expect(spoon.locator('svg')).toHaveCount(1);
 await page.screenshot({path:`artifacts/revision333/spoon-checked-${phone?'iphone':'desktop'}.png`});
});

test('smoked privacy glazing retains glass detail outside and a clear one-way view inside',async({page},info)=>{
 await boot(page);
 const report=await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js'),e=window.__ktd.engine,o=e.objectives.china,g=o.glassPrivacy;e.setFloor(o.officeFloor);o.update(0);e.player.root.visible=false;for(const n of e.npcs)n.visual.root.visible=false;
  const w=g.boundaries.find(w=>{const p={x:w.x+(w.axis==='z'?w.outward:0),z:w.z+(w.axis==='x'?w.outward:0)};return e.canStand(p.x,p.z,.3,e.floor);}),normal=new T.Vector3(w.axis==='z'?w.outward:0,0,w.axis==='x'?w.outward:0),center=new T.Vector3(w.x,2.2,w.z);
  const marker=new T.Mesh(new T.BoxGeometry(.6,.6,.6),new T.MeshBasicMaterial());marker.position.copy(center).addScaledVector(normal,-1);e.scene.add(marker);e.camera.position.copy(center).addScaledVector(normal,1.2);e.camera.lookAt(marker.position);e.playerPos.copy(e.camera.position).setY(0);e.updateLights();
  const pixel=(colour,active)=>{g.set(active);marker.material.color.set(colour);e.renderScene();const gl=e.renderer.getContext(),p=new Uint8Array(4);gl.readPixels(Math.floor(e.renderer.domElement.width/2),Math.floor(e.renderer.domElement.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return [...p.slice(0,3)];};
  const result={clear:pixel('#ff2020',false),smoked:pixel('#ff2020',true),other:pixel('#2020ff',true),opacity:g.material.opacity,roughness:g.material.roughness};
  marker.removeFromParent();marker.geometry.dispose();marker.material.dispose();g.set(true);e.camera.position.copy(center).addScaledVector(normal,2.2).add(new T.Vector3(normal.z*1.2,0,-normal.x*1.2));e.camera.lookAt(center.clone().addScaledVector(normal,-2));e.renderScene();return result;
 });
 await page.screenshot({path:`artifacts/revision333/smoked-glass-${phone?'iphone':'desktop'}.png`});await info.attach('smoked-glass',{body:JSON.stringify(report),contentType:'application/json'});console.log('Smoked glass',JSON.stringify(report));
 expect(report.opacity).toBe(.9);expect(report.roughness).toBeLessThan(.2);expect(report.smoked[0]).toBeLessThan(report.clear[0]-50);expect(Math.max(...report.smoked.map((v,i)=>Math.abs(v-report.other[i])))).toBeGreaterThan(2);
});

for(const stage of ['close','lock'])test(`China ${stage} stage protects its full five seconds, then a real visitor enters before failure`,async({page},info)=>{
 test.setTimeout(120000);await boot(page);
 const report=await page.evaluate(stage=>{
  const e=window.__ktd.engine,o=e.objectives.china;e.setFloor(o.officeFloor);e.playerPos.set(0,0,30);e.mission.elapsed=100;o.doctor.pos.set(o.home.x,0,o.home.z);o.collapseDoctor(100);
  for(const n of e.npcs)if(n!==o.doctor&&!n.officeVisitor)n.dead=true;
  for(const d of o.doors){d.open=true;d.angle=d.openAngle;d.pivot.rotation.y=d.angle;}
  const side=Math.sign(o.office.center.z-o.doors[0].z),walk=seconds=>{const until=e.mission.elapsed+seconds;while(e.mission.elapsed<until&&!e.mission.result){const dt=Math.min(.05,until-e.mission.elapsed);e.mission.tick(dt);e.time+=dt;o.update(dt);e.updateNPCs(dt);e.updateEnvironment(dt);}};
  if(stage==='lock'){e.playerPos.set(o.doors[0].x,0,o.doors[0].z+side*2.25);o.handleDoor(o.doors[0]);for(let i=0;i<50&&o.seal.stage!=='lock';i++)walk(.05);if(o.seal.stage!=='lock')throw Error('E close did not reach lock stage');e.playerPos.set(o.home.x,0,o.home.z);}
  const start=stage==='close'?o.seal.collapsedAt:o.seal.closedAt;walk(start+4.999-e.mission.elapsed);
  const protectedState={elapsed:e.mission.elapsed,start,failed:o.seal.failed,discovery:o.patients.discoveryAt,result:e.mission.result,inside:o.patients.entries.filter(v=>o.roomOf(v.n.pos)===o.office.id).length};
  walk(.001);const expired={elapsed:e.mission.elapsed,stage:o.seal.failed,discovery:o.patients.discoveryAt,result:e.mission.result};
  walk(18);const found=o.patients.entries.find(v=>v.phase==='discovered');e.updateCamera(.1,true);e.emitHUD();e.renderScene();return{protectedState,expired,result:e.mission.result,entered:!!found&&o.roomOf(found.n.pos)===o.office.id};
 },stage);
 expect(report.protectedState.failed).toBe(null);expect(report.protectedState.discovery).toBe(null);expect(report.protectedState.result).toBe(null);expect(report.protectedState.inside).toBe(0);expect(report.expired.stage).toBe(stage);expect(report.expired.result).toBe(null);expect(report.result?.success).toBe(false);expect(report.entered).toBe(true);expect(report.result.reason).toContain('visiting patient discovered the unconscious doctor');
 await info.attach('two-stage-discovery',{body:JSON.stringify(report),contentType:'application/json'});console.log('Protected stage',stage,JSON.stringify(report));
});
