# KTD — Kill the Doctor

A complete playable hospital stealth thriller built with **Vue 3, Three.js, and Web Audio**, with native **Capacitor 8** apps for iOS and Android.

For phone controls, native builds, simulator launch, and mobile verification, see [MOBILE.md](MOBILE.md).

## Play

The local production build runs at **http://localhost:4173**. The development server runs at **http://localhost:5173**.

Choose Adrian, Alex, or your own customizable character, watch or skip the illustrated client file, enter the hospital, and inspect the staff directory near reception. Follow the evidence to your assigned doctor, verify their badge, complete the objective, and escape through the ground-floor main entrance before police seal the hospital. Patients are protected: hitting a patient fails the assignment immediately.

| Action | Control |
| --- | --- |
| Move / strafe | W A S D |
| Look | Mouse (click the scene to capture it) |
| Keyboard look / movement | Arrow keys |
| Sprint / crouch | Shift / C |
| Inspect clues, badges, doors, lift | E |
| Flashlight | F |
| Aim / fire | Hold right mouse / left mouse |
| Keyboard aim / fire | V / Space |
| Reload | R |
| Draw / holster | G |
| Switch pistol / scoped rifle | Q |
| Equip / remove bought mask | B |
| Hospital map / evidence journal | M / J |
| Pause / release mouse | Escape |

To preview phone controls on a desktop, append `?controls=touch` and use a landscape window. Phone controls provide a movement stick, drag-to-look and two-finger pinch camera zoom, and dedicated action buttons on touch devices. Maps, evidence dialogs, and menus pause mission time. The game also pauses when the browser loses focus.

## What is playable

