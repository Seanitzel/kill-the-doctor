import {test,expect} from '@playwright/test';
test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
test('Phone web edition has usable landscape controls, pauses, and responds to portrait rotation',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('ktd-northline-v1',JSON.stringify({settings:{quality:'low',volume:0,speech:false}})));
 await page.goto('/');await expect(page.locator('.game-shell')).toHaveClass(/mobile-mode/);
 await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).tap();await page.getByRole('button',{name:'Skip story',exact:true}).click();
 await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);
 for(const selector of ['touch-move','touch-look','touch-use','touch-aim','touch-fire','touch-reload'])await expect(page.getByTestId(selector)).toBeVisible();
 const actions=await page.getByTestId('touch-fire').boundingBox();expect(actions.x+actions.width).toBeLessThanOrEqual(844);expect(actions.y+actions.height).toBeLessThanOrEqual(390);
 await page.getByRole('button',{name:'Toggle flashlight',exact:true}).tap();expect(await page.evaluate(()=>window.__ktd.engine.flashlight)).toBe(true);
 await page.getByRole('button',{name:'Hospital map',exact:true}).tap();expect(await page.evaluate(()=>window.__ktd.engine.paused)).toBe(true);
 await page.getByRole('button',{name:'Close dialog'}).tap();expect(await page.evaluate(()=>window.__ktd.engine.paused)).toBe(false);
 await page.getByRole('button',{name:'Pause mission'}).tap();await expect(page.getByRole('heading',{name:'Take a breath.'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('heading',{name:'Turn your phone.'})).toBeVisible();
 await page.setViewportSize({width:844,height:390});await expect(page.getByRole('heading',{name:'Turn your phone.'})).not.toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
