# Northline 2.0 — local acceptance notes

Acceptance checks completed 15 October 2026, before publication. The 44 automated checks and GitHub Pages production build were run again successfully on 16 October 2026 for the user-approved release.

## Checks completed

- All 44 Node tests pass. The tests use the actual hospital collision geometry and shooting code, without requiring a GPU renderer.
- Camera clearance and physical routes pass across all three floors, including waiting chairs, desks, beds, tables and doors.
- A complete crowd simulation starts with closed doors, sounds the alarm, opens doors, moves adults around furniture, transfers upper-floor evacuees through the lift, and removes them at the ground exit. Newborns remain protected in the nursery. Every adult completes the route, and sampled positions stay outside solid furniture and walls.
- Shooting checks verify the primary-target restriction, an immediate primary alarm, later staff bonuses, banking rewards once, and an actual rifle hit beyond pistol range.
- Story rotation, all eight illustration files and scene crops, old-save migration, character unlocks, separate weapon ammunition, mask purchases/protection, witness visibility/reporting, and the fictional MRI hazard pass.
- Standard production and GitHub Pages builds succeed. Building the Pages files does not publish them.

## Browser play and layout checks

- Started multiple stories and confirmed different cases, scene changes, source notes, skip and game entry.
- Selected Noah, changed the display name, inspected the 3D preview and saved the character.
- Walked from reception to the directory, read the assignment, reached the lift and travelled directly to the second floor. Entered Endoscopy and observed a doctor reacting to the intrusion.
- Drew the weapon in front of witnesses and observed the gasp caption, reporting countdown, running witness and police-interception result.
- Opened the local production build and played with the phone movement stick at a 956 × 390 landscape viewport. Touch controls, shop scrolling and camera framing fit, no visible keyboard shortcuts appeared, and the production session had no console errors or warnings.
- Fixed crowd door jams found by the stress test, overlapping witness/toast messages, cropped story art, long room names on the map, and dialogue bubbles appearing through walls.

Phone layout was tested using the supported `?controls=touch` preview. Physical iPhone Safari validation remains for the user; the simulator's accessibility connection was unavailable in this session. Existing browser-test scripts were updated for story skipping, the three-floor selector and the cough-warning delay; they were not executed as a separate Playwright run in this session.

## Preview and provenance

- LAN preview: <http://192.168.1.172:5173/> (same network as the development computer).
- Desktop touch preview: <http://192.168.1.172:5173/?controls=touch> in a landscape window.
- Eight exact image-generation prompts: `public/stories/README.txt`.
- Cough and gasp licenses: `public/audio/expansion-sources.txt`; required credit is visible in the game's credits.
- Documented cases and qualifications: the in-game Story references panel, backed by `src/game/stories.js`.

The intros and assignments are fictional. The jewelry event represents a dramatized MRI magnetic hazard; the game does not describe radiation pulling metal or imply that all real jewelry is magnetic.
