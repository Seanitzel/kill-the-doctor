import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HospitalAudio,hospitalMachineBuffer,MACHINE_DURATIONS,HOSPITAL_SAMPLE_FILES,announcementChimeBuffer} from '../src/game/audio.js';
import {HospitalFoley} from '../src/game/foley.js';
import {ALL_DIALOGUE_LINES,CLINICAL_CONVERSATIONS,PATIENT_PAIN_LINES,SUSPICION_LINES,RECRUIT_DIALOGUE,CONVERSATIONS,DISTRESS_LINES,ANNOUNCEMENT_LINES,WITNESS_LINES} from '../src/game/life-rules.js';

function context(){
  const nodes=[],param=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
  const node=kind=>{const item={kind,connections:[],gain:param(),frequency:param(),pan:param(),delayTime:param(),playbackRate:param(),positionX:param(),positionY:param(),positionZ:param(),connect(to){this.connections.push(to);},disconnect(){this.connections.length=0;},start(time){this.started=true;this.startTime=time;},stop(){this.stopped=true;},finish(){this.onended?.();}};nodes.push(item);return item;};
  return {nodes,state:'running',sampleRate:32000,currentTime:1,bufferCount:0,close(){this.state='closed';return Promise.resolve();},
    createBuffer(channels,length,rate){this.bufferCount++;const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:channel=>data[channel]};},
    createBufferSource:()=>node('source'),createPanner:()=>node('panner'),createGain:()=>node('gain'),createBiquadFilter:()=>node('filter'),createConvolver:()=>node('convolver'),createDelay:()=>node('delay'),createStereoPanner:()=>node('pan')};
}
const owner=()=>{const audio=new HospitalAudio({volume:.5,speech:true});audio.ctx=context();audio.lowpass=audio.ctx.createBiquadFilter();return audio;};

test('Each machine cue is finite, deterministic and softly bounded; the cuff contains inflation and release',()=>{
  const ctx=context();let total=0;
  for(const [kind,duration]of Object.entries(MACHINE_DURATIONS)){
    const first=hospitalMachineBuffer(ctx,kind),again=hospitalMachineBuffer(ctx,kind),samples=first.getChannelData(0);total+=first.length*4;
    assert.equal(first.numberOfChannels,1);assert.equal(first.length,Math.ceil(duration*ctx.sampleRate));assert.deepEqual(samples,again.getChannelData(0));
    let energy=0;for(const sample of samples){assert.ok(Number.isFinite(sample)&&Math.abs(sample)<.65);energy+=sample*sample;}
    assert.ok(energy>1);assert.equal(samples[0],0);assert.ok(Math.abs(samples.at(-1))<.002);
  }
  assert.ok(total<1.2*1024*1024,'four mono cues stay below 1.2 MiB at 32 kHz');
  const cuff=hospitalMachineBuffer(ctx,'blood-pressure').getChannelData(0);
  const energy=(start,end)=>cuff.slice(start*ctx.sampleRate,end*ctx.sampleRate).reduce((sum,v)=>sum+v*v,0);
  assert.ok(energy(.5,2.5)>10);assert.ok(energy(3.6,4.4)>1,'air releases after the pump');
  assert.equal(hospitalMachineBuffer(ctx,'unrecognized'),null);
});

