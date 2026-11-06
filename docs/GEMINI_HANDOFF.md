<!-- Brief for Gemini. Run `npm run handoff` to build dist/Shardfall_Gemini_Handoff.md (this brief + the current source). Keep sections 2-8 up to date when the architecture changes. -->
# Shardfall Survivors: handoff for optimisation review

**To:** Gemini (co-developer, technical architect, art pipeline partner)
**Repo:** `Truck-kun69/JhombCombo`, commit `{{COMMIT}}` (bundle generated {{DATE}})
**What we want from you:** concrete, prioritised optimisation suggestions for performance, architecture, packaging and the art pipeline. The full source is attached at the end of this file.

---

## 1. What the game is

Shardfall Survivors is a 3D survivors-style arena game (auto-attacking hero, swarms of foes, XP gems, level-up choices, a boss at the end of each run). The design targets phones first and desktop second.

- **Content:** 4 heroes (Warden, Sparkcaller, Emberwitch, Stormwright), 4 stages (Mossglen Hollow, Cinder Wastes, Gravebound Crypt, Neon Rift), 7 foe types plus elites with affixes, bosses, and a Nemesis invader. There are also relics, Blood Shrines, a Phantom Mirror clone, post-boss portals and an Endless Delve mode.
- **Run length:** 150 s to the boss, with 4 difficulty tiers.
- **Controls:** drag anywhere to move on touch (floating joystick), double-tap to roll. On desktop: WASD/arrows to move, Space/Shift to roll, Esc/P to pause.
- **Persistence:** one `localStorage` key (gold, unlocks, settings).

## 2. Repository layout

```
web/index.html          the whole game: ~5,900 lines, ~384 KB, ~460 functions, one IIFE, vanilla JS (ES5 style)
web/vendor/             three.js r128 (three.min.js) + Barlow Condensed / Bungee woff2 + fonts.css (offline, no CDNs)
electron/main.js        Windows desktop shell (Electron 45)
android/                Capacitor 8 Android project (MainActivity.java customised)
capacitor.config.json   appId com.truckkun69.shardfall, webDir "web"
resources/icon.png      1024 px app icon (generated)
scripts/vendor.mjs      copies three.js + fonts from node_modules into web/vendor (runs on npm postinstall)
scripts/make-icons.js   renders app icon, Android launcher icons and splash screens with headless Chromium
scripts/make-handoff.mjs   builds this handoff bundle (brief + current source) for Gemini
docs/GEMINI_HANDOFF.md     the brief part of this file
.github/workflows/build.yml   CI: Windows NSIS installer + portable exe, Android debug APK (+ signed APK/AAB if secrets set)
```

## 3. Runtime architecture of `web/index.html`

The file is ordered in sections, and each one starts with a `/* ---------- Name ---------- */` banner. Refer to code by **function name or section banner**, not by line number, because line numbers will drift.

| Section | What it does |
| --- | --- |
| Save data / Content | `save` object and `persist()`; `STAGES`, `HEROES`, `ETYPES`, `DIFFS` tables |
| Assets | `AssetManager`: PNG sprite-sheet loader and slicer. `MANIFEST` is currently **empty**, so everything is procedural |
| Canvas / Audio | 2D canvas setup (`DPR = min(devicePixelRatio, 2)`); WebAudio procedural SFX |
| Run lifecycle, Level up, Spawning, Combat | the core game loop logic, with DoT stacks (burn, poison, bleed, chill), elites and bosses |
| Classes, ascendancies, hybrids, allies | per-hero modifiers, summons (max 6 allies) |
| Living world | continuous heightfield from value noise, a meandering river, bridges, roads, waterfalls, points of interest. **Terrain chunk cache:** 440-unit squares baked to canvas at 4 units/px, 16 kept, at most one baked per frame. Foliage is bucketed in 64-unit cells. Decals use a 90-slot ring buffer |
| Bodies / HD vector rigs | the 2D renderer draws characters as gradient-shaded articulated vector rigs, baked into cached canvases ("Baked bodies"). A "lite" path draws flat fills |
| Dynamic lighting (2D path) | quarter-resolution darkness layer with holes punched for lights |
| **v9-3D** | three.js WebGL scene (`init3D` / `render3D`) behind a transparent 2D overlay canvas. Terrain is a displaced `PlaneGeometry` textured with the baked chunk canvas. Swarms are **one `InstancedMesh` per foe type**. Bosses are hierarchical groups. Uses `MeshStandardMaterial` with a sun casting `PCFShadowMap` shadows (1024², or 512² in lite) and pixel ratio capped at 1.5. It falls back to the 2D renderer if WebGL fails (`fail3D`) |
| 2D overlay over WebGL | damage numbers, warnings, status badges, health pips and buff bars, drawn each frame on `#cv` above `#cv3d` |
| Loop | `frame()` runs `update(dt)` (dt clamped to 0.05) then `render()`. **Auto-FX:** under `save.fx === 'auto'`, if the average frame time over 150 frames exceeds 27 ms (about 37 fps), it switches to lite permanently and persists the choice |
| v9 systems | Phantom Mirror clone, relics, portals, Endless Delve |
| Isometric 2.5D camera (2D path) | 45° tilt (`ISO_TILT 0.66`), insertion-sort depth ordering |
| Input | pointer drag joystick, double-tap roll, keyboard `KEYMAP` |

**Shell hooks the game exposes (do not break these):**
- `window.addEventListener('app-pause', pauseGame)`: the Electron shell dispatches this when the window is minimized.
- `window.__shardfallState()`: returns `'menu' | 'play' | 'pause' | ...`. The Android back button uses it to pause or resume instead of exiting mid-run.
- `visibilitychange`: pauses when the app is hidden.

## 4. Platform shells

