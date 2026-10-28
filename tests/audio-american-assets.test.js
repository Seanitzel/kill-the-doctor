import {OFFICE_VISITOR_LINES} from '../src/game/dialogue-v25.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ALL_DIALOGUE_LINES,ANNOUNCEMENT_LINES,dialogueKey} from '../src/game/life-rules.js';

const dialogueRoot=new URL('../public/audio/dialogue/',import.meta.url);
test('Legacy dialogue retains its four designed voice identities; new patient questions use the verified ElevenLabs bank',()=>{
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',dialogueRoot))),profiles=JSON.parse(readFileSync(new URL('voice-profiles.json',dialogueRoot)));
  assert.equal(manifest.length,ALL_DIALOGUE_LINES.filter(text=>!OFFICE_VISITOR_LINES.includes(text)).length*2);assert.equal(Object.keys(profiles).length,4);
  // New questions are verified in english-voices.test.js with the full current catalog.
  const identityByRegion=new Map();
  for(const text of ALL_DIALOGUE_LINES.filter(text=>!OFFICE_VISITOR_LINES.includes(text)))for(const gender of ['female','male']){
    const key=dialogueKey(text,gender),entry=manifest.find(e=>e.key===key);assert.equal(entry.text,text);assert.equal(entry.synthetic,true);assert.match(entry.engine,/Qwen3-TTS/);
    assert.deepEqual(entry.variants.map(v=>v.voiceRegion),['standard','southern']);
    for(const variant of entry.variants){
      const profileKey=`${gender}-${variant.voiceRegion}`,profile=profiles[profileKey];assert.ok(profile.syntheticDesigned);assert.ok(variant.syntheticDesigned);assert.equal(variant.voiceId,profile.voiceId);assert.equal(variant.referenceSha256,profile.referenceSha256);assert.equal(variant.speed,1);
      assert.equal(variant.file,key+(variant.voiceRegion==='southern'?'-alt':'')+'.mp3');assert.ok(variant.duration>.3&&variant.duration<18);
      const audio=readFileSync(new URL(variant.file,dialogueRoot));assert.equal(createHash('sha256').update(audio).digest('hex'),variant.sha256);assert.ok(audio.length>1000);
      if(identityByRegion.has(profileKey))assert.equal(identityByRegion.get(profileKey),variant.voiceId);identityByRegion.set(profileKey,variant.voiceId);
    }
  }
  assert.equal(new Set(identityByRegion.values()).size,4);
});

test('New medical-staff PA phrase is bundled with the standard designed voice',()=>{
  const line='Attention medical staff. Please return to your assigned departments. Your next consultation is waiting.';
  assert.ok(ANNOUNCEMENT_LINES.includes(line));const manifest=JSON.parse(readFileSync(new URL('manifest.json',dialogueRoot))),entry=manifest.find(e=>e.key===dialogueKey(line,'female'));
  assert.equal(entry.category,'announcement');assert.equal(entry.variants[0].voiceRegion,'standard');assert.ok(entry.variants[0].file.endsWith('.mp3'));
});
