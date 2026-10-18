# KTD 2.7 — Nhalewick

## Changes

- Renamed the invented setting to **Nhalewick Medical Center**, including signs, badges, story text, UI and the spoken welcome. Kept the legacy save key and internal voice identifiers so existing coins, upgrades and saved looks survive. An exact-name web search for `Nhalewick` returned no results on 18 October 2026; this is a fictional naming choice, not trademark clearance.
- Fixed Retina portrait cropping. Render targets now use their own physical-pixel viewport rather than a viewport multiplied again by the renderer's pixel ratio. Face and outfit previews retain the head/body at front, side and back angles. Laptop menus use two columns so the larger title cannot push the launch button below the footer.
- Replaced nurse sweaters with collarless light-blue scrub shells, short sleeves, exposed upper/forearms, matching trousers, and retained animated name badges. The black cap has a round fitted crown, curved forward bill, panel seams and a top button.
- Ordinary pedestrians commit to a passing side or briefly yield instead of changing direction repeatedly around the player. Emergency and escort routes retain their established crowd handling. Failed route searches wait before trying again.
- White-cane visitors use measured walking, shorter strides, a forward grip and slower sweeps. They remain unable to visually report weapons; their blindness does not prevent them hearing events.
- Added actual sliding glass entrance doors and a connected forecourt. Evacuees cross the entrance before disappearing. Player escape and rescued-patient checks now lead outside; the ground-floor map includes this area.
- **Optional fictional coffee route:** collect the KTD compound from Pharmacy, verify the assigned doctor, then tamper with the named cup beside the lift on their floor unseen. The target visits after any active 3–5 minute consultation, drinks, and is eliminated after a short game delay. This triggers the same immediate alarm/evacuation and primary-target completion, without firing. Only invented game items are represented.
- Campaign pressure grows with completed assignments, with faster patrols, wider witness range, shorter reporting/escape windows and shorter coffee breaks. From round two, the directory gives only floor/wing; the exact rota must be collected unseen from Records while its custodian physically leaves for coffee. Collection takes two seconds and can be interrupted or witnessed. The map/HUD do not leak the restricted room. From round four, badge confirmation requires the handover log. Retrying preserves the same case, seed and difficulty.
- The original menu-only 40-second synth score has suspended minor pads, a soft plucked motif and occasional electrical sputters. It starts after the first user gesture, as browsers require, and suspends outside the menu or when hidden. The existing in-mission composition is unchanged. Menu audio has an explicit enable button and follows the volume setting.
- Replaced three story strips in the existing cinematic style: Pamela is mixed-race, Jonah is Chinese, and Isabella is Black. Narrative scene counts, boundaries and identities remain consistent. Built-in ImageGen was used; exact prompts, source PNGs, WebP paths and cut metadata are in `docs/story-art-v27/`.
- Passing patients occasionally pause to sneeze into a visible tissue, then say “Oh, sorry. Excuse me.” Clean sneezers remain clean. Contagious patients keep their cough/sneeze warning before gas. Added matching recordings in the existing four designed American voice variants; bumped audio cache version so browsers fetch them.

## Verification

- `npm test`: **198 tests passed**, including new campaign, actual doctor departure, successful/witnessed rota theft, cancelled collection, fictional coffee/alarm flow, entrance connectivity, stable passing, prop cleanup, finite menu-score samples, actual GLB uniforms/caps, and portrait viewport checks at pixel ratios 1, 1.25, 1.7 and 2.
- Existing whole-hospital evacuation, rescue escort, protected patients, physics, audio lifecycle, appearance disposal, save migration and mobile input tests pass.
- `npm run build:pages`: passed. `git diff --check`: passed.
- Actual browser checks through the UI: laptop menu at 1280×720, face/outfit studio controls, normal keyboard walking, doorway traversal, confidential-rota interaction and witnessed failure; phone control layout at 956×440, joystick release, torch brightness drag, pause/abandon dialog; home screen at 956×310 remains scrollable with its main launch button visible. No horizontal overflow was present at the measured laptop/phone sizes.
- Real rig gallery inspected at renderer pixel ratio 2. Screenshots and detailed logs are under the ignored `artifacts/revision-2.7/` folder.

Browser verification used the local Chromium-based in-app browser with the phone control mode. Physical iPhone Safari and native-device testing remain for the user. The existing Playwright browser suite was updated for the real exit location but was not run in this revision; deterministic engine/physics tests and direct UI interaction supplied the checks above.

Patch 2.7.1 fits portrait cameras to the actual posed head, cap, hair and body geometry, with tested headroom for front/side/back face and outfit views.

Patch 2.7.2 adds a dark desktop control-panel backing so moving bright hospital walls cannot wash out menu labels. Phone layout is unchanged.
