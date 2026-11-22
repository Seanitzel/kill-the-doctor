# KTD 3.31.0 — China privacy remote and responsive controls

## Changes

- **China Story privacy:** the target doctor's office cupboard contains a physical glass privacy remote in its top drawer. Searching the cupboard makes it available before coffee preparation, independently of the later basement-key search. USE toggles grey, opaque hallway-facing glazing while the inside view remains transparent. Door windows follow their moving door leaves. NPC sight respects the same one-way rule; ordinary wall and door collision is preserved. The remote does not prevent a visitor from entering through an open door.
- **Mission instructions:** the final China story slide, assignment tasks, journal and current objective explain where to find the remote and why to use it before mixing. They also explain restoring clear glass before leaving to watch the doctor return and drink. Cupboard controls work during this early search without granting a later key or requiring an unrelated mission's key.
- **Visitor failure timing:** opening the office door provides a warning. Failure occurs in the same movement update in which a male or female visitor actually crosses into the office while mixing continues. There is no door-opening timer. Patients still inside while returning to their seats remain witnesses. The player retains manual mixing control.
- **Elevator feedback:** a valid floor press immediately uses the original lighter selected-floor palette. The destination changes after that state has had a frame to paint. Pending selections are cancelled when the overlay or mission closes; the original button layout is retained.
- **Flashlight response:** phone controls activate on touch-down instead of waiting for release. Keyboard activation and brightness adjustment remain available. The light keeps a stable graphics slot with zero intensity when off, avoiding a full material recompile on the first toggle.
- **Graphics preparation:** loading prepares materials for the lighting configurations on every floor and waits for all compiled variants of shared materials. This moves first-use graphics work out of flashlight activation and floor travel. Hidden avatars' textures and geometry are not all uploaded during preparation. Temporary preparation objects are released without disposing shared resources; inactive flashlight shadows do not render repeatedly.

## Scope

The privacy remote is specific to China's International Story infiltration assignment. Other countries and Freeplay retain their own mission rules. Existing doctor warnings, patient visit spacing, both separate five-second post-collapse stages, instruments, recordings and escape remain in place. All Story countries remain unlocked. Artwork, country clothing and voices are unchanged; no voice generation or Replicate spending is involved.

## Verification

All 558 unit tests pass. Seven iPhone WebKit browser groups and seven desktop browser groups pass, with separate checks that the extended final briefing remains scrollable. The 315-second high-quality China WebKit session changes floors and toggles the flashlight and privacy surfaces without a runtime failure, page reload or graphics reset. Resource counts settle after uploads, and the dialogue cache remains below 8 MiB.

Verification covers the cupboard search and subsequent key search, directional surface rendering and NPC sight, unchanged collision, male/female entry boundaries, restoring clear glass, cancelled controls and owned-resource disposal. Automated browser checks exercise the real E interaction, actual rendered pixels from each side of the glass, floor-button colour and destination, touch-down flashlight activation, and the final story/journal UI. A complete China playthrough covers the remote, both visitors, coffee preparation, collapse, the two door stages, disguise, basement recordings/instrument requests and escape.

The measured iPhone WebKit cold render decreased from about 3.2 seconds to about 20 milliseconds for flashlight activation, and from about 2.5 seconds to about 240 milliseconds for the first floor change. These are local automated measurements, not physical-device guarantees.

Native Android and iOS Simulator packages compile successfully. Their bundled production assets match all 1,736 voice files, all 38 interior JPEGs and the production HTML/JS/CSS: 1,777 checked files per package. Test results, screenshots, performance samples, package hashes and live deployment checks are retained in the revision's automated artifacts. This verification does not install a new build on a physical iPhone.
