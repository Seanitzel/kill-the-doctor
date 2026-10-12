# Kill the Doctor — Northline

A complete playable hospital stealth thriller built with **Vue 3, Three.js, and Web Audio**, with native **Capacitor 8** apps for iOS and Android.

For phone controls, native builds, simulator launch, and mobile verification, see [MOBILE.md](MOBILE.md).

## Play

The local production build runs at **http://localhost:4173**. The development server runs at **http://localhost:5173**.

Select Adrian or Alex, enter the hospital, and inspect the staff directory near reception. Follow the evidence to your assigned doctor or nurse, verify their badge, complete the objective, and escape through the ground-floor main entrance before police seal the hospital. Patients are protected: hitting a patient fails the assignment immediately.

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
| Hospital map / evidence journal | M / J |
| Pause / release mouse | Escape |

Phone controls provide a movement stick, drag-to-look camera, and dedicated action buttons on touch devices. Maps, evidence dialogs, and menus pause mission time. The game also pauses when the browser loses focus.

## What is playable

- Both protagonists have equal abilities and rigged idle, walking, and running animations.
- Sixteen departments across two connected floors: Emergency, Radiology, Laboratory, Pharmacy, Outpatient, Records, Cafeteria, Maintenance, Surgery, Intensive Care, Cardiology, Neurology, Maternity, Pediatrics, Patient Ward, and Pathology.
- Central and perimeter routes, opening doors, viewing windows, navigable rooms, and a working lift between floors.
- Three evidence sources, rotating target assignments, matching target portraits, badge inspection, and a journal.
- Patrolling staff and security, emergency reactions, pursuit, and a late police response.
- Nurse handovers and patient conversations with spoken dialogue and captions. Six seated cafeteria diners eat, gesture, and talk around tables with meals.
- Doctors examine clothed patients in eight clinical rooms, with a visible stethoscope. Room entry interrupts the examination with a startled turn and an “Excuse me” response.
- Two clothed pregnant maternity patients, two swaddled newborns in bassinets, and bundled recordings of baby cries, distress vocalizations, and heavy breathing. Maternity sounds fade with distance and stop being audible on the other floor.
- Layered synthesized music with gradual target proximity intensity, hospital ambience, optional spoken announcements, bundled NPC dialogue in two voices, and persistent captions.
- Blackouts, emergency lighting, a shadow-casting flashlight, and occasional brief light-fixture glitches.
- Only selected sick patients emit green contamination clouds. Base blur durations are 30 or 60 seconds, according to the patient, with a visible recovery countdown and gradual clearing over the final ten seconds. The recovery filter upgrade reduces these durations. Clean patients do not contaminate the player, and a single cloud does not repeatedly reset the timer.
- Target objective, visible escape timer, successful escapes, patient protection, interception, timer failure, and mission results.
- Coins, reward breakdowns, four equipment upgrades, new rounds, and browser-persistent progression.
- Difficulty, volume, speech, mouse sensitivity, visual quality, fullscreen, responsive menus, and touch controls.

This is the complete browser prototype stage of the supplied GDD. Hospital geometry and equipment are modular; the lift transitions between two fully playable floor layouts. It is a foundation for further custom art and hospital expansion.

## Save behavior

Coins, completed missions, selected character, equipment levels, and settings save automatically in this browser using `ktd-northline-v1`. Active mission state is not saved on a page reload. Saves are separate for each browser and origin, so localhost and the hosted edition maintain their own profiles.

All models and fonts are included locally. Gameplay has no backend or external API dependency. NPC conversations and entry reactions are bundled as MP3 audio and can overlap announcements. Spoken public-address announcements use available browser/OS voices; captions remain available.

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

The unit suite covers mission transitions, protected patients, rewards, save repair, upgrade costs, replay variation, and layout connectivity. Browser tests cover character loading, movement and wall collision, evidence, map/journal pause behavior, doors, floor transfer, blackouts, flashlight, coughing, target identification, actual shooting logic, escape, failure conditions, reloads, rewards, upgrades, save persistence, and responsive screens.

Screenshots and the latest browser report are in `artifacts/`. Sixteen independent physical route checks also verified that every department can be reached without crossing furniture or walls.

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
