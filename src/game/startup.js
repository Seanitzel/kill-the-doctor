// One owner for a start attempt. Every wait releases its timer and abort listener.
export function canceledStart(){const error=new Error('Assignment preparation canceled.');error.name='AbortError';return error;}
export function waitFor(promise,{signal,timeout=30000,message='Preparation took too long. Please try again.'}={}){
  return new Promise((resolve,reject)=>{
    let timer,done=false;
    const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);fn(value);};
    const abort=()=>finish(reject,signal.reason||canceledStart());
    Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
    if(signal?.aborted){abort();return;}
    signal?.addEventListener('abort',abort,{once:true});
    if(timeout)timer=setTimeout(()=>finish(reject,new Error(message)),timeout);
  });
}
export function yieldToBrowser(signal){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(signal.reason||canceledStart());return;}
    const abort=()=>{clearTimeout(timer);reject(signal.reason||canceledStart());};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},16);
    signal?.addEventListener('abort',abort,{once:true});
  });
}
export class StartTask{
  constructor(report=()=>{},timeout=90000){this.controller=new AbortController();this.signal=this.controller.signal;this.report=report;this.started=performance.now();this.timer=setTimeout(()=>this.cancel(new Error('The hospital could not finish preparing. Try again with lighter graphics.')),timeout);}
  check(){if(this.signal.aborted)throw this.signal.reason||canceledStart();}
  async stage(label,progress,detail=''){this.check();this.report({label,progress,detail});await yieldToBrowser(this.signal);this.check();}
  wait(promise,options={}){return waitFor(promise,{...options,signal:this.signal});}
  cancel(reason=canceledStart()){if(!this.signal.aborted)this.controller.abort(reason);}
  dispose(){clearTimeout(this.timer);}
}
// Three r180's compileAsync polls forever and cannot be canceled. Use its same
// readiness check with our own bounded, abortable poll. Keep the adapter here
// because currentProgram is renderer-internal and must be checked on upgrades.
export async function compileForStart(renderer,scene,camera,task,targetScene=scene){
  task.check();const materials=renderer.compile(scene,camera,targetScene),started=performance.now();
  while(materials.size){
    task.check();
    if(renderer.getContext?.().isContextLost())throw new Error('Graphics were interrupted. Reload the game or try lighter graphics.');
    for(const material of materials){const program=renderer.properties.get(material).currentProgram;if(!program||program.isReady())materials.delete(material);}
    if(materials.size){if(performance.now()-started>15000)throw new Error('Graphics preparation took too long. Try lighter graphics.');await yieldToBrowser(task.signal);}
  }
}
