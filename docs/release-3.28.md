# KTD 3.28.0 — visible finishes and curated hallway galleries

This revision corrects three International Story Mode visual issues reported after 3.27.0.

- **Venezuela:** the floor and ceiling now use clearly visible neutral mid-grey tones. Continuous mineral grain and irregular aggregate replace the previous barely visible speckles. The floor remains matte and keeps its existing tile dimensions and grout layout; cream walls are unchanged.
- **Egypt:** floral relief follows the same window-opening definition as the structural wall builder. Full-height relief covers solid white wall bays; at office windows it is cropped to the solid header above the glass. The glass, frames, rooms, doors and collision boundaries retain their previous geometry. The header crop shares the original floral image rather than downloading or decoding another copy.
- **Nigeria:** galleries occupy only the outermost west and east hallway walls. Each of the three public floors has four different paintings, with wall artifacts alternating between pictures. Twelve paintings appear once each across the entire hospital. Central corridors, cross corridors and room-facing window walls receive no paintings. The existing peach/green walls remain unchanged. Artifacts include indigo textile displays, shallow woven domestic trays and carved wooden serving spoons.

Ten additional original paintings are stored as 512×384 JPEGs, alongside the two original paintings. Textures remain bounded, shared by the floor assemblies and released on country changes. Static decoration continues to use the existing geometry instances. See [artwork files and generation prompts](interior-art-328/README.md).

## Verification

- 539 unit tests pass. New checks verify unique artwork across all three floors, the two permitted gallery walls, alternating artifacts, preserved tile divisions, and actual batched floral raycasts through office window openings on every Egyptian public floor.
- Desktop and iPhone Safari visual checks cover Venezuela's grain and ceiling, Egypt's clear office windows, and both Nigerian galleries.
- Repeated country switching passes decoded-image retirement and bounded retained texture checks. A high-quality Nigerian Safari session passes **315 seconds** with real dialogue loading and muted output, no runtime failure or graphics-context loss, and retained resources within the existing budgets.
- Native Android and iOS Simulator packages and the Pages build are verified with the current artwork and voice assets.

The browser checks use automated WebKit, not a physical iPhone. No Replicate calls, voice changes, mission-rule changes or country locks are introduced in this revision.
