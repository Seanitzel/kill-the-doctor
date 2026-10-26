import manifest from './country-voice-manifest.json' with {type:'json'};
import {dialogueKey,CONVERSATIONS,PATIENT_PAIN_LINES,CLINICAL_CONVERSATIONS} from './life-rules.js';
import {countryPatientLine} from './country-dialogue.js';
const localized=new Map();
for(const pair of CONVERSATIONS.patients)pair.forEach((text,i)=>localized.set(text,i?'wait-answer':'wait-question'));
localized.set(CONVERSATIONS.patients[2][0],'magazine-question');localized.set(CONVERSATIONS.patients[2][1],'magazine-answer');
for(const text of PATIENT_PAIN_LINES)localized.set(text,text.includes('head')?'dizzy':text.includes('sick')?'nausea':'pain');
for(const pairs of Object.values(CLINICAL_CONVERSATIONS))for(const pair of pairs)localized.set(pair[1],'pain');
localized.set('Oh, sorry. Excuse me.','apology');
export function countryVoice(text,person={}){
 const country=person.voiceCountry||person.castCountry,gender=person.gender==='female'?'female':'male';if(!country)return null;
 const patient=person.voiceRole==='patient'&&!person.recruit,localId=patient&&localized.get(text),line=localId&&countryPatientLine(country,localId);
 const key=`${country}/${gender}/${line?`patient-${line.id}`:dialogueKey(text,gender)}`,entry=manifest.entries[key];
 return entry?{key:`countries/${key}`,caption:line?.caption||text,spokenText:entry.text,language:entry.language}:null;
}
