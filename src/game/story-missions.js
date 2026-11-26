// Story configuration is authored and repeatable. Freeplay owns random setups.
const rows=[
 ['france','standard',1,0,0,0],['nigeria','standard',2,0,0,0],
 ['china','infiltration',2,4,900,0],['india','rescue',2,0,0,2],
 ['russia','infiltration',2,6,600,0],['venezuela','rescue',2,0,0,4],
 ['america','standard',3,0,0,0],['romania','infiltration',3,8,420,0],
 ['uganda','rescue',3,0,0,5],['england','standard',4,0,0,0],
];
export const STORY_MISSIONS=Object.freeze(Object.fromEntries(rows.map(([id,type,guards,instruments,coverSeconds,doctors],index)=>[id,Object.freeze({id,level:index+1,type,guards,instruments,coverSeconds,doctors,seed:731003+index*1009,hidden:id==='america'?3:id==='england'?5:0,psychosis:[2,4,7,10].includes(index+1),flicker:['nigeria','india','venezuela','uganda'].includes(id)})])));
export const storyMission=m=>m?.playMode==='story'?STORY_MISSIONS[m.country?.id]:null;
export const rescueDoctorCount=m=>storyMission(m)?.doctors||({relaxed:2,standard:3,hard:5}[m?.difficulty]||3);

// Completed country interiors keep their lighting rules when selected in Freeplay.
export const motionLighting=m=>STORY_MISSIONS[m?.country?.id]?.flicker??true;
