const rows=[['france','standard',1,0,0,0],['nigeria','standard',2,0,0,0],['china','infiltration',2,4,900,0],['india','rescue',2,0,0,2],['russia','infiltration',2,6,600,0],['venezuela','rescue',2,0,0,4],['america','standard',3,0,0,0],['romania','infiltration',3,8,420,0],['uganda','rescue',3,0,0,5],['england','standard',4,0,0,0]];
export const STORY_MISSIONS=Object.freeze(Object.fromEntries(rows.map(([id,type,guards,instruments,coverSeconds,doctors],i)=>[id,Object.freeze({id,level:i+1,type,guards,instruments,coverSeconds,doctors})])));
export const storyMission=m=>m?.playMode==='story'?STORY_MISSIONS[m.country?.id]:null;
export const rescueDoctorCount=m=>storyMission(m)?.doctors||2;
