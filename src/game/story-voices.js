import manifest from './story-voice-manifest.json' with {type:'json'};
import {storyVoiceProfile,storyVoiceKey} from './story-voice-policy.js';
import {dialogueKey} from './life-rules.js';
export function resolveStoryVoice(bank,text,person={}){
 const country=person.voiceCountry||person.castCountry;
 if(person.voicePlayMode!=='story'||!bank.countries?.includes(country))return null;
 // The same explicit gender selects both the character model and its recordings.
 if(!['male','female'].includes(person.gender))return {pending:true,strict:true,caption:text};
 const profile=storyVoiceProfile({country,role:person.voiceRole,gender:person.gender,ordinal:person.voiceOrdinal||0,availablePatientLanguages:bank.patientLanguages?.[country]});
 if(!profile)return null;
 const key=storyVoiceKey(profile,dialogueKey(text,profile.gender)),entry=bank.entries[key];
 const pending={pending:true,strict:true,caption:text,language:profile.language};
 if(!entry||entry.country!==country||entry.gender!==profile.gender||entry.role!==profile.role||entry.voice!==profile.voice||entry.caption!==text||entry.language!==profile.language||profile.role==='staff'&&entry.text!==text)return pending;
 return {key:`countries/story/${key}`,strict:true,caption:text,spokenText:entry.text,language:entry.language,duration:entry.duration};
}
export function storyVoice(text,person){return resolveStoryVoice(manifest,text,person);}
