import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {nativeVersion,syncNativeVersion} from '../scripts/sync-native-version.mjs';
test('native versions are monotonic and reject invalid or overflowing distribution versions',()=>{
 assert.deepEqual(nativeVersion('3.17.0'),{version:'3.17.0',build:3017000});
 assert.ok(nativeVersion('3.18.0').build>nativeVersion('3.17.999').build);
 for(const value of ['3.17.0-beta','3.17', '3.1000.0','3.0.1000','99999.1.0'])assert.throws(()=>nativeVersion(value));
});
test('sync updates both iOS configurations from one version without modifying app identity',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ktd-version-'));
 try{const project=path.join(root,'ios/App/App.xcodeproj/project.pbxproj');fs.mkdirSync(path.dirname(project),{recursive:true});fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'3.17.0'}));fs.writeFileSync(project,'CURRENT_PROJECT_VERSION = 1; MARKETING_VERSION = 1.0; CURRENT_PROJECT_VERSION = 2; MARKETING_VERSION = 1.2; PRODUCT_BUNDLE_IDENTIFIER = com.ktd.northline;');syncNativeVersion(root);const content=fs.readFileSync(project,'utf8');assert.equal(content.match(/CURRENT_PROJECT_VERSION = 3017000/g).length,2);assert.equal(content.match(/MARKETING_VERSION = 3.17.0/g).length,2);assert.match(content,/com.ktd.northline/);syncNativeVersion(root);assert.equal(fs.readFileSync(project,'utf8'),content);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('native release defaults use bundled assets and restrict inspection to debug builds',()=>{
 const config=JSON.parse(fs.readFileSync('capacitor.config.json','utf8'));assert.equal(config.webDir,'dist');assert.equal(config.server?.url,undefined);assert.notEqual(config.ios.webContentsDebuggingEnabled,true);assert.notEqual(config.android.webContentsDebuggingEnabled,true);
 const swift=fs.readFileSync('ios/App/App/AppDelegate.swift','utf8');assert.doesNotMatch(swift,/isInspectable\s*=\s*true/);assert.match(swift,/#if DEBUG && NORTHLINE_QA/);assert.match(swift,/deinit \{ qaTimer\?\.invalidate\(\) \}/);
 const info=fs.readFileSync('ios/App/App/Info.plist','utf8');assert.match(info,/\$\(MARKETING_VERSION\)/);assert.match(info,/\$\(CURRENT_PROJECT_VERSION\)/);
 const gradle=fs.readFileSync('android/app/build.gradle','utf8');assert.match(gradle,/versionCode ktdBuild/);assert.match(gradle,/versionName ktdPackage.version/);
});
