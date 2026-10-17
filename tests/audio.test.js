import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dialogueKey,ALL_DIALOGUE_LINES} from '../src/game/life-rules.js';
import {HospitalFoley,FOLEY_FILES,roomImpulse} from '../src/game/foley.js';
import {HospitalAudio} from '../src/game/audio.js';
import {STORIES,storyDuration} from '../src/game/stories.js';

function context(){
  const nodes=[],parameter=()=>({value:0,setTargetAtTime(value){this.value=value;}});
  const node=kind=>{const n={kind,connections:[],gain:parameter(),frequency:parameter(),delayTime:parameter(),pan:parameter(),playbackRate:parameter(),connect(to){this.connections.push(to);},disconnect(){this.connections=[];},start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};nodes.push(n);return n;};
  return {nodes,sampleRate:32000,currentTime:1,createBuffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return {length,sampleRate:rate,numberOfChannels:channels,getChannelData:c=>data[c]};},createGain:()=>node('gain'),createConvolver:()=>node('convolver'),createBiquadFilter:()=>node('filter'),createDelay:()=>node('delay'),createBufferSource:()=>node('source'),createStereoPanner:()=>node('pan')};
}
const buffers=()=>Object.fromEntries(Object.keys(FOLEY_FILES).map(key=>[key,{duration:key.startsWith('step')?.44:1.5}]));

