// Assemble only validated, complete country banks. Generation itself is done
// through the approved Replicate browser workflow; this script spends nothing.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {STORY_ENGLISH_LINES} from '../src/game/story-voice-lines.js';
import {storyVoiceProfile,storyVoiceKey} from '../src/game/story-voice-policy.js';
import {dialogueKey} from '../src/game/life-rules.js';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'artifacts/voices-fr-ng');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const ledger=read(path.join(root,'spend.json'));
if(ledger.approvedUSD!==20||ledger.reservedUSD>20)throw Error('Approved voice budget exceeded');
const entries={};
for(const job of ledger.attempts){
  const report=path.join(root,`${job.id}.clips.json`);
  if(job.status==='succeeded'&&fs.existsSync(report))Object.assign(entries,read(report).entries);
}
const patientLines=read(path.join(repo,'src/game/story-patient-lines.json'));
const expected={};
for(const country of ['france','nigeria'])for(const role of ['staff','patient'])for(const gender of ['female','male'])for(let variant=0;variant<2;variant++){
  const profile=storyVoiceProfile({country,role,gender,ordinal:variant*2,availablePatientLanguages:[country==='france'?'fr':'ha']});
  for(const caption of role==='staff'?STORY_ENGLISH_LINES:Object.keys(patientLines)){
    const key=storyVoiceKey(profile,dialogueKey(caption,gender));
    expected[key]={...profile,caption,text:role==='staff'?caption:patientLines[caption][profile.language]};
  }
}
const missing=Object.keys(expected).filter(key=>!entries[key]);
if(missing.length)throw Error(`Voice bank incomplete: ${missing.length} missing recordings\n${missing.join('\n')}`);
if(Object.keys(entries).some(key=>!expected[key]))throw Error('Unexpected recording in staged bank');
let totalBytes=0;
for(const[key,entry]of Object.entries(entries)){
  for(const field of ['country','role','gender','language','variant','voice','caption','text'])if(entry[field]!==expected[key][field])throw Error(`Wrong ${field}: ${key}`);
  if(!Number.isFinite(entry.duration)||entry.duration<.15||entry.duration>35||entry.transcriptScore<.82||!entry.predictionId)throw Error(`Unverified recording: ${key}`);
  const data=fs.readFileSync(path.join(root,'validated',`${key}.mp3`));
  if(data.length!==entry.bytes||createHash('sha256').update(data).digest('hex')!==entry.sha256)throw Error(`Recording integrity failed: ${key}`);
  totalBytes+=data.length;
}
// Validate everything before writing to the production bank.
for(const key of Object.keys(entries)){
  const dest=path.join(repo,'public/audio/countries/story',`${key}.mp3`);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(path.join(root,'validated',`${key}.mp3`),dest);
}
const manifest={version:1,engine:'ElevenLabs v3 via Replicate',countries:['france','nigeria'],patientLanguages:{france:['fr'],nigeria:['ha']},pendingLanguages:['ig','yo'],entries};
fs.writeFileSync(path.join(repo,'src/game/story-voice-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({recordings:Object.keys(entries).length,bytes:totalBytes,reservedUSD:ledger.reservedUSD,pendingLanguages:manifest.pendingLanguages}));
