import {COUNTRIES} from '../src/game/international.js';
import {COUNTRY_DIALOGUE} from '../src/game/country-dialogue.js';
import {ALL_DIALOGUE_LINES,ANNOUNCEMENT_LINES,DISTRESS_LINES,WITNESS_LINES,dialogueKey} from '../src/game/life-rules.js';
import {ROOM_WARNING_LINES} from '../src/game/dialogue-v25.js';
export const VOICE_MODES=Object.freeze(['english-shared','english-accents','multilingual']);
export const COUNTRY_ACCENTS=Object.freeze({france:'French',nigeria:'Nigerian',china:'Chinese',japan:'Japanese',israel:'Israeli',india:'Indian',italy:'Italian',germany:'German',congo:'Congolese',canada:'Canadian',england:'British',america:'American',spain:'Spanish',brazil:'Brazilian',kenya:'Kenyan',morocco:'Moroccan',pakistan:'Pakistani',ireland:'Irish','south-africa':'South African',sudan:'Sudanese'});
const worried=new Set([...DISTRESS_LINES,...Object.values(WITNESS_LINES)]);
function delivery(text){if(worried.has(text))return'[nervous] ';if(text===ROOM_WARNING_LINES.security)return'[stern] ';if(text===ROOM_WARNING_LINES.warning)return'[firm] ';if(ANNOUNCEMENT_LINES.includes(text))return'[calm] ';return'';}
// English modes never submit translated patient phrases. The shared set keeps
// one stable adult male and female voice across every destination and role.
export function voiceJobs(mode='english-shared'){
 if(!VOICE_MODES.includes(mode))throw Error('Unknown voice generation mode.');
 const jobs=[],destinations=mode==='english-shared'?[{id:'english',accent:'American'}]:COUNTRIES.map(c=>({...c,accent:COUNTRY_ACCENTS[c.id]}));
 for(const country of destinations)for(const gender of ['female','male']){
  const voice=gender==='female'?'Rachel':'Drew';
  for(const text of ALL_DIALOGUE_LINES){const prompt=`[${country.accent} accent] ${delivery(text)}${text}`;jobs.push({key:`${country.id}/${gender}/${dialogueKey(text,gender)}`,country:country.id,gender,voice,prompt,text,language:'en'});}
  if(mode==='multilingual')for(const line of COUNTRY_DIALOGUE[country.id].patients){const emotion=line.kind==='pain'?'pained':line.kind==='symptom'?'worried':'conversational',prompt=`[${emotion}] ${line.text}`;jobs.push({key:`${country.id}/${gender}/patient-${line.id}`,country:country.id,gender,voice,prompt,text:line.text,caption:line.caption,language:COUNTRY_DIALOGUE[country.id].modelLanguage||'en'});}
 }
 return jobs;
}
export const generationCost=job=>Array.from(job.prompt).length*.0001;
export function voicePlan(mode='english-shared'){const jobs=voiceJobs(mode);return{mode,jobs:jobs.length,characters:jobs.reduce((n,j)=>n+Array.from(j.prompt).length,0),estimatedUSD:+jobs.reduce((n,j)=>n+generationCost(j),0).toFixed(2),hardLimitUSD:mode==='english-shared'?3:40};}
