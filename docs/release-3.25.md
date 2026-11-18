# KTD 3.25.0 — gameplay reliability and international hospital interiors

This release implements the November 18 feedback. Existing room coordinates, corridor connections and department locations on the original floors remain intact. The higher-level expansion adds floors rather than rearranging those rooms.

## Gameplay repairs

- Busy frames previously discarded elapsed time above 50 ms. The simulation now accepts normal low-frame-rate intervals up to 250 ms, while collision movement uses short spatial steps and genuine suspension remains bounded. Pausing and visibility changes reset the clock as before.
- Nearby crowd collision queries use a frame-local spatial index. Navigation measures progress toward waypoints, reroutes actors that are circling, and prevents evacuation detours from repeatedly turning backwards.
- Clinical cables are visible only while their assigned clinician is actually examining that patient nearby. Departing rota custodians complete the consultation and leave without stretching a cable through the hall.
- The posed chest region includes the lower ribcage. Player and hostile bullet occlusion use the actual hinged door leaf rather than the larger enclosing rectangle. Existing arm, leg, hip/back, fatal-region and three-wound rules remain shared across roles.
- Every person can receive a physical hit. Shooting an innocent or unauthorized person immediately fails the mission; authorized armed security and accomplices retain their existing escape-combat rules. Drawing a gun in a patient's view still fails even beside the assigned target.
- Gunshots cause panic within 6 m, alarm within 18 m, and suspicion within 45 m. Suppressors reduce those distances. Moderate listeners say “What was that noise?!” using newly prepared local recordings of the existing fictional voices. Nearby panic starts a single five-second opportunity to shoot the target; additional shots do not extend it. A nonfatal target hit satisfies that shot opportunity while the target remains injured and can still flee.
- Security positions appear automatically on the corner map during pursuit, including on iPhone. Other-floor guards are identified by floor. Accomplices wait until all security guards are defeated, then flee or use their existing hiding/attack behaviour.
- Lift arrivals clear carried movement/fire input and interception state, update the arrival position before floor-dependent systems, and preserve the active mission, clues, keys and elapsed time. The ground-floor lift cabin is indoors; it no longer starts exterior rain audio.
- Each doctor warning grants five complete seconds after the warning is issued, including when a frame arrives late. A consultation cannot silently finish and cancel an active warning sequence.

## Nigeria rota search

Hospital information explicitly tells the player to consult the doctor's rota. Room 205 displays its appointment wait, departure state and room availability. The custodian keeps examining the patient until the appointment finishes and takes a scheduled colleague consultation rather than abruptly visiting the bathroom.

The Story mission now requires a separate storage key from the Maintenance cupboard, then unlocking and searching Room 205's cupboard shelves. Its key is local to this interaction and never substitutes for a Theatre or basement key. The actual rota is collected after it is found; its stand/cupboard remains physical.

## Floor progression and visual scope

The hospital has **five floors in total from level 4 and six from level 7**, counting the existing restricted basement. The new third and fourth public floors contain furnished respiratory, orthopaedic, therapy, renal and diagnostic departments, working lifts, waiting seats, patients and clinicians. Public stairs connect the added floors where the existing stairwell progression applies; they never bypass basement access.

Story interiors follow the supplied references:

| Country | Finish and detail |
|---|---|
| France | Bright neutral finishes, timber slatted ceiling and light timber seating |
| Nigeria | Peach/green split walls, worn neutral flooring, simple metal fittings and ceiling fans |
| China | White clinical finishes, blue signs, medical displays and a charging delivery robot |
| India | Brown lower walls and framed lotus craft |
| Russia | Blue floor tiles and modern pale finishes |
| Venezuela | Grey tiles and cream walls |
| America | Wood-style flooring and warm neutral walls |
| Egypt | Marble-style flooring, gold-toned fittings and geometric wall panels |
| Somalia | Yellow/cream split walls, beige worn flooring and simple fans |
| England | Existing default appearance preserved |

Public department and wayfinding signs put English first with French, Igbo, Chinese, Hindi, Russian, Spanish, Arabic or Somali beneath as appropriate. Arabic text uses right-to-left drawing. America and England keep English signage. Existing floor-tile proportions remain unchanged where a country does not explicitly request a different floor material.

The material and sign changes are isolated to Story Mode. Freeplay and the English hospital retain their existing finishes; other mode values do not opt into the redesign. Custom materials and small procedural textures have explicit ownership and disposal when switching countries. The mobile pixel ceiling, texture limits, bounded audio cache and limited navigation fields remain in place.

Late-level mandatory offender objectives are reserved during the security phase, so delaying accomplice movement cannot accidentally turn those assignments into an early exit. The corner map reuses its static floor plan between live player/guard updates rather than rebuilding rooms every HUD refresh. Interrupted country preparation invalidates its signature before rebuilding, preventing a partially prepared hospital from being mistaken for a reusable completed one.

## Verification

- All **515 unit checks** pass on the final source, covering damage, warning/panic deadlines, floor progression, resource disposal, interrupted country preparation, held accomplice objectives and the earlier mission rules.
- The complete **52-scenario browser suite** passes across desktop and iPhone-sized Chromium/WebKit sessions. After the final map-cache, cancellation and objective-reservation corrections, all **seven affected browser scenarios** were rerun and pass, including actual phone lift-selector taps through every public floor.
- The full China assignment passed three consecutive runs, plus the final focused rerun: manual mixing, two individually seated visitors, collapse, closing/key/locking stages, disguise, three recordings and escape. These automated playthroughs use rendered characters and real controls with controlled time and repositioning between objectives.
- A 315-second high-quality phone WebKit session exercises the real voice-loading path through a silent output bus. A separate 200-second six-floor phone session traverses additional floors with 110 actors. Both remain running without reload, context loss or runtime errors; the latter holds at 2,330 geometries and 1,457 textures after warmup, with navigation caches within their limits.
- Android APK, iOS Simulator and signed generic iPhone builds compile successfully. Both native projects contain identical production web assets, without a remote server or mutable testing bridge. The GitHub Pages production build also succeeds.

All local testing remains muted. These browser sessions do not substitute for a physical-device playthrough or guarantee behaviour under iOS memory pressure or thermal throttling. Noga's paired iPhone 12 Pro Max is currently unavailable, so this revision has not been installed or played on that phone.
