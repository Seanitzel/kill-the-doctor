import {test,expect} from '@playwright/test';
test('a fresh player can select every Story country, reload and enter its styled hospital',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('ktd-northline-v1'))localStorage.setItem('ktd-northline-v1',JSON.stringify({settings:{volume:0,speech:false}}));});
 await page.goto('/');await page.getByRole('button',{name:/INTERNATIONAL STORY/}).click();
 const countries=page.locator('.country-grid button');await expect(countries).toHaveCount(10);for(const button of await countries.all())await expect(button).toBeEnabled();
 await countries.filter({hasText:'Romania'}).click();await page.reload();await page.getByRole('button',{name:/INTERNATIONAL STORY/}).click();await expect(page.locator('.country-grid button.selected')).toContainText('Romania');await expect(page.getByRole('button',{name:'Freeplay · 0 countries'})).toBeEnabled();await page.locator('.country-grid button').filter({hasText:'Romania'}).click();
 await page.getByRole('button',{name:'ENTER THE HOSPITAL',exact:false}).click();await page.getByRole('button',{name:'Skip story',exact:true}).click();await page.waitForFunction(()=>window.__ktd?.engine.mission&&!window.__ktd.engine.paused);
 expect(await page.evaluate(()=>({country:window.__ktd.engine.mission.country.id,style:window.__ktd.engine.interiorStyle.profile.country,completed:window.__ktd.save.completedCountryIds||[]}))).toEqual({country:'romania',style:'romania',completed:[]});
});
