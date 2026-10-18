// Original menu-only score: D minor suspended pads, felt-pluck motif, electrical
// sputters. The in-mission HospitalAudio score is deliberately untouched.
export const MENU_SCORE_SECONDS=40;
export function menuScoreBuffer(ctx){
  const rate=24000,buffer=ctx.createBuffer(1,rate*MENU_SCORE_SECONDS,rate),out=buffer.getChannelData(0),notes=[146.83,174.61,220,164.81,130.81,174.61,196,164.81];
  let seed=271019;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};let air=0;
  for(let i=0;i<out.length;i++){
    const t=i/rate,bar=Math.floor(t/10),phase=t%10,root=[73.416,65.406,58.27,65.406][bar];
    const pad=Math.sin(Math.PI*phase/10)**2;
    let v=pad*(Math.sin(t*2*Math.PI*root)*.12+Math.sin(t*2*Math.PI*root*1.5+.4)*.045+Math.sin(t*2*Math.PI*root*2.002)*.03);
    const beat=Math.floor(t/2.5),s=t%2.5,note=notes[beat%notes.length]*(beat%4===3?.5:1),envelope=(1-Math.exp(-s*24))*Math.exp(-s*1.8);
    v+=envelope*(Math.sin(t*2*Math.PI*note)*.065+Math.sin(t*2*Math.PI*note*2)*.014);
    const echo=s-.38;if(echo>0)v+=Math.exp(-echo*2.4)*Math.sin((t-.38)*2*Math.PI*note)*.014;
    air+=.025*(random()-air);v+=air*.035;
    for(const start of [4.8,17.2,31.6]){const z=t-start;if(z>=0&&z<.24)v+=(random()*.08+Math.sin(t*2*Math.PI*120)*.022)*Math.exp(-z*27)*Math.min(1,z/.006);}
    const fade=Math.min(1,t/.2,(MENU_SCORE_SECONDS-t)/.4);out[i]=v*Math.max(0,fade);
  }
  return buffer;
}
export class MenuMusic{
  constructor(settings){this.settings=settings;this.active=true;this.unlocked=false;this.disposed=false;}
  unlock(){if(this.disposed)return;this.unlocked=true;if(!this.ctx){try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.gain=this.ctx.createGain();this.gain.connect(this.ctx.destination);this.source=this.ctx.createBufferSource();this.source.buffer=menuScoreBuffer(this.ctx);this.source.loop=true;this.source.connect(this.gain);this.source.start();}catch{return;}}this.sync();}
  sync(){if(!this.ctx||this.disposed)return;const play=this.active&&!document.hidden&&this.settings.volume>0;this.gain.gain.setTargetAtTime(play?this.settings.volume*.65:0,this.ctx.currentTime,.15);const action=play?this.ctx.resume():this.ctx.suspend();action.catch(()=>{});}
  setActive(value){this.active=value;this.sync();}
  dispose(){if(this.disposed)return;this.disposed=true;try{this.source?.stop();}catch{}this.source?.disconnect();if(this.source)this.source.buffer=null;this.gain?.disconnect();this.ctx?.close().catch(()=>{});this.ctx=null;this.source=null;this.gain=null;}
}
