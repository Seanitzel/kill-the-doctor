import {attach} from '../.runtime/mobile-tools/node_modules/webdriverio/build/node.js';
import fs from 'node:fs/promises';
const kind=process.argv[2]||'ios',session=JSON.parse(await fs.readFile(`artifacts/native/${kind}-session.json`,'utf8'));
const driver=await attach({hostname:'127.0.0.1',port:4725,path:'/',sessionId:session.id,capabilities:session.capabilities,logLevel:'error'});
await driver.switchContext('NATIVE_APP');
if(kind==='ios'){console.log('Active',JSON.stringify(await driver.execute('mobile: activeAppInfo')));await driver.activateApp('com.ktd.northline');await driver.setOrientation('LANDSCAPE');}
console.log('Rect',JSON.stringify(await driver.getWindowRect()));await driver.saveScreenshot(`artifacts/native/${kind}-native.png`);
const contexts=await driver.getContexts();console.log('Contexts',JSON.stringify(contexts));const web=contexts.find(c=>String(c).includes('WEBVIEW'));
if(web){await driver.switchContext(web);console.log(JSON.stringify(await driver.execute(()=>({status:window.__northline,rect:{w:innerWidth,h:innerHeight},buttons:[...document.querySelectorAll('button')].map(b=>({text:b.innerText,r:JSON.stringify(b.getBoundingClientRect())})).slice(0,10)}))));}
