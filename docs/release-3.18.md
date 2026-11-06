# KTD 3.18 — shared injuries and assignment corrections

## Feedback covered

This release covers the four November screenshots, universal injury mechanics, and every numbered item in the additional 35-point feedback list.

| Feedback | Result |
| --- | --- |
| Universal shooting; items 15–18 | One posed-body hit system for doctors, guards, police, hostile accomplices and the player. Head/neck/chest hits are fatal; arms retain speed and use a protective clutch; legs slow to 42%; hips/back slow to 58% with an impaired gait. Hits leave small red marks and use pain audio. The third nonfatal player wound is fatal. Incoming shots are actual rays, can miss moving players, and respect solid cover. No instructions reveal lethal aim locations. |
| 1–4 | Carried firearms trigger the Radiology magnet even while holstered. The pull animation has no advance warning or explanatory caption. Target and Disguise & Evidence are armed; Rescue and Evidence are unarmed. |
| 5 | New contamination events have a hospital-wide 50–90 second exposure cooldown, with longer individual cough intervals. Warning, gas, masks and recovery durations remain. |
| 6–8, 34–35 | Four Freeplay choices, with consistent assassin/detective story introductions. China Story is explicitly called Disguise & Evidence. Freeplay Evidence in China is an ordinary unarmed investigation. Rescue no longer requires shooting the operating doctors: collect both keys, release the patient and escort them out. Living doctors evacuate so they cannot block the escort. |
| 9–11 | More varied distressed-visitor speech, occasional “la la la,” no immediate line repeats, mouth opening throughout screams, and louder close-range positional cries that follow the moving actor. |
| 12–14 | France's rota custodian is brought out of the examination/idle pose before routing to the bathroom. Verified physically leaving and returning through the hospital. Target coffee breaks use the requested seat/return dialogue at the departure and return moments. |
| 19 | Passing vehicle engine/road audio reduced. |
| 20–22 | Rota occupancy/return HUD and announcements remain hidden before the current notice is read. Relevant information boards vary by assignment floor. Nigeria's documents move to an upstairs ward; other countries retain their varied departments. |
| 23 | Nigerian population hair selection strongly favors varied dark black/brown shades. |
| 24 | China basement shots alone neither identify the player to upstairs security nor trigger pursuit, restraint or spawned police. A later public witness can still report an exposed weapon. |
| 25 | Equipment choices display drawings and A–D letters, without instrument-name answers or selected-name hints. Existing recording/hand-over rules remain. |
| 26–29 | A visible weapon within the doctors' field of view, a hit or a missed shot makes the surviving operating team panic and flee. They use actual hospital navigation to the lift. A living doctor boarding starts door closure; failure occurs only after the doors close. Shooting both before departure prevents that failure. Reactions begin after bullet collision is resolved, so a first-shot target cannot jump out of the bullet's path. |
| 30 | Basement greeting waits for the theatre door to finish opening. |
| 31 | Smaller earrings fitted to each rig's actual ear surface; necklace anchored and fitted to the neck rather than the head/chest. Accessories follow animation and retain independent toggles. |
| 32 | Aurora angular frequencies are periodic across the sky wrap, removing the vertical discontinuity. |
| 33 | Equipment sits beside Character Studio with the same label styling and existing circular crosshair icon, without a subtitle or balance. |
| Additional screenshot | Save-color buttons have a non-shrinking, single-line label with wrapping swatch rows in compact layouts. |

## Resource ownership and mobile behavior

Combat marks are capped at three per avatar and explicitly detach/dispose on restart or teardown. Bone lookups use weak caches; injury processing adds no timers, listeners or animation loops. Existing bounded audio caches, source cancellation, scene disposal, recorder teardown, portrait cleanup and startup serialization remain covered by regression checks. The audio additions use existing fictional local Qwen-designed voices, with recorded hashes and explicit provenance; no additional paid service was used.

The shared damage rules are independent of the renderer. Rendering, hit regions, injury poses, input controls, operating-team escape and audio remain separate modules. Rescue omits weapon/aim/reload controls while retaining the mask and flashlight.

## Verification

- 419 passing unit tests, including real masculine/feminine rigs, movement, cover, marks/disposal, schedule navigation, roles across all twenty Freeplay destinations, basement visibility/escape, recordings and native build invariants.
- 24 passing browser acceptance cases in muted desktop Chromium and iPhone WebKit: menu sizes, startup, movement, collision/camera, crosshair firing, phone controls, mission outcomes, campaign progression, injury rays and accessory lifetimes. The final rotated-avatar accessory adjustment also passes a focused browser rerun.
- Production Pages build, synchronized native assets, Android debug APK and iOS Simulator build at version 3.18.0 / build 3018000.

This verifies the exercised paths and owned-resource cleanup. It does not claim an unlimited-duration leak guarantee or physical-iPhone performance test. Installing on Noga's physical iPhone still requires completing the existing device registration/signing step.
