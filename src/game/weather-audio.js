// Original synthesized ambience: no samples from the linked reference videos.
// Four-second reusable buffers; phase-coherent tones and gentle band-limited rain.
export function weatherBuffer(ctx,kind){
 const seconds=4,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate),data=buffer.getChannelData(0);let seed=58719,low=0,mid=0,soft=0,phase=0,drop=0;
 for(let i=0;i<data.length;i++){
  const t=i/ctx.sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/4294967296*2-1;
  low+=Math.min(1,45/ctx.sampleRate)*(white-low);mid+=Math.min(1,2800/ctx.sampleRate)*(white-mid);soft+=Math.min(1,1100/ctx.sampleRate)*(white-soft);
  if(kind==='siren'){
   // Emergency two-tone horn: sustained harmonics, rounded 0.5s changes,
   // a little amplifier rasp, and a short cabinet echo rather than a sine beep.
   const change=Math.tanh(Math.sin(2*Math.PI*t)*9),frequency=980+200*change;
   phase+=2*Math.PI*frequency/ctx.sampleRate;
   const horn=.53*Math.sin(phase)+.23*Math.sin(phase*2)+.11*Math.sin(phase*3)+.045*Math.sin(phase*5);
   const edge=Math.min(1,t/.02,(seconds-t)/.02);data[i]=Math.tanh(horn*1.4)*.28*edge;
  }else if(kind==='thunder'){
   const edge=Math.min(1,t/.08,(4-t)/.7);data[i]=Math.max(0,edge)*Math.exp(-t*.7)*(low*4+.14*mid);
  }else{
   const wind=.73+.16*Math.cos(t*Math.PI/2)+.11*Math.cos(t*Math.PI);
   // Sparse small water impacts over a soft continuous wash; no harsh white hiss.
   if((seed&8191)<9)drop=.03+(seed%17)*.002;drop*=Math.exp(-1/(ctx.sampleRate*.012));
   data[i]=kind==='snow'?low*1.8*wind:kind==='wind'?low*3*wind:((mid-soft)*.38+soft*.5+low*.5+drop*Math.sin(t*8900))*(kind==='storm'?1.15:.8)*wind;
  }
 }
 return buffer;
}
