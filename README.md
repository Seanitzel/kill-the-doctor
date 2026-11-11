# KTD — Kill the Doctor

A fictional third-person hospital stealth game built with **Vue 3, Three.js and Web Audio**, packaged for **Android and iOS with Capacitor 8**.

[Play the web edition](https://seanitzel.github.io/kill-the-doctor/) · [Native builds and phone setup](MOBILE.md) · [Latest verification notes](docs/release-3.24.md)

## Run

```sh
npm ci
npm run dev
```

The development server uses port 5173. For the production web build:

```sh
npm run build
npm start
```

The production server uses port 4173. `npm run build:pages` builds with the GitHub Pages mount path; normal web and native builds use the local root. All game assets are included in the repository.

## Play

Choose Adrian, Alex or a custom character, view the client story, enter the hospital, investigate the assignment and escape before lockdown. The twenty-country story campaign includes target, rescue and evidence assignments. The current campaign's briefing and objective HUD describe the mission rules. Successful missions unlock subsequent countries and award coins for equipment and outfits.

| Action | Desktop | Phone |
| --- | --- | --- |
| Move | W A S D | Left stick |
| Look | Mouse / arrow keys | Drag right side |
| Interact | E | USE or contextual prompt |
| Aim / fire | Right / left mouse, V to toggle aim | AIM / FIRE |
| Reload | R | RELOAD |
| Draw / holster | G | DRAW |
| Weapon | Q | RIFLE |
| Flashlight | F | LIGHT; drag to adjust brightness |
| Sprint / crouch | Shift / C | RUN / CROUCH |
| Hide | H | HIDE |
| Map / journal | M / J | Map / book icons |
| Pause | Space / Escape | Pause icon / Android Back |
| Camera zoom | — | Two-finger pinch |

Append `?controls=touch` for phone controls in a desktop browser. Native apps support landscape play and safe areas. Browser tabs pause on focus loss; native apps pause on backgrounding.

Progress, equipment, settings and up to three custom looks save automatically. Outfit colours can use a five-colour saved palette. An active assignment's identity persists for retry, but reloading does not save its live gameplay state. Browser origins and native apps each have separate local saves.

## Current systems

- Modular three-floor hospital plus a restricted basement, solid doors/furniture and avoidance routes. Level six adds public stairs and a rear automatic exit.
- Clinical appointments, staff conversations, pharmacy/cafeteria activity, maternity, emergency arrivals and ambient hospital sound.
- Investigation, confidential schedules, keys, badges, covert coffee interactions and evidence recordings.
- Contamination and masks, a ground-floor antidote, advance spit warnings and a ten-second hit restriction, intermittent lights and a directional torch.
- Security pursuit, evacuation and timed escape. From level five, marked accomplices can run, hide, relocate and telegraph different attacks. Hidden offenders are required in armed Story assignments, optional in Freeplay; other marked staff remain optional. Security and accomplice map tracking have separate unlock rules.
- Character customization, distinct premium outfit designs, coin purchases, weapon upgrades and Mystery Soda's independent 40% double / 60% halve appointment roll.
- Illustrated stories, globe flight transitions, a ten-country campaign with completed Story replays, persistent progression and reward animations.

The hospitals, characters, cases and compounds are fictional. Asset notices and recording provenance are in `public/credits.txt`, `public/licenses/` and the audio source files. The game has no backend or external API dependency for play.

## Verification

```sh
npm test
npx playwright install chromium webkit
npm run test:browser
npm run native:doctor
npm run native:android
npm run native:ios
```

The unit suite covers rules, navigation, collision, actual animated rigs, disposal, bounded caches, startup failures/cancellation, persistence and native packaging invariants. Browser tests cover real start/loading flows, desktop/phone controls, camera/aiming, interactions, atmosphere and progression. Tests use muted output. Native projects are compiled separately and tested with bundled local assets.

See [MOBILE.md](MOBILE.md) for APKs, iOS Simulator apps, release bundles/archives, quiet native QA and signing. See `docs/release-*.md` for each revision's changes and tested limits.

## Source layout

- `src/App.vue`, `CharacterStudio.vue`, `MapView.vue`, `InfiltrationHUD.vue`: UI, progression and overlays.
- `src/game/engine.js`: renderer, startup/retirement and system coordination.
- `src/game/layout.js`, `hospital.js`, `navigation.js`, `egress.js`: world construction and routes.
- `src/game/assets.js`, `appearance.js`, `smoking-pose.js`, `coffee-sip.js`: rigged characters, fitting and activity poses.
- `src/game/mission.js`, `objectives.js`, `covert.js`, `escape-threats.js`: rules, assignments and escape encounters.
- `src/game/audio.js`, `atmosphere.js`, `emergency-arrivals.js`: sound and hospital life.
- `src/mobile/`: touch input, native lifecycle and phone integration.
- `android/`, `ios/`, `scripts/build-native.mjs`: native projects and reproducible builds.

`window.__ktd` is a mutable testing bridge available only in development/native-test builds. Production packages omit it. `sources/` in the parent project is synced read-only reference material.
