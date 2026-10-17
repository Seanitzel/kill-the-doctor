# KTD 2.3 validation

## Changes

- Rescue and evidence-only assignments rotate into the campaign and can also be selected on the home screen. Assignment type, seed and briefing remain stable through retries and reloads. Existing active legacy assignments retain the standard rules.
- A compact restricted basement has an operating table, clothed patient, doctors, monitor, instruments and two separate access gates: a pass for the lift and a key for the theatre. Collect keys, or quietly lift the theatre key from behind the passing nurse while crouched and unwatched.
- Rescue requires stopping both operating doctors, releasing the patient, and escorting them to the ground exit. Public-floor witnesses can still report a weapon; operating doctors instead trigger an immediate alarm and the rescue timer. Other staff are protected and earn no bonus. The patient follows real collision-aware routes and floor transfers.
- Evidence-only uses a handheld camera and three framed subjects. Actual 320×180 JPEG images are retained in the current mission journal. Security can report photography. Three photographs and a final escape are required; casualties fail the assignment.
- A ground-floor bathroom has cubicles, toilets, basins and physical collision. Two blind visitors carry animated white canes and are excluded from visual weapon detection.
- Eligible distressed visitors arrive 65–110 seconds after entry, then alternate screams/running with abrupt calm and varied distressed lines. Their existing private-room encounter remains optional in standard assignments.
- Two additional fictional client files cover Mara’s prescription/paralysis story and Evelyn/Nora’s unwarned dilation/traffic accident story. These are fictional composites, do not name a drug and do not document real patients.
- Tattoos use real skinned alpha decals, glasses fit measured eye bounds on both rigs, hair has revised continuous straight/loose-curly surfaces, and the former front ponytail is now rear-tied with a side part. The cap is plain. Hair hi-lights follow hair color; eye color is last in the customization form.
- NPC dialogue and fixed announcements use supplied licensed Kyutai Pocket TTS presets with complete-phrase synthesis. They remain synthetic performances. Footsteps alone were lowered about 4 dB; their samples, filtering and room response remain unchanged.

## Verification

- All 143 unit/regression tests pass, covering assignment rotation/retry persistence, key theft checks, distinct access keys, photographic framing/line of sight, protected patients, rescue alarm behavior, actual escort routes, floor transfer, extraction presence, rewards, hair/accessory fitting, voice hashes, and cleanup. Both the normal production build and GitHub Pages build succeed.
- In a 956×390 phone-sized browser viewport, the evidence mission collected both keys, unlocked the lift and theatre, saved all three photographs in the journal, and completed a nonviolent escape for 460 coins.
- The rescue browser playthrough used the real firing controls from clear staged side positions, stopped both operating doctors, released the patient, then manually walked around solid equipment, through the lift and past the evacuation crowd/reception desk. Extraction waited for the patient and awarded 560 coins. An earlier attempt confirmed that hitting the patient fails with no reward. North-facing shots blocked by the bedside monitor were correctly occluded.
- Four repeated special missions, each rendering all four levels, held steady at 280 geometries, 936 textures and 25 programs. Final teardown returned tracked geometries, textures, scene children, canvases and pending voice requests to zero, and released the audio context. These are object counts, not a guarantee of zero total browser memory.
- Three full App mount/unmount cycles included cancellation during asset loading and active missions with pending UI feedback. Each released tracked textures/scenes/canvases/audio and development bridges. Disposing one of two renderers preserved the other’s 43 shared primitive geometries; both returned to zero on disposal.
- Browser and viewport checks do not establish physical iPhone frame rates or actual device multitouch behavior. Dialogue delivery and style are subjective; recordings are generated speech rather than human acting.

Ignored local evidence is under `artifacts/revision-v4/`: test output, resource/lifecycle JSON, successful assignment screens, appearance views and bathroom gameplay. Earlier release audits remain unchanged.