- Adrian, Alex and a customizable profile share two rigged body models. Eleven hairstyles include side-swept ponytails, an afro, braids, straight hair, and short/long curls. Eight skin tones, pink hair/highlights, iris colors, four free outfits plus five coin-locked premium looks, with custom eye/nose/mouth shapes, glasses, cap, watch, purse and two tattoo options are available. Existing extra profiles migrate to the custom slot without losing progression.
- Special assignments rotate through the campaign: evidence-only every third round and rescue every fifth (rescue takes priority), with a home-screen selector to try either immediately. Collect a basement pass in Records, then a spare theatre key in Maintenance or quietly lift it from the charge nurse while crouched behind her, out of witnesses’ view. The pass unlocks the lift; the key unlocks the theatre door.
- Rescue assignments require stopping both operating doctors, releasing the clothed patient, and escorting them through the lift to the main entrance. Their presence at the exit is required. Only the operating team may be harmed; there are no staff bonuses in this mode. The operating team raises an alarm instead of applying the ordinary pre-target report failure.
- Evidence-only assignments replace firing with camera photography. Frame the Records ledger (G), Research consent file (2), and basement operation (B); three actual 320×180 images are retained in the mission journal. Security can report visible photography. Escape with all three; harming anyone fails the assignment.
- A ground-floor bathroom has cubicles, toilets, basins, working bounded-resolution mirrors and collision. Two blind visitors use animated white mobility canes; they can hear events but cannot visually report a weapon.
- The pharmacy is a staffed store with a counter, open medicine shelves, checkout and three customers waiting in line. Clinical rooms contain IV bags, stands and visible infusion tubes.
- An unseen same-floor gunshot leaves listeners worried for up to 120 seconds; later encounters include anxious gestures and uncertain sound-related dialogue. Hearing alone does not identify the player.
- Three early assignments in every ten, or five attempts per ten on standard assignments from level five onward, can contain a varied distressed adult visitor who arrives 65–110 seconds after entry, alternating panic runs/screams with abrupt calm and short distressed speech. Special missions do not recruit an armed visitor. Invite them to follow, reach the empty ground-floor bathroom, and make an offer in a voiced dialogue. A recruited contact waits until the primary target is down, then autonomously attacks eligible staff and contributes to the escape bonus. Patients remain protected.
- Thirty-four fictional client case files use three or four pictures each. Every ending explains that the client hired the player as an assassin. Previous-picture and back-to-menu buttons, fades, timed reading, skip and qualified background references are included. A case and target remain assigned through retries and reloads; stories advance only after successful missions. Dedicated matching story artwork preserves the existing cinematic illustration style; prompts are in `public/stories/asset-prompts-v25.json`.
- Twenty-four departments across three public floors, plus a bathroom and a restricted basement operating suite: Emergency, Radiology, Laboratory, Pharmacy, Outpatient, Records, Cafeteria, Maintenance, Surgery, Intensive Care, Cardiology, Neurology, Maternity, Pediatrics, Patient Ward, Pathology, Oncology, Research, Renal Care, Endoscopy, Rehabilitation, Patient Advocacy, Transplant Ward and Isolation Unit.
- Central and perimeter routes, opening doors, viewing windows, navigable rooms, and a working lift between floors.
- Three evidence sources, rotating target assignments, matching target portraits, badge inspection, and a journal.
- Patrolling staff and security, emergency reactions, pursuit, and a late police response.
- Nurse handovers and patient conversations with spoken dialogue and captions. Six seated cafeteria diners eat, gesture, and talk around tables with meals.
- Doctors examine clothed patients in the clinical rooms, with a visible stethoscope. Room entry interrupts the examination with a startled turn and an “Excuse me” response.
- Two clothed pregnant maternity patients, two swaddled newborns in bassinets, and bundled recordings of baby cries, distress vocalizations, and heavy breathing. Maternity sounds fade with distance and stop being audible on the other floor.
- Layered synthesized music with gradual target proximity intensity, hospital ambience, optional spoken announcements, bundled Qwen3-TTS NPC dialogue and fixed public-address lines in four designed voices (female/male, standard American/Southern-inspired) with stable per-character accents, and persistent captions.
- Recorded sneakers on tile vary across four takes, synchronized to the rigged walking/running animation, with distinct pistol and rifle recordings and a subtle hospital room response. Only player effects use this room response. Footsteps have a softer contact and lower gain; the original soundtrack receives a20% bus gain rise without changing its notes or timing. Clip provenance and CC0 licenses are in `public/audio/foley/SOURCES.txt`.
- Blackouts, emergency lighting, a shadow-casting flashlight, and occasional brief light-fixture glitches with electrical zaps. Blood-pressure cuffs, cardiac monitors, ventilators, clinical instructions and short pain reactions provide local background activity.
- A cough or sneeze warns the player before selected sick patients emit green contamination clouds. A bought, equipped face mask prevents new exposure. Base blur durations are 30 or 60 seconds, according to the patient, with a visible recovery countdown and gradual clearing over the final ten seconds. The recovery filter upgrade reduces these durations. Clean patients do not contaminate the player, and a single cloud does not repeatedly reset the timer.
- Drawing or aiming a visible weapon causes witnesses to gasp and run to report it. A completed report before the primary objective fails the mission. Walls and facing affect detection; holstering prevents new sightings.
- Only the assigned doctor may be harmed before the primary objective. Their death immediately starts the alarm and an evacuation of staff and ambulatory patients. People on upper floors use the lift and then the ground exit; newborns remain protected. Additional staff earn 25 coins each, banked only after successful escape.
- The visible escape timer, patient protection, interception, timer failure and mission results remain active.
- Optional steel jewelry triggers a dramatized fatal magnetic pull inside Radiology. This is an MRI magnet hazard, not radiation; not all real jewelry is magnetic. Remove jewelry in the studio or loadout before entering.
- Coins, reward breakdowns, eight equipment upgrades (including a protective mask, scoped rifle, extended magazines and endurance training), new rounds, and browser-persistent progression.
- Exhaustion settles into a steady walk until sprint is released and a recovery reserve is restored. Touch sprint switches off when depleted; the RUN control shows REST during recovery.
- Difficulty, volume, speech, camera sensitivity, scene brightness, torch brightness, visual quality, fullscreen, responsive menus, and touch controls.

This is the complete browser prototype stage of the supplied GDD. Hospital geometry and equipment are modular; the lift transitions between three fully playable floor layouts. It is a foundation for further custom art and hospital expansion.

## Save behavior

Coins, completed missions, selected character, equipment levels, and settings save automatically in this browser using `ktd-northline-v1`. Active mission state is not saved on a page reload. Saves are separate for each browser and origin, so localhost and the hosted edition maintain their own profiles.

All models and fonts are included locally. Gameplay has no backend or external API dependency. NPC conversations and entry reactions are bundled as MP3 audio and can overlap announcements. Spoken public-address announcements use bundled designed American voices through a muffled speaker/telephone filter; captions remain available.

## Run or edit

From this directory:

```sh
npm install
npm run dev
```

For the production edition:

```sh
npm run build
npm start
```

