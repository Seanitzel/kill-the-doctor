# KTD 3.32.0 — direct elevator changes and reliable doctor warnings

## Changes

- Removes the full-screen blue floor-transition mask and its delay. A successful elevator selection keeps the existing lighter button feedback and changes directly to the destination scene. The graphics preparation introduced in 3.31 remains in place.
- A consultation's warning sequence is now updated only while a real clinician is present to deliver it. Losing that clinician cancels the encounter; a returning or replacement clinician gives a fresh first warning. Previously the timer could consume the second warning while no clinician was available, then later call security using that unseen stage.
- Warning occupancy uses the actual open doorway and the character's body radius. Crossing either office doorway cancels the encounter immediately, including when part of the character still overlaps its original floor cell. Standing against a closed door or beside the doorway does not cancel it. Hallway movement and subsequent re-entry do not retain an old security deadline.
- A clinician giving privacy warnings stays focused on the player, and routine dialogue cannot replace either warning. Both warnings are also shown as visible captions. Five full mission seconds follow the first warning, and five more follow the second, including when a frame arrives late.
- The same doorway boundary is used for the China target doctor and the rota custodian. Their mission-specific keys, coffee, post-collapse windows and other requirements remain independent.

No artwork, voice recordings, country access or other interior design is changed. All Story countries remain unlocked.

## Verification

The two warning regressions were reproduced before the fix. Unit checks cover an absent clinician consuming a warning, a replacement clinician, suppression of ambient interruptions, both doorway directions, closed doors and door jambs across every country and floor, both China warning stages, re-entry, and exact five-second deadlines. Browser checks exercise real floor selection and rendered destination frames, watch every frame for the removed blue mask, and walk out of a real consultation after the second warning using keyboard movement.

All 564 unit tests pass, including preservation of a clinician's patient-care activity after a warning. Nine iPhone WebKit browser groups and five desktop browser groups pass. These include the complete China mission, privacy glass, flashlight response, original floor-button feedback, story/journal instructions, door collisions, and map/lift use. The live warning test measures the two warnings five seconds apart, then walks out before the second deadline and remains safe beyond it. Elevator checks inspect destination frames on ground, first and second floors in both France and China; there is no blue mask on any frame.

Android and iOS Simulator builds pass. Their bundled production assets match all 1,736 voice files, all 38 interior JPEGs and the production HTML/JS/CSS: 1,777 checked files per package. Logs, screenshots, timing samples, package checks and live hashes are retained with the revision's automated artifacts. These are automated browser checks and an iOS Simulator build; no physical phone is installed or tested as part of this release.
