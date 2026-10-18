# KTD 2.6

## Changes

- Floors 1 and 2 have a green antidote cabinet on a solid north-concourse wall beside the lift, marked on the map. One dose per cabinet per assignment cures contamination immediately and grants eight game seconds of protection from lingering gas. Doses are preserved when the player is clean. Empty cabinets reset next assignment.
- Contact following uses a maximum 96-point trail, smoothed temporary routes, a stable stopping gap, speed based on actual player movement, and a room/visibility check so the visitor crosses a bathroom doorway instead of stopping outside it. NPCs turn toward their actual movement, including retreats. Moving goals do not grow the shared flow-field cache.
- The contact occasionally gives a short human-recorded nervous laugh. Both genders have quiet spatial clips; sound honors speech/floor settings, replaces that actor’s prior voice, and uses the existing bounded source ownership. Sources and CC0 records are in `public/audio/laugh-sources.json`.
- Ordinary nurses and doctors use furniture-aware smoothed routes. Staff open only doors crossed by their route and wait beyond the leaf’s swing. Blocked paths are abandoned and retried, while animation continues to use actual displacement.
- When the primary target has a clinical appointment, the assigned doctor visibly examines an actual patient. The first discovery of the occupied room starts a random 180–300 game-second appointment. Pause stops game time. The first “excuse me” has a full 30-second grace period before the leave/security warning, followed by 10 seconds to leave. The player can act during the grace period or wait outside.
- Leaving cancels the active warning timer. Re-entering the same occupied examination retains the previous revision’s immediate report rule. At appointment completion the patient stands and walks toward the hall, the doctor becomes available, and privacy restrictions clear for that room. HUD and journal show the consultation countdown. Targets in non-clinical departments do not acquire a fabricated examination.

## Validation

- Automated suite: 186 passing tests, including antidote consumption/grace/reset/disposal, 180–300 second appointment boundaries, exact warning timing, real target/patient setup and departure, ordinary nurse closed-door traversal, contact walking/stopping/turning/bathroom entry, recorded laughter ownership, full hospital evacuation, camera/furniture collision, and existing save/mission/audio regressions.
- GitHub Pages production build succeeds.
- Browser playtest uses the real Vue app and GLB/FBX assets with touch controls at phone-sized landscape dimensions. Visible test controls stage contamination, an examination and the contact; normal game prompts cure contamination. Warning and completion frames are checked in the running game.
- Browser resource audit: three mission starts across all four floors retained exactly 313 geometries, 930 textures and 27 programs each. Unmount left zero geometries, textures, scene children, canvases or pending dialogue requests, and a null audio context. Browser console reported no errors or warnings. The audit is stored in the ignored release artifacts directory.

## Limits

Phone-sized browser QA does not substitute for testing Safari on a physical iPhone. Procedural acting and existing synthetic spoken dialogue remain stylized; only the new laughter cues are recorded human performances. No claim is made that all possible crowd configurations are bug-free.
