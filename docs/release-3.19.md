# KTD 3.19 — China interactions, campaign and response performance

## Feedback coverage

| Items | Changes |
| --- | --- |
| 1, 10 | China cupboard actions resolve the real item and require a nearby player. Uniform cupboard leaves open inward; moving drawer/door bounds update camera clearance. Movement remains available throughout. |
| 2 | Character Studio and Equipment retain their existing icons and styling, with matching vertical alignment. |
| 3 | Doctor collapse starts a hidden ten-game-second securing window. Enter, take the key from the holder to the right of the front doorway, close the two doors, then lock each from inside. Entering alone does not cancel discovery. Existing patients approach physically; the open doorway permits discovery if the office remains unsecured. Helpful guidance can be disabled independently of dialogue and essential feedback; repeated instructional notices are suppressed within a round. Spitting retains its visual cue and gains a separate throat-clearing recording before release. |
| 4 | A wrong instrument retains the original request. A second mistake starts mask verification and failure. |
| 5 | Two existing patients stage outside opposite doors, then make separate shallow visits within thirty seconds of initial mixing. Stopping does not cancel their visits. A brief threshold response window lets the player stop; continuing produces the suspicious spoken line before failure. |
| 6 | The cup stays raised during the poisoned drink, follows the hand into the initial fall, then releases under gravity. Floor impact produces persistent shards, a spill at the actual landing position, a subtle shirt stain and a shatter cue. |
| 7, 15, 18, 22, 25 | Shorter actual walks and break intervals; actors leave idle/examination poses before routing. Door use begins nearby and allows enough room for the swing. Staff can unlock their own assigned room while departing. Patient dialogue checks real room occupancy. Privacy requests have a five-second first grace period, a security threat, then five further seconds; the first request never calls security. |
| 8 | Long-range visible actors continue receiving poses. Delayed contact arrivals wait until the entrance is outside the view; police enter outside sightlines. Floor arrivals appear behind cabin doors and walk out as the lift opens, rather than appearing in the concourse. |
| 9 | Escapes schedule a tactical power fault sooner. Only armed security escapes and living-hidden-offender searches extend an outage by ten seconds. Ordinary outages retain their normal duration. |
| 11–14 | Existing assassin narratives and illustrations remain; hiring revelations come at the end. Detective assignments establish the victim’s conflict before the family’s investigation/rescue request. Completed countries can be replayed as Story assignments, retaining the default story and difficulty. Disguise/rescue task cards withhold the office answer; hospital notices reveal the access trail. |
| 16–17 | Michael Bennett’s announcement remains. Added varied imaging, blood collection, staff and visitor pages, plus additional sneeze replies without removing the originals. New lines use the existing locally designed fictional American voices, with manifest hashes. No new paid generation. |
| 19 | Collect a physical cafeteria spoon before mixing. Stirring uses a fitted right-arm/finger pose and a world-space grip, a visible spoon and quiet stirring sounds. The utensils table remains after the spoon is collected. |
| 20 | Exactly ten Story destinations: France, Nigeria, China, India, Russia, Venezuela, America, Egypt, Somalia, England. Existing valid country completions, coins and attempts migrate by country identity; new destinations are not silently unlocked. |
| 21 | Cabin roof bounds constrain the camera across all public floors. |
| 23 | Evacuation initialization is queued across frames and shares exit fields. Standing-position selection checks the nearest candidates first, rather than doing expensive physical clearance checks for every node on the floor. Freeplay guards vary from one to three; Story levels 5/7/9/10 have 2/4/6/8 guards. |
| 24 | Both Shift keys run; C crouches. The guide shows Shift. |
| 26 | Confidential rota departments vary across the campaign rather than always using Records. |
| 27 | Authored city/season weather is visible in gameplay. Moscow has snow; Lagos/Caracas have storms; Cairo/Mogadishu stay dry. India, Venezuela and Egypt gradually move through golden hour, sunset and night with synchronized exterior lighting. See [weather references](weather-missions-3.19.md). |
| 28 | Hidden offenders block escape in armed Story assignments. They remain optional in Freeplay; other marked staff remain optional in both. Nonviolent detective assignments retain their protected-patient/no-casualty rules. |

## Resource and performance checks

New spoon/visitor state uses the main game clock, without another animation loop, timeout or global listener. Props, material ownership, borrowed character references and collision bounds are released on retirement. Camera collision caches refresh moving furniture bounds. Existing bounded voice caches, recorder ownership, startup serialization and native lifecycle checks remain in the regression suite.

A muted desktop Chromium run with 87 characters measured a target shot at 7.9 ms. During the first 45 evacuation frames, the mean CPU update was 35.9 ms and the largest was 173 ms on this Mac. This exercises the former synchronous freeze trigger; it is not a physical-iPhone frame-rate guarantee. No long-duration universal leak guarantee is implied.

## Verification

- 434 unit checks passed, including two actual routed patient interruptions, physical discovery, near-only actions, hidden locking time, retained instrument requests, both real character rigs at four stirring rotations, migrations, replay stories and sunset continuity.
- Desktop Chromium and iPhone WebKit browser checks cover the menu baseline, persisted guidance setting, cupboard movement, all-floor cabin camera bounds, visible weather and the measured shot/evacuation path.
- Android debug APK and iOS Simulator builds succeed at version 3.19.0 (build 3019000). Production native assets pass the QA-bridge exclusion check.
- Story final panels show the named client contract above their task list; mobile panels scroll without obstructing the entry button.
- All 31 browser scenarios passed across the full regression run and the corrected clinic resumption check. The clinic fixture now leaves after the first request, so it does not mistakenly assert that no new warning occurs while remaining past the requested five-second threshold.

Completed debriefs no longer render the hidden hospital. A late WebGL context reset preserves the saved result; active assignments retain their explicit graphics recovery screen. This addresses a cloud-run GPU interruption observed after a patient-shot failure had already completed.
