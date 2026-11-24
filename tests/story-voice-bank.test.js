import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import bank from '../src/game/story-voice-manifest.json' with {type:'json'};
import patients from '../src/game/story-patient-lines.json' with {type:'json'};
import {STORY_ENGLISH_LINES} from '../src/game/story-voice-lines.js';
import {STORY_VOICE_CAST,storyVoiceProfile,storyVoiceKey} from '../src/game/story-voice-policy.js';
import {resolveStoryVoice} from '../src/game/story-voices.js';
import {dialogueKey,CONVERSATIONS,CLINICAL_CONVERSATIONS,PATIENT_PAIN_LINES,SUSPICION_LINES,DISTRESS_LINES,SNEEZE_REPLIES,RECRUIT_DIALOGUE} from '../src/game/life-rules.js';
import {JAMIE_SELF_TALK_LINES} from '../src/game/dialogue-v25.js';

test('the patient translation catalog covers conversations, clinical replies, pain, suspicion and recruited patients',()=>{
  const required=[...CONVERSATIONS.patients.flat(),...CONVERSATIONS.pharmacy.flat(),...CONVERSATIONS.cafe.flat(),...Object.values(CLINICAL_CONVERSATIONS).flat().map(pair=>pair[1]),...PATIENT_PAIN_LINES,...SUSPICION_LINES,...DISTRESS_LINES,...SNEEZE_REPLIES,...Object.values(RECRUIT_DIALOGUE),...JAMIE_SELF_TALK_LINES,'What was that noise?!'];
  for(const caption of required){assert.ok(patients[caption],caption);assert.equal(typeof patients[caption].fr,'string');assert.equal(typeof patients[caption].ha,'string');}
});

test('complete France and Nigeria recordings retain separate native patients, English staff and matching model genders',()=>{
  assert.deepEqual(bank.countries,['france','nigeria']);
  assert.deepEqual(bank.patientLanguages,{france:['fr'],nigeria:['ha']});
  assert.deepEqual(bank.pendingLanguages,['ig','yo']);
  const expected=new Set(),identities=new Set();
  for(const country of bank.countries)for(const role of ['patient','staff'])for(const gender of ['female','male'])for(let variant=0;variant<2;variant++){
    const ordinal=variant*2,profile=storyVoiceProfile({country,role,gender,ordinal,availablePatientLanguages:bank.patientLanguages[country]});
    assert.equal(profile.voice,STORY_VOICE_CAST[role][gender][variant]);identities.add(profile.voice);
    for(const caption of role==='patient'?Object.keys(patients):STORY_ENGLISH_LINES){
      const key=storyVoiceKey(profile,dialogueKey(caption,gender)),entry=bank.entries[key];expected.add(key);
      assert.ok(entry,key);
      for(const field of ['country','role','gender','variant','language','voice'])assert.equal(entry[field],profile[field],`${key}: ${field}`);
      assert.equal(entry.caption,caption);assert.equal(entry.text,role==='staff'?caption:patients[caption][profile.language]);
      assert.equal(entry.engine,'ElevenLabs v3 via Replicate');assert.match(entry.predictionId,/^[a-z0-9]+$/);
      assert.ok(entry.duration>=.15&&entry.duration<=35);assert.ok(entry.transcriptScore>=.82);
      const file=readFileSync(new URL(`../public/audio/countries/story/${key}.mp3`,import.meta.url));
      assert.equal(file.length,entry.bytes);assert.equal(createHash('sha256').update(file).digest('hex'),entry.sha256);
      const take=resolveStoryVoice(bank,caption,{voiceCountry:country,voiceRole:role,voicePlayMode:'story',voiceOrdinal:ordinal,gender});
      assert.equal(take.key,`countries/story/${key}`);assert.equal(take.strict,true);assert.equal(take.language,profile.language);assert.equal(take.caption,caption);
    }
  }
  assert.equal(identities.size,8);assert.deepEqual(new Set(Object.keys(bank.entries)),expected);
});

test('other destinations, Freeplay and Terror retain their existing voice bank',()=>{
  for(const country of ['china','india','russia','venezuela','america','romania','uganda','england'])assert.equal(resolveStoryVoice(bank,'Hello',{voiceCountry:country,voiceRole:'patient',voicePlayMode:'story',gender:'female'}),null);
  for(const country of bank.countries)for(const mode of ['freestyle','terror','other',undefined])assert.equal(resolveStoryVoice(bank,'Hello',{voiceCountry:country,voiceRole:'patient',voicePlayMode:mode,gender:'male'}),null);
});
