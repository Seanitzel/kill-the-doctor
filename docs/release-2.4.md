# KTD 2.4

## Behavior

- Reading a browser save preserves the active case, mission seed, original target selection and purchases, but resets `introSeen` for the new page session. Repeating/restarting or failing an assignment in the same session skips its introduction. A successful next assignment has its own introduction.
- The contextual door/evidence/contact prompt is a real button above the mobile look surface. Pointer-up handles touch even when the iOS zoom guard suppresses compatibility clicks; keyboard clicks work separately, without activating twice or firing a weapon through a focused button.
- Torch origin is attached to the avatar chest and follows its forward heading. Aiming converges toward the camera aim point. Independent scene exposure and torch strength controls save across refreshes.
- Movement and door swings reserve a 0.48 m arm envelope against structural walls/door leaves. A full door sweep is sampled, not just its final angle. Running changes to walking near structure before the longer running arm swing can reach it; raised-arm gestures are kept down when there is no room beside a wall/door. Shared evacuation fields use the same structural clearance, retaining the smaller footprint around low furniture.
- Nurses have light-blue tops/trousers and an owned, bone-attached name badge. Civilians no longer inherit the old generic staff badge. Customization adds opaque black sunglasses and a black sport cap, called “Cap”; choosing optical glasses or sunglasses replaces the other. Eye color is immediately below skin tone, and hair hi-lights remain below hair color.
- Four original synthetic Qwen3-TTS voice designs provide male/female standard American and Southern/Texas-inspired delivery. The same actor keeps the same regional voice across phrases. Accent descriptions are the intended generated performance, not a promise of perfect regional authenticity or human acting. No real person's recording was used as a reference. Models run only during asset preparation; the browser plays bundled MP3s with the existing bounded decoded-voice cache.
- Every hospital PA uses a two-note chime followed by speech through 350 Hz high-pass and 3300 Hz low-pass filters. A newer announcement replaces the older one, including delayed loads. Named runtime paging is replaced by a bundled general medical-staff request so it uses the same filtered voice path. Captions remain available on audio failure.

## Validation

- All 157 unit/regression tests pass, and the GitHub Pages production build succeeds.
- The phone-sized browser check opened and closed the laboratory door by tapping the contextual prompt itself, and opened the staff directory evidence panel by tapping its prompt.
- Restarting bypassed the story; a refresh followed by Enter showed the same illustrated case again.
- Scene/torch sliders changed independently; the studio showed eye color immediately after skin tone, and the new eyewear/cap controls.
- Actual rig renders verified nurse fabric and readable badges, plus the black cap/sunglasses fit. A Nurse → Avatar regression prevents staff badge leakage onto protagonists.
- Geometry tests cover idle/walking arm clearance, intermediate door sweep collisions, camera clearance, hospital reachability, full crowd evacuation, and the rescue escort.
- Audio tests cover chime sequencing, telephone filters, cancellation of superseded/pending PA, fixed regional voice selection, cache bounds, and complete graph teardown. Generated voice files receive finite/decode/hash and sampled transcript checks.
- Foreground browser playback completed the same clinical line in all four identities (2.862–3.422 s), left zero active sources, and cached four distinct files. A PA check used the bundled female standard voice, both telephone filters, and separate chime/speech sources.
- Three real browser mission starts, rendering all four floors each time, held steady at 308 geometries, 923 textures and 26 programs. App teardown returned tracked geometries/textures/scene children/canvases to zero, released the audio context and left no pending voice requests. These are object counts rather than a promise of zero total browser memory.

Browser viewport checks do not establish physical iPhone performance or Safari's actual touch event sequence. The interaction prompt handles pointer input independently of suppressed native clicks. Generated voice quality remains subjective.

Local proof and diagnostic outputs are retained in ignored `artifacts/revision-2.4/` and `artifacts/audio-v5/`.