**Windows (Electron 45 + electron-builder 26).** The window is 1280×800 with no menu. F11 or Alt+Enter toggles fullscreen. It runs with `sandbox: true`, `contextIsolation: true` and `backgroundThrottling: false`, and it blocks navigation. It ships as an NSIS installer and a portable exe, both unsigned, so SmartScreen warns. The CI artifact holding both files is about **237 MB**.

**Android (Capacitor 8; minSdk 24, target/compile SDK 36, Java 21).** Runs immersive fullscreen with `FLAG_KEEP_SCREEN_ON` and `shortEdges` cutout mode, and has the `VIBRATE` permission for `navigator.vibrate`. The back button pauses during a run and otherwise calls `moveTaskToBack`. The CI artifact is about **15 MB** (debug APK). Release signing is wired through the `ANDROID_KEYSTORE_*` secrets, which are not yet configured.

## 5. What has and hasn't been verified

- ✅ The game runs fully offline in headless Chromium: local three.js and fonts load, a run starts, keyboard movement works, `app-pause` and Esc pause and resume, and the console is clean.
- ✅ CI builds both apps successfully.
- ❌ **Not yet tested on real hardware** (a Windows PC or an Android phone). There are no frame-time measurements from real devices yet. Treat any performance hotspot below as a hypothesis to confirm with profiling.

## 6. Where we suspect the costs are (hypotheses, please challenge)

1. **Two full renderers per frame.** In 3D mode, WebGL renders the scene and then a full-screen 2D canvas (at DPR up to 2) is cleared and redrawn on top every frame. Fill-rate and compositing cost on mid-range Android GPUs could be significant. Should the HUD and damage numbers move into WebGL (sprites or an SDF text atlas), or should the 2D overlay drop to DPR 1?
2. **CPU terrain baking.** Chunks are baked into 2D canvases and uploaded as `CanvasTexture`. Each upload causes a texture-upload hitch when a new chunk streams in. Could this be a shader (heightfield plus noise in the fragment shader), or baked in a worker with `OffscreenCanvas`?
3. **Lighting and shadows.** The code has 13 point-light or `castShadow` sites, all using `MeshStandardMaterial` and PCF shadows. Is a Lambert/Toon material plus baked or blob shadows better for mobile?
4. **Draw calls.** Swarms are instanced (good), but bosses, allies, POIs, bridges, foliage and FX are many separate `Mesh` and `Group` objects (~35 `new THREE.Mesh` sites). Opportunities include merging static geometry per chunk and instancing foliage and decals.
5. **GC pressure.** The code is mostly ES5 with closures and some per-frame object creation. We'd like pooling recommendations for projectiles, damage numbers, particles and decals (the decals already use a ring buffer).
6. **Auto-FX switch is one-way and coarse.** It's a binary full/lite switch after 150 frames. A graded quality ladder could adjust shadow map size, pixel ratio, foliage density and overlay DPR, using hysteresis and dynamic resolution.
7. **three.js r128 (2021).** Is upgrading to a current release worth the migration (WebGL2 by default, better instancing and `BatchedMesh`, colour-management changes)? What breaks?
8. **Electron size and memory.** The roughly 100 MB per exe is mostly Chromium. Is Tauri (system WebView2) a better fit, given WebView2's WebGL performance and the trade-offs for a game?
9. **Android WebView.** Performance varies by device and WebView version. Should we set any WebView settings (hardware acceleration, `setRendererPriorityPolicy`, disabling overscroll)? Would a TWA or native wrapper be a better long-term route?
10. **Single 384 KB file.** The single file is great for portability but hard to work in collaboratively. Should we split it into ES modules with a bundler (Vite/esbuild) while still emitting a single offline `index.html`, and if so, in what order?

## 7. Art pipeline: current state and open questions

- Characters, foes and bosses are **fully procedural**: vector rigs in 2D, and procedural articulated meshes in 3D ("procedural articulated characters", "hierarchical bosses"). `MANIFEST` supports PNG sprite strips and grid sheets (keys `hero_0..3`, `enemy_<type>`, `boss_0..3`), but none are supplied.
- The icon and splash screen are generated by `scripts/make-icons.js` (a gold and cyan shard crystal on dark navy, `#0d1019`).
- **Questions for you:** How should authored 3D art come in (glTF/GLB with Draco or meshopt, KTX2/Basis textures), while keeping the procedural fallback and offline single-folder packaging? What poly and texture budgets fit mid-range Android? How should skeletal animation work at swarm scale: vertex-animation textures for instanced foes, versus skinned meshes for heroes and bosses only? How should palette and stage theming work with authored assets?

## 8. Constraints

- Must run **fully offline** (no CDNs) and launch from `file://` (Electron) or `https://localhost` (Capacitor).
- Must keep the 2D renderer fallback when WebGL isn't available.
- Must keep the shell hooks in section 3 working.
- Touch first. Keep the UI usable at phone width with safe-area insets.
- Keep the CI build green: `npm ci`, then `electron-builder --win nsis portable --x64`, then `cap sync android` and `./gradlew assembleDebug`.

## 9. How to respond

Please return:
1. A **prioritised list** of 5 to 15 optimisations, each with the expected impact (high, medium or low), the effort (S, M or L), the risk, and which platform benefits most.
2. For the top 3, **concrete patches**: name the function or section to change and show before and after code. Our side applies the patches, so keep them self-contained.
3. A **profiling plan**: what to measure on a real mid-range Android phone and a Windows PC (Chrome DevTools remote debugging via `chrome://inspect` works for the Capacitor WebView, and Electron has DevTools). Include the target frame-time budgets.
4. An **art pipeline proposal** (section 7) covering formats, budgets, folder layout, and how the code would load it.
5. Anything in the source that looks like a **bug** or a correctness risk you noticed along the way.

