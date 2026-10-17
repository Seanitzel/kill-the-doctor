import {STORIES,takeStory} from './stories.js';
import {assignmentType,SPECIAL_BRIEFS,ASSIGNMENT_TYPES} from './assignment-types.js';
export function prepareAssignment(save,random=Math.random,seed=Date.now()){
  let assignment=save.activeAssignment;
  const story=STORIES.find(s=>s.id===assignment?.storyId)||SPECIAL_BRIEFS[assignment?.type];
  if(assignment?.round===save.completed+1&&story&&Number.isSafeInteger(assignment.seed)&&Number.isSafeInteger(assignment.attempt)){assignment.type||='standard';return {...assignment,story};}
  const type=assignmentType(save),selected=SPECIAL_BRIEFS[type]||takeStory(save,random);
  assignment={type,round:save.completed+1,storyId:selected.id,seed,attempt:save.attempts,introSeen:false};
  save.activeAssignment=assignment;return {...assignment,story:selected};
}
export function markIntroSeen(save){if(save.activeAssignment)save.activeAssignment.introSeen=true;}

export function selectAssignmentType(save,type){if(!ASSIGNMENT_TYPES.includes(type))return false;save.activeAssignment={round:save.completed+1,type};return true;}
