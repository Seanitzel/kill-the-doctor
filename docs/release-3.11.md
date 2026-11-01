# KTD 3.11.0 — mission rules, customization and hospital fixes

## Mission flow and rules

- Rescue and evidence introductions end with ordered task lists. Freestyle is now called Freeplay in the interface; old saves keep their mode and unlocks.
- The campaign has ten rota/evidence departments, each used twice and separated by ten destinations. Information boards, objectives, journals and map markers use their actual floor and room. Sophia's Brazilian case is an evidence assignment with its first record in Maternity.
- Nigeria checks physical occupancy. Idle visits produce two warnings before the next intrusion fails; actively witnessed rota collection fails immediately. A returning doctor or another visitor prevents a false “Room clear” message. The custodian return estimate includes the walk back.
- Drawing a weapon unseen is safe. An unjustified witnessed draw fails; a legitimate target confrontation starts the existing police deadline. Only the primary target can be harmed before the objective. Afterward, red-marked staff with assigned research/management involvement earn coins; innocent staff remain protected. Responding armed guards are combat targets without staff bonuses. The autonomous contact follows the same eligibility rules.
- One outdoor guard is present from the first assignment. Counts increase steadily to four at level 10 and seven at level 20, with standing, patrolling and seated posts. Additional guards add escape time. Guards pursue and fire during an exposed confrontation; solid cover and ducking block their sightline. Covert poisoning stays quiet until discovery.
- Running has no stamina limit. Touch RUN remains enabled while moving until switched off; Shift or Shift+C runs on computer. DUCK and HIDE replace the separate crouch button. Legacy endurance purchases now provide protective lining against guard hits.
- Jamie yields at nearby doorways and alternates existing laughter, panic and varied voiced distress. Two new statements use Rachel and Drew; the existing laugh audio is unchanged.

## Characters and equipment

- All existing color swatches remain, with full-spectrum custom choices for shirts, trousers, hair, highlights, skin and eyes. Shirt/trouser colors are independent. Necklaces and earrings are separate, including old-save migration and the MRI check.
- Regular masks and N95 masks can be purchased and equipped in the studio. Regular masks block 70% of new gas exposures. Equipped N95 masks block all new exposures; existing contamination still needs recovery or an antidote. Previously purchased protective masks remain valid N95 equipment.
- Three levels each of reload speed, precision sights and weapon tuning affect actual reloads, aim acquisition, shot recovery and guard stopping power. Magazine upgrades and the scoped rifle remain available through coins.
- Skin rendering uses a shared neutral albedo and the character's skin color rather than multiplying colored maps. Procedural exposed arms use the same skin color. This also avoids a separate skin texture allocation for every complexion.
- Bed patients use the correct world-space bed orientation. Emergency admissions retain a supporting bed after the returning stretcher leaves. Minor injuries, wristbands and IV details remain visible.

## China and the environment

- All defeated characters remain visible on their floor. A shared bounds-based fall establishes a stable floor height, pivots around the body center and chooses a wall- and furniture-clear landing instead of lowering a body beneath the floor. This covers shots, coffee and the ally's attacks.
- Liu Wen holds his coffee cup through the drinking sequence. On death it falls, shatters and leaves a persistent spill beside his body. His ID interaction also collects the basement access pass and updates inventory.
- China's office has a corner cupboard, appropriately facing chairs, a hollow desk drawer bay and sliding drawer trays. The office switch affects local fixtures/surfaces without dimming the entire hospital or resetting when the player leaves.
- Unoccupied patient chairs offer Sit/Stand interactions. Queued evacuees can pass fully opened doors and reroute around blocked crowds while retaining body collision.
- Floor indicators use G. The handover log's support reaches the floor. Schedule kiosks reserve an access gap from seats. Toilet plaque supports sit above the text. The minimized music player's arrow sits inside its title container.
- Mystery Soda is available and mapped on all four floors, including an accessible basement machine. Locked passport tiles hide country names, cities and hospital names. Orientation guidance says “device.” Room-number PA captions use digits while speech retains its pronunciation.
- Rain uses fast, elongated line streaks. Snow starts on the ground and bounded roadside banks accumulate to a maximum 48 cm, with the walking route kept clear. Storms have purple lightning. Weather ambience, thunder and an ambulance wail use reusable finite audio buffers.
- Ambulances follow curved approaches and departures, slowing to park. Smoke-break items follow the hand; visible moving sky patterns and color drift last for the entire break. Entering the hospital ends smoking and its phone music automatically.
- Pamela's first slide no longer reveals the later organ-removal discovery early. Existing story art is retained.

## Verification

All 337 automated checks pass, and the GitHub Pages production build succeeds. Checks cover the actual rigs' body bounds, both mask types and old saves, all 20 evidence locations, witness rules, coins and innocent protection, guard counts/cover, office state, cup remnants, usable seating, four-floor soda locations and disposal, weather buffers, snow limits, smoke-effect cleanup and full-crowd evacuation. Existing startup cancellation/retry and resource-disposal checks remain enabled.

Local browser and audio processing checks are muted. The browser pass verifies the coffee aftermath and a clear floor landing, the five-step China story slide and controls at 932 × 430, persistent RUN toggle, and locked outfit previews. New voice files passed decoding, integrity and offline transcription checks; no local listening comparison was performed. Phone-sized browser checks supplement the automated tests and do not substitute for testing physical iOS hardware.
