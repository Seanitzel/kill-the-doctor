# KTD 2.5

This revision updates hospital behavior, mobile controls and story presentation.

- The rare distressed contact follows the player to the empty ground-floor bathroom. Stationary anxious breathing/trembling, self-talk, nervous chuckling, temple taps and short running/screaming bursts alternate. Actual movement drives animation, with stable walk/run transitions and no panic gesture laid over a running gait.
- Tap LIGHT to switch it on/off; drag it up/down to adjust brightness. A drag enables the beam, captures the pointer beyond the button, shows the level, and persists the level on release. Keyboard users can focus LIGHT and use the arrow keys, or use Settings.
- Occupied clinical rooms request privacy. Remaining for six seconds prompts a security warning; remaining fourteen seconds starts a physical report. Leaving cancels that visit’s timer. Re-entering the same occupied room starts a report immediately. Security completes the existing interception/failure flow.
- The character studio stores three independent custom looks on this browser/device, including names, body, colors, clothes and accessories. Save/replace/load/delete are available. Choosing a hairstyle removes the cap so the new style is visible.
- Pause includes a different-mission picker. Its text explains that switching ends the current attempt without reward while preserving banked progression.
- Successful evidence missions play a three-scene illustrated police handover, acceptance and reward sequence before the debrief. The reward is banked by the mission once; replaying/skipping the pictures cannot award it again.
- Initial power cuts occur after 150–240 seconds, then every 210–330 seconds, lasting ten seconds. Brief fixture glitches occur every 55–105 seconds after a 45–80 second initial delay.
- Routine PA pages begin after 85–120 seconds and recur every 95–150 seconds; critical announcements defer the next routine page by at least 75 seconds. Four named-patient pages supplement the existing lines. Two low, soft cue notes precede a 430 Hz high-pass and cascaded 2200/2600 Hz low-pass speaker/telephone filter. All scheduled nodes remain owned and are released on pause/disposal.
- A new line replaces the same speaker’s earlier line, including stale audio still decoding. Nearby speakers and public address remain independent.
- Lift doors, frames, call panels and signs sit flush on the actual north wall across all four levels.
- Story illustration mappings and new asset prompts are documented in `public/stories/asset-prompts-v25.json`.

The original soundtrack, footsteps and gunshot recordings are unchanged. New dialogue uses the same four fictional standard-American/Southern-inspired synthetic identities. Voice delivery is still synthetic; the nervous chuckle is a designed spoken phrase.

Validation and browser proof are recorded in the revision’s QA artifacts. Desktop phone-size testing cannot establish performance or audio quality on a physical iPhone.

Validation completed: all 177 Node tests pass, including full-floor evacuation, camera/obstacle checks, real GLB/FBX gestures, three custom slots, privacy escalation, evidence reward idempotence, audio ownership and every story-image mapping. The GitHub Pages production build passes. Phone-size browser checks exercised the LIGHT drag in both directions, tap toggle, all three character slots, cap removal, mission switching, retry behavior, privacy reporting and evidence completion. Three complete reloads rendering all four floors held at 308 geometries, 925 textures and 26 programs each; disposal left zero owned geometries, textures, scene children, canvases, audio context and pending voice requests. This verifies these resource lifetimes, not every possible JavaScript heap leak or physical-device performance.

All 34 cases now have dedicated illustrations. The two special briefs and two protagonist variants of the evidence ending bring the total to 38 strips / 127 scenes, 5.43 MiB of new WebP artwork. Only the current strip is requested by the story viewer.
