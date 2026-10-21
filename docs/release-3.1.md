# KTD 3.1 — Reliable assignment preparation

## What changed

Entering after the story, retrying, restarting and traveling now use the same controlled preparation flow. The loading screen paints before expensive work starts and shows named stages, step progress, elapsed time, slower-first-visit guidance and a safe cancel action. Gameplay and its controls appear only after the first hospital frame has rendered. Failures offer Try Again, Try Lighter Graphics, Reload and Return to Menu. Saved coins, equipment and campaign progress are preserved.

The original start awaited both Web Audio resume and every sound download. Those optional operations could stall entry, especially without audio permission or on an interrupted connection. They no longer gate gameplay. Audio resumes and downloads have bounded waits; stalled sound requests are aborted, concurrent starts reuse one graph, and late completions cannot repopulate disposed owners.

A start attempt owns one cancellation signal, deadline and progress stream. Repeated requests for that assignment share its job; a different assignment cannot overwrite an active start. Story completion emits once and stops its old timer. UI launch identifiers prevent canceled work from reopening gameplay or replacing a later attempt. Returning to the menu, disposing the engine or a graphics interruption cancels outstanding setup. Native Back and Escape also cancel preparation. Loading and paused menus retain normal Tab navigation rather than the game consuming those keys.

Character downloads have deadlines and abort their requests when retired. Partial asset results are disposed on failure; failures remain retryable instead of poisoning a cached promise. Movement retargeting is prepared once per character with browser yields, then reused. Hospital floors, staff and consultations are prepared in batches that allow feedback and cancellation between them. Optional portraits are generated after the initial gameplay handoff rather than blocking it.

Shader warmup covers the initial visible view. The unbounded Three.js compileAsync poll is replaced with an abortable readiness check capped at 15 seconds. Its small r180 adapter uses renderer-internal currentProgram readiness and must be reviewed when Three.js is upgraded. Whole preparation has a 90-second deadline; character requests have 30-second deadlines. Graphics context loss and runtime errors lead to recovery controls instead of continuing on retired state.

Failed or canceled preparation releases partial mission actors, props and any orphan scene roots. Renderer lists are retired on stop. A mission-ending frame now returns immediately when completion clears its scene; subsequent systems cannot dereference that retired mission. Existing disposal of avatar skeletons, textures, hospital instances, mirrors, clinical cables, effects, dialogue, observers and listeners remains in use.

Hand-face classification is weakly cached by source geometry, avoiding repeated full scans for every clinician. Character preview caches its framing until appearance or framing mode changes, and resizes its drawing buffer only when size changes, rather than recalculating every posed vertex during rotation. Preview rendering remains on demand.

## Validation

- 241 automated tests pass, including stalled/aborted downloads, late completions, duplicate and conflicting starts, mid-setup cancellation, shader failure followed by retry, partial scene cleanup, optional audio that never resolves, audio graph reuse and sound-request deadlines. Existing avatar geometry, movement, mission, resource and twenty-country checks also pass.
- GitHub Pages production build passes. No dependencies added.
- Actual browser UI: repeated home/story entry taps, final story Enter double-tap, automatic story completion, repeated Restart taps, download failure → restored downloads → retry, canceled graphics wait, shader error → lighter graphics → gameplay.
- Twelve repeated start/stop cycles produced identical active counts (407 geometries, 305 textures) and identical stopped counts (76 geometries, 106 textures). Every stop had zero NPCs and 20 persistent scene children. No uncaught errors or failed starts were reported. These are retained renderer counts, not bytes of heap memory.
- Six country changes (France, Nigeria, China, Japan, Israel, India) started successfully. Every stop had zero NPCs, 20 persistent children and 76 geometries. Retained textures were 106–107, accounted for by the small clothing cache increasing from 19 to 20 entries; iris cache remained 12. Explicit engine teardown removed its canvas and closed its audio context.
- Desktop and 956×440 phone layouts checked. Isolated fault/stress fixtures and screenshots are ignored under artifacts/revision-3.1 and are not shipped or exposed on GitHub Pages.

## Practical limits

The repeated-cycle checks found no accumulating game resources in the exercised paths. They are not proof of absence of every possible leak or a guarantee against operating-system tab termination. Physical iPhone Safari, native builds and device-specific memory pressure were not tested in this revision. Browser audio permissions still apply; sound being unavailable no longer blocks entry.
