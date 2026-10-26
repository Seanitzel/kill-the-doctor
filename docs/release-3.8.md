# KTD 3.8.0

International Story now fixes each country's assignment type. France and Nigeria
remain target missions, China retains its stolen-identity infiltration, and other
countries alternate predetermined target, rescue and evidence assignments. Only
Free Play allows choosing a mission type, with destinations gated by story wins.
The final story image waits indefinitely for the Enter Hospital button. Marcus's
opening now explicitly describes a hospital-acquired infection and neglected care.

Investigation uses Clues. The atrium information board first identifies the
physical Records office; the directory / rota is inside. The target's consultation
cannot occupy Records. Restricted rotas show the custodian's actual coffee-break
phase: waiting, leaving, room clear, returning. The paper alone is collected.

Target consultations start with a 2–5-minute wait. Visible timers share the actual
appointment clock, including Mystery Soda's double/half effects. An occupied room
shows a prominent red leave warning. Two warnings precede a third security threat,
which immediately fails the assignment. Departing cancels escalation without
erasing warnings. Emergency remains accessible. Drawing a concealed gun before
reaching the primary target immediately fails a standard target mission; drawing
within eight metres and sight of that doctor starts one police deadline, covering
both the assassination and escape. Rescue and evidence rules remain distinct.

China's third doctor physically leaves for a bathroom break, returns, drinks and
becomes unresponsive. Mixing the fictional KTD compound requires thirty seconds
and a fully absent doctor. USE or movement stops mixing immediately and retains
progress. A patient or returning doctor seeing active mixing exposes the player;
a stopped action alone does not. The player secures the office, takes the ID,
searches cupboard drawers for hidden basement keys (desk drawers are decoys), and
may turn off the office lamps. Both the drawer key and disguise gate basement
entry. The camera is brought with the character; there is no pharmacy purchase.

Nurse hands use two-sided surfaces, normalized skin weights, restrained wrists
and stable finger poses. Patients have varied casual tops, jackets and neutral
trousers. Premium outfits cost 100–150 coins. Lift doors retain their closed centre
seam; a large floor number sits to the left. A staffed triage desk is near the
entrance. Evacuation uses shared doorway leases, staggered reactions, separate
exit lanes and collision-aware queues, retiring stale door owners on teardown.

Outside scenery includes four moving cars with headlights, country-specific
evening rain / snow / storms / clear skies, softer smoke and a subtle optional
smoke-break colour drift. Weather uses fixed buffers on the existing frame loop;
car parts are merged to reduce draw calls. All owned geometry, texture, light
instance changes and doorway references are released or restored on teardown.

The mobile anti-zoom guard preserves touch-generated button clicks and menu
scrolling. Phone playback, next-track controls and smoke breaks were exercised
in a muted 852×393 touch-control preview. All local previews used volume zero.
Final-story confirmation, the narrow-screen red warning / appointment timer,
loading feedback and paused Story menu were inspected through the browser.

Validation: 297 automated checks passed, including physical full-hospital
and eight-person doorway evacuation, China doctor travel / mixing / drawer / lamp
behaviour, warning failure, story mission selection, phone input and hand rigs.
The GitHub Pages production build succeeds. Physical iPhone testing is still
needed to confirm Safari's touch event compatibility on the actual device.

## Voice generation pending owner billing approval

Existing bundled designed American voices are retained, with newly recorded
warning lines. No paid Replicate request has been submitted for this release.
Country-specific ElevenLabs v3 routing, twenty country casting briefs, native
ambient patient phrases with English captions, and a static-asset generator are
prepared. The generator's current plan is 4,200 clips and an estimated $33.22 at
the displayed $0.10/1,000-character rate. It requires explicit $40 approval and an
existing Replicate token through stdin, serializes spending reservations, caps
concurrency at four, validates clips, and stops before exceeding its $40 limit.
Credentials are never written to disk or included in the browser build. The empty
country manifest deliberately leaves the existing voices active until generation
and quality checks are complete. Native-speaker accent / translation review is
still advisable; the casting prompts are not a guarantee of accent authenticity.
