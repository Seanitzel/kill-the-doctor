# KTD 3.14 — clothing, soda messages and smoking pose

- The green waist object came from Expedition’s rigid cylinder and belt, which were separate from the shirt and used a fixed green material. The outfit now extends the existing skinned garment, using its chosen clothing color and original animation weights. The rigid back band is replaced by that continuous fabric; pocket flaps sit on the jacket.
- Appointment timers/privacy warnings and notifications now share a flowing HUD stack while an appointment is visible. Variable-height messages wrap and push the next card down, preserving a gap on desktop, landscape and portrait layouts. Standalone notifications retain their existing placement.
- Smoking uses a smooth nine-second lower/raise/hold/lower cycle, rather than a binary pose switch. The cigarette follows the grip between the index and middle fingers, with the filter positioned at the measured mouth. Relaxed finger curls, coordinated shoulder/elbow/wrist orientation and shared arm roll avoid the previous open-palm pose and wrist twisting. Starting another smoke break resets the cycle to the lowered position. Phone posture remains separate.
- Pose calculations reuse vectors/quaternions and the existing fixed prop/particle pool. Replacing an already-owned garment geometry disposes the previous intermediate geometry without touching the shared character source.

## Validation

- All 368 automated tests passed, including existing resource lifecycle checks.
- Additional focused check passed with the real Idle, Walk and Run animation files on both character rigs.
- Smoking checks cover two complete cycles, continuous wrist movement, mouth height, fingertip attachment, translated character roots and four facing directions on both rigs.
- Muted browser review covered actual character rendering, front/side smoking views, clothing during movement, and a running hospital soda purchase. The HUD component was separately checked with simultaneous timer/toast and warning/long-message states at desktop, 956×440 landscape and 440×956 portrait sizes.
- Production build passed. The existing large application bundle warning remains.
- Browser automation became unavailable during an extra 844×390 check; that additional size and browser cleanup could not be confirmed. Physical iPhone/Safari testing was not performed.
