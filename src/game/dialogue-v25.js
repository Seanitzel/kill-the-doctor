// Fixed captions keep bundled voice keys stable across actors and public-address playback.
export const PATIENT_PAGE_LINES = [
  'Michael Bennett, please come to Outpatient, room one oh five.',
  'Sarah Collins, please come to Cardiology, room two oh three.',
  'David Parker, please report to Neurology, room two oh four.',
  'Emily Carter, please come to Rehabilitation, room three oh five.',
];

export const ROOM_WARNING_LINES = {
  request: 'Excuse me. Please wait outside while we finish with this patient.',
  warning: 'You need to leave this room now, or I will call security.',
  security: 'Security, please come to this room. We need assistance.',
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
