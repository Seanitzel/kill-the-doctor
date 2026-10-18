import {HospitalFoley,FOLEY_FILES} from './foley.js';
import { assetUrl } from './asset-url.js';
import { native,stopNativeSpeech } from '../mobile/platform.js';
import { dialogueKey,ANNOUNCEMENT_LINES } from './life-rules.js';
const AUDIO_REVISION='2.5.0';
const DIALOGUE_MAX_BYTES=8*1024*1024,DIALOGUE_MAX_ENTRIES=32,DIALOGUE_MAX_PENDING=8;
export const HOSPITAL_SAMPLE_FILES=Object.freeze({newborn:'/audio/newborn-cry.mp3',labor:'/audio/labor-groan.mp3',breathing:'/audio/labor-breathing.mp3',cough:'/audio/cough-warning.mp3',gasp:'/audio/witness-gasp.mp3','pain-female':'/audio/pain-female.mp3','pain-male':'/audio/pain-male.mp3','distress-female':'/audio/distress-female.mp3','distress-male':'/audio/distress-male.mp3',...FOLEY_FILES});
export const MACHINE_DURATIONS=Object.freeze({'blood-pressure':4.8,monitor:.65,ventilator:3.4,zap:.19});
const disconnect=node=>{try{node?.disconnect();}catch{}};

// Accent is assigned once from identity, never from skin tone or the spoken line.
export function dialogueRegion(person={}){
  if(['standard','southern'].includes(person.voiceRegion))return person.voiceRegion;
  const identity=person.voiceId||person.name||'';let hash=2166136261;
  if(!identity)return 'standard';
  for(const char of identity)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  return hash%3===0?'southern':'standard';
}

export function announcementChimeBuffer(ctx){
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.88),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++){
    const time=i/ctx.sampleRate;let sample=0;
    for(const [start,freq] of [[.015,392],[.355,329.63]]){const t=time-start;if(t>=0&&t<.5){const envelope=Math.min(1,t/.03)**2*Math.exp(-t*8);sample+=envelope*(Math.sin(2*Math.PI*freq*t)*.095+Math.sin(2*Math.PI*freq*2.001*t)*.004);}}
    data[i]=sample*Math.min(1,(data.length-i)/(ctx.sampleRate*.03));
  }
  return buffer;
}

