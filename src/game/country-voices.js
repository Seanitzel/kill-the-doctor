import manifest from './country-voice-manifest.json' with {type:'json'};
import {dialogueKey,CONVERSATIONS,PATIENT_PAIN_LINES,CLINICAL_CONVERSATIONS} from './life-rules.js';
import {countryPatientLine} from './country-dialogue.js';
const localized=new Map();
for(const pair of CONVERSATIONS.patients)pair.forEach((text,i)=>localized.set(text,i?'wait-answer':'wait-question'));
localized.set(CONVERSATIONS.patients[2][0],'magazine-question');localized.set(CONVERSATIONS.patients[2][1],'magazine-answer');
for(const text of PATIENT_PAIN_LINES)localized.set(text,text.includes('head')?'dizzy':text.includes('sick')?'nausea':'pain');
for(const pairs of Object.values(CLINICAL_CONVERSATIONS))for(const pair of pairs)localized.set(pair[1],'pain');
localized.set('Oh, sorry. Excuse me.','apology');
export function resolveCountryVoice(bank,text,person={}){
 const country=person.voiceCountry||person.castCountry,gender=person.gender==='female'?'female':'male',baseKey=dialogueKey(text,gender),englishOnly=bank.mode?.startsWith('english-');
 const patient=person.voiceRole==='patient'&&!person.recruit,localId=!englishOnly&&patient&&localized.get(text),line=localId&&countryPatientLine(country,localId);
 const keys=[];if(country&&line)keys.push({key:`${country}/${gender}/patient-${line.id}`,caption:line.caption});
 if(country)keys.push({key:`${country}/${gender}/${baseKey}`,caption:text});keys.push({key:`english/${gender}/${baseKey}`,caption:text});
 for(const candidate of keys){const entry=bank.entries[candidate.key];if(!entry||englishOnly&&entry.language!=='en')continue;return{key:`countries/${candidate.key}`,caption:candidate.caption,spokenText:entry.text,language:entry.language};}return null;
}
export function countryVoice(text,person={}){return resolveCountryVoice(manifest,text,person);}
