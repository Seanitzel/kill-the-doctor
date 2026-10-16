// Keyed timers prevent older feedback from clearing a newer message.
export class TimerScope {
  constructor(clock=globalThis){this.clock=clock;this.timers=new Map();this.disposed=false;}
  after(key,delay,callback){
    if(this.disposed)return;
    this.cancel(key);
    const id=this.clock.setTimeout(()=>{this.timers.delete(key);if(!this.disposed)callback();},delay);
    this.timers.set(key,id);
  }
  cancel(key){if(this.timers.has(key)){this.clock.clearTimeout(this.timers.get(key));this.timers.delete(key);}}
  clear(){for(const id of this.timers.values())this.clock.clearTimeout(id);this.timers.clear();}
  dispose(){this.clear();this.disposed=true;}
}
