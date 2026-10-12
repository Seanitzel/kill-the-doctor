import {remote} from '../.runtime/mobile-tools/node_modules/webdriverio/build/node.js';
import fs from 'node:fs/promises';
import path from 'node:path';
const target=process.argv[2]||'ios',root=process.cwd();
const caps=target==='ios'?{
  platformName:'iOS','appium:automationName':'XCUITest','appium:udid':'564B5234-ED8C-4A13-87CD-0BFCB38C7643','appium:deviceName':'iPhone 16 Pro','appium:platformVersion':'18.1',
  'appium:bundleId':'com.ktd.northline','appium:noReset':true,'appium:newCommandTimeout':7200,'appium:wdaLocalPort':8114,'appium:mjpegServerPort':9114,'appium:derivedDataPath':path.join(root,'.runtime/wda'),'appium:webviewConnectTimeout':30000,'appium:showXcodeLog':true,
}:{platformName:'Android','appium:automationName':'UiAutomator2','appium:udid':'emulator-5554','appium:deviceName':'Android simulator','appium:appPackage':'com.ktd.northline','appium:appActivity':'.MainActivity','appium:noReset':true,'appium:newCommandTimeout':7200,'appium:ensureWebviewsHavePages':true,'appium:webviewConnectTimeout':30000};
const driver=await remote({hostname:'127.0.0.1',port:4725,path:'/',logLevel:'error',capabilities:caps,connectionRetryTimeout:180000,connectionRetryCount:1});
await fs.writeFile(path.join(root,`artifacts/native/${target}-session.json`),JSON.stringify({id:driver.sessionId,capabilities:driver.capabilities},null,2));
console.log(JSON.stringify({platform:target,session:driver.sessionId}));
if(target==='ios'){await driver.setOrientation('LANDSCAPE');console.log('iOS native controls ready');process.exit(0);}
for(let i=0;i<15;i++){const contexts=await driver.getContexts();console.log('Contexts',JSON.stringify(contexts));const web=contexts.find(c=>String(c).includes('WEBVIEW'));if(web){await driver.switchContext(web);console.log(JSON.stringify(await driver.execute(()=>({url:location.href,title:document.title,status:window.__northline,view:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio},body:document.body.innerText.slice(0,900)}))));await driver.saveScreenshot(path.join(root,`artifacts/native/${target}-first-webview.png`));await driver.switchContext('NATIVE_APP');await driver.saveScreenshot(path.join(root,`artifacts/native/${target}-first-native.png`));break;}await driver.pause(1500);}
