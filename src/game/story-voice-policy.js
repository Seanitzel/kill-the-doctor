// Casting policy for the first two Story destinations. Audio banks opt in only
// after their recordings pass validation; this module alone changes no playback.
const PATIENT_LANGUAGES=Object.freeze({france:Object.freeze(['fr']),nigeria:Object.freeze(['ha','ig','yo'])});
export const STORY_VOICE_CAST=Object.freeze({staff:Object.freeze({female:Object.freeze(['Rachel','Domi']),male:Object.freeze(['Drew','Roger'])}),patient:Object.freeze({female:Object.freeze(['Sarah','Jane']),male:Object.freeze(['Clyde','Paul'])})});
export function storyVoiceProfile({country,role,gender,ordinal=0,playMode='story',availablePatientLanguages}){
 if(playMode!=='story'||!PATIENT_LANGUAGES[country])return null;
 if(!['male','female'].includes(gender))throw new TypeError('A Story voice requires the model’s explicit gender.');
 const index=Number.isFinite(ordinal)?Math.max(0,Math.trunc(ordinal)):0,patient=role==='patient',requested=PATIENT_LANGUAGES[country],available=availablePatientLanguages?.filter(l=>requested.includes(l)),languages=available?.length?available:requested;
 const castRole=patient?'patient':'staff',variant=Math.floor(index/2)%2;
 return {country,role:castRole,voice:STORY_VOICE_CAST[castRole][gender][variant],gender,language:patient?languages[index%languages.length]:'en',accent:country==='france'?'French':'Nigerian',variant};
}
export function storyVoiceKey(profile,lineKey){
 return `${profile.country}/${profile.role}/${profile.language}/${profile.gender}/${profile.variant}/${lineKey}`;
}

export function storyVoiceMode(mission){return mission?.playMode==='story'&&(mission.terror||mission.mode==='terror')?'other':mission?.playMode;}
