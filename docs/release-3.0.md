# KTD 3.0 — Automatic international flights

## Behavior

- Successful international story assignments advance automatically after the coin reward animation. A ten-second departure → globe flight → arrival sequence precedes the destination story, which advances into gameplay. The route comes from the completed country and next uncleared country; repeat results cannot award or advance twice. Retries, freestyle and the completed twentieth chapter do not trigger a new-country flight. Evidence assignments retain their police handover ending before rewards and travel.
- Departure and landing show a night airport and moving aircraft. The Earth shows country markers, a black dotted great-circle route and a moving plane. Procedural turbine departure/arrival effects accompany the existing in-game theme. A world-map fallback continues the same sequence if another WebGL context is unavailable. Timers pause while the page is hidden; presentation resources are disposed on exit.
- Fixed result delivery when the engine had already paused at an exit. The result is delivered exactly once rather than silently discarded. All twenty countries retain gradual increases in surveillance, patrol speed and objective constraints.
- Character studio has a live 360-degree mouse/touch drag preview, a keyboard-accessible rotation slider, and previews of locked premium outfits. Previewing does not purchase, equip or alter saved outfits. Rendering happens only on changes and all preview-owned resources are released.
- Menu music attempts to start on page load and resumes on the first interaction when required by browser autoplay policy. No separate enable-sound button is needed. Saved volume preferences remain respected; the in-game score is unchanged.
- The exterior represents three above-ground storeys, with upper windows and a broad ground backdrop beyond the existing night street and lamps. Walking remains within the forecourt. Outdoor camera placement no longer uses the virtual indoor ceiling.
- Nigerian casts include weighted Afro and braid choices alongside other hair. Incompatible retargeted finger poses are excluded and hands receive a relaxed resting curl, retaining complete original hand meshes.
- A weapon witness uses new recorded “calling the police” dialogue. Reporting starts the police arrival deadline instead of ending a target assignment immediately. The player must still finish the primary target and escape; other staff remain protected until the target is down. Eliminating the target does not reset a running police deadline. Privacy and evidence-camera rules retain their existing consequences.
- Mystery Soda purchases play a vending sound, visibly drop a bottle into a collection slot, and require pickup before the bottle enters inventory. Another bottle can be purchased after collection. The five-coin price and existing 60% longer / 40% shorter appointment effect remain.
- Calling the elevator opens physical sliding doors. The player walks into the recessed cabin before the floor selector appears, then arrives inside the destination cabin with doors open. Large 0, 1, 2 and basement B labels are on the left of the elevator.
- Exposure durations are 30 or 60 seconds, with occasional 180-second contamination, before purchased filter reductions. Base walking speed increases from 2.8 to 3.35. Aim input is less sensitive and the aiming camera follows direction more closely.
- Records pickup hides only the paper and its printed lines. The stand and its collision remain.

## Verification

- All 231 automated checks pass, including all twenty country routes and unseen stories, duplicate results, retries, gradual difficulty, police reporting, moving lift collision, entering the cabin, bottle dispensing and collection, paper-only pickup, contamination duration, country hair variation, exterior storeys, full rig geometry and existing mobile/resource checks.
- GitHub Pages production build passes; no new dependencies.
- Browser checks on the actual app confirmed France → Nigeria and Nigeria → China automatic progression. The latter continued through the destination story into normal China gameplay without pressing Next or advancing the story manually. A separate WebGL-unavailable fixture confirmed the world-map fallback and automatic completion.
- Browser interaction verified mouse drag rotation, locked outfit preview, calling and physically entering the lift, choosing a floor and walking out, buying and collecting a bottle, and looking back at the three-storey exterior.
- Desktop and 956×440 touch-control layouts were inspected. Screenshots and isolated test fixtures are under ignored artifacts/revision-3.0 and are not shipped.

## Limits

Physical iPhone Safari and native-app builds were not tested in this revision. Audible autoplay on first page load is controlled by the browser; a first tap starts music when required. Flight visuals are code-generated cinematics, not rendered video assets. Subjective animation and sound realism remain suitable for further player feedback.
