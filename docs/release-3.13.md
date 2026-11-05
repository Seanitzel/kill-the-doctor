# KTD 3.13 — security, France and hospital reactions

## Security

- Navy long sleeves and trousers, shirt collar/buttons, matching cap, black shoes, duty belt, secured pistol holster and baton. Badge interaction includes an inspection gesture. Sleeve volumes clear the actual rig’s arm radius, avoiding skin clipping through the long sleeves.
- Replaced the bench with one narrow black padded folding counter chair, with crossed tubular legs and foot rail, matching the supplied reference. It sits against the entrance’s right-hand wall behind the road-facing guard.
- Guard alternates standing, sitting, a brief patrol and returning to the chair. Fixed a navigation rounding error that could otherwise keep him just short of his post indefinitely.
- Armed guards pursue across floors, reposition when an obstacle blocks their shot and turn to face the player. Close contact starts a short restraint animation and capture. Solid cover still blocks fire.
- Security receives red target markers after the target is eliminated; innocent staff and patients remain unmarked and protected.

## France and occupied rooms

The reported detour was possible in the standard target assignment, including international Story mode: the optional lab key could appear before any lab diversion item was available, while the required rota was in Pharmacy.

- France now follows information board → confidential rota in Records → the assigned doctor’s department and badge → target → escape. The doctor’s actual department can vary between attempts.
- Laboratory/research service keys and the Dream Vial begin at level five, where they have a purpose. No empty early lab-key detour.
- Records custodian physically leaves for the bathroom, waits, and returns. Actual occupancy drives “Doctor leaving”, “Room clear”, and “Doctor returning”. Unseen collection takes two seconds; witnesses still catch active theft.
- Occupied office and lab entry checks staff actually present, even when their original home assignment is elsewhere. Records uses its own warnings to avoid duplicate privacy dialogue.

## Target and escape sequence

- A doctor recognizes a drawn weapon based on forward vision, distance and an unobstructed view. A short 280ms recognition interval allows a fast shot before a spoken reaction. An unseen draw behind them does not itself alert them; a nearby shot does.
- Once alerted, the doctor gasps/screams, flees and has a 15-second escape deadline. Routine appointment and uncertain-noise chatter no longer override that response.
- Ordinary patients and staff evacuate immediately after an overt target elimination. Security responds immediately. The hospital alarm starts **60 seconds later**, independently of the guard encounter.
- Involved staff remain in their existing departments until security is eliminated, then move out individually at staggered intervals, with red markers. They are not spawned directly in front of the player.
- Varied evacuation speeds, brief individual hesitation, lanes and crowd avoidance. Departed NPCs have their models, movement and report state cleared and no longer participate in collision checks.
- Covert coffee deaths keep the existing body-discovery trigger before a public evacuation; rescue/evidence-specific rules are retained.

## Player and atmosphere

- Clinical equipment stops tracking a patient when evacuation ends the consultation, including when its clinician is held for the later accomplice phase. This fixes a live-render crash that a movement-only simulation did not exercise.
- F switches the actual light immediately, including after a brightness slider held keyboard focus.
- A spit projectile that actually hits causes a visible red neck patch and scratching that prevents movement for 30 seconds. Dodging avoids it. The effect expires on mission time and resets for each assignment.
- Long straight/curly hair now opens wider around the face; side locks sit behind the cheeks instead of forming slabs across the face. Tested on both actual character rigs with gestures.
- Smoke-break aurora uses slowly evolving curtains and blended, faded colors. One reusable shooting-star streak appears at varied intervals; both effects stop when the break ends.

## Audio

Replaced the synthetic rain and ambulance siren with CC0 field recordings. Cars use recorded engine and road layers, with 3D positioning, distance attenuation and motion-based pitch change. Rain channels and thunder stop completely indoors.

Sources and adaptations: [field-recording credits](../public/audio/field-recordings-v313.txt). No audio was extracted from YouTube. Four mono compressed clips add approximately 420 KB, with bounded reusable channels and cleanup on mission retirement.

**Listening limitation:** local gameplay stayed muted at the user’s request. Playback routing, positions, distance behavior, finite signals and source licensing were checked; an audible in-context listening review was not performed.

## Validation

- 365 automated tests passed; production build passed.
- Added regressions for the complete France Records collection route; visible/unseen/fast target encounters; security → staggered accomplices; exact alarm delay; guard restraint and actual patrol return; spit hit/dodge; immediate F input; hair clearance on both rigs; shooting-star lifecycle; vehicle channels and asset provenance.
- Muted browser checks: loading/retry, movement and F, Records occupancy and rota collection through the actual interaction button, target escape failure, guard/chair and hair presentation, post-target phase UI and atmosphere.
- No additional timers or animation loops for the new gameplay systems. Props, collider, material, audio-channel and mission references are retired with the existing mission lifecycle.
