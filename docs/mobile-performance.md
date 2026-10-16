# Mobile performance and lifecycle audit (2.1.1)

The balanced touch profile uses a 512 px limit on character source maps, 256 px clothing atlases, pixel ratio at most 1, three local lights, and 512 px shadow maps. High quality uses larger maps/resolution. Texture limits are selected when loading the engine. The original music, hospital geometry and character rigs are preserved.

Source-map RGBA8 estimates including mipmaps for both GLBs fall from 88.5 MiB to 28.5 MiB at 512 px. A square recolored clothing atlas falls from about 5.33 MiB at 1024 px to 0.33 MiB at 256 px. These estimates exclude skeleton textures, scene textures, framebuffer storage, compressed network payloads and driver overhead.

Rendering is capped at 60 fps on touch devices, 30 fps in menus and 15 fps for paused missions. Hidden tabs stop the renderer loop and suspend audio. Mission simulation remains paused on returning. Character animation skips distant/off-screen actors, while AI, collision and mission rules continue. Lighting selection and camera obstacle arrays reuse storage; stethoscope cables update existing vertex buffers.

## Resource ownership

- Avatar disposal releases cloned materials, skeleton textures, appearance geometry and mixer bindings. Shared template geometry/maps remain owned by the loaded asset set.
- Weapons/accessories and transient effects release their owned resources on replacement/reset. Full shutdown also releases template assets, hospital textures, instance buffers, shadow targets and the portrait target.
- Portraits reuse a 256 px render target and restore renderer state without resizing the game canvas.
- Clothing/iris caches are scoped to an asset owner. Active leases protect clothing; at most 32 idle clothing entries remain.
- Dialogue cache: at most 8 MiB decoded audio / 32 entries / 8 concurrent requests. Effect sources and scheduled timers have explicit ownership and bounds.
- Async startup/load/decode completions cannot revive a disposed engine or audio owner. App unmount cancels feedback timers, native listeners, diagnostic requests and global inspection bridges.
- Shared primitive CPU attributes are reusable. At full shutdown their GPU buffers/listeners are released as well; another live renderer uploads them again on its next render.

## Verification

89 automated tests pass, including actual GLB disposal, repeated portrait success/failure, interrupted startup, delayed audio, bounded caches, all-floor collision/evacuation, and simulated 120 Hz frame scheduling. Standard and GitHub Pages builds pass.

In an isolated local browser using the balanced touch profile, six identical missions included 48 weapon changes, 24 portraits and gas creation/cleanup; another 40 portraits followed. Warmed resource counts stayed exactly at 228 geometries, 856 textures and 21 programs. Texture counts include hundreds of small per-skeleton float textures, not just image maps. JS heap dropped from 214.2 MiB to 86 MiB during natural collection and to 106.8 MiB after the extra previews, rather than growing on every cycle.

Application unmount was also exercised during loading and with live missions plus pending UI effects. The test checks zero remaining canvases, textures, audio nodes/requests and scene children, with both inspection bridges removed. A two-engine check confirms cleanup of one engine does not prevent the other from reuploading shared geometry.

A 12-second active desktop-host run using mobile settings rendered at approximately 56 fps at the last sampling window. This is not a physical iPhone benchmark. Long sessions, thermal throttling, native audio behavior and actual Safari/driver memory remain device-dependent; automated checks cannot prove the absence of every leak.

Local browser measurements and QA fixtures are retained under ignored `artifacts/memory-audit/`. They are not shipped in the game.
