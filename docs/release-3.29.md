# KTD 3.29.0 — continuous Story skies and country weather

## Requested changes

- **Public announcements:** removed the later mobile enlargement/central dark panel and restored the earlier rules from before 3.25.0. Captions use the original DM Sans body text, IBM Plex Mono label, 8px/6px phone sizing, original bottom placement and transparent presentation. Desktop announcement styling is unchanged.
- **Nigeria:** a clear evening replaces Story rain, storm flashes and thunder. The sky is calibrated against the supplied blue reference (sampled at `#091f31`) and remains the same through the entrance.
- **England:** Story uses the existing 170 snowflakes, with the same colour, opacity, point size, motion and reused buffers. Settled snow now has a single smooth terrain mesh with shallow surface variation and soft drifts to the sides. The central entrance path stays shallow and the existing navigation/collision plane is preserved.
- **America:** a clear evening replaces Story rain. A small, illuminated full moon includes procedural lunar surface detail, without the previous hard-edged halo.
- **Egypt:** a visible setting sun and warm horizon gradually reach night over 150 seconds of active mission time. The sun descends and fades below the horizon. The crescent moon appears only at night and fades in over the following 12 seconds. Pausing does not advance the transition. Sky materials are prepared during loading, including the initially hidden lunar shader.

## Underlying doorway repair

The previous update path selected one background colour indoors and another outdoors, hid the sky/precipitation at the entrance threshold, and enabled sunset illumination only outside. Story mode now computes sky colour, fog, sunset light and celestial state from the same country/time state on both sides of the doorway. Exterior particles remain physically outside, so walls and ceilings conceal them normally. Weather/traffic audio and smoking interactions still follow the player's actual location.

The country weather overrides apply only to International Story Mode. Other countries retain their existing weather profiles. Freeplay/Terror retain their previous weather and rendering path. Existing hospital interiors, tile dimensions, galleries, doors and mission mechanics remain intact. All Story countries remain unlocked for exploration.

## Verification

- 544 unit tests pass, including Story/Freeplay isolation, unchanged snowflake motion/appearance, bounded terrain relief, sky/lighting continuity, Egyptian sun/crescent sequencing and resource disposal.
- Desktop browser checks cover the entrance in all ten countries, including rendered sky samples immediately before/after the threshold, constant exposure, original PA styling, and sunset/snow views.
- Automated iPhone WebKit checks cover the requested countries, announcement styling, paused sunset timing and country-switch artwork cleanup.
- A high-quality Egyptian Safari session runs for 315 seconds with real dialogue loading and muted output, checking resource limits and the final nighttime crescent state.
- Android and iOS Simulator packages and the Pages build contain the current production assets. No new image downloads, voice generation or Replicate calls are needed for these procedural sky/terrain changes.

These are automated browser checks and Simulator builds, not a physical iPhone installation or a device-memory guarantee.
