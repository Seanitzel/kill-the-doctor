import {evidenceLabel} from './campaign-locations.js';
export function assignmentJournal(mission){
 if(!mission||mission.type==='standard')return [];
 if(mission.china)return [
  `Use the hospital notices and schedules to locate ${mission.china.doctorName||'the consultant'}’s office before the 15:00 meeting. Collect a spoon from the cafeteria station.`,
  'Wait outside until the doctor has fully left for a break. Enter unseen and mix the fictional KTD compound into the personal coffee for 30 seconds. USE again or move away to stop; progress is saved.',
  'Stop mixing before a visiting patient or returning doctor can see you. Leave unseen and watch through the window until the doctor drinks and becomes unresponsive.',
  'Enter the office, close the doors, collect the nearby office key and lock both doors. Take the ID and basement access pass; the desk drawers are decoys.',
  'Change into the doctor’s uniform from the office cupboard. Your covert camera is already packed. Leave and secure the office again before going downstairs.',
  'In the basement, record four seconds from each of the three marked angles. Use the equipment cart to pass the requested instruments. Two incorrect or missed requests expose the disguise.',
  'Secure all three recordings before confronting the operating doctors, then escape through the ground-floor glass entrance.'
 ];
 const keys=[`Find the basement pass in ${evidenceLabel(mission.country)}. Follow the hospital notices and search monitored offices while the doctor is away.`,
  'Find the spare theatre key in Maintenance, or crouch behind the passing charge nurse and use TALK / USE unseen.'];
 return mission.photoOnly?[...keys,
  `Photograph the ledger in ${evidenceLabel(mission.country)}, the consent file in Research (2), and the operating theatre (B).`,
  'Approach each subject, centre it in the camera and take a photo. Avoid security and harm nobody.',
  'Bring all three photographs back through the main entrance.'
 ]:[...keys,
  'Enter the basement and confront the operating team. Protect the patient and doctors who surrender; stop anyone who attacks.',
  'Release the patient beside the bed, then stay close while escorting them to the lift and the main entrance.',
  'Bring any handcuffed doctor with you. Other hospital staff and patients remain protected.'
 ];
}
