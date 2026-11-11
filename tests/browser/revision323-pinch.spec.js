import {test,expect,devices} from '@playwright/test';
const {defaultBrowserType,...phone}=devices['iPhone 17 Pro Max landscape'];
async function menu(page){await page.addInitScript(()=>localStorage.setItem('ktd-northline-v1',JSON.stringify({settings:{quality:'high',volume:0,speech:false}})));await page.goto('/');await page.waitForFunction(()=>window.__ktd?.engine.ready);}
test.use({...phone,browserName:'chromium'});
 test('home page can pinch in and back to its original size over the scrolling menu',async({page})=>{
  await menu(page);const box=await page.locator('.menu-content').boundingBox(),cdp=await page.context().newCDPSession(page),x=Math.round(box.x+box.width*.55),y=Math.round(box.y+box.height*.55);
  await cdp.send('Input.synthesizePinchGesture',{x,y,scaleFactor:1.6,gestureSourceType:'touch',relativeSpeed:800});await expect.poll(()=>page.evaluate(()=>visualViewport.scale)).toBeGreaterThan(1.2);expect(await page.locator('html').getAttribute('class')).toContain('page-zoomed');
  const reverse=await page.evaluate(()=>({x:Math.round(visualViewport.width/2),y:Math.round(visualViewport.height/2)}));
  await cdp.send('Input.synthesizePinchGesture',{...reverse,scaleFactor:.6,gestureSourceType:'touch',relativeSpeed:800});await expect.poll(()=>page.evaluate(()=>visualViewport.scale)).toBeLessThan(1.03);expect(await page.locator('html').getAttribute('class')||'').not.toContain('page-zoomed');
 });
