# KTD 3.36.0 — Authored missions, reference outfits and combat corrections

## Character Studio and equipment

The male premium collection now contains the reference shearling aviator, midnight turtleneck and chain, leather biker, black suit and tie, and camel overcoat. The female collection contains the navy pantsuit, black skirt suit, white jumpsuit and gloss black latex outfit. The collections switch with character gender. Accessories and footwear follow the supplied references without including their weapons. The latex outfit uses the existing regular female boots. All eight regular male/female outfit geometry and material signatures match the pre-change snapshots.

Shoe Colour follows Trouser Colour and persists independently, including custom looks. Premium clothes follow the animated rig. Tattoos share their source morph influences; high-collar hair is tucked clear of the collar. The fitted valved respirator, held flashlight and upgraded shoe soles follow the appropriate bones. Equipment has representative illustrations, exact level/balance debits, functional effects, and consistent mask controls. Legacy N95 ownership counts as the existing purchase instead of a second upgrade.

## Fixed International Story progression

| Level | Country | Assignment | Required progression |
| --- | --- | --- | --- |
| 1 | France | Target Mission | 1 security guard |
| 2 | Nigeria | Target Mission | 2 security guards |
| 3 | China | Disguise & Evidence | 4 instrument choices; 15-minute cover |
| 4 | India | Rescue Operation | 2 resisting doctors |
| 5 | Russia | Disguise & Evidence | 6 instrument choices; 10-minute cover |
| 6 | Venezuela | Rescue Operation | 4 resisting doctors |
| 7 | America | Target Mission | 3 security guards; 3 required hiders |
| 8 | Romania | Disguise & Evidence | 8 instrument choices; 7-minute cover |
| 9 | Uganda | Rescue Operation | 5 resisting doctors |
| 10 | England | Target Mission | 4 security guards; 5 required hiders |

Romania and Uganda replace Egypt and Somalia throughout active destination labels, flights and save migration. Existing interior artwork files remain intact. Country-specific Story seeds fix targets, names, rooms and appearances across retries. Random configurations remain in Freeplay. The distressed visitor arrives at 30 seconds in Story levels 2, 4, 7 and 10. All Story destinations remain available for owner-requested exploration; completion records alone unlock country interiors in Freeplay. The original normal Freeplay hospital is always available.

## Interactions and combat

Coffee mixing uses a recorded metal spoon and liquid loop, stops exactly at 30/30 and plays the existing spoon collection cue once. The Chinese coffee station is shared across the other hospitals and default Freeplay. The recording is a CC0 excerpt of [Coffee Pour and Stir by RealSquink](https://freesound.org/people/RealSquink/sounds/788304/); provenance is bundled beside the audio. The China mission retains its reachable desk approach, patient approach to the physical door, privacy remote, and separate five-second close and lock windows.

Head and torso shots are lethal. Hips, legs and feet cause limping; arm wounds preserve movement speed. Both designated infiltration basement doctors and resisting rescue doctors use the correct target rules. The aim range reaches above the old chest-height ceiling. Rifles penetrate office glass; metal frames and solid walls still block fire.

A witnessed public draw fails unless the player is deliberately aiming at the Target Doctor. Deliberate confrontation can alert the doctor and make them flee without an automatic witness failure. Crowd flight alone does not end the mission. The player stands against wall cover, faces the corner, peeks and can shoot without moving their feet. Cupboard and door hiding remain available. Doctors yield obstructed office exits. Failure has a dedicated sound cue, and syringe incapacitation visibly collapses the character before the result screen.

## Rescue operations and hidden accomplices

Rescue basements have connected rooms, cross-corridors, alternate routes and cover. The theatre key must be stolen from the fast roaming maintenance clinician during an unwitnessed moment; the Maintenance cupboard alternative is removed for Rescue Operations. The clinician visits files, the cafeteria, bathroom and utility room.

Resisting doctors take cover, duck, peek, relocate, pursue with syringes and use firearms or soft gas mist. A doctor reaching the elevator fails the mission immediately. Story rescue counts are 2/4/5; Freeplay scales to difficulty and retains surrendered-doctor arrest/escort. Story hiders are limited to America and England, are required for escape, and can relocate and attack. Freeplay hiders remain optional. Gas causes roughly 60 seconds of reversible impairment instead of immediate failure; masks retain protection. Guns use shared body injury rules.

## Hospital feedback and presentation

The journal names the assignment type. Target location and schedule information stays hidden until the information board is checked. Rota messages stop after collection, while relevant target timing remains available after appointments and retries. The separate visitor warning, Room Clear wording and red office absence sign follow actual occupancy. Warning windows remain five seconds each.

Antidotes are available on the ground and second floors. Selected hallway corners have security cameras. East/West signs follow real branches rather than pointing into terminal walls. Ordinary lighting remains continuous in France, China, Russia, America, Romania and England; Nigeria, Venezuela, Uganda and India retain local motion/flicker behaviour. The same country lighting rules apply when its interior is selected in Freeplay; default Freeplay retains its original lighting. Power outages retain their existing rules. The player-following emergency beacon responsible for the unexplained red dot is hidden; real actor indicators remain. Waiting patients no longer receive specialist staff labels.

## Verification

All 605 unit tests pass, including snapshots of all eight regular outfits, real-rig body hit checks, rifle/window collision, rescue route connectivity, key ownership, equipment accounting and fixed country configurations. Twenty-four desktop browser groups and 22 iPhone WebKit groups pass. These cover the ten-country startup sweep, actual Studio selection, default/country Freeplay, coffee completion, full China assignment, visitor door approaches, independent five-second close/lock windows, warnings and exit movement, elevator feedback and destination frames, flashlight response, standing corner fire, rescue movement, mask purchase controls and visible collapse.

Production web, Android APK and iOS Simulator builds pass. Both native packages match 1,791 production files: all 1,736 existing voice recordings, 38 interior JPEGs, 12 equipment SVGs, the stirring recording and license, and the HTML/entry/CSS. Logs, screenshots and integrity reports are retained under `artifacts/revision336/`. Browser emulation and iOS Simulator compilation do not constitute installation or testing on a physical phone. No paid voice or image generation was used for this update.
