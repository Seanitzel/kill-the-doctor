import test from 'node:test';
import assert from 'node:assert/strict';
import {HospitalAudio} from '../src/game/audio.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const buffer=(length=800)=>({length,numberOfChannels:1,sampleRate:8000,duration:length/8000});

function harness(t,{resumeGate=null}={}){
  const originals=Object.fromEntries(['window','SpeechSynthesisUtterance','fetch','setTimeout','clearTimeout'].map(key=>[key,globalThis[key]]));
  const h={contexts:[],owners:[],requests:[],spoken:[],timers:new Map(),timerId:0,fetchImpl:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})};
  const parameter=()=>({value:0,setValueAtTime(value){this.value=value;},setTargetAtTime(value){this.value=value;},linearRampToValueAtTime(value){this.value=value;},exponentialRampToValueAtTime(value){this.value=value;}});
  class Context{
    constructor(){this.state='suspended';this.currentTime=1;this.sampleRate=8000;this.nodes=[];this.destination={};this.listener={};this.resumeCalls=0;this.closeCalls=0;this.decodeCalls=0;h.contexts.push(this);}
    node(kind){const node={kind,connections:[],gain:parameter(),frequency:parameter(),pan:parameter(),delayTime:parameter(),playbackRate:parameter(),stopCalls:0,connect(target){this.connections.push(target);},disconnect(){this.connections=[];},start(){this.started=true;},stop(){this.stopCalls++;},finish(){this.onended?.();}};this.nodes.push(node);return node;}
    createGain(){return this.node('gain');}createBiquadFilter(){return this.node('filter');}createPanner(){const node=this.node('panner');for(const key of ['positionX','positionY','positionZ'])node[key]=parameter();return node;}
    createOscillator(){return this.node('oscillator');}createBufferSource(){return this.node('source');}createConvolver(){return this.node('convolver');}createDelay(){return this.node('delay');}createStereoPanner(){return this.node('pan');}
    createBuffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:index=>data[index]};}
    async resume(){this.resumeCalls++;if(resumeGate)await resumeGate.promise;if(this.state!=='closed')this.state='running';}
    async suspend(){if(this.state!=='closed')this.state='suspended';}
    async close(){this.closeCalls++;this.state='closed';}
    decodeAudioData(bytes){this.decodeCalls++;return this.decodeImpl?this.decodeImpl(bytes):Promise.resolve(buffer());}
  }
  globalThis.window={AudioContext:Context,speechSynthesis:{speaking:false,cancel(){},getVoices:()=>[],speak:utterance=>h.spoken.push(utterance)}};
  globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  globalThis.fetch=(url,options)=>{h.requests.push({url,options});return h.fetchImpl(url,options);};
  globalThis.setTimeout=callback=>{const id=++h.timerId;h.timers.set(id,callback);return id;};
  globalThis.clearTimeout=id=>h.timers.delete(id);
  h.audio=()=>{const audio=new HospitalAudio({volume:.5,speech:true});h.owners.push(audio);return audio;};
  h.runTimers=()=>{for(const [id,callback]of [...h.timers]){h.timers.delete(id);callback();}};
  t.after(async()=>{for(const audio of h.owners)await audio.dispose();for(const [key,value]of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
  return h;
}

test('Concurrent and repeated starts share one background graph and one sample load',async t=>{
  const h=harness(t),audio=h.audio();await Promise.all([audio.start(),audio.start(),audio.start()]);
  const ctx=audio.ctx,nodeCount=ctx.nodes.length,loads=h.requests.length;
  assert.equal(h.contexts.length,1);assert.equal(audio.backgroundSources.size,4);assert.equal(loads,11);
  for(let i=0;i<8;i++){audio.pause(true);audio.pause(false);await audio.start();}
  assert.equal(ctx.nodes.length,nodeCount);assert.equal(h.requests.length,loads);assert.equal(audio.backgroundSources.size,4);
});

test('A late resume cannot undo a newer pause or resurrect a disposed audio owner',async t=>{
  const resumeGate=deferred(),h=harness(t,{resumeGate}),audio=h.audio(),starting=audio.start(),ctx=audio.ctx;
  audio.pause(true);resumeGate.resolve();await starting;
  assert.equal(audio.enabled,false);assert.equal(ctx.state,'suspended');assert.equal(h.requests.length,0);
  await audio.dispose();await audio.start();assert.equal(h.contexts.length,1);assert.equal(ctx.closeCalls,1);
});

test('Disposal during resume releases sources even before startup can finish',async t=>{
  const resumeGate=deferred(),h=harness(t,{resumeGate}),audio=h.audio(),starting=audio.start(),ctx=audio.ctx;
  await audio.dispose();resumeGate.resolve();await starting;
  assert.equal(audio.ctx,null);assert.equal(audio.enabled,false);assert.equal(h.requests.length,0);
  assert.equal(ctx.closeCalls,1);assert.ok(ctx.nodes.filter(n=>['oscillator','source'].includes(n.kind)).every(n=>n.stopCalls===1));
  assert.ok(ctx.nodes.every(n=>n.connections.length===0));
});

test('Disposal aborts every sample request and ignores a fetch implementation that completes anyway',async t=>{
  const h=harness(t),gates=[];h.fetchImpl=()=>{const gate=deferred();gates.push(gate);return gate.promise;};
  const audio=h.audio(),starting=audio.start();await flush();const ctx=audio.ctx;
  assert.equal(gates.length,11);await audio.dispose();assert.ok(h.requests.every(request=>request.options.signal.aborted));
  for(const gate of gates)gate.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await starting;
  assert.equal(ctx.decodeCalls,0);assert.deepEqual(Object.keys(audio.samples),[]);assert.equal(audio.samplePromise,null);assert.equal(audio.ctx,null);
});

test('A noncancelable sample decode finishing after disposal cannot refill the released sample bank',async t=>{
  const h=harness(t),audio=h.audio(),starting=audio.start(),gates=[],ctx=audio.ctx;
  ctx.decodeImpl=()=>{const gate=deferred();gates.push(gate);return gate.promise;};await flush();
  assert.equal(gates.length,11);await audio.dispose();for(const gate of gates)gate.resolve(buffer());await starting;
  assert.deepEqual(Object.keys(audio.samples),[]);assert.equal(audio.samplePromise,null);assert.equal(audio.ctx,null);assert.equal(ctx.closeCalls,1);
});

test('Delayed reload and alarm effects are removed at pause and cannot spill into a resumed mission',async t=>{
  const h=harness(t),audio=h.audio();await audio.start();audio.sound('reload');audio.sound('alarm');
  assert.equal(h.timers.size,2);audio.pause(true);assert.equal(h.timers.size,0);assert.equal(audio.timers.size,0);
  audio.pause(false);const count=audio.ctx.nodes.length;h.runTimers();assert.equal(audio.ctx.nodes.length,count);
});

test('Completed synthesized one-shots disconnect their full graph and release sample buffers',async t=>{
  const h=harness(t),audio=h.audio();await audio.start();audio.noise(.1,.2);audio.tone(500,.1,.1);
  const records=[...audio.activeSynth];assert.equal(records.length,2);
  for(const record of records){const nodes=[...record.nodes];record.source.finish();assert.ok(nodes.every(node=>node.connections.length===0));assert.equal(record.source.onended,null);if(record.source.kind==='source')assert.equal(record.source.buffer,null);}
  assert.equal(audio.activeSynth.size,0);
});

test('A failed dialogue request cannot trigger fallback speech after mission teardown',async t=>{
  const h=harness(t),audio=h.audio();await audio.start();const gate=deferred();h.fetchImpl=()=>gate.promise;
  const speaking=audio.dialogue('Excuse me.',{gender:'female'},.7);audio.stopAmbient();gate.reject(Error('Network failure'));await speaking;
  assert.equal(h.spoken.length,0);assert.equal(audio.activeSamples.size,0);assert.equal(audio.dialogueBuffers.size,0);assert.equal(audio.dialogueRequests.size,0);
});

test('A voice decode completing after pause and resume stays canceled',async t=>{
  const h=harness(t),audio=h.audio();await audio.start();const gate=deferred();audio.ctx.decodeImpl=()=>gate.promise;
  const speaking=audio.dialogue('Please wait outside.',{gender:'female'},.7);await flush();
  audio.pause(true);audio.pause(false);gate.resolve(buffer());await speaking;
  assert.equal(audio.activeSamples.size,0);assert.equal(audio.dialogueBuffers.size,0);assert.equal(audio.dialogueBytes,0);assert.equal(h.spoken.length,0);
});

test('Failed voice loads are retryable rather than permanently cached failures',async t=>{
  const h=harness(t),audio=h.audio();await audio.start();let attempts=0;
  h.fetchImpl=async()=>({ok:++attempts>2,arrayBuffer:async()=>new ArrayBuffer(1)});
  for(let i=0;i<3;i++)await audio.dialogue('Excuse me.',{gender:'female'},.7);
  assert.equal(attempts,3);assert.equal(h.spoken.length,2);assert.equal(audio.activeSamples.size,1);assert.equal(audio.dialogueBuffers.size,1);
});

test('Decoded dialogue uses a bounded LRU while preserving in-flight request sharing',async t=>{
  const h=harness(t),audio=h.audio();await audio.start();audio.ctx.decodeImpl=async()=>buffer(512*1024);audio.sampleNodes=()=>null;
  for(let i=0;i<12;i++)await audio.dialogue(`Distinct patient line ${i}`,{gender:'male'},.5);
  assert.ok(audio.dialogueBytes<=8*1024*1024);assert.ok(audio.dialogueBuffers.size<=4);assert.equal(audio.dialogueRequests.size,0);
  const key=[...audio.dialogueBuffers.keys()].at(-1),requests=h.requests.length;
  await Promise.all([audio.dialogueBuffer(key,audio.ctx),audio.dialogueBuffer(key,audio.ctx)]);assert.equal(h.requests.length,requests);
  await audio.dispose();assert.equal(audio.dialogueBytes,0);assert.equal(audio.dialogueBuffers.size,0);assert.equal(audio.dialogueTakes.size,0);
});

test('Concurrent unique voice loads are bounded and canceled without later playback',async t=>{
  const h=harness(t),audio=h.audio();await audio.start();const gates=[];h.fetchImpl=()=>{const gate=deferred();gates.push(gate);return gate.promise;};
  const requests=Array.from({length:30},(_,i)=>audio.dialogue(`Pending line ${i}`,{gender:'male'},.5));
  assert.equal(gates.length,8);assert.equal(audio.dialogueRequests.size,8);audio.stopAmbient();
  for(const gate of gates)gate.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await Promise.all(requests);
  assert.equal(audio.dialogueRequests.size,0);assert.equal(audio.dialogueBuffers.size,0);assert.equal(audio.activeSamples.size,0);assert.equal(h.spoken.length,0);
});

test('Inactive ambient loops are stopped and active loops follow their current floor and position',async t=>{
  const h=harness(t),audio=h.audio();await audio.start();audio.ambientSample('newborn','newborn',{x:1,y:1,z:2,floor:0},.5);
  const record=audio.ambientChannels.get('newborn');audio.ambientSample('newborn','newborn',{x:7,y:1,z:8,floor:1},.4);
  assert.equal(record.floor,1);assert.equal(record.panner.positionX.value,7);assert.equal(record.panner.positionZ.value,8);
  audio.ambientSample('newborn','newborn',{x:7,y:1,z:8,floor:1},0);
  assert.equal(record.source.stopCalls,1);assert.equal(record.source.buffer,null);assert.equal(audio.ambientChannels.size,0);assert.equal(audio.activeSamples.size,0);
});

test('Bursts of effects are bounded and disconnected without waiting for browser ended events',async t=>{
  const h=harness(t),audio=h.audio();await audio.start();
  for(let i=0;i<90;i++){audio.tone(500);audio.playSample('cough',{x:0,y:1,z:0},.5);audio.foley.play('shot');}
  assert.equal(audio.activeSynth.size,32);assert.equal(audio.activeSamples.size,24);assert.equal(audio.foley.active.size,18);
  const sourceCount=audio.ctx.nodes.filter(node=>['source','oscillator'].includes(node.kind)&&node.connections.length).length;
  assert.equal(sourceCount,4+32+24+18);audio.stopAmbient();
  assert.equal(audio.activeSynth.size,0);assert.equal(audio.activeSamples.size,0);assert.equal(audio.foley.active.size,0);
  assert.equal(audio.ctx.nodes.filter(node=>['source','oscillator'].includes(node.kind)&&node.connections.length).length,4);
});

test('Repeated disposal synchronously disconnects foley, samples, effects and background resources',async t=>{
  const h=harness(t),audio=h.audio();await audio.start();const ctx=audio.ctx,foley=audio.foley;
  audio.sound('step');audio.sound('reload');audio.tone(440);audio.playSample('cough',{x:0,y:1,z:0},.5);
  await audio.dialogue('Can I help you?',{gender:'female'},.7);
  const sources=ctx.nodes.filter(node=>['source','oscillator'].includes(node.kind));
  await audio.dispose();await audio.dispose();h.runTimers();
  assert.equal(ctx.closeCalls,1);assert.ok(sources.every(source=>source.stopCalls>0));assert.ok(ctx.nodes.every(node=>node.connections.length===0));
  assert.equal(audio.ctx,null);assert.equal(audio.activeSamples.size,0);assert.equal(audio.activeSynth.size,0);assert.equal(audio.backgroundSources.size,0);assert.equal(audio.ownedNodes.size,0);assert.equal(audio.timers.size,0);assert.equal(audio.dialogueBuffers.size,0);assert.equal(audio.dialogueBytes,0);assert.deepEqual(Object.keys(audio.samples),[]);
  assert.equal(foley.nodes.length,0);assert.equal(foley.active.size,0);assert.equal(foley.ctx,null);assert.deepEqual(foley.buffers,{});assert.equal(foley.play('step'),false);
  const count=ctx.nodes.length;audio.sound('alarm');audio.speak('Late speech');audio.announce('Late announcement');await audio.start();h.runTimers();assert.equal(ctx.nodes.length,count);assert.equal(h.spoken.length,0);assert.equal(h.contexts.length,1);
});
