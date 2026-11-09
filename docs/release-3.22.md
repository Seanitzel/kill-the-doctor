# KTD 3.22 — clear rendering and stable movement

The 3.21 memory changes disabled phone edge smoothing, which visibly degraded diagonal edges. This revision restores edge smoothing with the standard Three.js OutputPass → FXAA order. Two bounded offscreen targets avoid mobile multisample buffers; their materials and targets are explicitly disposed with the engine. Mobile resolution is explicit: Low 1× CSS pixels, Balanced 1.25×, High 1.5×, subject to the device ratio and a 1.2-million-pixel framebuffer ceiling for large displays. Shared character textures, smaller phone sign textures, mirror bounds, collision allocation savings and the eight-field navigation cache remain bounded.

## Root causes and implementation

- **Frame pacing:** The old limiter restarted its phase at each accepted frame. A ten-second synthetic 60 Hz callback stream alternating 15.867/17.467 ms rendered only about 301 frames. `frame-pacing.js` preserves target phase with a bounded early window, follows the browser animation timestamp, and never creates catch-up render queues. Jittered 60/120 Hz, 30 Hz delivery, menu/pause caps, long stalls and resets have deterministic regression cases. This follows [MDN's timestamp-based animation guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) and the existing [Three.js animation-loop contract](https://threejs.org/docs/pages/WebGLRenderer).
- **Route hitches:** A* previously scanned every open node to find the next minimum, and nearest-node lookups scanned every floor node. Search-local indexed priority queues handle decreased scores without duplicate entries. Spatial rings stop once no unvisited grid node can beat the nearest valid candidate, preserving deterministic tie order. Navigation snapshots and the bounded destination LRU are retained. Randomized tests compare against exhaustive nearest-node search; route lengths are checked against a breadth-first reference field.
- **Touch continuity:** Safari toolbar height changes reset the held joystick, and its origin was recalculated from a moving layout on each pointer event. A held stick now keeps its original thumb anchor through toolbar changes. Real width/orientation changes, release, lost capture, page hiding and blur retain their safety resets. A second finger cannot replace the movement touch owner.
- **Animation time:** Distant NPC mixers now receive elapsed pose time rather than losing the skipped frame intervals. Catch-up is bounded when an avatar returns to view. The player's actual run state is supplied to locomotion.

## Structure and ownership

The engine retains one animation-loop owner. Small independent modules own frame cadence, resolution policy and search-frontier storage. The frontier is search-local; door bounds use weak ownership; images, audio and persistent navigation caches keep their existing bounds. This is a focused runtime correction rather than a broad rewrite of working mission systems.

## Verification

- All 473 unit/simulation checks pass. Added cases reproduce the frame-limiter regression, compare navigation with exhaustive/BFS reference results, cover touch ownership, and verify postprocessing pass order, bounded target reuse, exceptional state restoration and idempotent disposal.
- Production Android APK and iOS Simulator builds succeed at 3.22.0. Native asset verification confirms both contain current production assets with no mutable QA bridge or remote development server.
- All 39 browser scenarios pass, covering camera/furniture collision, crosshair hits, injuries, clinic routines, UI, mission flow and touch controls. The new phone cases check resolution budgets, actual rendered color-target pixels, and a held joystick across toolbar and orientation changes.
- The High-quality iPhone-sized WebKit session ran for 315 wall-clock seconds across the floors, with 287 simulated seconds, no runtime error, context loss or mission failure. After the late ambulance upload, graphics held at 1,856–1,857 geometries and 1,130 textures. Destination fields stayed at most eight per floor; decoded dialogue remained below 8 MiB. The fixed render targets remained 1,257 × 585, with source textures capped at 512 px. Normal audio loading/decoding ran through a silent final output bus.
- GitHub Pages production build passes. A deployed-production smoke check follows publication.

Host measurements do not establish physical iPhone performance or prove the absence of every memory leak.
