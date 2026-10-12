export class HospitalAudio {
  constructor(settings) { this.settings = settings; this.ctx = null; this.nextNote = 0; this.nextBeep = 0; this.stepClock = 0; this.enabled = true; this.noteIndex = 0; }
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
      await this.ctx.resume(); this.enabled = true; this.setSettings(this.settings);
    } catch { /* Captions and gameplay remain available without an audio device. */ }
  }
  setSettings(settings) { this.settings = settings; if (this.ctx) this.master.gain.setTargetAtTime(this.enabled ? settings.volume * .45 : 0, this.ctx.currentTime, .12); }
  pause(paused) { this.enabled = !paused; this.setSettings(this.settings); if (paused) window.speechSynthesis?.cancel(); }
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
  announce(text) {
    if (!this.enabled || !this.settings.speech || this.settings.volume === 0 || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = .9; utterance.pitch = .88; utterance.volume = this.settings.volume * .55;
    const voices = speechSynthesis.getVoices(); const voice = voices.find(v => v.lang.startsWith('en') && /Samantha|Daniel|Google/.test(v.name)) || voices.find(v => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
  }
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
  dispose() { window.speechSynthesis?.cancel(); this.ctx?.close(); }
}
