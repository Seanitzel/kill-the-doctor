import { dialogueKey } from './life-rules.js';
export class HospitalAudio {
  constructor(settings) { this.settings = settings; this.ctx = null; this.nextNote = 0; this.nextBeep = 0; this.stepClock = 0; this.enabled = true; this.noteIndex = 0; this.samples = {}; this.ambientChannels = new Map(); this.activeSamples = new Set(); this.speechPriority = 0; this.speechSerial = 0; this.dialogueBuffers = new Map(); this.voiceEpoch=0; this.listenerFloor=0; }
  async start() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.gain.value = this.settings.volume * 0.45; this.master.connect(this.ctx.destination);
        this.music = this.ctx.createGain(); this.music.gain.value = 0.07; this.music.connect(this.master);
        this.lowpass = this.ctx.createBiquadFilter(); this.lowpass.type = 'lowpass'; this.lowpass.frequency.value = 9500; this.lowpass.connect(this.master);
        this.droneGain = this.ctx.createGain(); this.droneGain.gain.value = 0.08; this.droneGain.connect(this.music);
        for (const freq of [55, 82.41, 110.3]) { const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq; o.connect(this.droneGain); o.start(); }
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const d = noiseBuffer.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource(); noise.buffer = noiseBuffer; noise.loop = true;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 240;
        const g = this.ctx.createGain(); g.gain.value = 0.025; noise.connect(filter); filter.connect(g); g.connect(this.master); noise.start();
      }
      await this.ctx.resume(); this.enabled = true; this.setSettings(this.settings); await this.loadSamples();
    } catch { /* Captions and gameplay remain available without an audio device. */ }
  }
  setSettings(settings) { this.settings = settings; if (!settings.volume || !settings.speech) window.speechSynthesis?.cancel(); if (this.ctx) this.master.gain.setTargetAtTime(this.enabled ? settings.volume * .45 : 0, this.ctx.currentTime, .12); }
  pause(paused) { this.enabled = !paused; this.setSettings(this.settings); if (paused) { window.speechSynthesis?.cancel(); this.speechPriority=0; this.ctx?.suspend().catch(()=>{}); } else this.ctx?.resume().catch(()=>{}); }
  tone(freq, length = .2, gain = .1, type = 'sine', destination) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain, now + .008); g.gain.exponentialRampToValueAtTime(.0001, now + length);
    o.connect(g); g.connect(destination || this.lowpass); o.start(now); o.stop(now + length + .05);
  }
  noise(length, gain, filterFreq = 900) {
    if (!this.ctx || !this.enabled) return;
    const n = this.ctx.createBuffer(1, this.ctx.sampleRate * length, this.ctx.sampleRate), data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    source.buffer = n; filter.frequency.value = filterFreq; g.gain.value = gain; source.connect(filter); filter.connect(g); g.connect(this.lowpass); source.start();
  }
  sound(name) {
    if (name === 'flicker') { this.noise(.09,.10,1800); this.tone(80,.12,.035,'triangle'); }
    if (name === 'shot') { this.noise(.22, this.settings.suppressor ? .25 : .6, 3400); this.tone(62, .2, .4, 'triangle'); }
    if (name === 'step') this.noise(.065, .11, 650);
    if (name === 'door') { this.noise(.25, .07, 300); this.tone(130, .12, .04, 'triangle'); }
    if (name === 'clue') { this.tone(523, .22, .12); setTimeout(() => this.tone(784, .3, .1), 130); }
    if (name === 'blackout') { this.noise(.6, .25, 250); this.tone(38, 1.2, .28, 'triangle'); }
    if (name === 'cough') { this.noise(.25, .25, 1000); setTimeout(() => this.noise(.2, .2, 600), 280); }
    if (name === 'empty') this.tone(240, .035, .08, 'square');
    if (name === 'reload') { this.noise(.08, .12, 2300); setTimeout(() => this.noise(.12, .13, 1300), 480); }
    if (name === 'alarm') { this.tone(660, .3, .2); setTimeout(() => this.tone(440, .3, .2), 320); }
  }
  async loadSamples() {
    if(this.samplePromise) return this.samplePromise;
    this.samplePromise=Promise.allSettled(Object.entries({newborn:'/audio/newborn-cry.mp3',labor:'/audio/labor-groan.mp3',breathing:'/audio/labor-breathing.mp3'}).map(async([name,url])=>{
      const response=await fetch(url);if(!response.ok) throw Error('Audio sample unavailable');this.samples[name]=await this.ctx.decodeAudioData(await response.arrayBuffer());
    }));return this.samplePromise;
  }
  sampleNodes(name,position,gain,loop=false,buffer=null) {
    const sample=buffer||this.samples[name];if(!this.ctx||!sample)return null;
    const source=this.ctx.createBufferSource(),panner=this.ctx.createPanner(),volume=this.ctx.createGain();source.buffer=sample;source.loop=loop;
    panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=4;panner.maxDistance=25;panner.rolloffFactor=.65;
    panner.positionX.value=position.x;panner.positionY.value=position.y||1;panner.positionZ.value=position.z;
    volume.gain.value=gain;source.connect(panner);panner.connect(volume);volume.connect(this.lowpass);
    const record={source,panner,volume,name,floor:position.floor};this.activeSamples.add(record);
    source.onended=()=>{this.activeSamples.delete(record);panner.disconnect();volume.disconnect();};source.start();return record;
  }
  playSample(name,position,gain=.5) {if(!this.enabled||gain<=0)return;return this.sampleNodes(name,position,gain);}
  ambientSample(key,name,position,gain) {
    if(!this.ctx)return;
    let channel=this.ambientChannels.get(key);
    if(!channel&&gain>.003&&this.enabled) {channel=this.sampleNodes(name,position,0,true);if(channel)this.ambientChannels.set(key,channel);}
    if(channel) channel.volume.gain.setTargetAtTime(this.enabled?gain:0,this.ctx.currentTime,.55);
  }
  stopAmbient() {this.voiceEpoch++;for(const record of this.activeSamples){try{record.source.stop();}catch{}}this.activeSamples.clear();this.ambientChannels.clear();}
  setListener(position,direction,floor=0) {if(this.ctx&&floor!==this.listenerFloor)for(const record of this.activeSamples)if(record.floor!==undefined&&record.floor!==floor)record.volume.gain.setTargetAtTime(0,this.ctx.currentTime,.15);this.listenerFloor=floor;
    if(!this.ctx)return;const listener=this.ctx.listener;
    if(listener.positionX){listener.positionX.value=position.x;listener.positionY.value=position.y;listener.positionZ.value=position.z;listener.forwardX.value=direction.x;listener.forwardY.value=direction.y;listener.forwardZ.value=direction.z;listener.upX.value=0;listener.upY.value=1;listener.upZ.value=0;}
  }
  speak(text,person={},gain=1,priority=1) {
    if(!this.enabled||!this.settings.speech||this.settings.volume===0||!window.speechSynthesis)return;
    if(speechSynthesis.speaking&&this.speechPriority>priority)return;
    speechSynthesis.cancel();this.speechPriority=priority;const serial=++this.speechSerial;
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=priority>1?.91:.96;utterance.pitch=person.gender==='female'?1.08:.88;utterance.volume=this.settings.volume*Math.min(1,gain)*(priority>1?.7:.85);
    const voices=speechSynthesis.getVoices().filter(v=>v.lang.startsWith('en'));
    const match=person.gender==='female'?/Samantha|Zira|Karen|Victoria|Female/i:/Daniel|David|Alex|Fred|Male/i;
    const voice=voices.find(v=>match.test(v.name))||voices[person.gender==='female'?0:Math.min(1,voices.length-1)];if(voice)utterance.voice=voice;
    const finish=()=>{if(serial===this.speechSerial)this.speechPriority=0;};utterance.onend=finish;utterance.onerror=finish;speechSynthesis.speak(utterance);
  }
  async dialogue(text,person,gain,urgent=false,position=null) {
    if(!this.enabled||!this.settings.speech||!this.settings.volume)return;
    const key=dialogueKey(text,person.gender),epoch=this.voiceEpoch;
    try {
      if(!this.dialogueBuffers.has(key))this.dialogueBuffers.set(key,fetch(`/audio/dialogue/${key}.mp3`).then(async response=>{if(!response.ok)throw Error('Voice unavailable');return this.ctx.decodeAudioData(await response.arrayBuffer());}));
      const buffer=await this.dialogueBuffers.get(key);
      if(!this.enabled||epoch!==this.voiceEpoch||!this.settings.speech||position?.floor!==undefined&&position.floor!==this.listenerFloor)return;
      this.sampleNodes(`voice-${key}`,position||{x:0,y:1,z:0},gain*.9,false,buffer);
    }catch{this.speak(text,person,gain,urgent?4:1);}
  }
  announce(text) {this.speak(text,{gender:'female'},.8,/Code blue|Police|Security incident/i.test(text)?5:3);}
  update(dt, proximity, emergency, impairment, moving, running) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(.1 + proximity * .38 + (emergency ? .2 : 0), now, 1.4);
    this.lowpass.frequency.setTargetAtTime(impairment ? 500 : 9500, now, .4);
    if (now > this.nextNote) {
      const notes = [220, 261.63, 329.63, 246.94, 164.81, 293.66, 207.65, 220];
      this.tone(notes[this.noteIndex++ % notes.length], 2.5, .09, 'triangle', this.music);
      this.nextNote = now + (emergency ? .8 : 2.9 - proximity * 1.3);
    }
    if (emergency && now > this.nextBeep) { this.sound('alarm'); this.nextBeep = now + 3.5; }
    else if (!emergency && now > this.nextBeep) { this.tone(980, .1, .028); this.nextBeep = now + 5 + Math.random() * 3; }
    if (moving) { this.stepClock += dt; if (this.stepClock > (running ? .27 : .46)) { this.sound('step'); this.stepClock = 0; } }
  }
  dispose() { this.stopAmbient(); window.speechSynthesis?.cancel(); this.ctx?.close(); }
}
