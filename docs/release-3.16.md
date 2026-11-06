# KTD 3.16 — Emergency access, escape encounters and lifecycle audit

## Gameplay and presentation

- Ambulance lane avoids solid street lamps. The stretcher and admitted bed have owned, dynamic collision bounds. Transport waits for sliding entrance and emergency leaves to open, and asks pedestrians and security to move aside. Seated guards finish their standing transition rather than becoming trapped in the chair. Yield routing is throttled.
- Smoking lowers the wrist beside the shoulder line, with a consistent elbow bend direction through the entire cycle. The target doctor's borrowed desk cup follows a timed pickup, lift, sip and replacement sequence on both rigs. Preparing the coffee explicitly tells the player to watch through the office window and enter when the doctor is unresponsive. Jamie's distress source follows his actual position with stronger close-range attenuation settings.
- Searched office drawers and the outfit cupboard can close and reopen. France rota messages stop when its document has been collected. Initial rota breaks take 10–18 seconds; office collection windows and bathroom trips are shorter. Ordinary appointments now last 45–90 seconds with the existing 30-second privacy warning. Countdown formatting cannot produce `09:60`.
- Every equipment upgrade tier costs 150 coins more than its former price, without changing previously owned upgrades. Equipment is beside Character Studio on the menu. The first four premium designs use separate suit, bomber, long coat and utility details; fitted closed torso/sleeve geometry replaces intersecting source clothing.
- Players can save at most five validated custom outfit colours. A saved palette replaces the original shirt/trouser swatches, survives reload and supports removal/replacement.
- Mystery Soda makes a fresh independent roll per drink: 40% doubles the remaining appointment and 60% halves it. A 100,000-roll deterministic distribution test checks the implementation and exact boundary.
- Spitting has a 1.5-second visible windup and a dodgeable projectile aimed at the player's earlier position. A hit immediately shows a red ten-second movement restriction countdown; the skin effect fades over that same period.

## Escape and later levels

- After the target goes down, security's live map dots are available first. Accomplice tracking unlocks only after all security guards are defeated. Escaping while security is alive still succeeds; remaining past the escape deadline still fails.
- From level five, five marked case accomplices mix runners and randomly assigned hiding spots: open office desks, hollow cupboards, beds and bathroom stalls. Most other staff evacuate. Hidden map dots identify the room rather than the furniture. Search prompts reveal hiders, and an unsuccessful room visit can trigger relocation.
- The five-actor ability cycle is two guns, one syringe and two distinct gas threats. Attacks show windup warnings and visible equipment/poses; distance, cover or a timely dodge can prevent a hit. Successful attacks immediately fail the mission. Hidden accomplices award 60 bonus coins versus 25 for runners; eliminations are deduplicated. Bonuses remain optional, and existing red overhead markers are retained.
- Level five is now a target assignment so the requested hiding encounter can occur there. From level six, public stair landings connect floors 0, 1 and 2, and a second automatic glass exit opens onto the rear forecourt. The basement restriction remains. Map signage shows the new routes.

## Organisation, memory and startup audit

New behaviours are separated into `escape-threats`, `coffee-sip`, `stairs`, `saved-colors` and `time-format` modules. Reviewed startup cancellation and failures, mission retirement, character/material ownership, dynamic colliders, dialogue requests, particles, phone props, mirrors and recording resources.

- Constructor failures clean up already-built floors, graphics and input handlers.
- A stalled voice request is aborted after twelve seconds and releases its pending slot.
- Fitted medical/premium clothing skips unused recoloured outfit textures.
- Threat props, particles and cupboard colliders are owned by one controller and released idempotently; office cups remain borrowed. Ambulance bed bounds are reused rather than abandoned between arrivals.
- Repeated phone/smoke use reuses fixed pools; character source assets remain immutable. Disposal and failure-path regression tests verify these ownership rules.

## Verification

All 398 automated tests pass. Automated tests cover actual male/female rigs, continuous smoking motion, timed coffee pickup/replacement, poisoned-office interactions, independent soda randomisation, palette/save migration, pre-hit warnings and dodging, guard/map gating, hiding relocation, every attack outcome, escape with living security, reward deduplication, stair access/travel, ambulance lamp/stretcher collisions and a seated guard plus blocking pedestrian.

Muted browser checks exercise the real loading/start flow, five-colour limit, guard tracking followed by room-only hidden tracking, searching/revealing a desk hider, an attack failure, staircase travel and rear exit presentation. The production Pages build passes. A browser restart of the same France assignment returned to the identical sampled baseline: 591 geometries, 332 textures, 86 NPCs, 9 clothing-cache entries, 13 appearance-cache entries and unchanged per-floor collider counts. No page errors were recorded.

Limits: local browser testing stays muted at the owner's request, so spatial audio changes are verified through channel/source behaviour rather than listening. No physical iPhone performance measurement or unlimited-duration leak guarantee is claimed. The build retains a warning for the large main game bundle; this revision reduces avoidable per-character allocations but does not replace the existing renderer or assets.
