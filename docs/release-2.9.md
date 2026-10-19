# KTD 2.9 — Arrivals and escape

## Behavior

- New story campaigns begin in France, followed by Nigeria. Cleared country identities migrate from the older Nigeria-first order without removing coins, character saves or equipment. The next departure persists through menu returns and reloads; arrival precedes the next country story. Twenty distinct cases and the existing escalating surveillance remain.
- One free, single-use contamination antidote lives on the ground floor. Its green + map marker becomes grey after use. Exposure notifications point players to it.
- Automatic sliding glass doors have moving physical leaves, reset each assignment, and open on proximity or alarm. Outside are pavement, a road, markings and warm yellow streetlamps.
- Debriefs animate gold coins into the existing balance and count up with short stacking cues. Reward accounting remains immediate, persistent and idempotent.
- Country populations have varied skin tones, hair, eyes and faces. Named clinicians use gender-consistent pools. China and Japan use an East Asian cast mix. African, South Asian and mixed-cast destinations use their own distributions; behavior and voice accents remain independent of appearance.
- Each site has distinct ceiling ribs, portal trims, inset panels, colours, arrival identity and department arrangement. The arrival country sign is mounted on the atrium wall, away from the directory. Clinical workstations move to the side of rooms and leave doorway clearance.
- Nurses retain collarless short-sleeved light-blue scrubs and long trousers. Actual hand faces are preserved from both source body and outfit meshes before replacing the nurse top; this fixes female hand loss and avoids glove textures on clinicians. Hands retain the original finger skinning. Evacuation routes are smoothed, with a steady running gait through short slowdowns and no animation when genuinely blocked.
- Maternity patients use female rigs and a continuous deformed clothed torso, replacing the separate attached sphere.
- Office coffee is available only in target assignments on levels 2, 4, 7, 11, 14 and 19. The personal cup is on a real workstation. After consultation the doctor physically walks to a bathroom, returns, drinks and can succumb to the fictional KTD compound. No real chemical or preparation is represented. The player may leave covertly before discovery; a witness discovering the body or subsequent gunfire triggers the normal alarm, screams, evacuation and police deadline.
- Longer recorded human sneeze and frightened-scream assets replace the truncated sneeze and support evacuation. Source and CC0 notices are included. In-game music is unchanged.
- France has a newly illustrated Chinese immigrant Jack case with French clinicians; Congo has a Black Michael family case. The inconsistent inset in the generated fourth Congo image is not displayed. Existing locally suitable art is assigned to Nigeria, China and Kenya. Other chapters retain existing cinematic artwork.

## Verification

- Automated game suite: 222 passing checks, including save migration, all twenty destinations/stories, pending flights, coin accounting, country casts, local architecture and desk clearance, six physical coffee routes, bathroom return, covert discovery, single-use map antidote, full-crowd evacuation, real masculine/feminine hand geometry through running, pregnancy deformation, resource disposal and prior mobile controls.
- GitHub Pages production build passes. No dependency additions.
- Browser QA uses the actual app and isolated ignored checkpoint fixtures. A character physically walks through the entrance; reward balance increases from 50 to 326; Next Mission displays France → Nigeria, then Nigeria’s Pamela story. No game-console errors observed for this flow.
- Touch layout checked at 956×440, including the ground-floor map and antidote marker. Actual doctor, nurse and patient rigs checked from front and back in running poses; maternity silhouette checked from front and side.
- Audio encoding, provenance and waveform checks completed. Subjective sneeze realism requires listening feedback.

## Limits

Physical iPhone Safari and native-app builds were not tested for this revision. Hospital layouts reuse modular floor plans and props with site variations, rather than twenty entirely independent building models. Artwork casting is localized for selected chapters; not every illustration has been regenerated. Browser autoplay restrictions still apply to music.