test('Machine events reuse only four cached buffers, obey floors, and retain bounded source ownership',async()=>{
  const audio=owner(),ctx=audio.ctx,pos={x:3,y:1,z:8,floor:0};
  const first=audio.hospitalMachine('monitor',pos,.3),second=audio.hospitalMachine('monitor',pos,.4);
  assert.equal(first.source.buffer,second.source.buffer);assert.equal(ctx.bufferCount,1);assert.equal(first.panner.positionX.value,3);assert.equal(first.floor,0);
  const count=ctx.nodes.length;assert.equal(audio.hospitalMachine('monitor',{...pos,floor:2}),null);assert.equal(audio.hospitalMachine('__proto__',pos),null);assert.equal(ctx.nodes.length,count);
  for(let i=0;i<100;i++)audio.hospitalMachine(Object.keys(MACHINE_DURATIONS)[i%4],pos,.4);
  assert.equal(audio.clinicalBuffers.size,4);assert.equal(ctx.bufferCount,4);assert.equal(audio.activeSamples.size,24);assert.ok(first.source.stopped);assert.equal(first.source.buffer,null);
  const records=[...audio.activeSamples];audio.stopAmbient();assert.equal(audio.activeSamples.size,0);assert.ok(records.every(record=>record.source.stopped&&record.source.buffer===null));
  assert.equal(audio.timers.size,0);assert.equal(audio.clinicalBuffers.size,4,'finite sounds can be reused in the next round');
  await audio.dispose();assert.equal(audio.clinicalBuffers.size,0);const after=ctx.nodes.length;assert.equal(audio.hospitalMachine('monitor',pos),null);assert.equal(ctx.nodes.length,after);
});

test('Pain uses the recorded gendered clip, respects voice settings/floors, and ends without retained nodes',async()=>{
  const audio=owner(),ctx=audio.ctx,pos={x:2,y:1.2,z:5,floor:0};
  audio.samples['pain-female']={duration:.469};audio.samples['pain-male']={duration:.32};
  const female=audio.patientPain({gender:'female'},pos,.45),male=audio.patientPain({gender:'male'},pos,.4);
  assert.equal(female.name,'pain-female');assert.equal(male.name,'pain-male');assert.equal(female.volume.gain.value,.45);
  female.source.finish();assert.equal(female.source.buffer,null);assert.equal(female.source.onended,null);assert.ok([female.source,female.panner,female.volume].every(node=>node.connections.length===0));
  audio.settings.speech=false;assert.equal(audio.patientPain({},pos),null);audio.settings.speech=true;assert.equal(audio.patientPain({}, {...pos,floor:1}),null);
  audio.pause(true);assert.equal(audio.patientPain({},pos),undefined);assert.equal(audio.activeSamples.size,0);await audio.dispose();
  for(const key of ['pain-female','pain-male']){const file=readFileSync(new URL(`../public${HOSPITAL_SAMPLE_FILES[key]}`,import.meta.url));assert.ok(file.length>3000&&file.length<10000);}
});

test('Footstep volume is lower while the contact filters and recorded weapon mix are preserved',()=>{
  const ctx=context(),buffers=Object.fromEntries(['step-01','step-02','step-03','step-04','pistol-shot','rifle-shot'].map(key=>[key,{}]));
  const foley=new HospitalFoley(ctx,ctx.createGain(),buffers),walk=foley.play('step'),run=foley.play('step',{running:true}),shot=foley.play('shot');
  assert.ok(walk.gain.gain.value<=.27);assert.ok(run.gain.gain.value<=.38);assert.equal(walk.filter.frequency.value,4200);assert.equal(shot.filter.frequency.value,14500);assert.equal(shot.gain.gain.value,.79);foley.dispose();
});

test('Music receives a modest gain rise and keeps the original notes and timing',async()=>{
  const audio=owner(),ctx=audio.ctx,played=[];audio.music=ctx.createGain();audio.tone=(note,length,gain,type,destination)=>{if(destination===audio.music)played.push({note,length,gain});};
  ctx.currentTime=1;audio.update(.1,0,false,false,false,false);assert.equal(audio.music.gain.value,.192);assert.equal(audio.nextNote,3.9);assert.deepEqual(played,[{note:220,length:2.5,gain:.09}]);await audio.dispose();
});

test('Clinical, pain, suspicion, recruitment and pharmacy dialogue are included in the generated line set',()=>{
  for(const text of [...Object.values(CLINICAL_CONVERSATIONS).flat(2),...PATIENT_PAIN_LINES,...SUSPICION_LINES,...Object.values(RECRUIT_DIALOGUE),...CONVERSATIONS.pharmacy.flat(),...DISTRESS_LINES,...ANNOUNCEMENT_LINES,...Object.values(WITNESS_LINES)])assert.ok(ALL_DIALOGUE_LINES.includes(text),text);
  assert.ok(SUSPICION_LINES.includes('Did you hear that?'));assert.ok(SUSPICION_LINES.includes('That was weird.'));assert.ok(PATIENT_PAIN_LINES.some(text=>text.includes('Acamol')));
  assert.equal(ALL_DIALOGUE_LINES.length,new Set(ALL_DIALOGUE_LINES).size);
});

