# KTD 3.21 — iPhone Safari memory-pressure fix

Reported symptom: Safari reloads with an error roughly three minutes into play. The exact physical-device termination reason is unavailable; this pattern is consistent with memory pressure. The investigation did not reproduce continuously growing retained JavaScript heap. It did identify excessive allocation traffic and unnecessarily large mobile graphics buffers.

## Changes

- Replace the collision slab test's per-call nested arrays with scalar calculations. Navigation uses its own allocation-free 2D test; sampled departure checks no longer allocate callbacks or arrays at every step.
- Reuse each swinging door's broad-phase box through weak ownership. Navigation takes a deliberate snapshot when a locked door's geometry must remain fixed. Door movement, shot occlusion, furniture collision and overlap escape preserve their previous intersection results.
- Reject distant body obstacles before square roots; remove transient door-local rectangles and crowd-check callbacks.
- Limit cached whole-floor destination fields to eight per navigation owner using LRU eviction.
- Cap small sign textures at 512 px on phones (one quarter of their previous pixel storage), retaining the original drawing coordinates, typography and aspect.
- Cap character source textures at 512 px on phones even if High quality was previously saved. Desktop retains its existing texture quality.
- Remove multisampled default framebuffers on phones. Phone mirror buffers are limited to 768 px with no multisampling and a maximum 15 Hz reflection refresh; unused mirrors still shrink on floor/distance changes. Desktop mirror resolution remains unchanged.

## Evidence

A Chromium allocation profile including garbage-collected objects sampled 2,734 MiB of allocation over 500 gameplay frames before the changes and 424 MiB afterward, approximately 84% less allocation traffic. This is allocated volume, **not** retained memory or process resident size. Different run seeds and host scheduling affect exact totals.

Ten simulated gameplay minutes before and after the change stayed around 72 MiB of retained JavaScript after collection once the ambulance crew had loaded. Four/eight repeated country-switch cycles also held graphics counts steady for each country; they did not accumulate another hospital every round. These observations distinguish allocation pressure from a demonstrated unbounded retained-heap leak.

New regression checks compare 12,000 randomized collision cases with the previous algorithm, verify exact oriented-door penetration, bounded LRU destinations, reusable door boxes and independent navigation snapshots, and phone reflection limits. A muted iPhone-sized WebKit session exercises normal voice loading and multiple floors beyond the reported three-minute interval, checking graphics counts, audio/request bounds and runtime errors. Its final output bus is silent.

All 463 unit/simulation tests passed. All 37 browser scenarios passed across the full regression run and the corrected prewarmed soak rerun. The 210-second iPhone-sized WebKit session at High quality finished with no runtime error, context loss or mission failure. After warmup, the final ambulance upload reached 1,834 geometries and 1,125 textures; active voice buffers stayed below 8 MiB and destination fields below eight per floor. The test checks source textures are at most 512 px and the phone context uses no multisampling. Normal voice decoding is exercised behind a silent final output bus.

Production Android APK and iOS Simulator builds succeeded at 3.21.0. Native asset verification passed, including exclusion of the mutable QA bridge. GitHub Pages production build passed. These finite host tests do not substitute for retrying the released build on the affected physical iPhone.
