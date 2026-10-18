// Smooth campaign progression; retrying the same assignment never increases it.
export function campaignChallenge(round=1,difficulty='standard'){
  const level=Math.max(1,Math.floor(Number(round)||1)),pressure=Math.log2(level),hard=difficulty==='hard'?1:difficulty==='relaxed'?-.65:0;
  return {level,pressure,scheduleRequired:level>=2,verifyHandover:level>=4,
    witnessRange:11+Math.min(4,pressure*.75)+hard,
    reportSeconds:Math.max(4,8-pressure*.55-hard),
    patrolSpeed:1.35+Math.min(1.1,pressure*.16)+hard*.12,
    searchWindow:Math.max(16,42-pressure*4-hard*3),
    escapeScale:1/(1+pressure*.055),
    label:level===1?'Orientation':level<4?'Restricted schedules':level<7?'Cross-check required':'High surveillance'};
}