test('Witness wording distinguishes a visible weapon from forbidden camera evidence',()=>{
  assert.equal(WITNESS_LINES.weapon,'A weapon! I am calling security!');
  assert.equal(WITNESS_LINES.camera,'That camera is not allowed here. I am calling security.');
  assert.ok(!WITNESS_LINES.camera.toLowerCase().includes('weapon'));
});

test('Distress uses one finite human cue and can stop abruptly without ending unrelated sounds',async()=>{
  const audio=owner(),pos={x:2,y:1.5,z:3,floor:0};
  audio.samples['distress-male']={duration:1.457};audio.samples['distress-female']={duration:1.486};audio.samples.cough={duration:.9};
  const male=audio.distress({gender:'male'},pos),female=audio.distress({gender:'female'},pos,.7),cough=audio.playSample('cough',pos);
  assert.equal(male.source.loop,false);assert.equal(female.name,'distress-female');assert.equal(male.volume.gain.value,.8);assert.equal(male.floor,0);
  audio.stopDistress();assert.equal(audio.activeSamples.size,1);assert.ok(male.source.stopped&&female.source.stopped);assert.equal(male.source.buffer,null);assert.equal(female.source.onended,null);assert.ok(!cough.source.stopped);
  audio.settings.speech=false;assert.equal(audio.distress({},pos),null);audio.settings.speech=true;assert.equal(audio.distress({}, {...pos,floor:1}),null);
  for(let i=0;i<100;i++)audio.distress({},pos);assert.equal(audio.activeSamples.size,24);audio.pause(true);assert.equal(audio.activeSamples.size,0);await audio.dispose();
  for(const key of ['distress-female','distress-male'])assert.ok(readFileSync(new URL(`../public${HOSPITAL_SAMPLE_FILES[key]}`,import.meta.url)).length<20000);
});

test('Static PA announcements use the bundled voice path at the listener rather than device speech',()=>{
  const audio=owner(),calls=[];audio.listenerPosition={x:7,y:2,z:8,floor:1};audio.dialogue=(...args)=>calls.push(args);audio.speak=()=>assert.fail('Device speech should not be the primary static PA voice');
  audio.announce(ANNOUNCEMENT_LINES[0]);assert.equal(calls.length,1);assert.equal(calls[0][0],ANNOUNCEMENT_LINES[0]);assert.equal(calls[0][1].gender,'female');assert.equal(calls[0][4],audio.listenerPosition);
  assert.equal(calls[0][5].publicAddress,true);assert.equal(calls[0][5].announcementSerial,1);
  audio.dispose();
});

test('PA has two finite chime notes before telephone-filtered speech and releases every scheduled node',async()=>{
  const audio=owner(),ctx=audio.ctx;audio.dialogueBuffer=async()=>({duration:3});
  const voice=await audio.announce(ANNOUNCEMENT_LINES[0]),chime=[...audio.activeSamples].find(record=>record.name==='pa-chime');
  assert.ok(chime);assert.ok(voice.source.startTime>=chime.source.startTime+.77);assert.equal(voice.panner,null);
  assert.deepEqual(voice.filters.map(node=>[node.type,node.frequency.value]),[['highpass',430],['lowpass',2200],['lowpass',2600]]);
  const buffer=announcementChimeBuffer(ctx),data=buffer.getChannelData(0),energy=(a,b)=>data.slice(a*ctx.sampleRate,b*ctx.sampleRate).reduce((sum,n)=>sum+n*n,0);
  assert.ok(energy(.02,.2)>1);assert.ok(energy(.36,.55)>1);assert.ok(data.every(Number.isFinite));assert.ok(buffer.duration<1);
  const records=[...audio.activeSamples];audio.pause(true);assert.equal(audio.activeSamples.size,0);assert.ok(records.every(record=>record.source.stopped&&record.source.buffer===null));assert.ok(records.flatMap(record=>[record.source,record.volume,...record.filters]).every(node=>node.connections.length===0));
  await audio.dispose();assert.equal(audio.paChimeBuffer,null);
});

