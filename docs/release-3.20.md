# KTD 3.20 — Transplant case, rescue confrontation and physical interactions

This revision implements the November 9 feedback. The cases and substances remain fictional. Existing in-game music is retained. All local browser and native verification is muted.

## Request coverage

| # | Result |
| --- | --- |
| 1 | Liu Wen’s actual consulting office, desk, drawers, uniform cupboard, key holder, switch and schedule move to the second-floor Transplant Ward. Clues use the real floor and department. |
| 2 | A four-scene China case follows Daniel’s unconsented kidney removal, an independent diagnosis, records supplied to his sister Amara, and evidence of another imminent transplant. Chinese clinicians and Black relatives match the narration. The named client’s contract comes last. |
| 3 | Story pictures decode before their narration/timing appears. The detailed Earth texture loads and uploads before the flight is revealed or its clock and sound begin. The same geographic fallback is retained only for unavailable graphics. |
| 4 | Movement tests the actual swinging door leaf and furniture bounds. A trapped body can move toward decreasing penetration. Muzzle-to-target obstruction prevents camera rays from shooting through cover. Open drawers and cupboard leaves retain dynamic physical bounds. |
| 5 | Access passes and the laboratory service key are concealed in monitored drawers. A custodian actually leaves, visits a destination, and returns. The drawer can be searched only during the custodian’s actual absence. Cabinet furniture remains after its key is collected. |
| 6 | Scratching uses fingertips and the palmar side of the hand with unchanged arm-link lengths. |
| 7 | Rescue uses an armed detective. The basement encounter begins with an arrest command and startle reactions. Seeded encounters contain one or two resisting doctors using guns, injections or gas. Gas has a three-second dodge window; any successful attack incapacitates the detective. Resistors use fast routes and crouches. An escaping doctor fails the mission only after boarding and closing the lift. Surrendered doctors are protected, cuffed and escorted with the patient. The confrontation and escort have no automatic alarm or escape timer. |
| 8 | Crouching lowers the hips and bends both legs through grounded IK. Shoes remain anchored rather than the root sinking below the floor. |
| 9 | HIDE uses a physical wall or the emptied uniform cupboard. Contiguous wall sections are merged when identifying a real corner. Hold PEEK / P to expose the upper body and aim; release to return. Movement leaves cover. Security tests the exposed posed head, and physical muzzle obstruction still applies. |
| 10 | A carried gun triggers a swept physical MRI pull, a character scream and an explicit Radiology/carried-gun failure reason. |
| 11 | The cafeteria has a corner coffee/cutlery station with machine, cups, sugar, salt and cutlery; the spoon is collected there. |
| 12 | The office owns its privacy sequence, preventing duplicate hospital-life warnings. Visitors deliver complete lines and wait long enough to finish them. |
| 13 | `OfficeSeal` gives exactly five game-clock seconds to get inside and close the entry, followed by an independent five seconds to retrieve/use its nearby key. No numerical seal countdown is displayed. Patient discovery starts on a failed deadline, never early. The secondary entrance uses a spring closer. |
| 14 | Schedules cycle through a bathroom break, document errand, colleague consultation and scheduled break, with real destinations and matching first/next wording. |
| 15 | Appointment visitors sit in solid waiting chairs, stand through a bounded seat transition, enter separately and return to their seats. |
| 16 | A blocked door asks the player to step clear. Movement permits retreat out of an overlap instead of trapping the player. Cupboard swing safety also checks nearby actors. |
| 17 | The consultant responds as soon as the player is visible inside the occupied office. The normal request/warning stages remain separate. |
| 18 | The player explicitly stops mixing with USE or movement. Returning doctors do not automatically cancel it; being seen actively mixing has consequences. |
| 19 | China requires all thirty seconds of preparation before the doctor drinks. Stopped progress is retained. |
| 20 | Non-China Disguise & Evidence and Hard Freeplay target coffee support hallway distractions and interrupted sips. Partial coffee causes dizziness and slower movement; 60% return to the office and collapse three seconds later, while 40% collapse in the hall and fail. Successful return uses the same close/key/lock contract. Hard target coffee remains optional; ordinary target combat is preserved. |
| 21 | Collapse immediately produces the requested urgent office-securing guidance. Guidance settings affect the instruction, never the deadlines. |
| 22 | All six colour categories use the same picker popover with Apply Colour on the left and Save Colour as Default on the right. Draft changes do not apply prematurely; saved category defaults persist separately. |
| 23 | Adrian and Alex retain their own edited names and appearances. Menu portraits refresh after the studio closes, using the saved shirt, hair, skin and eye appearance. Switching profiles and reloading preserve them. |
| 24 | Freeplay Easy / Medium / Hard unlock at reached Story levels 1 / 3 / 6. Mission difficulty is validated against actual progress, including saved selections. |
| 25 | After three successful Freeplay assignments or three completed Story countries, instructions turn off once per mode. A notice points to Settings. Re-enabling is respected thereafter. Existing progressed saves migrate to the milestone. Dialogue, warnings and essential indicators remain. |
| 26 | Evidence-only success gets one rear-view arrest slide, then proceeds directly to the next flight/story. Both doctors’ faces are concealed. |
| 27 | Rescue success gets one hospital reunion slide, with three family variants, a supported patient, photographers and police cars, followed by the next flight/story. |
| 28 | The cup owns the spoon’s circular path. Full-circle anatomical reach is validated, with a forward lean, unchanged arm lengths and a quiet liquid/ceramic cue synchronized to alternate stirring cycles. Unreachable positions cannot move the spoon out onto the desk. |

## Ownership and performance

- New encounter, seal, drawer, cover and mixing state uses the existing game clock and frame loop. No additional gameplay interval or animation loop is introduced.
- Drawer, chair, station, cuff, weapon and gas resources are retired with their owning assignment. Replacement cupboard collision bounds are restored on disposal.
- Procedural pose changes restore the mixer’s previous transforms before the next frame. Preallocated scratch/crouch scratch space avoids sustained per-vertex work during gameplay.
- Decoded story/Earth images use a four-entry LRU rather than retaining the entire story catalogue. Failed requests are evicted and can retry. Flight renderers, textures, observers and sound handles release on completion, skip, context loss and unmount.
- The new dialogue uses the existing locally designed fictional American voice identities. Existing recordings are retained; no paid generation was used for this revision.
- Native and web saves retain their existing identifiers. Production builds exclude the mutable QA bridge.

## Verification

All 457 unit and simulation tests passed. All 36 browser scenarios passed across the full run and the corrected contract-fixture rerun, including iPhone-sized WebKit. A final seven-scenario browser run reconfirmed delayed-media gating, all six colour categories, phone picker layout, real-rig stirring at 48 camera angles, injury and accessory disposal. Production Android APK and iOS Simulator builds succeeded at version 3.20.0; production asset verification excludes the QA bridge.

The checks exercise exact deadline boundaries, actual routed visitors/custodians, partial-coffee branches, seeded resistance, each rescue attack, lift escape, cuff gates, grounded rigs, hiding, MRI collision, persisted profiles, difficulty/guidance, delayed media, all picker categories and mobile layout. Physical-device performance and universal absence of leaks cannot be guaranteed by these finite tests.
