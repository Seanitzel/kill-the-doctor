export function exposureDuration(patient, filterLevel = 0) {
  const duration = Number(patient?.contamination) || 0;
  if (![30,60].includes(duration)) return 0;
  return duration * Math.pow(.75, Math.max(0,Math.min(3,filterLevel)));
}
export function activityVolume(distance, sameFloor = true, visible = true) {
  if (!sameFloor || distance >= 23) return 0;
  return Math.max(0, 1-distance/23) ** 2 * (visible ? 1 : .22);
}
export function recoveryStrength(remaining, total) {
  if (remaining <= 0) return 0;
  return Math.min(1, remaining / Math.min(10, total || 10));
}
export const CLINICAL_KINDS = ['clinic','cardio','emergency','icu','ward','pediatric','maternity'];
export const CONVERSATIONS = {
  nurses: [
    ['Did you finish the handover for the west wing?', 'Yes. The evening rounds are all written up.'],
    ['I can cover your station while you take a break.', 'Thank you. I could really use a coffee.'],
    ['There is another patient waiting for their results.', 'I will check with the laboratory after these rounds.'],
    ['It has been a busy night on this floor.', 'At least the next shift will be here soon.'],
  ],
  patients: [
    ['Have you been waiting here long?', 'A little while. They said someone would call me soon.'],
    ['My family is bringing me a change of clothes.', 'That is nice. I hope you can go home tomorrow.'],
    ['Would you mind passing me that magazine?', 'Of course. I have already read it twice.'],
  ],
  cafe: [
    ['This soup is better than yesterday.', 'Anything tastes good after a twelve hour shift.'],
    ['Is this seat taken?', 'No, please. I was just finishing my lunch.'],
    ['Do you want to share the last piece of bread?', 'Yes, thanks. I missed dinner again.'],
    ['I am going to get another coffee before rounds.', 'Take a minute first. You have barely touched your food.'],
  ],
};
export const ENTRY_REACTIONS = {
  maternity: ['Excuse me! This is a delivery room. Please give her some privacy.', 'Oh! Please wait outside. We are looking after a mother.'],
  clinical: ['Excuse me. We are examining a patient.', 'Oh! I did not hear you come in. Please wait by the door.'],
  office: ['Oh! Excuse me. Can I help you?', 'Excuse me. You startled me.'],
};
export function dialogueKey(text, gender='male') {
  let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;
  return `${gender==='female'?'f':'m'}-${hash.toString(16)}`;
}
