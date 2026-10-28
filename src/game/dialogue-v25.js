export const OFFICE_VISITOR_LINES=['Is the doctor around?','What number are you? I thought I was next.'];
// Fixed captions keep bundled voice keys stable across actors and public-address playback.
export const PATIENT_PAGE_LINES = [
  'Michael Bennett, please come to Outpatient, room one oh five.',
  'Sarah Collins, please come to Cardiology, room two oh three.',
  'David Parker, please report to Neurology, room two oh four.',
  'Emily Carter, please come to Rehabilitation, room three oh five.',
];

export const ROOM_WARNING_LINES = {
  request: 'Excuse me. Please wait outside while we finish with this patient.',
  warning: 'I have already asked you to leave. Your presence is becoming suspicious. Please wait outside.',
  security: 'You ignored both warnings. I am calling security now.',
};

export const JAMIE_SELF_TALK_LINES = [
  'Okay. Breathe. Just keep moving.',
  'Why is everyone staring at me?',
  'I thought I heard something. Maybe it was nothing.',
];

// A synthetic conversational chuckle phrase, not a recording of a real person laughing.
export const JAMIE_LAUGH_LINE = 'Ha... okay. That was funny. For a second, I forgot where I was.';

export const ADDITIONAL_DIALOGUE_LINES = [...new Set([
  ...PATIENT_PAGE_LINES, ...Object.values(ROOM_WARNING_LINES),
  ...JAMIE_SELF_TALK_LINES, JAMIE_LAUGH_LINE,
])];
