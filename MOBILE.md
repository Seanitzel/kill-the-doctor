# KTD for Android and iOS

KTD uses Capacitor 8 to package the Vue 3 / Three.js game as native Android and iOS apps. The game, models, fonts, stories and audio are bundled locally. Native play does not depend on GitHub Pages, a development server or a login. Browser and app saves are separate.

## Build tools

Install Node 22+ and run `npm ci`. Android needs JDK 21 and Android SDK Platform 36. iOS needs macOS and Xcode 26+. Capacitor's [environment setup guide](https://capacitorjs.com/docs/getting-started/environment-setup) covers the toolchain installation.

```sh
npm run native:sync
npm run native:doctor
```

`native:sync` builds the web assets, synchronizes the native version numbers, and copies assets/plugins into both projects. Always sync after changing game code. The application identifier remains `com.ktd.northline` to preserve existing installations and their saves; the displayed name is KTD.

## Android

```sh
npm run native:android          # installable debug APK
npm run native:run:android      # build, install and launch on a connected device
npm run native:release:android  # unsigned release Android App Bundle
npm run native:open:android     # open Android Studio
```

Outputs:

- `artifacts/native/KTD-Android.apk`: debug-signed APK for device testing.
- `artifacts/native/KTD-Android-unsigned.aab`: release bundle requiring the owner's upload signing key before Play distribution.

Set `ANDROID_HOME` to the SDK installation. `ANDROID_SDK_ROOT` is also accepted; the macOS fallback is `~/Library/Android/sdk`. Set `JAVA_HOME` to JDK 21 or newer. On a phone, enable developer options/USB debugging and approve its USB connection. With multiple connected devices, choose one using `ANDROID_SERIAL`.

For store distribution, open Android Studio's **Generate Signed App Bundle / APK** action, select the release bundle and your upload key. Signing keys and `keystore.properties` are ignored by Git. Store signing/submission is a separate owner-controlled step.

## iOS

```sh
npm run native:ios             # unsigned Simulator app and portable ZIP
npm run native:run:ios         # build, install and launch on a booted Simulator
npm run native:archive:ios     # unsigned Release archive for physical iOS
npm run native:open:ios        # open Xcode
```

Outputs:

- `artifacts/native/KTD-iOS-Simulator.zip`: Simulator app, not an installable iPhone IPA.
- `artifacts/native/KTD.xcarchive`: unsigned physical-device archive. Signing/export requires the owner's Apple development team.

Set `IOS_SIMULATOR_ID` to select a booted Simulator; otherwise the first booted device is used. For a physical iPhone, open `ios/App/App.xcodeproj`, select the **App** scheme, choose your development team under **Signing & Capabilities**, select the connected iPhone and run. To distribute through TestFlight, archive/export with that team. No credentials are stored by the build scripts.

## Native behaviour

- Landscape play, safe-area spacing, immersive system bars, haptic feedback, Android Back handling and background pause.
- Touch movement, independent look/fire controls and two-finger camera zoom.
- Existing coins, upgrades, custom characters and settings persist in the installed app. Backgrounding clears active input and pauses gameplay; resuming is explicit.
- Release WebView inspection follows Capacitor's production defaults. The mutable game inspection bridge is excluded from normal builds.
- The native and web app version is taken from `package.json`. Android's version code and iOS's build number are derived monotonically from it; increasing the version before distribution increases both.

## Verification and quiet QA

```sh
npm test
npx playwright install chromium webkit
npm run test:browser
npm run native:qa:ios
npm run native:qa:android
```

Browser tests start or reuse a local server automatically. Chromium's output is muted during automated checks. Native QA packages start with music/effects volume zero and speech disabled, preserve other save data, and contain the reproducible test bridge. QA and normal iOS builds use separate output directories. Never distribute QA packages: rebuild with the normal commands before sharing.

The native GitHub Actions workflow builds an Android APK, unsigned AAB and iOS Simulator ZIP on changes and pull requests. Those checks catch compilation, plugin integration and asset packaging failures. Simulator/device interaction remains a separate smoke check; passing builds do not establish physical-device performance or store approval.

See [release 3.18 notes](docs/release-3.18.md) for this revision's measured results and limits.
