import {evidenceLabel} from './campaign-locations.js';
import {countryFor,campaignLevel} from './international.js';
import {STORIES,takeStory} from './stories.js';
import {assignmentType,SPECIAL_BRIEFS,ASSIGNMENT_TYPES} from './assignment-types.js';
const COUNTRY_CASES={france:'trial-without-consent',nigeria:'stolen-choice',china:'denied-care',japan:'daniel-unqualified-hands',israel:'uninvited-observers',india:'language-barrier',italy:'switched-cradles',germany:'ethan-experimental-drug',congo:'michael-organ-sold',canada:'olivia-wrong-diagnosis',england:'evelyn-unwarned-dilation',america:'elena-phantom-billing',spain:'mara-after-the-prescription',brazil:'sophia-wrong-floor',kenya:'isabella-trial-never-ended',morocco:'missing-truth',pakistan:'james-wrong-limb',ireland:'noah-phantom-surgery','south-africa':'amara-price-of-life',sudan:'marcus-invisible-infection'};
export function countryStory(country){return STORIES.find(s=>s.id===COUNTRY_CASES[country.id])||STORIES[country.index%STORIES.length];}
function situatedStory(story,country,type){
 const panels=story.panels.map(panel=>panel.map(text=>typeof text==='string'?text.replaceAll('Nhalewick',country.hospital):text));
 const result={...story,theme:`${country.name} / ${story.theme}`,panels};
 if(country.id==='france'&&story.id==='trial-without-consent'){result.visuals=[0,1,2,3].map(panel=>({artId:'jack-france-v29',panel}));result.panels[0][1]=result.panels[0][1].replace('an undocumented immigrant trying to survive in a foreign country','a Chinese immigrant trying to survive in France');}
 if(country.id==='nigeria'&&story.id==='stolen-choice')result.visuals=[0,1,2,3].map(panel=>({artId:panel<2?'pamela-nigeria-v36':'case-pamela-v25',panel}));
 if(country.id==='congo'&&story.id==='michael-organ-sold')result.visuals=[0,1,2,2].map(panel=>({artId:'michael-congo-v29',panel}));
 if(type&&type!=='standard'&&saveStoryCase(story)){const brief=SPECIAL_BRIEFS[type];result.panels[result.panels.length-1]=['Your assignment',brief.panels.slice(1).map(p=>p[1]).join(' ').replaceAll('Nhalewick',country.hospital)];}
 if(country.id==='china'&&type==='evidence'){if(story.id==='special-evidence')result.panels=[['The missing doctor','Two doctors are conducting an unauthorized operation in the basement. A third doctor, Liu Wen, is due to join them in fifteen minutes. Impersonating him is your way inside.'],['A borrowed identity','Find Liu Wen in ground-floor Records. Patient visits can expose you. Poison his drink unseen, lock his office and take his badge. Your covert camera is already packed. Search the cupboard drawers for basement keys, then change into the doctor’s outfit from his office cupboard.'],['Your assignment','']];result.title='Under a stolen name.';result.panels[result.panels.length-1]=['Your assignment · stolen identity','Dr. Liu Wen is expected in the basement fifteen minutes after you enter. Find him in ground-floor Records and wait for his bathroom break. Mix the fictional KTD compound into his coffee for 30 seconds, stopping and resuming to avoid witnesses. Wait for him to return and drink it. Your camera is already packed. Lock his office, take his badge, collect his basement pass, then change into the doctor’s outfit from his office cupboard. Record three clear angles of the operation while answering equipment requests. Two wrong selections expose your disguise. Only after recording, stop both operating doctors and escape.'];}
 if(type==='evidence'||type==='rescue')result.assignmentSteps=country.id==='china'&&type==='evidence'?[
 'Find Dr. Liu Wen in Records (G). Wait until he leaves for the bathroom.',
 'Mix the fictional compound into his coffee unseen for 30 seconds. Stop if a visitor arrives.',
 'Let him drink. Lock the office; take his badge and basement pass from his body.',
 'Change into the doctor’s outfit from his office cupboard. Enter the basement.',
 'Record three angles, answer equipment requests, stop both operating doctors and escape.'
 ]:[`Collect the basement pass in ${evidenceLabel(country)}.`, 'Find the theatre key in Maintenance, or quietly lift it from the charge nurse.',...(type==='evidence'?[`Photograph the altered ledger in ${evidenceLabel(country)}.`, 'Photograph the consent file in Research (2) and the basement operation (B).', 'Return to the main entrance with all three images. Do not harm anyone.']:['Stop both doctors in the basement operating theatre.', 'Release the patient and escort them to the ground-floor glass entrance.'])];
 return result;
}
const saveStoryCase=story=>!story.id.startsWith('special-');
export function prepareAssignment(save,random=Math.random,seed=Date.now()){
  let assignment=save.activeAssignment;if(save.playMode!=='freestyle'&&assignment&&assignment.type!==assignmentType(save)){save.activeAssignment=null;assignment=null;}
  const story=STORIES.find(s=>s.id===assignment?.storyId)||SPECIAL_BRIEFS[assignment?.type];
  if(assignment?.round===save.completed+1&&(!assignment.countryId||assignment.countryId===countryFor(save).id)&&story&&Number.isSafeInteger(assignment.seed)&&Number.isSafeInteger(assignment.attempt)){assignment.type||='standard';return {...assignment,story:situatedStory(story,countryFor(save),assignment.type)};}
  const type=assignmentType(save),selected=assignment?.briefOnly&&SPECIAL_BRIEFS[type]?SPECIAL_BRIEFS[type]:save.playMode==='freestyle'?(SPECIAL_BRIEFS[type]||takeStory(save,random)):countryStory(countryFor(save));
  if(!SPECIAL_BRIEFS[type]){save.storySeen=[...new Set([...(save.storySeen||[]),selected.id])].slice(-128);save.lastStory=selected.id;}
  assignment={type,countryId:countryFor(save).id,level:campaignLevel(save),round:save.completed+1,storyId:selected.id,seed,attempt:save.attempts,introSeen:false};
  save.activeAssignment=assignment;return {...assignment,story:situatedStory(selected,countryFor(save),type)};
}
export function markIntroSeen(save){if(save.activeAssignment)save.activeAssignment.introSeen=true;}

export function selectAssignmentType(save,type){if(save.playMode!=='freestyle'||!ASSIGNMENT_TYPES.includes(type))return false;save.activeAssignment={round:save.completed+1,type,briefOnly:true};return true;}
