# KTD 3.17 — Native builds and renewed acceptance review

The existing Capacitor 8 wrapper is updated and rebuilt against the current game. This revision preserves the application identifier and installed saves, with KTD as the display name.

## Native packaging

- Android debug APK and unsigned release AAB compile with JDK 21 / SDK 36. The APK manifest reports version 3.17.0, build 3017000, minimum SDK 24 and target SDK 36.
- The iOS Simulator app and unsigned physical-device Release archive compile with Xcode 26.4.1. The archive reports version 3.17.0 / build 3017000. The Simulator ZIP cannot be installed on a physical iPhone; physical-device installation or TestFlight requires the owner's Apple signing team.
- One version source (`package.json`) drives both native version/build numbers. Scripts build, synchronize assets, verify production contents, package outputs, and optionally install/run on selected test devices. Release builds reject QA/run flags.
- Release builds no longer force WebView inspection on. Capacitor's normal debug-versus-release defaults apply, and the Swift QA relay remains inside `DEBUG && NORTHLINE_QA`. Its timer is invalidated on controller teardown.
- QA builds start with volume zero and speech disabled. Normal builds retain player audio settings. QA and normal iOS output directories are separate. Production verification checks matching asset hashes across web/Android/iOS, no remote server URL and no mutable QA bridge.
- `native:doctor` checks the local toolchain. `native:verify` catches stale native copies. Native build and browser workflows now run on relevant changes and pull requests and retain test packages/reports for fourteen days. Signing keys are ignored.

## Review fixes

- Mobile map, journal and pause overlays now open on one completed click. Previously an overlay could appear during pointerdown and then immediately close from a subsequent touch compatibility event. Browser acceptance reproduces the single-tap pause/resume path.
- Compact landscape menu rules accommodate the Equipment row while preserving scroll access on very short screens and keeping the footer outside the content panel.
- Native/generated build directories are excluded from Vite's development watcher so a native sync cannot reload a running browser game.
- Browser acceptance fixtures are brought up to date with actual current rules: named café participants, nurse-or-doctor privacy reactions, continuous pregnancy clothing, released audio channels, independent sneeze windup, confidential rota access, lift reboarding, current prices, automatic flight/story progression and protected-patient rules. Control labels and portrait guidance use the current UI text.
- README and the mobile guide now describe current builds, controls, campaign behaviour, testing, signing and save separation instead of the October 12 prototype state.

## Measured checks

- 401 unit tests pass, covering mission rules, paths/collisions, actual rigs, resource lifetimes, startup failure/cancellation, bounded caches, save migration and native packaging/version invariants.
- Browser acceptance covers twenty-two desktop/phone cases, including real loading, WebKit iPhone 17 Pro Max sizes, camera/crosshair rays, firing at three heights, touch input reset, map/journal/lift, maternity/audio, contamination, mission outcomes and campaign progression. Chromium audio output stays muted during these tests.
- On an isolated iPhone 17 Pro Max / iOS 26.4 Simulator, the QA build visibly loads the local menu, story, loading progress and game. Manual checks exercise movement, flashlight, map, pause/resume and Home → KTD background return. Returning leaves gameplay paused until explicitly resumed. This test stayed muted.
- The Android QA APK installs and launches on a dedicated API 36 emulator. Its process remains running. The emulator window is not exposed by this Mac's computer-use interface, so a manual Android UI/touch acceptance pass is not claimed.
- Normal Android, iOS Simulator, Android Release bundle and unsigned iOS archive builds succeed. Normal bundled assets pass the production identity/no-QA checks.

No unlimited-duration leak guarantee, physical-device performance result or store approval is claimed. Production iOS signing and Android upload signing are intentionally owner-controlled.
