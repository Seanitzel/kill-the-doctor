import {execFileSync,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const report=[];
function check(name,fn){try{report.push({name,ok:true,detail:fn()});}catch(error){report.push({name,ok:false,detail:error.message});}}
const call=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
check('Node 22+',()=>{if(Number(process.versions.node.split('.')[0])<22)throw Error('Install Node 22 or newer');return process.versions.node;});
check('Capacitor',()=>call('npx',['--no-install','cap','--version']));
check('Bundled assets',()=>{const c=JSON.parse(fs.readFileSync('capacitor.config.json'));if(c.server?.url)throw Error('Production must use bundled assets');if(!fs.existsSync(path.join(c.webDir,'index.html')))throw Error('Run npm run native:sync first');return c.webDir;});
check('Android SDK',()=>{const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||path.join(os.homedir(),'Library/Android/sdk');if(!fs.existsSync(path.join(sdk,'platforms/android-36/android.jar')))throw Error('Install Android SDK Platform 36 and set ANDROID_HOME');return sdk;});
check('Java 21+',()=>{const home=process.env.JAVA_HOME||(process.platform==='darwin'?call('/usr/libexec/java_home',['-v','21']):null);const result=spawnSync(home?path.join(home,'bin/java'):'java',['-version'],{encoding:'utf8'});const value=(result.stderr||result.stdout||'').trim();if(result.status!==0||Number(value.match(/version \"(\d+)/)?.[1]||0)<21)throw Error('Install JDK 21 or newer and set JAVA_HOME');return value.split('\n')[0];});
if(process.platform==='darwin')check('Xcode 26+',()=>{const value=call('xcodebuild',['-version']);if(Number(value.match(/Xcode (\d+)/)?.[1])<26)throw Error('Install Xcode 26 or newer');return value;});
console.table(report);if(report.some(r=>!r.ok))process.exitCode=1;
