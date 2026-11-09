import {campaignProgress,countryFor} from './international.js';
export const FREEPLAY_DIFFICULTIES=[{id:'relaxed',label:'Easy',level:1},{id:'standard',label:'Medium',level:3},{id:'hard',label:'Hard',level:6}];
export function reachedStoryLevel(save){return countryFor({...save,playMode:'story',storyReplayId:null}).index+1;}
export function difficultyAvailable(save,id){return !!FREEPLAY_DIFFICULTIES.find(d=>d.id===id&&reachedStoryLevel(save)>=d.level);}
export function effectiveDifficulty(save){const chosen=save.settings?.difficulty||'standard';return save.playMode==='freestyle'&&!difficultyAvailable(save,chosen)?'relaxed':chosen;}
export function recordGuidanceProgress(save,mission,success){
 if(success&&mission.playMode==='freestyle')save.freeplayCompleted=(save.freeplayCompleted||0)+1;
 const mode=mission.playMode==='freestyle'?'freeplay':'story',count=mode==='freeplay'?save.freeplayCompleted||0:campaignProgress(save);save.guidanceMilestones||={};
 if(count<3||save.guidanceMilestones[mode])return false;save.guidanceMilestones[mode]=true;save.settings.helpfulGuidance=false;save.guidanceNoticePending=true;return true;
}