// Finite, reusable machine cues: no permanent oscillator, timer or loop per bed.
export function hospitalMachineBuffer(ctx,kind){
  if(!Object.hasOwn(MACHINE_DURATIONS,kind))return null;const duration=MACHINE_DURATIONS[kind];
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);let seed=81073,smooth=0;
  const pulse=(t,start,length)=>t<start||t>start+length?0:Math.sin(Math.PI*(t-start)/length)**2;
  for(let i=0;i<data.length;i++){
    const t=i/ctx.sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/4294967296*2-1;smooth+=.12*(noise-smooth);let value=0;
    if(kind==='blood-pressure'){
      const inflating=pulse(t,.08,3.12),release=pulse(t,3.28,1.38);
      const pump=.6+.4*Math.sin(t*2*Math.PI*5.3);
      value=inflating*pump*(.105*Math.sin(t*2*Math.PI*118)+.19*smooth)+release*.48*smooth;
    }else if(kind==='monitor'){
      const envelope=pulse(t,.025,.135);
      value=envelope*(.28*Math.sin(t*2*Math.PI*880)+.025*Math.sin(t*2*Math.PI*1760));
    }else if(kind==='ventilator'){
      const inhale=pulse(t,.06,1.55),exhale=pulse(t,1.86,1.42);
      value=(inhale*.42+exhale*.29)*smooth+.018*inhale*Math.sin(t*2*Math.PI*96);
    }else{
      const decay=Math.exp(-t*25),buzz=Math.sin(t*2*Math.PI*120);
      value=(noise*.25+buzz*.13)*Math.min(1,t/.008)*decay;
      // A second brief electrical spit keeps the cue distinct from a light switch.
      value+=pulse(t,.075,.035)*noise*.22;
    }
    const edge=Math.min(1,t/.006,(duration-t)/.015);data[i]=value*Math.max(0,edge);
  }
  return buffer;
}
export class HospitalAudio {
  constructor(settings) {
    this.settings=settings;this.ctx=null;this.nextNote=0;this.nextBeep=0;this.stepClock=0;this.enabled=true;this.noteIndex=0;this.samples={};
    this.ambientChannels=new Map();this.activeSamples=new Set();this.speechPriority=0;this.speechSerial=0;this.dialogueBuffers=new Map();this.dialogueTakes=new Map();
    this.dialogueSizes=new Map();this.dialogueBytes=0;this.dialogueRequests=new Map();this.voiceEpoch=0;this.listenerFloor=0;this.listenerPosition={x:0,y:1.7,z:0,floor:0};this.clinicalBuffers=new Map();
    this.disposed=false;this.controlEpoch=0;this.effectEpoch=0;this.timers=new Set();this.ownedNodes=new Set();this.backgroundSources=new Set();this.activeSynth=new Set();
  }
  ownsContext(ctx){return !this.disposed&&!!ctx&&this.ctx===ctx&&ctx.state!=='closed';}
  own(node){this.ownedNodes.add(node);return node;}
  async start() {
    if(this.disposed)return;
    if(this.startPromise&&this.enabled)return this.startPromise;
    this.enabled=true;const intent=++this.controlEpoch;
    const pending=this.startAudio(intent);this.startPromise=pending;
    try{await pending;}finally{if(this.startPromise===pending)this.startPromise=null;}
  }
  async startAudio(intent){
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.own(this.ctx.createGain()); this.master.gain.value = this.settings.volume * 0.45; this.master.connect(this.ctx.destination);
        this.music = this.own(this.ctx.createGain()); this.music.gain.value = 0.07; this.music.connect(this.master);
        this.lowpass = this.own(this.ctx.createBiquadFilter()); this.lowpass.type = 'lowpass'; this.lowpass.frequency.value = 9500; this.lowpass.connect(this.master);this.foley=new HospitalFoley(this.ctx,this.lowpass,this.samples);
        this.droneGain = this.own(this.ctx.createGain()); this.droneGain.gain.value = 0.08; this.droneGain.connect(this.music);
        for (const freq of [55, 82.41, 110.3]) { const o = this.own(this.ctx.createOscillator()); o.type = 'sine'; o.frequency.value = freq; o.connect(this.droneGain); o.start();this.backgroundSources.add(o); }
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const d = noiseBuffer.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const noise = this.own(this.ctx.createBufferSource()); noise.buffer = noiseBuffer; noise.loop = true;
        const filter = this.own(this.ctx.createBiquadFilter()); filter.type = 'lowpass'; filter.frequency.value = 240;
        const g = this.own(this.ctx.createGain()); g.gain.value = 0.025; noise.connect(filter); filter.connect(g); g.connect(this.master); noise.start();this.backgroundSources.add(noise);
      }
      const ctx=this.ctx;await ctx.resume();
      if(!this.ownsContext(ctx)||intent!==this.controlEpoch||!this.enabled){if(this.ownsContext(ctx)&&!this.enabled)await ctx.suspend();return;}
      this.setSettings(this.settings);await this.loadSamples();
    } catch { /* Captions and gameplay remain available without an audio device. */ }
  }
  setSettings(settings) {this.settings=settings;if(this.disposed)return;if(!settings.volume||!settings.speech)this.cancelVoices();if(this.ctx&&this.master)this.master.gain.setTargetAtTime(this.enabled?settings.volume*.45:0,this.ctx.currentTime,.12);}
  pause(paused) {
    if(this.disposed)return;this.controlEpoch++;this.enabled=!paused;
    if(paused)this.stopAmbient();this.setSettings(this.settings);
    try{const action=paused?this.ctx?.suspend():this.ctx?.resume();action?.catch(()=>{});}catch{}
  }
  delay(callback,ms){
    const epoch=this.effectEpoch,ctx=this.ctx;
    const id=setTimeout(()=>{this.timers.delete(id);if(this.ownsContext(ctx)&&this.enabled&&epoch===this.effectEpoch)callback();},ms);
    this.timers.add(id);return id;
  }
  clearTimers(){this.effectEpoch++;for(const id of this.timers)clearTimeout(id);this.timers.clear();}
  releaseSynth(record,stop=false){
    if(record.released)return;record.released=true;this.activeSynth.delete(record);record.source.onended=null;
    if(stop)try{record.source.stop();}catch{}
    for(const node of record.nodes)disconnect(node);if('buffer'in record.source)try{record.source.buffer=null;}catch{}
    record.nodes.length=0;
  }
  trackSynth(source,nodes,music=false){
    const record={source,nodes,music};this.activeSynth.add(record);source.onended=()=>this.releaseSynth(record);
    if(this.activeSynth.size>32)this.releaseSynth([...this.activeSynth].find(item=>!item.music)||this.activeSynth.values().next().value,true);
    return record;
  }
  tone(freq, length = .2, gain = .1, type = 'sine', destination) {
    if (!this.ctx || !this.enabled || this.disposed) return;
    const now = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain, now + .008); g.gain.exponentialRampToValueAtTime(.0001, now + length);
    o.connect(g); g.connect(destination || this.lowpass);this.trackSynth(o,[o,g],destination===this.music);o.start(now);o.stop(now + length + .05);
  }
  noise(length, gain, filterFreq = 900) {
    if (!this.ctx || !this.enabled || this.disposed) return;
    const n = this.ctx.createBuffer(1, this.ctx.sampleRate * length, this.ctx.sampleRate), data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    source.buffer = n; filter.frequency.value = filterFreq; g.gain.value = gain; source.connect(filter); filter.connect(g); g.connect(this.lowpass);this.trackSynth(source,[source,filter,g]);source.start();
  }
  sound(name,options={}) {
    if(this.disposed||!this.enabled||!this.ctx)return;
    if(['step','shot','rifle'].includes(name)&&this.enabled&&this.foley?.play(name,{...options,suppressed:!!this.settings.suppressor}))return;
    if (name === 'flicker') this.hospitalMachine('zap',options.position||this.listenerPosition,.55);
    if(name==='rifle'){this.noise(.32,.68,2200);this.tone(48,.32,.4,'triangle');}
    if(name==='gasp'){if(this.samples.gasp){this.sampleNodes('gasp',{x:0,y:1,z:0},.6);return;}this.noise(.35,.28,2300);this.tone(310,.17,.05,'sine');}
    if(name==='sneeze'){this.noise(.17,.16,1600);this.delay(()=>this.noise(.3,.3,3200),190);}
    if(name==='magnet'){this.tone(90,1.1,.25,'sawtooth');this.noise(.8,.18,500);}
    if (name === 'shot') { this.noise(.22, this.settings.suppressor ? .25 : .6, 3400); this.tone(62, .2, .4, 'triangle'); }
    if (name === 'step') this.noise(.065, .048, 550);
    if (name === 'door') { this.noise(.25, .07, 300); this.tone(130, .12, .04, 'triangle'); }
    if (name === 'clue') { this.tone(523, .22, .12); this.delay(() => this.tone(784, .3, .1), 130); }
    if (name === 'blackout') { this.noise(.6, .25, 250); this.tone(38, 1.2, .28, 'triangle'); }
    if (name === 'cough') { this.noise(.25, .25, 1000); this.delay(() => this.noise(.2, .2, 600), 280); }
    if (name === 'empty') this.tone(240, .035, .08, 'square');
    if (name === 'reload') { this.noise(.08, .12, 2300); this.delay(() => this.noise(.12, .13, 1300), 480); }
    if (name === 'alarm') { this.tone(660, .3, .2); this.delay(() => this.tone(440, .3, .2), 320); }
  }
  patientWarning(name,position){
    if(name==='cough'&&this.samples.cough){this.playSample('cough',position,.65);}else this.sound(name);
  }
  hospitalMachine(kind,position=this.listenerPosition,gain=.3){
    if(!this.ownsContext(this.ctx)||!this.enabled||gain<=0||!Object.hasOwn(MACHINE_DURATIONS,kind))return null;
    if(position.floor!==undefined&&position.floor!==this.listenerFloor)return null;
    let buffer=this.clinicalBuffers.get(kind);if(!buffer){buffer=hospitalMachineBuffer(this.ctx,kind);this.clinicalBuffers.set(kind,buffer);}
    return this.sampleNodes(`machine-${kind}`,position,Math.min(1,gain),false,buffer);
  }
  patientPain(person={},position=this.listenerPosition,gain=.45){
    if(!this.settings.speech||position.floor!==undefined&&position.floor!==this.listenerFloor)return null;
    return this.playSample(person.gender==='female'?'pain-female':'pain-male',position,Math.min(1,gain));
  }
  distress(person={},position=this.listenerPosition,gain=.8){
    if(!this.settings.speech||position.floor!==undefined&&position.floor!==this.listenerFloor)return null;
    return this.playSample(person.gender==='female'?'distress-female':'distress-male',position,Math.min(1,gain));
  }
  stopDistress(){for(const record of [...this.activeSamples])if(record.name.startsWith('distress-'))this.releaseSample(record,true);}
  gasp(position){if(this.samples.gasp)this.playSample('gasp',position,.85);else this.sound('gasp');}
  async loadSamples() {
    if(!this.ownsContext(this.ctx))return;
    if(this.samplePromise) return this.samplePromise;
    const ctx=this.ctx,controller=new AbortController();this.sampleController=controller;
    const pending=Promise.allSettled(Object.entries(HOSPITAL_SAMPLE_FILES).filter(([name])=>!this.samples[name]).map(async([name,url])=>{
      const buffer=await this.fetchBuffer(assetUrl(url)+`?v=${AUDIO_REVISION}`,ctx,controller);
      if(this.ownsContext(ctx)&&!controller.signal.aborted)this.samples[name]=buffer;
    }));this.samplePromise=pending;
    try{return await pending;}finally{if(this.samplePromise===pending)this.samplePromise=null;if(this.sampleController===controller)this.sampleController=null;}
  }
  async fetchBuffer(url,ctx,controller){
    const valid=()=>this.ownsContext(ctx)&&!controller.signal.aborted;
    const canceled=()=>{const error=Error('Audio load canceled');error.name='AbortError';return error;};
    const response=await fetch(url,{signal:controller.signal});
    if(!valid())throw canceled();
    if(!response.ok&&!(native&&response.status===0))throw Error('Audio sample unavailable');
    const bytes=await response.arrayBuffer();if(!valid())throw canceled();
    const buffer=await ctx.decodeAudioData(bytes);if(!valid())throw canceled();return buffer;
  }
  sampleNodes(name,position,gain,loop=false,buffer=null,options={}) {
    const sample=buffer||this.samples[name];if(!this.ownsContext(this.ctx)||!this.enabled||!sample)return null;
    const source=this.ctx.createBufferSource(),panner=options.publicAddress?null:this.ctx.createPanner(),volume=this.ctx.createGain(),filters=[];source.buffer=sample;source.loop=loop;
    if(options.publicAddress){
      const high=this.ctx.createBiquadFilter(),low=this.ctx.createBiquadFilter(),speaker=this.ctx.createBiquadFilter();high.type='highpass';high.frequency.value=430;low.type='lowpass';low.frequency.value=2200;speaker.type='lowpass';speaker.frequency.value=2600;
      source.connect(high);high.connect(low);low.connect(speaker);speaker.connect(volume);filters.push(high,low,speaker);
    }else{
      panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=4;panner.maxDistance=25;panner.rolloffFactor=.65;
      panner.positionX.value=position.x;panner.positionY.value=position.y||1;panner.positionZ.value=position.z;
      source.connect(panner);panner.connect(volume);
    }
    volume.gain.value=gain;volume.connect(this.lowpass);
    const record={source,panner,volume,filters,name,speakerId:options.speakerId,publicAddress:!!options.publicAddress,floor:options.publicAddress?undefined:position.floor};this.activeSamples.add(record);
    source.onended=()=>this.releaseSample(record);
    if(this.activeSamples.size>24)this.releaseSample([...this.activeSamples].find(item=>!item.source.loop)||this.activeSamples.values().next().value,true);
    try{source.start(this.ctx.currentTime+(options.startDelay||0));}catch{this.releaseSample(record,true);return null;}return record;
  }
  releaseSample(record,stop=false){
    if(!record||record.released)return;record.released=true;this.activeSamples.delete(record);record.source.onended=null;
    if(stop)try{record.source.stop();}catch{}
    disconnect(record.source);disconnect(record.panner);disconnect(record.volume);for(const filter of record.filters||[])disconnect(filter);try{record.source.buffer=null;}catch{}
    for(const [key,channel]of this.ambientChannels)if(channel===record)this.ambientChannels.delete(key);
  }
  playSample(name,position,gain=.5) {if(!this.enabled||gain<=0)return;return this.sampleNodes(name,position,gain);}
  ambientSample(key,name,position,gain) {
    if(!this.ownsContext(this.ctx))return;
    let channel=this.ambientChannels.get(key);
    if(channel&&gain<=.003){this.releaseSample(channel,true);return;}
    if(!channel&&gain>.003&&this.enabled) {channel=this.sampleNodes(name,position,0,true);if(channel)this.ambientChannels.set(key,channel);}
    if(channel){channel.floor=position.floor;channel.panner.positionX.value=position.x;channel.panner.positionY.value=position.y||1;channel.panner.positionZ.value=position.z;channel.volume.gain.setTargetAtTime(this.enabled?gain:0,this.ctx.currentTime,.55);}
  }
  cancelVoices(){
    this.voiceEpoch++;this.announcementSerial=(this.announcementSerial||0)+1;this.speechSerial++;this.speechPriority=0;
    if(this.utterance){this.utterance.onend=null;this.utterance.onerror=null;this.utterance=null;}
    globalThis.window?.speechSynthesis?.cancel();stopNativeSpeech();
    for(const [key,controller]of this.dialogueRequests){controller.abort();this.dropDialogue(key);}this.dialogueRequests.clear();
    for(const record of [...this.activeSamples])if(record.name.startsWith('voice-')||record.name==='pa-chime')this.releaseSample(record,true);
  }
  stopAmbient() {
    this.clearTimers();this.cancelVoices();this.foley?.stop();this.stepClock=0;
    for(const record of [...this.activeSamples])this.releaseSample(record,true);this.ambientChannels.clear();
    for(const record of [...this.activeSynth])if(!record.music)this.releaseSynth(record,true);
  }
  setListener(position,direction,floor=0) {if(this.ctx&&floor!==this.listenerFloor)for(const record of this.activeSamples)if(record.floor!==undefined&&record.floor!==floor)record.volume.gain.setTargetAtTime(0,this.ctx.currentTime,.15);this.listenerFloor=floor;
    this.listenerPosition.x=position.x;this.listenerPosition.y=position.y;this.listenerPosition.z=position.z;this.listenerPosition.floor=floor;
    if(!this.ctx)return;const listener=this.ctx.listener;
    if(listener.positionX){listener.positionX.value=position.x;listener.positionY.value=position.y;listener.positionZ.value=position.z;listener.forwardX.value=direction.x;listener.forwardY.value=direction.y;listener.forwardZ.value=direction.z;listener.upX.value=0;listener.upY.value=1;listener.upZ.value=0;}
  }
  speak(text,person={},gain=1,priority=1) {
    const synth=globalThis.window?.speechSynthesis;
    if(this.disposed||!this.enabled||!this.settings.speech||this.settings.volume===0||!synth)return;
    if(synth.speaking&&this.speechPriority>priority)return;
    if(this.utterance){this.utterance.onend=null;this.utterance.onerror=null;}
    synth.cancel();this.speechPriority=priority;const serial=++this.speechSerial;
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=1;utterance.pitch=1;utterance.volume=this.settings.volume*Math.min(1,gain)*(priority>1?.7:.85);
    const english=synth.getVoices().filter(v=>v.lang.startsWith('en')),american=english.filter(v=>/^en[-_]US/i.test(v.lang)),voices=american.length?american:english;
    const match=person.gender==='female'?/Samantha|Zira|Victoria|Susan|Allison|Joanna|Female/i:/David|Alex|Fred|Aaron|Tom|Male/i;
    const voice=voices.find(v=>match.test(v.name))||voices[person.gender==='female'?0:Math.min(1,voices.length-1)];if(voice)utterance.voice=voice;
    const finish=()=>{if(!this.disposed&&serial===this.speechSerial){this.speechPriority=0;this.utterance=null;}};utterance.onend=finish;utterance.onerror=finish;this.utterance=utterance;synth.speak(utterance);
  }
  dropDialogue(key){this.dialogueBuffers.delete(key);this.dialogueBytes-=this.dialogueSizes.get(key)||0;this.dialogueSizes.delete(key);}
  pruneDialogue(){
    while(this.dialogueBuffers.size>DIALOGUE_MAX_ENTRIES||this.dialogueBytes>DIALOGUE_MAX_BYTES){
      const key=[...this.dialogueBuffers.keys()].find(candidate=>this.dialogueSizes.has(candidate));if(key===undefined)break;this.dropDialogue(key);
    }
  }
  voiceIsCurrent(epoch,ctx,position){return this.ownsContext(ctx)&&this.enabled&&epoch===this.voiceEpoch&&this.settings.speech&&!!this.settings.volume&&!(position?.floor!==undefined&&position.floor!==this.listenerFloor);}
  dialogueBuffer(key,ctx){
    let pending=this.dialogueBuffers.get(key);
    if(pending){this.dialogueBuffers.delete(key);this.dialogueBuffers.set(key,pending);return pending;}
    if(this.dialogueRequests.size>=DIALOGUE_MAX_PENDING)return null;
    const controller=new AbortController();this.dialogueRequests.set(key,controller);
    pending=this.fetchBuffer(assetUrl(`audio/dialogue/${key}.mp3`)+`?v=${AUDIO_REVISION}`,ctx,controller).then(buffer=>{
      if(this.dialogueBuffers.get(key)===pending){
        const size=Math.max(0,(buffer.length||0)*(buffer.numberOfChannels||1)*4);this.dialogueSizes.set(key,size);this.dialogueBytes+=size;this.pruneDialogue();
      }return buffer;
    }).catch(error=>{if(this.dialogueBuffers.get(key)===pending)this.dropDialogue(key);throw error;}).finally(()=>{if(this.dialogueRequests.get(key)===controller)this.dialogueRequests.delete(key);});
    this.dialogueBuffers.set(key,pending);this.pruneDialogue();return pending;
  }
  async dialogue(text,person,gain,urgent=false,position=null,options={}) {
    if(this.disposed||!this.enabled||!this.settings.speech||!this.settings.volume)return;
    if(options.isCurrent&&!options.isCurrent())return;
    if(options.speakerId)for(const record of [...this.activeSamples])if(record.speakerId===options.speakerId)this.releaseSample(record,true);
    const ctx=this.ctx,baseKey=dialogueKey(text,person.gender),epoch=this.voiceEpoch;
    if(!this.ownsContext(ctx)){if(!options.publicAddress)this.speak(text,person,gain,urgent?4:1);return;}
    const key=baseKey+(dialogueRegion(person)==='southern'?'-alt':'');
    try {
      const pending=this.dialogueBuffer(key,ctx);if(!pending)return;const buffer=await pending;
      if(!this.voiceIsCurrent(epoch,ctx,position)||options.isCurrent&&!options.isCurrent())return;
      if(options.publicAddress&&options.announcementSerial!==this.announcementSerial)return;
      if(options.publicAddress){this.paChimeBuffer||=announcementChimeBuffer(ctx);this.sampleNodes('pa-chime',position||this.listenerPosition,.65,false,this.paChimeBuffer,{publicAddress:true});}
      return this.sampleNodes(`voice-${key}`,position||{x:0,y:1,z:0},gain*.9,false,buffer,{...options,startDelay:options.publicAddress?.78:0});
    }catch(error){if(!options.publicAddress&&(!options.isCurrent||options.isCurrent())&&error?.name!=='AbortError'&&this.voiceIsCurrent(epoch,ctx,position))this.speak(text,person,gain,urgent?4:1);}
  }
  announce(text) {
    if(this.disposed||!ANNOUNCEMENT_LINES.includes(text))return;
    const announcementSerial=this.announcementSerial=(this.announcementSerial||0)+1;
    for(const record of [...this.activeSamples])if(record.publicAddress)this.releaseSample(record,true);
    return this.dialogue(text,{gender:'female',voiceRegion:'standard'},.8,true,this.listenerPosition,{publicAddress:true,announcementSerial});
  }
  update(dt, proximity, emergency, impairment, moving, running,footfalls=null) {
    if (!this.ctx || !this.enabled || this.disposed) return;
    const now = this.ctx.currentTime;
    this.music.gain.setTargetAtTime((.16 + proximity * .55 + (emergency ? .28 : 0))*1.2, now, 1.4);
    this.lowpass.frequency.setTargetAtTime(impairment ? 500 : 9500, now, .4);
    if (now > this.nextNote) {
      const notes = [220, 261.63, 329.63, 246.94, 164.81, 293.66, 207.65, 220];
      this.tone(notes[this.noteIndex++ % notes.length], 2.5, .09, 'triangle', this.music);
      this.nextNote = now + (emergency ? .8 : 2.9 - proximity * 1.3);
    }
    if (emergency && now > this.nextBeep) { this.sound('alarm'); this.nextBeep = now + 2.4; }
    else if (!emergency && now > this.nextBeep) { this.tone(980, .1, .028); this.nextBeep = now + 5 + Math.random() * 3; }
    if(moving&&Number.isInteger(footfalls)){for(let i=0;i<footfalls;i++)this.sound('step',{running});this.stepClock=0;}
    else if (moving) { this.stepClock += dt; if (this.stepClock > (running ? .27 : .46)) { this.sound('step',{running}); this.stepClock = 0; } }
    else this.stepClock=0;
  }
  dispose() {
    if(this.disposed)return this.disposePromise;this.disposed=true;this.enabled=false;this.controlEpoch++;
    this.sampleController?.abort();this.sampleController=null;this.samplePromise=null;this.startPromise=null;this.stopAmbient();
    this.foley?.dispose();this.foley=null;for(const record of [...this.activeSynth])this.releaseSynth(record,true);
    for(const source of this.backgroundSources){source.onended=null;try{source.stop();}catch{}if('buffer'in source)try{source.buffer=null;}catch{}}this.backgroundSources.clear();
    for(const node of this.ownedNodes)disconnect(node);this.ownedNodes.clear();
    this.dialogueBuffers.clear();this.dialogueSizes.clear();this.dialogueBytes=0;this.dialogueTakes.clear();this.clinicalBuffers.clear();this.paChimeBuffer=null;for(const key of Object.keys(this.samples))delete this.samples[key];
    const ctx=this.ctx;this.ctx=null;this.master=null;this.music=null;this.lowpass=null;this.droneGain=null;
    try{this.disposePromise=Promise.resolve(ctx?.close()).catch(()=>{});}catch{this.disposePromise=Promise.resolve();}return this.disposePromise;
  }
}
