import {countryFor,campaignLevel} from './international.js';
import {STORIES,takeStory} from './stories.js';
import {assignmentType,SPECIAL_BRIEFS,ASSIGNMENT_TYPES} from './assignment-types.js';
function situatedStory(story,country){return {...story,panels:story.panels.map(panel=>panel.map(text=>typeof text==='string'?text.replaceAll('Nhalewick',country.hospital):text))};}
export function prepareAssignment(save,random=Math.random,seed=Date.now()){
  let assignment=save.activeAssignment;
  const story=STORIES.find(s=>s.id===assignment?.storyId)||SPECIAL_BRIEFS[assignment?.type];
  if(assignment?.round===save.completed+1&&(!assignment.countryId||assignment.countryId===countryFor(save).id)&&story&&Number.isSafeInteger(assignment.seed)&&Number.isSafeInteger(assignment.attempt)){assignment.type||='standard';return {...assignment,story:situatedStory(story,countryFor(save))};}
  const type=assignmentType(save),selected=SPECIAL_BRIEFS[type]||(save.playMode==='freestyle'?takeStory(save,random):STORIES[countryFor(save).index%STORIES.length]);
  if(!SPECIAL_BRIEFS[type]){save.storySeen=[...new Set([...(save.storySeen||[]),selected.id])].slice(-128);save.lastStory=selected.id;}
  assignment={type,countryId:countryFor(save).id,level:campaignLevel(save),round:save.completed+1,storyId:selected.id,seed,attempt:save.attempts,introSeen:false};
  save.activeAssignment=assignment;return {...assignment,story:situatedStory(selected,countryFor(save))};
}
export function markIntroSeen(save){if(save.activeAssignment)save.activeAssignment.introSeen=true;}

export function selectAssignmentType(save,type){if(!ASSIGNMENT_TYPES.includes(type))return false;save.activeAssignment={round:save.completed+1,type};return true;}
