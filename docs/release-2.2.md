# KTD 2.2 validation

This revision adds the staffed medicine store and three-person queue, bedside infusions, hospital machine/pain sounds, uncertain gunshot reactions lasting 120 seconds, camera pinch zoom, expanded character styling, and an optional rare visitor encounter. Three eligible assignments per ten contain the visitor; retries keep the same assignment. A recruited contact waits for the primary objective before acting autonomously.

Adrian, Alex, and Custom are the three character choices. Legacy additional profiles migrate to Custom while retaining progression and appearance. Preset faces use the existing rigged models with revised styling; this release does not replace them with scanned faces. Dialogue uses bundled generated voices with revised pacing and alternate deliveries, not human voice acting.

## Verification

- 117 unit/regression tests pass, including actual collision-aware escort movement, primary-target gating, patient protection, repeated assignment selection, all-floor evacuation, save migration, appearance cleanup and two-pointer camera math.
- Both normal production and GitHub Pages builds pass.
- Browser playthrough at 956 × 390 walked through the concourse, opened the pharmacy door, approached the queue and counter, and observed pharmacy conversations. No browser errors were recorded during that playthrough.
- Four consecutive complete mission starts, each rendering all three floors, stabilized at 281 geometries, 900 textures and 25 shader programs. These are renderer object counts, not byte measurements or a claim that total device memory is fixed.
- Three full Vue mount/unmount cycles included cancellation during loading and teardown of live missions with pending UI effects. Each ended with zero tracked textures, scene children, canvases and pending voice requests; audio contexts and development bridges were released.
- Two simultaneous engines retained their shared primitive buffers when one was disposed: the remaining renderer stayed at 43 geometries. Disposing both returned tracked geometry counts to zero.
- The unseen-shot fixture produced a 120-second worried state and uncertainty dialogue without reporting identity. Private recruitment kept the contact unarmed until the primary objective; a 12-second evacuation simulation then observed autonomous staff attacks.
- The camera fixture exercised two-pointer pinch from zoom 1 to 1.7 while retaining the collision solver. Physical iPhone multi-touch and sustained device frame rates still need user validation; desktop viewport emulation cannot establish either.

Local evidence is kept under ignored `artifacts/hospital-v3/`: test output, resource and lifecycle JSON, appearance previews, and a pharmacy gameplay screenshot. The earlier 2.1.1 audit remains in `mobile-performance.md` as historical evidence.
