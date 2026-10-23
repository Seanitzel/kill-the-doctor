# KTD 3.7.0

China's Evidence assignment becomes a stolen-identity infiltration. Other
countries retain the existing nonviolent three-photo assignment.

The player has fifteen game minutes to poison Dr. Liu Wen's fictional drink
unseen in ground-floor Records. Visiting patients attempt to enter his office
every few minutes. Witnessing the action, or discovering the unsecured body,
fails the assignment. The player closes and locks the office, steals the badge,
purchases a reusable 40-coin covert camera at Pharmacy, and changes into a
uniform, surgical cap and mask in the ground-floor bathroom. The office can be
unlocked to leave and must be secured again before basement access.

The basement team welcomes the stolen identity. Three reachable markers offer
four-second clear video angles of the operation. Each angle also requires a
correct equipment handover. Equipment requests continue during recording;
players approach a physical cart and choose A–D in a close-up, without pausing
the world. Two wrong or missed requests expose the disguise and remove the mask.
The operating doctors become valid targets only after all three angles are
secured. Both must be stopped before escaping via the ground-floor entrance.
Basement shots are filtered and quieter; staff on public floors become worried
instead of immediately evacuating. Public weapon witnesses remain a risk.

Supported browsers capture three silent 480×270, 12-fps clips from the game
canvas for journal playback. No microphone, webcam or device recording is used.
Capture uses the existing render loop with byte/frame budgets. Partial clips
are discarded; pause stops the active capture, and mission teardown stops
tracks, releases buffers and revokes object URLs. Unsupported encoders retain
the gameplay objective and a still preview without preventing progression.

Hospital fixes:
- Elevator visual widths now match their physical bounds, meeting at the center
  when closed. Leaves remain within the original portal. Auto-close checks the
  actual threshold/cabin rather than the surrounding corridor.
- Clinical-room waiting benches have linked steel frames and blue upholstery,
  collision bounds and seated patients. Doors and vending machines remain clear.
- Country relief panels sit below the country label; China's blue and warm-grey
  palette distinguishes its interior without changing the floor plan.
- Key collectibles and their permanent display tables are separate objects.
- Emergency evacuation cancels ordinary dialogue, privacy warnings and sneeze
  apologies. Existing alarm and recorded screams remain active.
- Bathroom mirrors use higher capped, aspect-correct render targets with 4×
  multisampling, while retaining distance/time throttling and explicit disposal.
  Distant bathrooms and inactive floors release large reflection targets.

Audio: 32 new clips use the existing four fictional Qwen-designed American
voices (male/female, standard/Southern). No real-person reference recording.
Generation: scripts/generate-dialogue-audio-v37.py; manifest records model
revision, hashes, synthetic provenance and delivery for every take.

Validation includes pure mission gates/deadlines/rewards, real-hospital route
and sightline checks, visiting-patient movement through closed doors, real
weapon rays hitting both operating doctors, all-country waiting-seat clearance,
key/table separation, visible lift geometry against colliders, video capture
budgets and disposal, and owned collision/scene teardown. Browser QA exercises
briefing/loading, poisoning, office locks, badge theft, camera purchase, uniform,
equipment selection, three recorded angles and journal playback, plus compact
landscape controls and the corrected hospital props.
