import {test,expect,devices} from '@playwright/test';

async function boot(page,country){
 await page.goto('/');
 await page.evaluate(country=>localStorage.setItem('ktd-northline-v1',JSON.stringify({internationalVersion:3,playMode:'story',storyReplayId:country,guidanceMilestones:{story:true},settings:{quality:'high',volume:0,speech:false}})),country);
 await page.reload();await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();
 await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);
 await page.evaluate(()=>window.__ktd.engine.renderer.setAnimationLoop(null));
}

const device=process.env.KTD_VISUAL_PHONE?'iphone':'desktop';
if(device==='iphone'){const {defaultBrowserType,...phone}=devices['iPhone 12 Pro Max landscape'];test.use({...phone,browserName:'webkit',launchOptions:{}});}
test.describe(device,()=>{

 test('Venezuela has visibly granular grey floors and grey ceiling under real hospital lighting',async({page},info)=>{
  await boot(page,'venezuela');
  const report=await page.evaluate(()=>{
   const e=window.__ktd.engine,m=e.materials;
   function stats(map){const data=map.image.getContext('2d').getImageData(8,8,110,110).data,values=[];for(let i=0;i<data.length;i+=4)values.push(data[i]);const mean=values.reduce((a,b)=>a+b,0)/values.length;return{mean,deviation:Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length),divisions:map.userData.divisions};}
   e.playerPos.set(0,0,27);e.player.root.position.copy(e.playerPos);e.player.root.visible=false;e.yaw=Math.PI;e.pitch=.16;e.updateCamera(.1,true);e.updateLights();e.renderScene();
   return{floor:stats(m.floor.map),ceiling:stats(m.ceiling.map),wall:m.wall.color.getHexString(),ceilingColor:e.interiorStyle.profile.ceilingColor};
  });
  expect(report.floor.mean).toBeLessThan(150);expect(report.floor.deviation).toBeGreaterThan(10);expect(report.ceiling.mean).toBeLessThan(170);expect(report.wall).toBe('e9dec7');expect(report.floor.divisions).toBe(4);
  await page.screenshot({path:`artifacts/revision328/venezuela-${device}.png`});
  await page.evaluate(()=>{const e=window.__ktd.engine;e.player.root.visible=false;e.camera.position.set(-1.2,1.65,25);e.camera.lookAt(0,0,22.6);e.renderScene();});
  await page.screenshot({path:`artifacts/revision328/venezuela-grain-${device}.png`});
  await info.attach('visible-finish-check',{body:JSON.stringify(report),contentType:'application/json'});
 });

 test('Egypt keeps office windows transparent and crops floral relief to solid headers',async({page},info)=>{
  await boot(page,'egypt');
  const report=await page.evaluate(()=>{
   const e=window.__ktd.engine,h=e.hospitals[0],panels=h.group.userData.floralPanelBounds;
   const p=panels.find(p=>p.window&&p.axis==='z'&&Math.abs(p.x)<6&&p.z<0);
   e.player.root.visible=false;e.playerPos.set(p.x+p.side*3,0,p.z);e.camera.position.set(p.x+p.side*3.5,1.85,p.z+.5);e.camera.lookAt(p.x,2.15,p.z);e.updateLights();e.renderScene();
   return{windows:panels.filter(p=>p.window),sameImage:e.materials.floral.map.image===e.materials.floralHeader.map.image,dimensions:[e.materials.floral.map.image.width,e.materials.floralHeader.map.image.width]};
  });
  expect(report.windows.length).toBeGreaterThan(0);expect(report.windows.every(b=>b.bottom>2.61)).toBe(true);expect(report.sameImage).toBe(true);expect(report.dimensions).toEqual([512,512]);
  await page.screenshot({path:`artifacts/revision328/egypt-windows-${device}.png`});await info.attach('solid-wall-bands',{body:JSON.stringify(report),contentType:'application/json'});
 });

 test('Nigeria uses twelve distinct pictures only in the two end hallways, with artifacts between pictures',async({page},info)=>{
  await boot(page,'nigeria');
  const report=await page.evaluate(()=>{
   const e=window.__ktd.engine;const galleries=e.hospitals.filter(h=>h.group.userData.nigerianGallery).map(h=>({floor:h.layout?.floor,displays:h.group.userData.nigerianGallery}));
   const art=Object.entries(e.materials).filter(([key,m])=>key.startsWith('art')&&m.map).map(([key,m])=>({key,width:m.map.image.width}));
   const p=galleries[0].displays.find(p=>p.hallway==='west-end'&&p.kind==='painting');e.playerPos.set(-25,0,-24);e.player.root.position.copy(e.playerPos);e.player.root.visible=false;e.camera.position.set(-23.3,2.1,-25);e.camera.lookAt(-28.3,2.3,-4);e.updateLights();e.renderScene();
   return{galleries,art,failed:!!e.runtimeFailed,lost:!!e.contextLost};
  });
  const paintings=report.galleries.flatMap(g=>g.displays).filter(p=>p.kind==='painting');expect(paintings).toHaveLength(12);expect(new Set(paintings.map(p=>p.artwork)).size).toBe(12);expect(report.art).toHaveLength(12);expect(report.art.every(p=>p.width===512)).toBe(true);expect(report.failed||report.lost).toBe(false);
  for(const g of report.galleries)for(const hallway of ['west-end','east-end']){const row=g.displays.filter(p=>p.hallway===hallway);expect(row.map(p=>p.kind)).toEqual(['painting','artifact','painting','artifact']);expect(row.every(p=>hallway==='west-end'?p.x<-28:p.x>25)).toBe(true);}
  await page.screenshot({path:`artifacts/revision328/nigeria-west-${device}.png`});
  await page.evaluate(()=>{const e=window.__ktd.engine;e.playerPos.set(23,0,-24);e.camera.position.set(20.3,2.1,-25);e.camera.lookAt(25.3,2.3,-4);e.updateLights();e.renderScene();});await page.screenshot({path:`artifacts/revision328/nigeria-east-${device}.png`});
  await info.attach('curated-end-galleries',{body:JSON.stringify(report),contentType:'application/json'});
 });
});
