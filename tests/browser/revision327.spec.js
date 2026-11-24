import {test,expect} from '@playwright/test';
const ids=['france','nigeria','china','india','russia','venezuela','america','romania','uganda','england'];
async function boot(page,country){await page.goto('/');await page.evaluate(country=>localStorage.setItem('ktd-northline-v1',JSON.stringify({internationalVersion:3,playMode:'story',storyReplayId:country,guidanceMilestones:{story:true},settings:{quality:'high',volume:0,speech:false}})),country);await page.reload();await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);}
test('all Story entrances hide interior geometry; country finishes, glass and decorations retain navigation',async({page},testInfo)=>{
 test.setTimeout(360000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const reports=[];
 for(const id of ids){
  console.log('Inspecting 3.27',id);await boot(page,id);
  const result=await page.evaluate(()=>{const e=window.__ktd.engine;e.renderer.setAnimationLoop(null);const h=e.hospitals[0],m=e.materials,p=e.interiorStyle?.profile;const n=e.systems.navigationFor(0),route=n.route({x:0,z:24},{x:0,z:33});const art=Object.keys(m).filter(k=>k.startsWith('art')||k==='floral').map(k=>({key:k,width:m[k].map?.image?.width||0,height:m[k].map?.image?.height||0}));
   e.playerPos.set(0,0,28);e.player.root.position.copy(e.playerPos);e.yaw=Math.PI;e.pitch=.13;e.updateCamera(.1,true);e.updateLights();e.renderScene();
   return{country:e.mission.country.id,entrance:h.group.userData.entranceFinish,route:route.length,ceiling:p?.ceilingColor||null,glass:!!m.hallGlass,grainy:p?.grainy||false,art,vases:h.group.userData.flowerVases,flowers:h.group.userData.floralPanels,resources:{...e.renderer.info.memory}};});
  expect(result.country).toBe(id);expect(result.route).toBeGreaterThan(0);expect(result.entrance.sharedBlue).toBe(['france','england'].includes(id));expect(result.entrance.frontZ).toBeGreaterThan(34.63);if(id==='china')expect(result.glass).toBe(true);if(id==='venezuela')expect(result.grainy).toBe(true);if(['nigeria','romania'].includes(id))expect(result.art.filter(a=>a.width===512).length).toBe(id==='nigeria'?14:1);if(id==='romania'){expect(result.vases.some(v=>v.triage)).toBe(true);expect(result.flowers).toBeGreaterThan(10);}reports.push(result);
  await page.screenshot({path:`artifacts/revision327/${id}-interior.png`});
  await page.evaluate(()=>{const e=window.__ktd.engine;e.playerPos.set(-4,0,41);e.player.root.position.copy(e.playerPos);e.camera.position.set(-6,2.3,43);e.camera.lookAt(1.5,2.5,34.5);e.updateLights();e.renderScene();});await page.screenshot({path:`artifacts/revision327/${id}-exterior.png`});
  if(id==='nigeria'||id==='romania'){
   await page.evaluate(id=>{const e=window.__ktd.engine;e.player.root.visible=false;const root=id==='nigeria'?e.hospitals[0].group.children.find(o=>o.name==='Nigerian daily-life painting'):e.hospitals[0].group.children.find(o=>o.name.includes('left of triage'));const p=root.position.clone(),n=new (e.camera.position.constructor)(0,0,1).applyQuaternion(root.quaternion);e.playerPos.copy(p).addScaledVector(n,3);e.playerPos.y=0;e.camera.position.copy(p).addScaledVector(n,id==='nigeria'?3.8:4);e.camera.position.y=id==='nigeria'?2.1:1.8;if(id==='romania'){e.camera.position.set(1,1.7,28.8);e.playerPos.set(1,0,28.8);}e.camera.lookAt(p.x,id==='nigeria'?2.25:1,p.z);e.updateLights();e.renderScene();},id);await page.screenshot({path:`artifacts/revision327/${id}-detail.png`});
  }
 }
 await testInfo.attach('interior-adjustment-checks',{body:JSON.stringify(reports,null,2),contentType:'application/json'});expect(errors).toEqual([]);
});
