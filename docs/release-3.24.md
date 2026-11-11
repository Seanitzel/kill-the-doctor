# KTD 3.24.0 — door and China mission regression repair

## Corrected behavior

- E / USE records a door command immediately. Collision is evaluated against the moving leaf on each frame, so a blocked leaf waits and resumes instead of rejecting the whole command. Nearby patients no longer replace a selected door with badge inspection or instantly undo a player's close command. Door visibility uses the rotated leaf rather than its oversized world bounding box.
- China owns its office doors and office key throughout the assignment. Its basement access uses the stolen identity, independently of the Theatre key used by other special assignments. The office can be unlocked from inside after securing it.
- Coffee preparation reaches 30 seconds without stopping the player's mixing action. E / USE or deliberate walking stops it. Background movement, animation reach samples and the preparation timer do not stop it. A slight working-hand body angle keeps both real character rigs within reach throughout their idle animation.
- Existing linked waiting seats are restored outside Transplant Ward 301. Two visitors sit there, enter briefly at approximately 12 and 18 seconds after mixing begins, speak, and return individually. Opening the door gives a brief manual input opportunity; continuing to mix is a failure, rather than automatically stopping the player's action.
- The doctor gives the requested first and second warnings with separate five-second response windows, then calls security and fails the mission. His break/drinking routine remains suspended while addressing the player. Leaving resets the encounter.
- Actual unconsciousness starts the first five-second enter-and-close window. Physically closing the office from inside starts a separate five-second key-and-lock window. The urgent red instruction appears immediately and stays visible until secured; neither deadline has a numerical countdown. Missing a deadline starts an actual visitor approach. Discovery failure occurs when that visitor enters, with a truthful failure description.
- Mission retirement disposes mission-owned props while navigation services still exist, fixing a completion/restart cleanup error exposed by the full China playthrough. Door command ownership is cleared on retirement.

## Regression verification

- 495 unit and simulation checks pass, including exact deadline boundaries at several mission times, real visitor walking/seating, missed-deadline discovery, warning enforcement, shared-key isolation, repeated retirement/restart, and both animated character rigs.
- All 46 browser scenarios pass (10.6 minutes locally), covering desktop keyboard doors on all three public floors, iPhone camera/aiming, the existing multi-angle China collision sweep, full China mixing/visits/sealing/disguise/recording/escape, and a successful evidence ending with clean retirement. The full China check also verifies that the normal basement travel path accepts its own identity without a Theatre key.
- The high-quality iPhone-sized WebKit soak ran for 315 wall-clock seconds / 315.1 game seconds. No reload, runtime error, mission failure or context loss occurred. After the late hospital upload, geometry stayed at 1,846 and textures at 1,148; decoded dialogue stayed below 8 MiB and navigation fields at most eight per floor.
- Android APK, iOS Simulator, signed iPhone and GitHub Pages production builds pass at 3.24.0. Native verification confirms identical current local assets in both projects, without a remote server or mutable QA bridge.

Local testing is muted. The China browser playthrough uses rendered characters and real interaction controls with a controlled game clock and repositioning between objectives; it is not a claim of a manual physical-phone playthrough. Physical iPhone memory pressure, temperature and frame rate still require on-device observation.
