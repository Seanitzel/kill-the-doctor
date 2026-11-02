# KTD 3.12.0 — China infiltration, guard poses and touch controls

## China mission

- Hospital-information records are now displayed in the special mission journal, as well as the normal journal, with an immediate HUD update on collection.
- Return messages distinguish active mixing, a prepared drink and an idle player. Patient interruptions start only during active mixing while the doctor is away. They leave when that phase ends; ordinary patient routes are kept out of the occupied office.
- The doctor’s collapse starts a hidden, simulation-time discovery check. Entering the office after the collapse prevents it; otherwise a visitor discovers him and the mission fails. No countdown or deadline hint is added to the HUD, journal or story.
- Cup landing is a terminal state. The floor-visibility pass cannot make the shattered cup reappear, and its transform stops updating after impact. The spill and shards remain.
- Both search cabinets have three drawers, numbered and positioned top to bottom. Drawers contain layered paperwork and distinct office supplies that move with their tray.
- Desks and chairs sit farther from both office entrances. The wall cabinet now has a framed interior, shelves, hinged doors, handles and a visible doctor’s outfit. Open it and use it to change after collecting the ID; story, objectives and journal point to this cupboard rather than the bathroom locker.
- Office darkness now attenuates light per surface point inside the room, including when viewed through its doorway or window. Corridor lighting remains normal. Shared-material shader hooks, fixture matrices and cabinet replacements are restored on cleanup.

## Security and seating

- Security personnel wear navy uniforms, matching black caps and shield badges. Their neutral and armed poses explicitly position both upper arms and forearms and preserve neutral wrists, preventing inherited crossed or twisted arms.
- The outdoor guard has a long black bench behind the post and periodically alternates between sitting and standing. The guard rises before responding to a confrontation. The station’s geometry and collision are removed with the mission.
- Player seats and guard transitions share a smooth sit/stand progression with knee bending, hip lowering and a forward weight shift instead of snapping between poses.

## Controls, customization and atmosphere

- Movement has one owning pointer and a common release path. Global pointer release/cancel, lost capture, missing mouse buttons, matching touch release, page hiding, focus loss and component cleanup all neutralize the stick. Releasing a different touch does not cancel the held movement finger.
- Regular masks cost **400 coins** and N95 masks cost **800 coins**. Existing owned masks remain owned. The separate “Remove face mask” studio button is removed. Face fitting now measures the actual eyes and face on both rigs; regular and N95 masks have distinct shapes.
- Each color row ends in a subtle rainbow circle with an edit icon opening the full native color picker. Shirt, trouser and hair rows have five presets; highlights have three plus None. Skin and eye palettes are unchanged. Presets and the edit circle share a baseline, including phone-sized layouts.
- Rain has fewer, slower, shorter, more transparent streaks and much quieter original band-limited water ambience. The weather channel and active thunder stop completely on entering the hospital.
- The ambulance uses an original harmonic emergency two-tone siren. No sound was downloaded or extracted from the supplied YouTube videos. The reference pages were checked, but direct YouTube playback was unavailable; local audio checks remain silent.
- The existing animated smoke-break sky pattern is retained with much lower opacity and softer green, blue and purple colors. The accompanying full-screen color shift is also reduced.

## Validation

All 351 automated checks pass, and the production build succeeds. Checks cover pointer ownership and release paths, real male/female guard rig poses, mask fit and prices, seating interpolation and reversal, bench cleanup, room-shader installation and restoration, visitor phases and hidden discovery behavior, stationary cup debris, ordered and populated drawers, cupboard outfit collection, weather audio and all prior regressions.

Browser QA is muted. It checks the actual China scene, dark office from the corridor, guard bench cycle, wardrobe and drawers, cup aftermath, phone-sized picker alignment and purchases. These browser-size checks do not replace testing on a physical iPhone or iPad. Sound buffers are checked numerically; no local listening comparison is performed.