test('A newer PA cancels stale loading and scheduled announcements without canceling nearby dialogue',async()=>{
  const audio=owner(),resolvers=[];audio.dialogueBuffer=()=>new Promise(resolve=>resolvers.push(resolve));
  audio.samples.cough={duration:.4};const other=audio.playSample('cough',{x:0,y:1,z:0},.2);
  const first=audio.announce(ANNOUNCEMENT_LINES[0]),second=audio.announce(ANNOUNCEMENT_LINES[1]);
  resolvers[0]({duration:3});await first;assert.equal(audio.activeSamples.size,1);
  resolvers[1]({duration:3});await second;assert.equal(audio.activeSamples.size,3);
  const records=[...audio.activeSamples].filter(record=>record.publicAddress);const third=audio.announce(ANNOUNCEMENT_LINES[2]);assert.ok(records.every(record=>record.source.stopped));assert.equal(audio.activeSamples.size,1);assert.ok(!other.source.stopped);
  audio.pause(true);resolvers[2]({duration:3});await third;assert.equal(audio.activeSamples.size,0);await audio.dispose();
});

test('A speaker replaces their own interrupted line and stale decodes cannot talk over the new line',async()=>{
  const audio=owner(),resolvers=[];audio.dialogueBuffer=()=>new Promise(resolve=>resolvers.push(resolve));let version=1;
  const request=audio.dialogue('First',{gender:'female'},.8,true,null,{speakerId:'nurse',isCurrent:()=>version===1});version=2;
  const warning=audio.dialogue('Warning',{gender:'female'},.8,true,null,{speakerId:'nurse',isCurrent:()=>version===2});
  resolvers[1]({duration:4});const warned=await warning;resolvers[0]({duration:5});assert.equal(await request,undefined);assert.equal(audio.activeSamples.size,1);
  const nearby=audio.sampleNodes('different-speaker',{x:0,y:1,z:0},.5,false,{duration:4},{speakerId:'doctor'});version=3;
  const report=audio.dialogue('Security',{gender:'female'},.8,true,null,{speakerId:'nurse',isCurrent:()=>version===3});assert.equal(warned.source.stopped,true);assert.equal(nearby.source.stopped,undefined);resolvers[2]({duration:4});await report;
  assert.equal([...audio.activeSamples].filter(r=>r.speakerId==='nurse').length,1);await audio.dispose();assert.equal(audio.activeSamples.size,0);
});

test('Recorded laughter respects speech and floor settings and owns only one finite source per actor',()=>{
 const audio=owner(),pos={x:2,y:1.5,z:4,floor:0};audio.samples['laugh-male']={duration:1.42};audio.samples['laugh-female']={duration:1.82};
 const first=audio.laugh({gender:'male'},pos,.45,'visitor');assert.equal(first.name,'laugh-male');assert.equal(first.source.loop,false);assert.equal(first.panner.positionX.value,2);assert.equal(first.speakerId,'visitor');
 const second=audio.laugh({gender:'female'},pos,.45,'visitor');assert.ok(first.source.stopped);assert.equal(first.source.buffer,null);assert.equal(second.name,'laugh-female');assert.equal(audio.activeSamples.size,1);
 const nodes=audio.ctx.nodes.length;audio.settings.speech=false;assert.equal(audio.laugh({},pos),null);audio.settings.speech=true;assert.equal(audio.laugh({},{...pos,floor:2}),null);assert.equal(audio.ctx.nodes.length,nodes);second.source.finish();assert.equal(audio.activeSamples.size,0);assert.equal(audio.timers.size,0);
});
