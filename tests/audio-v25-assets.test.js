import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ALL_DIALOGUE_LINES,dialogueKey} from '../src/game/life-rules.js';
import {PATIENT_PAGE_LINES,ROOM_WARNING_LINES,JAMIE_SELF_TALK_LINES,JAMIE_LAUGH_LINE,ADDITIONAL_DIALOGUE_LINES} from '../src/game/dialogue-v25.js';
import {makeLayout} from '../src/game/layout.js';

const root=new URL('../public/audio/dialogue/',import.meta.url);
test('New patient pages, room warnings and Jamie phrases have complete stable regional recordings',()=>{
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root))),profiles=JSON.parse(readFileSync(new URL('voice-profiles.json',root)));
  assert.equal(PATIENT_PAGE_LINES.length,4);assert.equal(Object.keys(ROOM_WARNING_LINES).length,3);assert.equal(JAMIE_SELF_TALK_LINES.length,3);assert.equal(ADDITIONAL_DIALOGUE_LINES.length,11);
  assert.equal(new Set(ADDITIONAL_DIALOGUE_LINES).size,11);assert.ok(ADDITIONAL_DIALOGUE_LINES.includes(JAMIE_LAUGH_LINE));
  for(const text of ADDITIONAL_DIALOGUE_LINES){
    assert.ok(ALL_DIALOGUE_LINES.includes(text),`Runtime registry includes ${text}`);
    for(const gender of ['female','male']){
      const key=dialogueKey(text,gender),entry=manifest.find(e=>e.key===key);assert.ok(entry,key);
      assert.equal(entry.text,text);assert.equal(entry.variants.length,2);
      for(const [i,region]of ['standard','southern'].entries()){
        const variant=entry.variants[i];assert.equal(variant.voiceRegion,region);assert.equal(variant.file,`${key}${i?'-alt':''}.mp3`);
        assert.equal(variant.referenceSha256,profiles[`${gender}-${region}`].referenceSha256);assert.equal(variant.voiceId,profiles[`${gender}-${region}`].voiceId);
        const bytes=readFileSync(new URL(variant.file,root));assert.equal(bytes.length,variant.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),variant.sha256);
      }
    }
  }
});

test('Named patient pages retain unambiguous captions and female standard PA recordings',()=>{
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root)));
  const rooms=[0,1,2].flatMap(floor=>makeLayout(floor).rooms),digits={one:'1',two:'2',three:'3',four:'4',five:'5',oh:'0'};
  for(const text of PATIENT_PAGE_LINES){
    assert.match(text,/^[A-Z][a-z]+ [A-Z][a-z]+, please (come|report) to (Outpatient|Cardiology|Neurology|Rehabilitation), room (one oh five|two oh three|two oh four|three oh five)\.$/);
    const [,department,spokenRoom]=text.match(/to ([A-Za-z]+), room (.+)\.$/),number=spokenRoom.split(' ').map(word=>digits[word]).join('');
    assert.ok(rooms.some(room=>room.name===department&&room.number===number),`Page matches a signed room: ${department} ${number}`);
    const entry=manifest.find(e=>e.key===dialogueKey(text,'female'));assert.equal(entry.category,'announcement');
    assert.equal(entry.variants[0].voiceId,'northline-female-standard');assert.equal(entry.variants[0].spokenText,text);
  }
});
