import {test,expect,devices} from '@playwright/test';
const phone=!!process.env.KTD_VISUAL_PHONE;
if(phone){const {defaultBrowserType,...device}=devices['iPhone 12 Pro Max landscape'];test.use({...device,browserName:'webkit',launchOptions:{}});}
const suffix=phone?'iphone':'desktop';
async function boot(page,country){
 // Set the destination on an inert same-origin page before starting the app.
 // Reloading an active GLTF load produces WebKit blob-abort console errors.
 await page.goto('/favicon.svg');await page.evaluate(country=>localStorage.setItem('ktd-northline-v1',JSON.stringify({internationalVersion:3,playMode:'story',storyReplayId:country,guidanceMilestones:{story:true},settings:{quality:'high',volume:0,speech:false}})),country);await page.goto('/');
 await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);
 await page.evaluate(()=>{const e=window.__ktd.engine;e.renderer.setAnimationLoop(null);e.nextBlackout=Infinity;e.player.root.visible=false;});
}
async function skyView(page,age,z=40){return page.evaluate(({age,z})=>{
 const e=window.__ktd.engine,w=e.hospitals[0].group.userData.evening,s=e.hospitals[0].group.userData.nightSky;
 e.time=w.began+age;e.mission.elapsed=age;e.playerPos.set(1.5,0,z);e.player.root.position.copy(e.playerPos);e.camera.position.set(1.5,1.7,z);e.camera.lookAt(1.5,19,z+50);e.updateEnvironment(0);e.updateLights();e.renderScene();
 const gl=e.renderer.getContext(),width=e.renderer.domElement.width,height=e.renderer.domElement.height,pixels=new Uint8Array(16*16*4);gl.readPixels(Math.floor(width*.5),Math.floor(height*.6),16,16,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 const median=[0,1,2].map(channel=>{const values=[];for(let i=channel;i<pixels.length;i+=4)values.push(pixels[i]);values.sort((a,b)=>a-b);return values[128];});
 return{country:e.mission.country.id,weather:w.weather,count:w.count,bg:e.scene.background.getHexString(),fog:e.scene.fog.color.getHexString(),skyVisible:s.root.visible,precipitation:w.particles.visible,sunLight:w.sun.intensity,sun:s.celestials?.sun?.visible,moon:s.moon.visible,phase:s.celestials?.moon?.material.uniforms.sunDirection.value.toArray(),exposure:e.renderer.toneMappingExposure,median,failed:!!e.runtimeFailed,lost:!!e.contextLost};
 },{age,z});}

test('all Story climates keep one sky colour, exposure and celestial state through the entrance',async({page},info)=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});const countries=phone?['nigeria','england','america','romania']:['france','nigeria','china','india','russia','venezuela','america','romania','uganda','england'],reports=[];
 for(const country of countries){
  console.log('Checking Story sky',country);await boot(page,country);const states=[];for(const z of [30,34.7,35.89,35.91,40])states.push(await skyView(page,20,z));
  expect(new Set(states.map(s=>s.bg)).size).toBe(1);expect(states.every(s=>s.bg===s.fog&&s.skyVisible)).toBe(true);expect(new Set(states.map(s=>s.sunLight)).size).toBe(1);expect(new Set(states.map(s=>s.exposure)).size).toBe(1);expect(states.every(s=>!s.failed&&!s.lost)).toBe(true);
  const a=states[2].median,b=states[3].median;expect(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))).toBeLessThanOrEqual(3);
  if(['nigeria','america'].includes(country)){expect(states.every(s=>s.weather==='clear'&&s.count===0&&!s.precipitation)).toBe(true);}if(country==='england')expect(states[0].weather).toBe('snow');if(country==='nigeria'){expect(states[0].bg).toBe('071e31');await page.screenshot({path:`artifacts/revision329/nigeria-evening-${suffix}.png`});await skyView(page,20,30);await page.screenshot({path:`artifacts/revision329/nigeria-entrance-${suffix}.png`});}
  if(country==='america')await page.screenshot({path:`artifacts/revision329/america-full-moon-${suffix}.png`});reports.push({country,states});
 }
 await info.attach('entrance-continuity',{body:JSON.stringify(reports,null,2),contentType:'application/json'});expect(errors).toEqual([]);
});

