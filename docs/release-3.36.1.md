# KTD 3.36.1 — Bright, steady hospital lighting

The steady-light change in 3.36 spread a limited number of fixture lights across each floor without enough diffuse fill. This left ceilings and areas far from those lights too dark, especially with the three-light phone pool. Removing flicker should not have reduced hospital brightness.

France, China, Russia, America, Romania and England now have bright, constant diffuse lighting across their hospitals, including ceilings, rooms and distant corridors. Their ordinary fixture lights remain fixed and do not flicker or respond to player proximity. The correction applies to Story and selected country interiors in Freeplay. It uses the existing light slots, without adding lights or shadow maps or changing the player’s brightness setting.

The other four country lighting profiles and default Freeplay retain their existing behaviour. Power outages retain the original dark intensity and ground fill, and return to bright lighting when power is restored. The office light switch retains its existing room-volume attenuation. Hospital materials, textures, layouts, missions, outfits and voices are unchanged.

## Verification

The 605 unit tests pass. Rendered-light checks cover all six countries on all four floors, comparing wall-, floor- and ceiling-facing neutral surfaces at central and distant locations. They verify bright output, unchanged illumination while the player moves, suppressed ordinary flicker, and dark power outages at the normal brightness setting. Desktop and iPhone WebKit screenshots are reviewed alongside the pixel measurements. Native compilation and browser emulation do not constitute physical phone testing.

The desktop lighting sweep and four iPhone WebKit groups pass, including flashlight/floor render latency, one-way privacy glass and its story/journal instructions. Web, Android APK and iOS Simulator builds pass. Both native packages match 1,791 production files, including all 1,736 existing voices and 38 interior images. Logs, pixel reports and screenshots are retained under `artifacts/revision3361/`.
