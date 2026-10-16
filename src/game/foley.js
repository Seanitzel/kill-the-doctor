export const FOLEY_FILES={
  'step-01':'audio/foley/step-01.wav','step-02':'audio/foley/step-02.wav',
  'step-03':'audio/foley/step-03.wav','step-04':'audio/foley/step-04.wav',
  'pistol-shot':'audio/foley/pistol-shot.wav','rifle-shot':'audio/foley/rifle-shot.wav',
};

export function roomImpulse(ctx){
  const length=Math.ceil(ctx.sampleRate*.72),buffer=ctx.createBuffer(2,length,ctx.sampleRate);let seed=9173;
  for(let channel=0;channel<2;channel++){
    const data=buffer.getChannelData(channel);
    for(let i=Math.round(ctx.sampleRate*.014);i<length;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      data[i]=(seed/4294967296*2-1)*.018*Math.pow(1-i/length,2.8);
    }
  }
  return buffer;
}

// Only player foley enters this room bus. Music and hospital voices keep their original mix.
export class HospitalFoley{
  constructor(ctx,destination,buffers){
    this.ctx=ctx;this.buffers=buffers;this.active=new Set();this.stepIndex=0;this.shotIndex=0;this.nodes=[];
    const own=node=>{this.nodes.push(node);return node;};
    this.input=own(ctx.createGain());this.input.connect(destination);
    const room=own(ctx.createConvolver()),tone=own(ctx.createBiquadFilter()),wet=own(ctx.createGain());
    room.normalize=false;room.buffer=roomImpulse(ctx);tone.type='lowpass';tone.frequency.value=4300;wet.gain.value=.04;
    this.input.connect(tone);tone.connect(room);room.connect(wet);wet.connect(destination);
    for(const [time,level,frequency] of [[.043,.025,5900],[.096,.008,3400]]){
      const delay=own(ctx.createDelay(.2)),filter=own(ctx.createBiquadFilter()),gain=own(ctx.createGain());
      delay.delayTime.value=time;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.value=level;
      this.input.connect(delay);delay.connect(filter);filter.connect(gain);gain.connect(destination);
    }
  }
  play(kind,{running=false,suppressed=false}={}){
    const step=kind==='step',keys=step?['step-01','step-02','step-03','step-04'].filter(k=>this.buffers[k]):[kind==='rifle'?'rifle-shot':'pistol-shot'];
    if(!keys.length||!this.buffers[keys[0]])return false;
    const index=step?this.stepIndex++:this.shotIndex++,key=keys[index%keys.length];
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
    const pan=this.ctx.createStereoPanner?.()||this.ctx.createGain();
    source.buffer=this.buffers[key];source.playbackRate.value=step?[.97,1.025,.99,1.01][index%4]*(running?1.035:1):[.99,1.01,1][index%3];
    filter.type='lowpass';filter.frequency.value=step?7200:suppressed?1250:14500;
    gain.gain.value=step?(running?.79:.61)*[1,.9,.96,.87][index%4]:(kind==='rifle'?.95:.79)*(suppressed?.28:1);
    if(pan.pan)pan.pan.value=step?(index%2?.12:-.12):.08;
    source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.input);
    const record={source,filter,gain,pan,key};this.active.add(record);
    source.onended=()=>{this.active.delete(record);source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
    // A short clip budget prevents runaway node accumulation during repeated fire.
    if(this.active.size>18){const first=this.active.values().next().value;this.active.delete(first);first.source.stop();}
    source.start();return record;
  }
  stop(){for(const record of this.active){try{record.source.stop();}catch{}}this.active.clear();}
  dispose(){this.stop();for(const node of this.nodes)node.disconnect();}
}
