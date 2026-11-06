import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const target=process.argv[2],run=process.argv.includes('--run'),qa=process.argv.includes('--qa'),release=process.argv.includes('--release');
if(!['ios','android'].includes(target))throw Error('Choose ios or android');
if(release&&(qa||run))throw Error('Release packages cannot include QA tools or run automatically');
const invoke=(command,args,options={})=>execFileSync(command,args,{stdio:'inherit',...options});
const output=path.join(root,'artifacts/native');fs.mkdirSync(output,{recursive:true});
invoke('npm',['run',qa?'native:test:sync':'native:sync']);
if(!qa)invoke('npm',['run','native:verify']);

if(target==='ios'){
  if(process.platform!=='darwin')throw Error('iOS builds require a Mac with Xcode 26 or newer');
  const configuration=release?'Release':'Debug',sdk=release?'iphoneos':'iphonesimulator';
  let udid=process.env.IOS_SIMULATOR_ID;
  if(!release){
    const devices=JSON.parse(execFileSync('xcrun',['simctl','list','devices','booted','--json'],{encoding:'utf8'}));
    udid||=Object.values(devices.devices).flat().find(d=>d.state==='Booted')?.udid;
    if(run&&!udid)throw Error('Boot an iOS simulator first, or set IOS_SIMULATOR_ID');
  }
  const derived=path.join(output,qa?'ios-qa':'ios');
  const args=['-project','ios/App/App.xcodeproj','-scheme','App','-configuration',configuration,'-sdk',sdk,'-destination',release?'generic/platform=iOS':udid?`id=${udid}`:'generic/platform=iOS Simulator','-derivedDataPath',derived,'CODE_SIGNING_ALLOWED=NO'];
  if(qa)args.push('SWIFT_ACTIVE_COMPILATION_CONDITIONS=DEBUG NORTHLINE_QA');
  if(release){
    invoke('xcodebuild',[...args,'-archivePath',path.join(output,'KTD.xcarchive'),'archive']);
    console.log('Unsigned iOS archive: artifacts/native/KTD.xcarchive. Sign/export in Xcode with your own team.');
  }else{
    invoke('xcodebuild',[...args,'build']);
    const app=path.join(derived,'Build/Products/Debug-iphonesimulator/App.app');
    if(!qa)invoke('ditto',['-c','-k','--sequesterRsrc','--keepParent',app,path.join(output,'KTD-iOS-Simulator.zip')]);
    if(run){
      try{execFileSync('xcrun',['simctl','terminate',udid,'com.ktd.northline'],{stdio:'ignore'});}catch{}
      invoke('xcrun',['simctl','install',udid,app]);
      invoke('xcrun',['simctl','launch',udid,'com.ktd.northline']);
    }
  }
}else{
  const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||path.join(os.homedir(),'Library/Android/sdk');
  const env={...process.env,ANDROID_HOME:sdk,ANDROID_SDK_ROOT:sdk};
  if(!env.JAVA_HOME){
    if(process.platform==='darwin')try{env.JAVA_HOME=execFileSync('/usr/libexec/java_home',['-v','21'],{encoding:'utf8'}).trim();}catch{}
    const fallback='/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home';
    if(!env.JAVA_HOME&&fs.existsSync(fallback))env.JAVA_HOME=fallback;
  }
  if(!fs.existsSync(sdk))throw Error('Android SDK not found. Set ANDROID_HOME to its installation folder.');
  if(!fs.existsSync('android/local.properties'))fs.writeFileSync('android/local.properties',`sdk.dir=${sdk.replaceAll('\\','\\\\')}\n`);
  invoke(process.platform==='win32'?'gradlew.bat':'./gradlew',[release?'bundleRelease':'assembleDebug'],{cwd:'android',env});
  const source=path.resolve(release?'android/app/build/outputs/bundle/release/app-release.aab':'android/app/build/outputs/apk/debug/app-debug.apk');
  const name=release?'KTD-Android-unsigned.aab':qa?'KTD-Android-QA.apk':'KTD-Android.apk';
  fs.copyFileSync(source,path.join(output,name));
  console.log('Built',path.join('artifacts/native',name));
  if(run){
    const adb=path.join(sdk,'platform-tools',process.platform==='win32'?'adb.exe':'adb');
    invoke(adb,['install','-r',source]);
    invoke(adb,['shell','am','start','-n','com.ktd.northline/.MainActivity']);
  }
}