test('Egypt shows its setting sun, then a dark sky with a crescent only after nightfall',async({page},info)=>{
 await boot(page,'romania');const frames=[];
 for(const age of [0,45,90,165]){const state=await skyView(page,age);frames.push({age,...state});await page.screenshot({path:`artifacts/revision329/egypt-${age}-${suffix}.png`});}
 expect(frames[0].sun).toBe(true);expect(frames.slice(0,3).every(s=>!s.moon)).toBe(true);expect(frames[3].moon).toBe(true);expect(frames[3].sun).toBe(false);expect(frames[0].bg).not.toBe(frames[3].bg);expect(frames[3].phase[2]).toBeGreaterThan(0);
 const pause=await page.evaluate(()=>{const e=window.__ktd.engine;e.mission.elapsed=45;e.updateExterior();const w=e.hospitals[0].group.userData.evening,before={age:w.age,bg:e.scene.background.getHex(),light:w.sun.intensity};e.time+=240;e.updateExterior();return{before,after:{age:w.age,bg:e.scene.background.getHex(),light:w.sun.intensity}};});expect(pause.after).toEqual(pause.before);
 await info.attach('sunset-sequence',{body:JSON.stringify(frames,null,2),contentType:'application/json'});
});

test('England retains falling snow with uneven settled ground and a shallow entrance walkway',async({page},info)=>{
 await boot(page,'england');await skyView(page,20);const surface=await page.evaluate(()=>{const e=window.__ktd.engine,w=e.hospitals[0].group.userData.evening,p=w.snowSurface.geometry.attributes.position,heights=[];for(let i=0;i<p.count;i++)heights.push(p.getY(i));e.camera.position.set(2,1.15,39);e.camera.lookAt(-12,.25,43);e.updateEnvironment(0);e.updateLights();e.renderScene();return{min:Math.min(...heights),max:Math.max(...heights),count:w.count,size:w.particles.material.size,opacity:w.particles.material.opacity,kind:w.particles.type};});
 expect(surface.max-surface.min).toBeGreaterThan(.2);expect(surface.max).toBeLessThan(.45);expect(surface.count).toBe(170);expect(surface.size).toBe(.065);expect(surface.opacity).toBe(.65);expect(surface.kind).toBe('Points');await page.screenshot({path:`artifacts/revision329/england-snow-${suffix}.png`});await info.attach('settled-snow',{body:JSON.stringify(surface),contentType:'application/json'});
});

test('public announcement captions retain their original font, size, position and transparent styling',async({page})=>{
 await boot(page,'nigeria');await page.evaluate(()=>window.__ktd.engine.hooks.announcement({label:'PUBLIC ADDRESS',text:'Michael Bennett, please come to Outpatient room 105.'}));
 const style=await page.locator('.announcement').evaluate(el=>{const box=getComputedStyle(el),text=getComputedStyle(el.querySelector('p')),label=getComputedStyle(el.querySelector('span'));return{size:text.fontSize,font:text.fontFamily,labelSize:label.fontSize,labelFont:label.fontFamily,background:box.backgroundColor,padding:box.padding,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:innerHeight};});
 expect(style.size).toBe(phone?'8px':'11px');expect(style.labelSize).toBe(phone?'6px':'7px');expect(style.font).toContain('DM Sans');expect(style.labelFont).toContain('IBM Plex Mono');expect(style.background).toBe('rgba(0, 0, 0, 0)');expect(style.padding).toBe('0px');if(phone)expect(style.bottom).toBeLessThanOrEqual(style.height-150);await page.screenshot({path:`artifacts/revision329/announcements-${suffix}.png`});
});
