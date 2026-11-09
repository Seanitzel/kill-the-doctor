import {test,expect,devices} from '@playwright/test';
const {defaultBrowserType,...iphone}=devices['iPhone 17 Pro Max landscape'];
test.use({...iphone,browserName:'webkit',launchOptions:{}});
test('iPhone high-quality session survives beyond three minutes with bounded graphics and audible-path audio muted at output',async({page},testInfo)=>{
 test.setTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('ktd-northline-v1',JSON.stringify({internationalVersion:3,settings:{quality:'high',volume:.5,speech:true}}));
  // Exercise normal sample/voice loading, but route every AudioContext through
  // a silent final bus. Nothing from the local test reaches the user's speakers.
  const destinations=new WeakMap(),connect=AudioNode.prototype.connect,Original=window.AudioContext||window.webkitAudioContext;
  AudioNode.prototype.connect=function(destination,...args){return connect.call(this,destinations.get(destination)||destination,...args);};
  class MutedContext extends Original{constructor(...args){super(...args);const silent=this.createGain();silent.gain.value=0;connect.call(silent,this.destination);destinations.set(this.destination,silent);}}
  window.AudioContext=window.webkitAudioContext=MutedContext;
  if(window.speechSynthesis)window.speechSynthesis.speak=()=>{};
 });
 await page.goto('/');await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);
 const budget=await page.evaluate(()=>{const e=window.__ktd.engine,sizes=[];for(const scene of [e.assets.male,e.assets.female,...Object.values(e.assets.sources)])scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)for(const value of Object.values(m))if(value?.isTexture&&!value.isDataTexture&&value.image?.width)sizes.push(Math.max(value.image.width,value.image.height));});return{mobile:e.mobile,antialias:e.renderer.getContext().getContextAttributes().antialias,maxTexture:Math.max(...sizes)};});expect(budget.mobile).toBe(true);expect(budget.antialias).toBe(false);expect(budget.maxTexture).toBeLessThanOrEqual(512);
 // Upload every existing avatar/floor once before measuring a plateau. Merely
 // visiting a hallway leaves unseen characters' buffers unallocated; counting
 // their first later upload as a leak would produce a false positive.
 await page.evaluate(()=>{const e=window.__ktd.engine,flags=[];e.renderer.setAnimationLoop(null);for(let floor=0;floor<e.hospitals.length;floor++){e.setFloor(floor);for(const n of e.npcs)n.visual.root.visible=n.floor===floor&&!n.evacuated;e.scene.traverse(o=>{if(o.isMesh){flags.push([o,o.frustumCulled]);o.frustumCulled=false;}});e.renderer.render(e.scene,e.camera);for(const[o,value]of flags)o.frustumCulled=value;flags.length=0;}e.setFloor(0);e.clock.getDelta();e.renderer.setAnimationLoop(e.frame);});
 const samples=[];
 for(let i=0;i<7;i++){
  await page.evaluate(i=>{const e=window.__ktd.engine;e.setFloor(i%3);e.playerPos.set(0,0,i%2?12:18);e.player.root.position.copy(e.playerPos);e.yaw=Math.PI;e.updateCamera(.1,true);},i);
  await page.waitForTimeout(30000);
  const sample=await page.evaluate(()=>{const e=window.__ktd.engine;return{elapsed:e.mission.elapsed,failed:e.runtimeFailed,contextLost:!!e.contextLost,result:e.mission.result,resources:{...e.renderer.info.memory},npcs:e.npcs.length,fields:e.systems.navigation.filter(Boolean).map(n=>n.fields.size),audio:{active:e.audio.activeSamples.size,voices:e.audio.dialogueBytes,requests:e.audio.dialogueRequests.size},canvas:{width:e.renderer.domElement.width,height:e.renderer.domElement.height}};});samples.push(sample);console.log(`Safari soak ${i+1}/7`,JSON.stringify(sample));
  expect(sample.failed).toBeFalsy();expect(sample.contextLost).toBe(false);expect(sample.result).toBeNull();expect(sample.npcs).toBeLessThan(150);expect(Math.max(...sample.fields)).toBeLessThanOrEqual(8);expect(sample.audio.active).toBeLessThanOrEqual(24);expect(sample.audio.voices).toBeLessThanOrEqual(8*1024*1024);
 }
 await testInfo.attach('iphone-memory-soak',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
 expect(samples.at(-1).elapsed).toBeGreaterThan(120);const warm=samples[3];for(const sample of samples.slice(4)){expect(sample.resources.geometries).toBeLessThanOrEqual(warm.resources.geometries+100);expect(sample.resources.textures).toBeLessThanOrEqual(warm.resources.textures+60);}expect(errors).toEqual([]);
});