`npm start` serves the existing `dist/` build on port 4173. Set `KTD_PORT` to choose another port.

## Verify

```sh
npm test
npx playwright install chromium
npm run test:browser
```

The unit suite covers rotating story assets, save migration, character and equipment purchases, witness detection and reporting, MRI behavior, three-floor crowd evacuation with real doors and furniture, weapon magazines, mission transitions, protected patients, rewards, save repair, upgrade costs, replay variation, and layout connectivity. Browser tests cover character loading, movement and wall collision, evidence, map/journal pause behavior, doors, floor transfer, blackouts, flashlight, coughing, target identification, actual shooting logic, escape, failure conditions, reloads, rewards, upgrades, save persistence, and responsive screens.

Screenshots and the latest browser report are in `artifacts/`. Twenty-four independent physical route checks also verified that every department can be reached without crossing furniture or walls.

## Source layout

- `src/App.vue`: menus, HUD, map/journal dialogs, progression, and settings.
- `src/MapView.vue`: navigation map drawn from the actual floor layouts.
- `src/game/engine.js`: rendering, input, movement, camera, NPC routines, events, and interaction.
- `src/game/layout.js`: modular floor plans and pathfinding.
- `src/game/hospital.js`: architecture, medical furniture, signs, and colliders.
- `src/game/assets.js`: character loading, bind-space animation retargeting, medical assets, portraits, and materials.
- `src/game/mission.js`: mission state machine, rewards, and persistent upgrades.
- `src/game/audio.js`: procedural music, recorded spatial ambience, effects, dialogue, and announcements.
- `src/game/atmosphere.js`: conversations, clinical activity, maternity, meals, entry reactions, contamination clouds, and fixture glitches.
- `src/game/life-rules.js`: contamination duration, recovery, audio falloff, and conversation variations.

The inspection bridge `window.__ktd` exists only in development builds. Production builds omit it.

Asset sources and notices are in `public/credits.txt` and `public/licenses/`.

## GitHub Pages

The personal-account source repository is `Seanitzel/kill-the-doctor`. GitHub Actions builds and deploys the browser game from `main` using `.github/workflows/pages.yml`. The Pages-specific build uses `/kill-the-doctor/` for all scripts, fonts, models, animations, and audio. Normal web and Capacitor builds continue to use `/`.

```sh
npm run build:pages
```

The output is in `artifacts/github-pages`. Enable **GitHub Actions** as the Pages publishing source in the repository settings. GitHub Pages requires a supported paid plan for a private repository; the published game URL is publicly accessible. A public repository supports Pages on the free plan.

Version 2.3 adds Mara’s antibiotic/paralysis case and Evelyn/Nora’s unwarned eye-dilation case as fictional composites. The tattoo fix uses skinned alpha decals; glasses use measured eye placement; straight and loose-curly hair have continuous layered silhouettes; the side-part ponytail stays behind the head. Hair hi-lights follow hair color and eye color is last. Dialogue uses supplied licensed Pocket TTS presets and remains synthetic. See `docs/release-2.3.md` for validation and limits.

## Version 2.4

Stories play before an assignment, skip repeat/failure attempts within the same page session, and play again after a refresh. The same case, mission seed and target remain intact. The contextual prompt is now a real button above the mobile look surface, supporting pointer and keyboard activation without duplicate actions.

The torch follows the avatar heading instead of the offset camera. Settings include separate scene/torch brightness. Structural collision and door swing checks reserve walking-arm clearance; avatars slow near walls and doors before their running pose can intersect them. Nurses wear light-blue tops/trousers and animated name badges. Customization adds black sunglasses and a black sport cap; eye color follows skin tone.

Public announcements have a two-note chime and a 350–3300 Hz telephone band. Bundled voice designs are fictional synthetic identities with standard American and Southern/Texas-inspired prompts, not a guarantee of a perfect accent or human acting. See `docs/release-2.4.md` for checks and limits.

## Version 2.5

Three saved custom characters, a brightness drag on LIGHT, mission selection from pause, bathroom conversations, varied anxious visitor behavior, room privacy enforcement, less frequent power faults and announcements, named patient pages, flush elevator geometry, matching case artwork, and a police handover ending for evidence assignments. See `docs/release-2.5.md` for behavior and validation limits.

## Version 2.6

Exactly one wall-mounted contamination antidote is placed on the ground floor per assignment. Its green + marker is shown on the map and turns grey when used. The cabinet supplies one free cure, with eight seconds of protection against lingering gas. Clean players do not waste a dose.

