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
 return result;
}
const saveStoryCase=story=>!story.id.startsWith('special-');
export function prepareAssignment(save,random=Math.random,seed=Date.now()){
  let assignment=save.activeAssignment;
  const story=STORIES.find(s=>s.id===assignment?.storyId)||SPECIAL_BRIEFS[assignment?.type];
  if(assignment?.round===save.completed+1&&(!assignment.countryId||assignment.countryId===countryFor(save).id)&&story&&Number.isSafeInteger(assignment.seed)&&Number.isSafeInteger(assignment.attempt)){assignment.type||='standard';return {...assignment,story:situatedStory(story,countryFor(save),assignment.type)};}
  const type=assignmentType(save),selected=assignment?.briefOnly&&SPECIAL_BRIEFS[type]?SPECIAL_BRIEFS[type]:save.playMode==='freestyle'?(SPECIAL_BRIEFS[type]||takeStory(save,random)):countryStory(countryFor(save));
  if(!SPECIAL_BRIEFS[type]){save.storySeen=[...new Set([...(save.storySeen||[]),selected.id])].slice(-128);save.lastStory=selected.id;}
  assignment={type,countryId:countryFor(save).id,level:campaignLevel(save),round:save.completed+1,storyId:selected.id,seed,attempt:save.attempts,introSeen:false};
  save.activeAssignment=assignment;return {...assignment,story:situatedStory(selected,countryFor(save),type)};
}
export function markIntroSeen(save){if(save.activeAssignment)save.activeAssignment.introSeen=true;}

export function selectAssignmentType(save,type){if(!ASSIGNMENT_TYPES.includes(type))return false;save.activeAssignment={round:save.completed+1,type,briefOnly:true};return true;}
