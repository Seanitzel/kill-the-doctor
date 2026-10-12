import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const target=process.argv[2],run=process.argv.includes('--run'),qa=process.argv.includes('--qa');
if(!['ios','android'].includes(target))throw Error('Choose ios or android');
const invoke=(command,args,options={})=>execFileSync(command,args,{stdio:'inherit',...options});
invoke('npm',['run',qa?'native:test:sync':'native:sync']);
if(target==='ios'){
 const devices=JSON.parse(execFileSync('xcrun',['simctl','list','devices','booted','--json'],{encoding:'utf8'}));
 const udid=process.env.IOS_SIMULATOR_ID||Object.values(devices.devices).flat().find(d=>d.state==='Booted')?.udid;
 if(run&&!udid)throw Error('Boot an iOS simulator first, or set IOS_SIMULATOR_ID');
 const args=['-project','ios/App/App.xcodeproj','-scheme','App','-configuration','Debug','-sdk','iphonesimulator','-destination',udid?`id=${udid}`:'generic/platform=iOS Simulator','-derivedDataPath','artifacts/native/ios','CODE_SIGNING_ALLOWED=NO'];
 if(qa)args.push('SWIFT_ACTIVE_COMPILATION_CONDITIONS=DEBUG NORTHLINE_QA');
 invoke('xcodebuild',[...args,'build']);
 if(run){try{execFileSync('xcrun',['simctl','terminate',udid,'com.ktd.northline'],{stdio:'ignore'});}catch{}invoke('xcrun',['simctl','install',udid,path.resolve('artifacts/native/ios/Build/Products/Debug-iphonesimulator/App.app')]);invoke('xcrun',['simctl','launch',udid,'com.ktd.northline']);}
}else{
 const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||path.join(os.homedir(),'Library/Android/sdk');
 const env={...process.env,ANDROID_HOME:sdk,ANDROID_SDK_ROOT:sdk};
 if(!env.JAVA_HOME){try{env.JAVA_HOME=execFileSync('/usr/libexec/java_home',['-v','21'],{encoding:'utf8'}).trim();}catch{const installed=fs.existsSync('/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home');if(installed)env.JAVA_HOME='/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home';}}
 if(!fs.existsSync('android/local.properties'))fs.writeFileSync('android/local.properties',`sdk.dir=${sdk.replaceAll('\\','\\\\')}\n`);
 invoke(process.platform==='win32'?'gradlew.bat':'./gradlew',['assembleDebug'],{cwd:'android',env});
 if(run){const adb=path.join(sdk,'platform-tools',process.platform==='win32'?'adb.exe':'adb');invoke(adb,['install','-r',path.resolve('android/app/build/outputs/apk/debug/app-debug.apk')]);invoke(adb,['shell','am','start','-n','com.ktd.northline/.MainActivity']);}
}
