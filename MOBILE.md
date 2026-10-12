# Northline for phones

Northline is a Capacitor 8 app for iOS and Android. The same complete Vue 3 / Three.js hospital game is bundled inside each native app. Models, animations, fonts, NPC dialogue, and maternity recordings ship with the app; no web server or login is needed to play.

## Play

Open **Northline** on either simulator. Hold the movement stick with your left thumb and drag the right side of the screen to look. The separate touch buttons provide USE, AIM, FIRE, RELOAD, LIGHT, RUN, and CROUCH. The map, journal, and pause buttons sit below the target portrait. USE highlights when a nearby clue, badge, door, or lift can be used.

Choose Adrian or Alex, inspect the staff directory near reception, follow the clues, verify the assigned target's badge, complete the assignment, and return to the ground-floor entrance before lockdown. Equipment, coins, character choice, and settings persist across app restarts. A running mission pauses when the app goes into the background and requires an explicit resume.

Native apps play in landscape and account for screen cutouts and the home indicator. The web edition shows a rotate-phone prompt in portrait. Long equipment, settings, map, and journal panels scroll with a finger.

## Build and run

Requirements: Node 22+, Xcode with an iOS simulator for iOS, or Android SDK 36 and JDK 21 for Android. Install project dependencies with `npm install`. Open a simulator or connect an Android phone with USB debugging enabled.

```sh
npm run native:run:ios
npm run native:run:android
```

Each command builds the web game, synchronizes bundled assets and native plugins, builds the native app, installs it, and launches it. iOS uses the currently booted simulator; set `IOS_SIMULATOR_ID` to select another device. Android uses `ANDROID_HOME` or `ANDROID_SDK_ROOT` (default on this Mac: `~/Library/Android/sdk`). If multiple Android devices are connected, use `ANDROID_SERIAL` to choose one.

Build without installing:

```sh
npm run native:ios
npm run native:android
```

The Android APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`. The iOS simulator app is generated at `artifacts/native/ios/Build/Products/Debug-iphonesimulator/App.app`. The APK uses the standard debug signature and can be installed on Android phones. For a physical iPhone, open `ios/App/App.xcodeproj`, select a development team and the connected iPhone, then run. App Store / Play Store distribution needs the owner's signing and store accounts.

To open the native projects directly:

```sh
npx cap open ios
npx cap open android
```

## Native behavior

- Landscape orientation, immersive fullscreen, safe-area spacing, native haptic feedback, and Android Back support.
- Independent pointer capture for simultaneous movement, look, and actions; all input is released on pause, backgrounding, and canceled touches.
- Native public-address speech, bundled spatial dialogue and maternity recordings, and audio interruption handling.
- Phone rendering uses fewer nearby point lights, smaller shadow maps, and capped pixel density. Visual quality and sensitivity remain adjustable in Settings.
- Saves live in each native app's storage, independently from the browser edition.
- `capacitor.config.json` contains no remote `server.url`; the game runs from `capacitor://localhost` on iOS and `https://localhost` on Android.

## Verification

```sh
npm test
npm run test:browser
```

Native acceptance scripts use Appium and actual simulator touch gestures. Install the optional tools into the ignored `.runtime/mobile-tools` directory (`npm install --prefix .runtime/mobile-tools appium webdriverio`) and install XCUITest / UiAutomator2 drivers into an Appium home. Start Appium on port 4725. Build the dedicated QA apps with `native:qa:ios` / `native:qa:android`, then use `scripts/native-probe.mjs` to create sessions, followed by `native-touch.mjs`, `native-gameplay.mjs`, and `native-atmosphere.mjs` with `ios` or `android` as the argument.

QA builds expose a development inspection bridge for staging reproducible missions. The iOS relay is compiled only with `DEBUG` and `NORTHLINE_QA`; normal builds exclude it. Normal web/native builds omit the mutable `window.__ktd` bridge. Rebuild with the normal run commands before sharing the apps.

The acceptance reports and simulator screenshots are saved under `artifacts/native/`.

## Verified on October 12, 2026

Native acceptance passed on the running **iPhone 16 Pro / iOS 18.1** simulator and **Android API 36** emulator. Both passed simultaneous movement and camera gestures, firing, flashlight, map and journal pause/resume, clues, lift travel, badge inspection, target combat, escape rewards, background interruption, scrolling equipment purchases, and save persistence after process restart.

Native atmosphere checks verified all sixteen departments, conversations and cafeteria diners, entry reactions, decoded maternity recordings playing together, patient-specific 30/60-second contamination, visible blur, and flashlight lighting during blackouts. The final normal builds were reinstalled and passed touch, firing, map, and pause checks without the mutable QA bridge. Android Back opened the pause screen.

All **16 unit tests** and **12 browser tests**, including the phone browser and rotation case, passed. Native acceptance uses reproducible position fixtures for the mission and atmosphere checks; movements and actions are delivered as real simulator touches. This validates simulator operation; physical-device and store distribution were not part of this run.

Ready-to-use copies are in `artifacts/native/Northline-Android.apk` and `artifacts/native/Northline-iOS-Simulator.zip`. The combined report and package hashes are in `artifacts/native/verification.json`.
