import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const config=JSON.parse(fs.readFileSync('capacitor.config.json','utf8'));
assert.equal(config.server?.url,undefined,'Native production must use bundled assets');
const root=config.webDir,html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const entry=html.match(/src="\/?(assets\/index-[^"]+\.js)"/)?.[1];
assert.ok(entry,'Production entry must use the local root');
const code=fs.readFileSync(path.join(root,entry),'utf8');
assert.doesNotMatch(code,/window\.__ktd\s*=[^=]/,'Mutable QA bridge must not ship');
for(const platform of ['android/app/src/main/assets/public','ios/App/App/public']){
 for(const file of ['index.html',entry,'models/adrian.glb','models/alex.glb','models/walk.fbx']){
  assert.equal(digest(path.join(platform,file)),digest(path.join(root,file)),`${platform}: stale ${file}`);
 }
 const nativeConfig=JSON.parse(fs.readFileSync(platform.replace(/public$/,'capacitor.config.json'),'utf8'));
 assert.equal(nativeConfig.server?.url,undefined);
 assert.notEqual(nativeConfig.ios?.webContentsDebuggingEnabled,true);
 assert.notEqual(nativeConfig.android?.webContentsDebuggingEnabled,true);
}
console.log('Both native projects contain identical current production assets; no remote server or mutable QA bridge.');
