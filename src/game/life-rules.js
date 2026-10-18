import {ADDITIONAL_DIALOGUE_LINES,PATIENT_PAGE_LINES} from './dialogue-v25.js';
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
  pharmacy: [
    ['Hi. I am here to collect my prescription.', 'Of course. Can I check your name and date of birth?'],
    ['Is this the queue for prescriptions?', 'Yes. The pharmacist will call you to the counter.'],
    ['Could you explain how I should take this?', 'Let us go through the label together before you leave.'],
  ],
};
export const ENTRY_REACTIONS = {
  maternity: ['Excuse me! This is a delivery room. Please give her some privacy.', 'Oh! Please wait outside. We are looking after a mother.'],
  clinical: ['Excuse me. We are examining a patient.', 'Oh! I did not hear you come in. Please wait by the door.'],
  office: ['Oh! Excuse me. Can I help you?', 'Excuse me. You startled me.'],
};
// The first line is the clinician; the second is the patient's response.
export const CLINICAL_CONVERSATIONS = {
  temperature: [
    ['I am going to check your temperature. Please hold still for a moment.', 'Okay. I have been feeling hot and cold all afternoon.'],
    ['Open your mouth a little, please. This will only take a second.', 'Like this? Please be gentle.'],
  ],
  bloodPressure: [
    ['Let your arm rest here. The cuff will feel a little tight.', 'All right. Tell me when I can move again.'],
    ['Just a few more seconds. Keep breathing normally.', 'Is it supposed to squeeze this much?'],
  ],
  heart: [
    ['Take a slow breath in for me. And breathe out.', 'It hurts a little when I breathe in.'],
    ['I am going to listen to your heart. Try to relax your shoulders.', 'Okay, doctor. My heart has been racing.'],
  ],
};
export const PATIENT_PAIN_LINES = [
  'Ow... please, that really hurts.',
  'Could I have something for the pain? Maybe Acamol?',
  'My head is spinning. Can someone help me sit down?',
  'Please, can you call the nurse? The pain is getting worse.',
  'I feel sick. I need a moment.',
];
export const SUSPICION_LINES = [
  'Did you hear that?',
  'That was weird.',
  'What was that noise? It came from down the hall.',
  'That sounded wrong. I am going to check.',
];
export const RECRUIT_DIALOGUE = {
  invite: 'My heart is racing. Something is wrong. I need somewhere quiet.',
  escort: 'Come with me. We can talk away from the corridor.',
  question: 'Why are they watching me? Tell me what is going on.',
  offer: 'The doctor I am after hurt people. The staff are covering for him. Wait for my signal, then help me stop them.',
  accept: 'They are all in on it? Okay. I will wait until you make your move.',
  dismiss: 'Stay here. Breathe slowly. I am going alone.',
};
export const RECRUIT_LINES = Object.values(RECRUIT_DIALOGUE);
// Spoken after a panic burst has stopped; the visitor's claims are fictional dialogue.
export const DISTRESS_LINES = [
  "I'm dying.",
  "I'm burning up, I can't breathe.",
  'The doctors are evil.',
  'Please... make it stop.',
  'Something is wrong with me.',
  'I need help. Please, help me.',
];
export const ANNOUNCEMENT_LINES = [
  ...PATIENT_PAGE_LINES,
  'Welcome to Nhalewick. Visitor services are located in the main atrium. Please keep all corridors clear.',
  'A power fault has been reported. Emergency lighting is active. Please remain calm.',
  'Code blue. Security incident reported. All staff follow emergency protocol. Police units are responding.',
  'Police response team entering the west wing. All exits will be secured shortly.',
  'Visitors: the staff directory is available in the entrance atrium. Please check department signage before proceeding.',
  'Attention medical staff. Please return to your assigned departments. Your next consultation is waiting.',
];
export const WITNESS_LINES = {
  weapon:'A weapon! I am calling security!',
  camera:'That camera is not allowed here. I am calling security.',
};
export const ALL_DIALOGUE_LINES = [...new Set([
  'Oh, sorry. Excuse me.', ...ADDITIONAL_DIALOGUE_LINES, ...Object.values(CONVERSATIONS).flat(2), ...Object.values(ENTRY_REACTIONS).flat(),
  ...Object.values(CLINICAL_CONVERSATIONS).flat(2), ...PATIENT_PAIN_LINES,
  ...SUSPICION_LINES, ...RECRUIT_LINES, ...DISTRESS_LINES, ...ANNOUNCEMENT_LINES, ...Object.values(WITNESS_LINES),
])];
export function dialogueKey(text, gender='male') {
  let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;
  return `${gender==='female'?'f':'m'}-${hash.toString(16)}`;
}