test('Bundled natural foley is small, decodable PCM with usable headroom',()=>{
  let total=0;
  for(const file of Object.values(FOLEY_FILES)){
    const bytes=readFileSync(new URL(`../public/${file}`,import.meta.url));total+=bytes.length;
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
    let channels,rate,format,bits,samples;
    for(let at=12;at+8<bytes.length;){const id=bytes.toString('ascii',at,at+4),size=bytes.readUInt32LE(at+4),offset=at+8;if(id==='fmt '){format=bytes.readUInt16LE(offset);channels=bytes.readUInt16LE(offset+2);rate=bytes.readUInt32LE(offset+4);bits=bytes.readUInt16LE(offset+14);}if(id==='data')samples=bytes.subarray(offset,offset+size);at=offset+size+(size%2);}
    assert.equal(format,1);assert.equal(channels,1);assert.equal(rate,32000);assert.equal(bits,16);assert.ok(samples.length>20000);
    let peak=0;for(let at=0;at<samples.length;at+=2)peak=Math.max(peak,Math.abs(samples.readInt16LE(at)));
    assert.ok(peak>3000&&peak<30000,`${file} is audible with headroom`);
  }
  assert.ok(total<350000,'six recordings remain lightweight for phones');
});
test('Hospital room response is short, stereo and decays without nonfinite samples',()=>{
  const response=roomImpulse(context()),left=response.getChannelData(0),right=response.getChannelData(1);
  assert.ok(response.length/response.sampleRate<1);assert.notDeepEqual(left,right);
  let early=0,late=0;for(let i=0;i<left.length;i++){assert.ok(Number.isFinite(left[i]));if(i<left.length/3)early+=left[i]**2;if(i>left.length*2/3)late+=left[i]**2;}
  assert.ok(early>late*20);assert.equal(left.at(-1)<.001,true);
});
test('Recorded steps vary, alternate feet, retain a dry attack and use finite room reflections',()=>{
  const ctx=context(),destination=ctx.createGain(),foley=new HospitalFoley(ctx,destination,buffers());
  const steps=Array.from({length:5},()=>foley.play('step'));
  assert.equal(new Set(steps.slice(0,4).map(s=>s.key)).size,4);assert.notEqual(steps[0].key,steps[1].key);
  assert.equal(Math.sign(steps[0].pan.pan.value),-Math.sign(steps[1].pan.pan.value));
  assert.ok(steps.every(s=>s.source.started&&s.source.playbackRate.value>.9&&s.source.playbackRate.value<1.1));
  assert.ok(foley.input.connections.includes(destination),'dry sound remains distinct');
  const delays=ctx.nodes.filter(n=>n.kind==='delay');assert.ok(delays.length>=2);assert.ok(delays.every(n=>n.delayTime.value>0&&n.delayTime.value<.15));
  assert.equal(steps[0].source.buffer,foley.buffers['step-01']);
});
test('Pistol and rifle use separate recordings; the suppressor lowers volume and high frequencies',()=>{
  const ctx=context(),foley=new HospitalFoley(ctx,ctx.createGain(),buffers());
  const pistol=foley.play('shot'),rifle=foley.play('rifle'),quiet=foley.play('shot',{suppressed:true});
  assert.equal(pistol.key,'pistol-shot');assert.equal(rifle.key,'rifle-shot');assert.ok(quiet.gain.gain.value<pistol.gain.gain.value*.4);assert.ok(quiet.filter.frequency.value<pistol.filter.frequency.value);
  for(let i=0;i<50;i++)foley.play('shot');assert.ok(foley.active.size<=18);foley.stop();assert.equal(foley.active.size,0);assert.ok(ctx.nodes.filter(n=>n.kind==='source').every(n=>n.stopped));
  const missing=new HospitalFoley(ctx,ctx.createGain(),{});assert.equal(missing.play('step'),false);assert.equal(missing.play('shot'),false);
});
test('Natural foley leaves the original eight-note music sequence intact',()=>{
  const audio=new HospitalAudio({volume:.5,speech:false}),ctx=context(),notes=[];
  Object.assign(audio,{ctx,music:ctx.createGain(),lowpass:ctx.createBiquadFilter(),enabled:true});
  audio.tone=(frequency,length,gain,type,destination)=>{if(destination===audio.music)notes.push(frequency);};
  for(let i=0;i<8;i++){ctx.currentTime=1+i*6;audio.update(.1,0,false,false,false,false);}
  assert.deepEqual(notes,[220,261.63,329.63,246.94,164.81,293.66,207.65,220]);
});
test('Longer story captions receive enough automatic reading time',()=>{
  for(const story of STORIES)for(let panel=0;panel<story.panels.length;panel++){
    const duration=storyDuration(story,panel);assert.ok(duration>=8500&&duration<=18000);
    if(story.panels[panel][1].split(/\s+/).length>35)assert.ok(duration>12000);
  }
});
test('Every conversation has two bundled neural takes with matching text keys and asset hashes',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../public/audio/dialogue/manifest.json',import.meta.url)));
  const lines=ALL_DIALOGUE_LINES;
  assert.equal(manifest.length,lines.length*2);
  for(const text of lines)for(const gender of ['male','female']){
    const key=dialogueKey(text,gender),entry=manifest.find(e=>e.key===key);assert.equal(entry.text,text);assert.equal(entry.synthetic,true);
    assert.equal(entry.variants.length,2);
    for(const variant of entry.variants){const bytes=readFileSync(new URL(`../public/audio/dialogue/${variant.file}`,import.meta.url));assert.ok(bytes.length>1000);assert.equal(createHash('sha256').update(bytes).digest('hex'),variant.sha256);}
  }
});
test('Repeated dialogue alternates performances and caches both without shifting playback pitch',async()=>{
  const audio=new HospitalAudio({volume:.5,speech:true}),requests=[],played=[],oldFetch=globalThis.fetch;
  audio.ctx={decodeAudioData:async()=>({decoded:true})};audio.sampleNodes=(key,pos,gain,loop,buffer)=>played.push({key,buffer});
  globalThis.fetch=async url=>{requests.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};};
  try{for(let i=0;i<3;i++)await audio.dialogue('Excuse me.',{gender:'female'},.5);assert.equal(requests.length,2);assert.match(requests[1],/-alt\.mp3\?v=2\.3\.0$/);assert.equal(played[0].key,played[2].key);assert.notEqual(played[0].key,played[1].key);}finally{globalThis.fetch=oldFetch;}
});
