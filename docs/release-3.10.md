# KTD 3.10 — hospital activity and interaction fixes

- Office visitors stop near the entrance, ask a voiced appointment question and leave. Selection rotates between eligible patients and restores their original activity afterward.
- Doctor occupancy, coffee availability, objective text, the door indicator and the away timer follow physical movement. Return estimates update with the doctor's route and remaining break, including the walk back.
- Character hands retain their own indexed skin geometry and bind spaces. Removed cross-avatar hand transplantation and the wrist clamp that twisted palms toward the T-pose.
- Contamination information has its own card above the infiltration checklist. It remains readable instead of overlapping it.
- Rain falls more slowly with a smaller fixed particle pool.
- A single reusable ambulance occasionally passes or stops, opens its rear doors, unloads a stretcher with two paramedics, carries a patient to Emergency, hands over care and departs. Routes are checked in all 20 hospital layouts. Events use the mission clock and retire with the mission.
- The phone's side arrow minimizes the player without interrupting the selected song. Movement controls return while music continues. Smoking ends when the player starts moving or puts the phone away; its visual effect has no persistent animation state.
- Quieter directory guidance and nearby conversations. Public announcements smoothly duck current and newly starting conversations and restore their level on completion. Sneezes are quieter and fall off more strongly with distance; announcements remain independent of distance.
- Four new American English patient-question recordings use the same Rachel and Drew voices as the existing dialogue. Transcripts and file integrity were checked silently.

## Validation

Regression coverage includes physical doctor occupancy, visitor rotation and return behavior, all-country ambulance routes, complete emergency handover/departure, phone collapse state, office-sign disposal, rain speed, and PA conversation ducking. Local previews and audio checks remain muted.
