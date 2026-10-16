import {STORIES,takeStory} from './stories.js';
export function prepareAssignment(save,random=Math.random,seed=Date.now()){
  let assignment=save.activeAssignment;
  const story=STORIES.find(s=>s.id===assignment?.storyId);
  if(assignment?.round===save.completed+1&&story)return {...assignment,story};
  const selected=takeStory(save,random);
  assignment={round:save.completed+1,storyId:selected.id,seed,attempt:save.attempts,introSeen:false};
  save.activeAssignment=assignment;return {...assignment,story:selected};
}
export function markIntroSeen(save){if(save.activeAssignment)save.activeAssignment.introSeen=true;}