The contact follows a short, bounded movement trail with a stable stopping distance, follows through doorways and the lift, and uses recorded occasional nervous laughter. Ordinary staff use furniture-aware smoothed routes and wait clear of door swings.

A primary target assigned to a clinical examination now checks a real patient. Finding their room starts a 3–5 minute consultation, shown in the target HUD and journal. The first request to wait outside allows 30 seconds before the leave/security warning; remaining another 10 seconds starts a report. Leaving cancels the active timer, while repeated intrusion during the appointment retains the existing security response. Once the appointment ends, the patient leaves and that room’s privacy restriction clears. The primary target remains vulnerable during the grace period. See `docs/release-2.6.md`.

## Version 2.7 — Nhalewick

The hospital is now the fictional **Nhalewick Medical Center**. Existing browser saves stay compatible. This revision fixes Retina character previews and laptop menu clipping, replaces nurse sweaters with short-sleeved scrubs, improves the black sport cap and cane movement, adds a real sliding entrance and forecourt, and steadies ordinary pedestrian passing.

Later standard assignments require secretly collecting the Records rota during a doctor's coffee break; from round four, cross-check the handover log before confirming the badge. Campaign surveillance and timing grow harder each round. You can alternatively use the fictional KTD compound from Pharmacy on the verified target's named coffee beside their floor's lift; being witnessed ends the mission. The original menu-only score starts after a tap/click, and the existing in-game score is preserved. Three story casts are more diverse, and passing patients can sneeze into tissues and apologize.

See [release-2.7.md](docs/release-2.7.md) for controls, validation and testing limits, and [story art prompts](docs/story-art-v27/prompts.json) for generated asset provenance.


## Version 2.8 — International assignments

A 20-country story route now has its own completion count. Each completed story destination unlocks a freestyle country, while freestyle wins preserve campaign progress. Existing saves carry over coins, characters, upgrades and completed destinations. Each fictional hospital has its own identity, palette and department arrangement. Next Mission plays an 8.2-second globe flight between the previous and next countries with the original game score and a plane cue.

Mystery Soda costs 5 coins at atrium vending machines on the three public floors. There is no stock limit. A carried can can be drunk during the target's appointment: 60% doubles the remaining time, 40% halves it. From level five, find the service key in Records, unlock the Laboratory and collect a fictional Dream Vial. Invite a contact to follow, lead them outside the confirmed target's office, offer the vial, then use Call for Help at the door. The target interrupts the consultation to assist; another clinician arrives to take over. The contact stays protected.

Emergency entry does not trigger privacy warnings. Laboratory and Research start closed and can be locked. Twenty distinct assigned doctor names, patient wristbands, taped IV ports, restrained minor-injury details and small fading drops have been added. Patient behavior is varied across destinations without nationality-specific hostility. A CC0 recorded sneeze replaces the generated noise effect. The menu score attempts autoplay and starts on the first gesture when a browser blocks autoplay; its new suspended tension preserves the in-game soundtrack.

See [release-2.8.md](docs/release-2.8.md) for validation and mobile limits.


## Version 2.9 — Arrivals and escape

Fresh campaigns begin in France, then Nigeria. Cleared destinations now persist by country identity so older Nigeria-first saves retain their progress. A saved pending flight ensures Next Mission (or resuming from the menu) shows the globe departure and arrival before the next country’s story. All 20 chapters retain increasing surveillance.

Ground-floor automatic glass doors open onto a night street with pavement, road markings and yellow streetlights. The single antidote is marked on the ground-floor map. Successful debriefs bank coins with a visible balance count and stacking sound.

All country casts use varied, gender-consistent names and appearances; site architecture includes distinct trims, ceilings and arrival details. France and Congo have new locally cast story scenes. Clinical desks leave doorway clearance. Pregnancies deform the clothed torso instead of attaching a separate sphere. Closed hand surfaces follow the real rigs, and evacuation uses smoothed routes and consistent running gait.

Office coffee exists on levels 2, 4, 7, 11, 14 and 19 only. The doctor physically visits a bathroom and returns to the personal desk. The fictional compound leaves a covert escape window, interrupted by body discovery or gunfire. Recorded human sneeze and evacuation scream assets include CC0 attribution. The in-game soundtrack is unchanged.

See [release-2.9.md](docs/release-2.9.md) for validation and limits.
