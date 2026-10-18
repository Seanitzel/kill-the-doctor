export function evidenceEnding(profile={},coins=0){
  const artId=profile.gender==='female'?'evidence-ending-female-v25':'evidence-ending-male-v25';
  const reward=Math.max(0,Math.round(Number(coins)||0));
  return {
    id:`${artId}-${reward}`,title:'The proof reaches the police.',client:'The patient advocate',theme:'Evidence delivered / mission complete',
    artId:'missing-truth',artPanels:[0,1,2],ending:true,
    visuals:[0,1,2].map(panel=>({artId,panel})),
    panels:[
      ['A safe handover','You leave Northline with the evidence intact and travel to the police station. The patient advocate has arranged a secure handover. An investigator is waiting to receive the photographs and record where each one was taken.'],
      ['All three photographs','You submit the altered ledger, the consent file and the basement theatre photographs. The investigator accepts all three images and records them as evidence. The hospital’s conflicting accounts can now be examined alongside the proof you brought out.'],
      ['Receipt and reward',`The officer gives you a receipt confirming the handover. Your reward of ${reward} coins is now banked for equipment and character upgrades. You completed the assignment without taking a life; the photographs will speak for the patients whose records were concealed.`],
    ],
  };
}
