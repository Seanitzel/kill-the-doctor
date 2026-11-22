# KTD 3.33.0 — China checklist, smoked privacy glass and protected door windows

## Changes

- **Spoon checklist:** the China infiltration checklist includes the spoon. The real cafeteria pickup immediately publishes the collected state and displays its check mark. Six compact items retain the existing two-row mobile layout.
- **Privacy glass:** the cupboard remote now produces charcoal smoked glazing with partial opacity and a glossy surface, replacing the flat opaque grey finish. Existing frames and fittings remain visible. The inside face is still culled so the player retains the original clear view out; hallway NPC sight is still blocked. This uses the existing owned surfaces and material without new textures, transmission passes or render targets. The journal and remote caption describe the updated tint.
- **First protected window:** the doctor becoming unconscious starts the existing full five-second window to enter and close the office doors. No visiting patient can open or cross either office entrance during this window, including an already-open door, an alternate entrance, an unrelated passing patient or a route-edge door shortcut.
- **Second protected window:** successfully entering and physically closing the doors starts a separate, additional five seconds to retrieve the nearby key and lock up. Patients remain outside throughout this window. The two deadlines are not combined, shortened or extended, and no numerical countdown is added.
- **Discovery:** only a missed close or lock deadline authorizes a discovery visit. The selected patient opens the door and walks in; the mission fails when that patient physically crosses into the office. Door opening, proximity to an interior destination and an expired timer alone cannot claim that somebody discovered the doctor. Existing patients can still leave the office. The failure reason explicitly describes the unconscious doctor being discovered.

The original early-entry defect was reproduced before the fix: guarding a scheduled patient's door-opening callback did not cover every open doorway, alternate door or other passing patient. Permission is now enforced at door use, the route-edge fallback and actual NPC movement. The ordinary mixing visits remain staggered and require manual stopping only on actual entry. Other missions retain their own doors and requirements. The direct elevator changes and doctor warning fixes from 3.32 remain in place.

All Story countries remain unlocked. Artwork, clothing and voice recordings are unchanged; no voice generation or Replicate spending is involved.

## Verification

All 570 unit tests pass. New checks cover immediate spoon pickup state, every office entrance for scheduled and ordinary patients, the independent lock deadline after late closure, actual discovery entry after either missed deadline, route-edge door opening, and the smoked material's one-way sight rule. Existing complete China mission, five-second timing, manual mixing, key ownership and mission isolation checks remain in the suite.

Browser checks inspect the real spoon checkbox before and after E pickup, actual rendered tint and remaining transparency, unchanged clear inside view, both protected five-second stages, an actual close interaction, actual visitor entry before failure, and successful completion of the full China assignment. Desktop checks additionally cover both countries' direct elevator rendering, doctor warning departure, doors, map and journal. Verification logs, screenshots, timing samples, package checks and live hashes are retained with the revision's automated artifacts. Browser emulation does not constitute testing or installation on a physical phone.

Ten iPhone WebKit browser groups and nine desktop browser groups pass. Android and iOS Simulator builds pass, and both compiled packages match all 1,736 voice files, all 38 interior JPEGs and the production HTML/JS/CSS: 1,777 checked files per package.
