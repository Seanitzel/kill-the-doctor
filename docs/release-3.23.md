# KTD 3.23 — studio, door control and cafeteria corrections

## Requested changes

1. Character Studio and Equipment now share a 16-pixel icon box, button height, type and text baseline. A responsive rule that hid the Studio label on short screens is explicitly overridden.
2. The KTD Journal uses semantic bullet lists for Stolen Identity, other Evidence assignments and Rescue. Illustrated story narration is unchanged except for Layla's requested name correction.
3. Nigeria's four-panel Pamela artwork now consistently shows the White patient with the Black Nigerian doctor. The corrected asset retains the established illustration style and panel crops.
4. Menu and modal scrolling permit native pinch in both directions. A visual-viewport listener preserves reverse pinch if a magnified menu carries into gameplay, and is removed on unmount. Normal gameplay retains its own camera gestures and double-tap guard.
5. Each colour category has its own bounded five-colour palette and default. Legacy shared outfit swatches are copied into independent shirt/trouser arrays on migration. Saving or removing a category colour cannot modify another category.
6. The China story's sister is named Layla.
7. Camera collision uses a door's actual rotated leaf rather than its surrounding world-aligned box. A valid player beside an angled door is no longer treated as standing inside it. Movement can slide out of an existing overlap without being allowed to move deeper into the obstacle.
8. The café has a drip brewer with carafe, eight nested paper cups with separate rims, six separated spoons and a floor bin. The service bay is checked against furniture, both door swings and the standing interaction point. Tables, seats, plates and diners share one layout; short and long cafés keep all twelve dining seats.
9. Phone Balanced/High resolution targets are now 1.5×/2×, still limited by device ratio and the existing 1.2-million-pixel ceiling. Floor grout uses derivative filtering and distance fading instead of aliased baked thin lines. Anisotropic filtering is capped at eight. The scene may use two samples only when both colour and depth formats explicitly report support; otherwise it retains FXAA alone. It never requests four/eight samples. The original floor material colour, roughness and metalness remain.
10. Office visitors reserve existing public waiting seats with a clear approach. The extra standalone chairs and their colliders are removed. Visitors enter in order despite differing walking distances.
11. Home portraits receive the actual saved accessories and tattoos rather than forcibly disabling them.
12. The colour dialog's indicator is a fixed 38-pixel square with a restrained rounded swatch instead of a stretched full-width oval. Apply and Save remain separate actions.

## Ownership and rendering bounds

There remains one animation-loop owner, two reused postprocessing targets and the existing 512-pixel phone source-texture limit. Audio decoding remains bounded at 8 MiB, navigation destination fields at eight per floor. New zoom listeners have explicit cleanup; door-ray scratch storage contains only numeric coordinates; category palettes are bounded. Service props are owned and disposed by their assignment system. No new recurring timers, avatar templates or unbounded caches are introduced.

The sampling decision follows the [WebGL internal-format capability query](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/getInternalformatParameter) and [Three.js render-target options](https://threejs.org/docs/pages/RenderTarget.html). Native menu zoom uses [touch-action pinch-zoom](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action).

## Verification

- All **481** unit/simulation checks and **44** browser scenarios pass. These include independent palette persistence, category isolation, existing-seat visitor order, all-country counter clearance, compact WebKit controls, native browser pinch in/out and a 479-position real China door sweep over open/angled/closed doors and eight camera headings.
- The High-quality iPhone-sized WebKit session completed **315 wall-clock seconds / 314.5 simulated seconds**, with no runtime error, context loss, reload or mission failure. After the late ambulance upload, geometry held at 1,862–1,863 and textures at 1,143–1,144. Decoded dialogue stayed below 8 MiB; destination fields stayed at most eight per floor. The canvas remained 1,605 × 747 (below 1.2 million pixels), with phone source maps capped at 512 pixels.
- All local tests use muted output, including normal dialogue loading through a silent final output bus during the Safari soak.
- Android APK, iOS Simulator and GitHub Pages production builds pass at 3.23.0. Native verification confirms both projects contain identical current production assets without a remote server or mutable development bridge.

Host tests cannot guarantee physical iPhone frame rate, thermal behavior or that every possible leak is absent. Resolution remains bounded rather than promising pixel-free output at arbitrary magnification.
