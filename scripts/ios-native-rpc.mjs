import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const udid='564B5234-ED8C-4A13-87CD-0BFCB38C7643';
export async function iosExecute(fn,arg){
 const container=execFileSync('xcrun',['simctl','get_app_container',udid,'com.ktd.northline','data'],{encoding:'utf8'}).trim(),folder=path.join(container,'Documents');await fs.mkdir(folder,{recursive:true});
 const id=randomUUID(),code=`JSON.stringify((()=>{try{return (${fn.toString()})(${JSON.stringify(arg)??'undefined'});}catch(e){return {__qaError:e.message,stack:e.stack};}})())`;await fs.writeFile(path.join(folder,'northline-qa-command.json'),JSON.stringify({id,code}));
 for(let i=0;i<100;i++){try{const r=JSON.parse(await fs.readFile(path.join(folder,'northline-qa-response.json'),'utf8'));if(r.id===id){if(r.error)throw Error(r.error);const value=r.value?JSON.parse(r.value):null;if(value?.__qaError)throw Error(value.__qaError);return value;}}catch(e){if(!['ENOENT'].includes(e.code)&&e.name!=='SyntaxError')throw e;}await new Promise(resolve=>setTimeout(resolve,100));}
 throw Error('iOS native QA response timed out');
}
if(process.argv[1]?.endsWith('ios-native-rpc.mjs'))console.log(JSON.stringify(await iosExecute(()=>({status:window.__northline,view:{w:innerWidth,h:innerHeight},className:document.querySelector('main').className}))));
