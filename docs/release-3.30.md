# KTD 3.30.0 — country art, clothing and exterior corrections

## Changes

- **Nigeria:** both maternity newborns use dark skin tones. Two original family paintings occupy the marked entrance walls; eighteen further original family paintings fill the gaps in the two outer hallways. The full hospital has 32 distinct paintings with domestic wall artifacts between them. Framed paintings no longer emit light and respond to blackouts. A selection of patients wear gele, blouses and wrapper skirts, or patterned embroidered long shirts, trousers and caps. Clinical staff and bed patients retain their clothing.
- **India:** restores the original 3.25 cream/brown wall, floor and ceiling finishes; removes the later brown ceiling override. Adds working ceiling fans, framed family and craft paintings, and a reflective silver elephant wall sculpture opposite a family picture at the entrance. Some patients wear saris with a pallu and red forehead bindi; some male patients wear kurtas and trousers. Existing lotus craft remains.
- **America:** glazing is restricted to the long exterior walls of the far west and east corridors. Room partitions and the central hall remain opaque, and the existing collision envelope is preserved. Short projecting annexes are not mistaken for the main side hallways.
- **Russia and England:** Story ground snow uses a continuous, wind-rippled terrain mesh with distributed soft drifts. Russia's four box banks are removed. The central entrance path stays shallow. Snowflake appearance, count and reused animation buffers are preserved.
- **Egypt:** replaces the sharp solar sphere with a small shader billboard that has a soft limb and an atmospheric glow. The existing sunset timing, directional illumination and nighttime crescent remain.
- **France:** Story uses visible blue-white lightning and thunder. Timing follows active mission time and resets for a new/replayed mission; it is independent of time spent in menus or paused.
- **Toilet signs:** white panels and black male/female/accessibility pictograms in Nigeria, Venezuela, Somalia, Egypt and India. Other countries keep their earlier signs.

## Scope and resource ownership

These are International Story changes. Existing mission rules, injury logic, doors, keys, objective timing, country access and voice recordings are preserved. No voice generation or Replicate spending is involved. All countries remain unlocked for exploration.

New clothing uses the existing animated character skeletons with normalized skin weights. Owned garment geometry, materials and the single 128px fabric map per wearer are released on retirement. The artwork loader shares one map per original across floor assemblies and keeps its cancellation/retry/bitmap cleanup. The elephant geometry is merged once; shared primitive buffers remain owned by the pool. Sun glow and snow do not allocate per-frame textures or extra bloom targets.

Artwork prompts, output records and primary clothing references: [interior-art-330](interior-art-330/README.md).

## Verification

551 unit tests pass. Two further browser regression checks pass for clues, journal/map/lift use, door collision state, blackout recovery and the flashlight. All four desktop visual/lifecycle groups and all four iPhone WebKit visual/lifecycle groups pass. A 315-second high-quality Nigerian iPhone WebKit session passes without a page reload, runtime failure or graphics reset; graphics resource counts settle after uploads, and the dialogue cache stays below 8 MiB. Both Android and iOS Simulator builds pass; the compiled packages match all 1,736 voice files, all 38 interior JPEGs, and the production HTML/JS/CSS (1,777 checked files per package). Verification results and build/live hashes are recorded with the revision’s automated artifacts. Browser checks include the marked wall placements, newborn skin, actual blackout rendering, country-specific signs and glass, clothing movement/seating, and repeated artwork/garment retirement. An extended iPhone WebKit session checks graphics/audio resource limits after warming all floors. Native packages are compiled separately and their bundled production assets are verified.

These are automated browser checks and an iOS Simulator build, not a physical iPhone installation or a guarantee of device memory behaviour.
