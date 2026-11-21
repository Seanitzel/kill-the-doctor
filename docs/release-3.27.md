# KTD 3.27.0 — country interior adjustments

These changes apply to International Story Mode. Room coordinates, doors, corridor cells, floor tile dimensions and mission rules retain their existing layouts. Freeplay and Terror keep their previous finishes.

## Country finishes

- **Nigeria:** whitish-grey ceiling tiles; peach-and-green interior wall colours preserved. Original framed market and pottery paintings, indigo textile accents and woven domestic wall trays occupy separated hallway bays above the handrails, across public floors. See the [artwork research and generation notes](interior-art-327/README.md).
- **China:** white marble with natural procedural veining and thicker grout, retaining four divisions per original floor module. Hall-facing internal wall sections become clear glass above frosted lower panels, with metal frames. Wall/door collision and gameplay occlusion boundaries remain unchanged; jambs, headers and exterior walls remain structural.
- **India:** dark beige ceiling, retaining the brown walls and existing craft details.
- **Russia:** pale blue-grey ceiling, distinctly lighter and less saturated than the blue floor.
- **Venezuela:** grainy grey tile texture, rougher finish and subtle bump detail; complementary grey ceiling and existing cream walls.
- **Egypt:** black-and-gold marble with flowing mineral ribbons, gold ceiling tiles, ivory floral hallway panels, and gold vases with white flowers. One vase is immediately left of triage. Vase placement checks existing colliders and door swing clearances; physical colliders keep characters from walking through them.
- **Somalia:** brown ceiling, retaining the yellow/cream walls and beige floor.

## Entrance and exterior repair

The old front facade sat behind the interior wall rails and omitted an opaque door lintel. The Story facade now encloses those surfaces, including the ceiling edge, while retaining the existing six-metre entrance portal. Expanded buildings also receive side/rear returns following their actual indoor boundary, without closing the rear exit.

France and England retain the blue entrance surround. The other countries use their own upper/lower wall colours and trim. Existing upper exterior windows and the street remain intact. In-game interior and front exterior views were checked for all ten current Story countries; geometry raycasts also check the repaired front lintel and rear surface while preserving the rear portal.

## Resource ownership and validation

The four original JPEG assets are at most 512px on their longest edge and shared across floors. Static pictures, textile details, vases and flowers are baked into the existing geometry/material instances rather than adding a draw call for every petal. Artwork downloads are bounded and cancellable; decoded images are closed when a country is retired, including late results after cancellation and retries after failed loads.

- **536 unit tests pass**, including country/mode isolation, unchanged Nigerian wall colours and tile divisions, identical Chinese wall colliders, triage vase placement, actual exterior raycasts, transform baking and asynchronous artwork cleanup.
- Browser visual checks cover all ten Story interiors and entrances. An iPhone 12 Pro Max WebKit scenario repeatedly switches Nigeria/Egypt and checks decoded image cleanup, texture size limits and stable retained texture counts.
- The existing real-door E interaction regression passes across the public floors.
- The high-quality Safari soak passes **315 seconds** with real audio loading and muted output, with no runtime failure or graphics-context loss and bounded dialogue memory. These are automated browser checks, not a physical-device guarantee.
- Android debug APK, iOS Simulator app and GitHub Pages builds pass. Native asset verification includes all four new images and the existing 1,736 voice recordings; their hashes are also checked inside both compiled packages.

No Replicate generation or voice changes were made in this release. The France/Nigeria voice update and the pending Igbo/Yoruba recordings retain their previous state. Story countries remain unlocked for exploration.
