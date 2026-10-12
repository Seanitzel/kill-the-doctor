import {execFileSync} from 'node:child_process';
const adb=process.env.ADB||'/Users/seandvir/Library/Android/sdk/platform-tools/adb';
let socket,pid,seq=0;const pending=new Map();
async function connect(){
 let current;try{current=execFileSync(adb,['-s','emulator-5554','shell','pidof','com.ktd.northline'],{encoding:'utf8'}).trim();}catch{throw Error('Northline Android app is not running');}
 if(socket?.readyState===1&&current===pid)return;
 socket?.close();pid=current;if(!pid)throw Error('Northline Android app is not running');
 execFileSync(adb,['-s','emulator-5554','forward','tcp:9224',`localabstract:webview_devtools_remote_${pid}`]);
 const targets=await (await fetch('http://127.0.0.1:9224/json/list')).json();const target=targets.find(t=>t.url?.startsWith('https://localhost'));
 if(!target)throw Error('Northline Android WebView is not ready');
 socket=new WebSocket(target.webSocketDebuggerUrl);
 socket.addEventListener('message',ev=>{const m=JSON.parse(ev.data),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
}
export async function androidExecute(fn,arg){
 await connect();const id=++seq;
 const response=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('Android evaluation timed out'));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression:`(${fn.toString()})(${JSON.stringify(arg)??'undefined'})`,returnByValue:true,awaitPromise:true}}));});
 if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);
 return response.result?.value;
}
export function closeAndroidQA(){socket?.close();}
