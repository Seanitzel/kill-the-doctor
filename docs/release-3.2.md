# KTD 3.2

Space pauses/resumes gameplay; it no longer fires or takes evidence photographs.
Mouse fire and touch controls are unchanged. Held Space toggles only once, and
text fields and focused menu buttons keep their normal keyboard behavior.

The international flight is one seven-second globe sequence: satellite Earth,
geographically placed gold pins, actual country names, a dotted route and a
smoothly moving airplane. There are no airport/departure/arrival cutaways.
The airplane recording follows visible playback; a separate short cabin cue
signals arrival, then the next country's story and gameplay start automatically.
Backgrounding freezes the journey and stops its engine sound. Skip is optional.
Stored stale destinations are reconciled against the next incomplete country.
Campaign order remains France, Nigeria, China, etc., pending clarification of
the latest Nigeria-to-France example. Completed countries/progress are preserved.

Jamie retains the original first public/private lines, with a new direct player
offer and acceptance. One in four offers is refused; that visitor walks back to
the public atrium using obstacle-aware navigation, stays unarmed, and cannot be
recruited again during the same attempt. All revised lines have recordings in
both genders and both existing American voice variants.

Resource ownership: the globe renders only for initialization, resize and texture
arrival; the SVG plane uses one animation clock. Unmount cancels animation,
request/deadline/listener/observer, releases sound nodes, disposes WebGL objects,
and closes the image bitmap. Optional texture/audio downloads never block the
mission sequence. Source attribution is in flight-assets-3.2.txt and credits.txt.

Validation: 248 automated tests, Pages production build, Chrome desktop and iPhone-sized
landscape layouts (physical iPhone Safari not tested). Browser acceptance checked Space pause/resume without ammo
loss, the revised offer/refusal, and automatic France → Nigeria flight → story
→ game. All adjacent country routes and recovery of stale destinations are
covered by tests. New assets remain small (~580 KB Earth, ~80 KB flight audio).
