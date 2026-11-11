# KTD 3.23.1 — restore the original floor

Restores the pre-3.23 hospital floor texture, original UV mapping, grout spacing and line weight exactly. The colour, noise texture, roughness and metalness match 3.22. The world-coordinate filtered grid introduced in 3.23 is removed: its constant screen-width lines made the floor visibly denser than the original subtle textured divisions.

Phone resolution limits, edge smoothing, movement/collision fixes and other 3.23 changes remain. This adds no textures, render targets, caches or animation work.

Verification: full unit/simulation suite, focused iPhone-sized WebKit rendering and movement checks, visual comparison, Android/iOS builds and GitHub Pages packaging. Physical-device installation is checked separately when the registered phone is connected.
