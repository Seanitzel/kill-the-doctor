import {evidenceLabel} from './campaign-locations.js';
import {countryFor,campaignLevel} from './international.js';
import {STORIES,takeStory} from './stories.js';
import {assignmentType,SPECIAL_BRIEFS,ASSIGNMENT_TYPES} from './assignment-types.js';
export const CHINA_STORY={id:'china-illicit-transplant-v320',client:'Layla',title:'A kidney he never gave.',theme:'Daniel and Layla',visuals:[0,1,2,3].map(panel=>({artId:'china-transplant-v320',panel})),panels:[['A routine admission','Daniel, a Black engineer working in Shanghai, trusted Dr. Liu Wen with an abdominal operation. The consent form described the planned treatment. It said nothing about removing a healthy kidney.'],['The missing organ','Persistent pain brought Daniel to an independent hospital. A scan showed that one kidney had been removed. A second surgeon found no documented medical reason for its removal, and the original hospital refused to release the operative report.'],['Another patient is scheduled','Daniel’s sister Layla received copied theatre records from a frightened ward assistant. They linked the missing organ to an unconsented transplant and listed another pair of patients for the same basement team. A formal complaint was stalled while the next operation drew closer.'],['Stop the next operation','Layla has hired you, an assassin, to record the illegal transplant operation and stop the doctors responsible before another patient is used without consent. Find Liu Wen’s office through the hospital notices and use his identity to enter the basement.']]};
const COUNTRY_CASES={france:'trial-without-consent',nigeria:'stolen-choice',china:'denied-care',japan:'daniel-unqualified-hands',israel:'uninvited-observers',india:'language-barrier',italy:'switched-cradles',germany:'ethan-experimental-drug',congo:'michael-organ-sold',canada:'olivia-wrong-diagnosis',england:'evelyn-unwarned-dilation',america:'elena-phantom-billing',spain:'mara-after-the-prescription',brazil:'sophia-wrong-floor',kenya:'isabella-trial-never-ended',morocco:'missing-truth',pakistan:'james-wrong-limb',ireland:'noah-phantom-surgery','south-africa':'amara-price-of-life',sudan:'marcus-invisible-infection',russia:'ethan-experimental-drug',venezuela:'sophia-wrong-floor',egypt:'missing-truth',somalia:'amara-price-of-life'};
export function countryStory(country){if(country.id==='china')return CHINA_STORY;return STORIES.find(s=>s.id===COUNTRY_CASES[country.id])||STORIES[country.index%STORIES.length];}
function situatedStory(story,country,type,freeplay=false){
 const panels=story.panels.map(panel=>panel.map(text=>typeof text==='string'?text.replaceAll('Nhalewick',country.hospital):text));
 const client=story.client||story.title.split(' — ')[0];const result={...story,theme:`${country.name} / ${story.theme}`,panels};
 if(country.id==='france'&&story.id==='trial-without-consent'){result.visuals=[0,1,2,3].map(panel=>({artId:'jack-france-v29',panel}));result.panels[0][1]=result.panels[0][1].replace('an undocumented immigrant trying to survive in a foreign country','a Chinese immigrant trying to survive in France');}
 if(country.id==='nigeria'&&story.id==='stolen-choice')result.visuals=[0,1,2,3].map(panel=>({artId:'pamela-nigeria-v36',panel}));
 if(country.id==='congo'&&story.id==='michael-organ-sold')result.visuals=[0,1,2,2].map(panel=>({artId:'michael-congo-v29',panel}));
 const infiltration=type==='infiltration'||country.id==='china'&&type==='evidence'&&!freeplay;
 if(infiltration&&country.id!=='china'){result.title='Under a stolen name.';result.panels[result.panels.length-1]=['A contract under a stolen name',`${client} has hired you, an assassin, to expose the operation and stop the doctors responsible. ${country.doctor}’s identity offers a way into the restricted basement. Start with hospital notices and schedules to find their office. They are due to join the operation in fifteen minutes.`];}
 else if(type==='evidence'||type==='rescue'){
  // The original case names the client before their detective contract.
  result.panels[result.panels.length-1]=type==='rescue'?['Someone is still inside',`${client} receives a message from a ward assistant: another patient has been moved downstairs despite refusing treatment. The hospital will not let the family see them. ${client} has hired you, a detective, to follow the access trail, confront the operating team, arrest those who surrender, stop any doctor who attacks, and bring the patient out safely.`]:['A record they cannot erase',`${client} kept copies of the original records, but the hospital disputes their account. A complaint without corroboration has gone nowhere. ${client} has hired you, a detective, to photograph the altered ledger, consent file and basement procedure, then return with evidence that can be verified. No casualties.`];
 }
 if(['evidence','rescue','infiltration'].includes(type))result.assignmentSteps=infiltration?[
 'Use hospital notices to locate the consultant’s office. Collect a spoon at the cafeteria coffee station.',
 'Prepare the coffee unseen. After he collapses, enter and close the door, then collect the nearby key and lock it.',
 'Take the ID, pass and uniform. Record three basement angles, stop the operating doctors, and escape.'
 ]:type==='rescue'?['Trace the access keys through hospital notices and search the monitored offices during an absence.','Confront the operating doctors. Stop those who resist; protect those who surrender.','Release the patient and escort them, with any cuffed doctor, to the main entrance.']:['Investigate hospital notices and staff schedules to trace the access passes.','Photograph the altered ledger, consent file and basement operation.','Return to the entrance with all three images. Do not harm anyone.'];
 const role=type==='standard'||type==='infiltration'||country.id==='china'&&type==='evidence'&&!freeplay?'assassin':'detective';
 result.operativeRole=role;result.panels[result.panels.length-1][1]=result.panels.at(-1)[1].replace(/\b(?:He|She) has hired you/g,`${client} has hired you`);result.panels=result.panels.map(([title,text])=>[title,text.replace(/an assassin|a detective/g,role==='assassin'?'an assassin':'a detective')]);
 if(!result.panels.some(([,text])=>new RegExp('hired you(?: as)?(?:,)? (?:an? )?'+role).test(text)))result.panels[result.panels.length-1][1]+=` ${client} has hired you, ${role==='assassin'?'an assassin, to confront the doctor responsible':'a detective, to bring back verifiable proof and protect the patient'}.`;
 return result;
}
const saveStoryCase=story=>!story.id.startsWith('special-');
export function prepareAssignment(save,random=Math.random,seed=Date.now()){
  let assignment=save.activeAssignment;if(save.playMode!=='freestyle'&&assignment&&(assignment.type!==assignmentType(save)||assignment.storyId!==countryStory(countryFor(save)).id)){save.activeAssignment=null;assignment=null;}
  const story=(assignment?.storyId===CHINA_STORY.id?CHINA_STORY:STORIES.find(s=>s.id===assignment?.storyId))||SPECIAL_BRIEFS[assignment?.type];
  if(assignment?.round===save.completed+1&&(!assignment.countryId||assignment.countryId===countryFor(save).id)&&story&&Number.isSafeInteger(assignment.seed)&&Number.isSafeInteger(assignment.attempt)){assignment.type||='standard';return {...assignment,story:situatedStory(story,countryFor(save),assignment.type,save.playMode==='freestyle')};}
  const type=assignmentType(save),selected=assignment?.briefOnly&&SPECIAL_BRIEFS[type]?SPECIAL_BRIEFS[type]:save.playMode==='freestyle'?(SPECIAL_BRIEFS[type]||takeStory(save,random)):countryStory(countryFor(save));
  if(!SPECIAL_BRIEFS[type]){save.storySeen=[...new Set([...(save.storySeen||[]),selected.id])].slice(-128);save.lastStory=selected.id;}
  assignment={type,countryId:countryFor(save).id,level:campaignLevel(save),round:save.completed+1,storyId:selected.id,seed,attempt:save.attempts,introSeen:false};
  save.activeAssignment=assignment;return {...assignment,story:situatedStory(selected,countryFor(save),type,save.playMode==='freestyle')};
}
export function markIntroSeen(save){if(save.activeAssignment)save.activeAssignment.introSeen=true;}

export function selectAssignmentType(save,type){if(save.playMode!=='freestyle'||!ASSIGNMENT_TYPES.includes(type))return false;save.activeAssignment={round:save.completed+1,type,briefOnly:true};return true;}
