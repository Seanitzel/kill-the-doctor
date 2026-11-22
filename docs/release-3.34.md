# KTD 3.34.0 — Physical visitor door approach and protected closure

## Changes

Visiting patients now finish standing and physically approach the office doorway before opening a closed door. The previous route look-ahead could trigger opening from 2.6 metres away, just after the patient left the waiting seat. Office patients now continue walking until they reach 1.35 metres, and cannot trigger opening while seated or transitioning out of a seat. The route-edge opening fallback uses the same permission check. Ordinary staggered visits, comments, return to the existing seats and the opportunity to stop mixing between door opening and actual entry are preserved.

After the doctor becomes unconscious, closed doors remain protected from patient reopening on either side throughout both existing deadlines. Previously a patient already inside could reopen a closed door while leaving. Patients can still leave through an already-open door, but cannot reverse the player's closure during either protected window.

The first window remains exactly five seconds to enter and close the doors. Successful physical closure starts a fresh, separate five seconds to retrieve the nearby key and lock up. Crossing the original first deadline cannot authorize a visit during the second window. A missed active deadline schedules a patient to stand, approach, open and enter; it no longer changes the door's lock or manual-close flags remotely from the waiting seat. Those flags are released only by the authorized discovery patient at the door. Failure still requires actual entry and discovery, rather than a timer or door-opening event alone. Successful locking prevents this discovery visit.

The changes are scoped to the operation's office patients. Other missions keep their own door and key behavior. All countries remain unlocked; the spoon checklist, smoked privacy glazing, elevator response, warning sequence, artwork and voices remain in place. No additional voice generation or spending is involved.

## Verification

All 577 unit tests pass. New regression checks follow both visitors from their seats to the actual doorway, exercise both sides of both doors during both protected windows, check late closure followed by successful locking, and repeat missed-close and missed-lock discovery with each visitor. Earlier tests were updated to distinguish permission to approach after expiry from permission to operate a door while still standing up.

The iPhone WebKit browser replay completes the full China assignment: spoon and remote, both mixing visitors, collapse, door closure, key and lock, disguise, recordings and escape. Additional browser checks cover the actual approach distances and closed-door state, a closure near the first deadline with a full additional lock window, and physical discovery by both male and female visitors. Browser emulation does not constitute installation or testing on a physical iPhone.

Eight iPhone WebKit browser groups pass, including the complete successful China mission. Android and iOS Simulator builds pass. Both packages match all 1,736 voice files, 38 interior JPEGs and the production HTML/JS/CSS: 1,777 checked files per package. Logs and timing reports are retained under the revision artifacts.

All 13 desktop browser groups also pass, including physical visitor approach, both late-closure discovery sequences, direct elevator rendering in France and China, actual departure during doctor warnings, movement/collision, map/journal, door collision, blackout/flashlight recovery, equipment persistence, graphics reset recovery, combat and mission completion.
