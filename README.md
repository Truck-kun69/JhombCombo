# JhombCombo — Shardfall Survivors

A 3D survivors-style arena game (three.js), packaged as a **Windows app** and an **Android app**.

```
web/            the game (index.html) + bundled three.js r128 and fonts — runs fully offline
electron/       Windows desktop shell (Electron)
android/        Android project (Capacitor)
resources/      app icon source
scripts/        vendor.mjs (copies three.js/fonts into web/vendor), make-icons.js (renders icons/splash)
```

## Download the builds

Every push runs **GitHub Actions → "Build apps"**. Open the run and download the artifacts:

- `shardfall-windows` contains `ShardfallSurvivors-<ver>-x64-nsis.exe` (installer) and `ShardfallSurvivors-<ver>-portable.exe` (no install needed).
- `shardfall-android` contains `ShardfallSurvivors-debug.apk`. Copy it to your phone and install it. You'll need to allow "Install unknown apps" for your file manager or browser.

Pushing a tag such as `v1.0.0` also attaches these files to a GitHub Release.

### Signed Android release (Play Store)

Add these repository secrets and the workflow will also build a signed `ShardfallSurvivors.apk` and `.aab`:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias |
| `ANDROID_KEY_PASSWORD` | key password |

Create a keystore with:

```bash
keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias shardfall
```

## Build locally

```bash
npm install
```

- **Play in a browser:** open `web/index.html`.
- **Windows app (dev):** `npm start`
- **Windows installer (on Windows):** `npm run dist:win`, which writes the `.exe` files to `dist/`.
- **Android:** install Android Studio (JDK 21, SDK 36), then run `npm run android:debug`. You can also run `npx cap sync android` and open the `android/` folder in Android Studio.

After editing `web/index.html`, run `npx cap sync android` so the Android project picks up the change.

## Controls

- **Windows:** WASD or arrow keys to move, Space or Shift to roll, Esc or P to pause. F11 or Alt+Enter toggles fullscreen.
- **Android:** drag to move, double-tap to roll. The back button pauses during a run.
