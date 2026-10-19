# KTD 2.8 — International assignments

- Twenty sequential story destinations and twenty fictional hospitals/assigned doctors. Freestyle only exposes completed countries. Legacy progress, coins, upgrades and saved looks migrate without a new save key.
- Story wins advance the passport; freestyle wins and failures do not. Stable assignment seeds/cases survive retries and refreshing still replays the intro.
- Next Mission shows an 8.2-second globe flight with departure/arrival pins, a black dotted route, moving plane, plane audio and the unchanged in-game theme. Skip/Escape/native Back skips the flight. Its renderer and audio source are released afterwards.
- Custom-only eye, nose and mouth shapes change actual rig geometry. Five premium outfits are bought once with coins; unpaid looks loaded from saved slots cannot equip them. Weapon purchases remain coin-gated.
- Emergency privacy exemption; naturally closed Laboratory/Research doors, service key in Records and later-level lab diversion. Contacts occur in five of each ten attempts from level five (standard assignments only), with identity variation on retries.
- Mystery Soda: 5 coins, unlimited stock, one carried can consumed per use during a consultation. 60% doubles remaining appointment time; 40% halves it. The Dream Vial is a fictional game item and includes no real substance or dosage.
- A collapsed contact stays down through an alarm; emergency staff come to help. Patients remain protected.
- One antidote per whole hospital, on a seeded random public floor, absent from all map HUD data.
- Actual reflections in bathroom mirrors. Patient wristbands, taped IV caps, a tiny stain, minor nose/head injuries and bounded floor drops. Incomplete-arm fixes include closed scrub sections/elbow coverage, double-sided body fabric and actor-level culling rather than unreliable individual mesh bounds.
- Natural recorded sneeze (Neo139, CC0). Menu music attempts autoplay, with first-gesture fallback where browser autoplay policy requires it. Suspended intervals and a low pulse make the menu more mysterious; in-game music is unchanged.

## Verification

213 Node tests pass, including 20 successful campaign transitions, legacy migration, freestyle gating, premium purchases, actual rig shape changes/closed arms/wrist details, soda probability and timing, the real door/help prompt, physical doctor diversion, and exactly one concealed antidote. Twenty hospital rebuilds release old mirror targets/signs/instances while preserving shared materials. Vending props are instanced, wrist details are merged, drops are capped at 48 and expire, mirror updates are distance/throttle limited, and flight assets are transient. Full-screen stories and travel suspend hidden hospital rendering while preserving theme scheduling.

The production Pages build passes. Browser checks used the actual local game UI, real character model fixtures, a real bathroom mirror, the full flight through automatic arrival, and 956×440 / 956×310 touch-layout frames. A real iPhone/Safari device and native iOS/Android builds were not exercised in this revision. Local screenshots and QA fixtures are ignored under artifacts/revision-2.8 and are not published.

## Asset provenance

- Natural Earth land outlines: public domain; see earth-map-attribution.txt.
- Neo139's recorded sneeze: CC0 1.0; see sneeze-natural-attribution.txt.
- Existing avatar, animation, story artwork and voice notices remain in public/credits.txt.
