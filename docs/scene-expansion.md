# Cherry Tree — Scene Expansion Roadmap

A practical guide for adding new nature-scenery scenes that fit the existing
aesthetic and reuse the existing engine. No new runtime dependencies are ever
needed to add a scene — the scroll/tint/parallax machinery is fully data-driven.

> Status: planning doc. **Koi (scene 06) shipped** — the first scene built from
> this catalog. The rest are still on paper. Pick a scene, follow the playbook,
> ship it behind the same `npm run validate` + `npm run test:smoke` gates as
> everything else.

---

## 1. The design system you're extending

### Palette tokens (`src/styles/base.css` `:root`)

| Token | Value | Role |
|---|---|---|
| `--bg-0 / --bg-1 / --bg-2` | `#f7efe7` → `#f2e2d8` → `#dcc8be` | Page background ramp (warm cream → dusty rose) |
| `--ink` | `#2d1e24` | Primary dark text |
| `--rose` / `--rose-bright` | `#cc5f87` / `#ef8bb0` | Core accent (progress bar, dots, preloader) |
| `--olive` | `#6e8b66` | The single green accent (triptych) |
| `--ease-gallery` | `cubic-bezier(0.22,0.65,0.14,1)` | Universal easing |

### The scene-tint contract (the important part)

Three CSS custom properties are mutated at runtime as each scene enters view —
this is what makes the whole page "cut" between color temperatures:

- `--scene-tint` — accent hue (cursor ring, grain dots, scroll-hint line, numeral)
- `--scene-ink` — text/ink color for that scene
- `--scene-grain` — film-grain dot color

Mechanics live in `src/experience/sceneTint.js`:
- `applySceneTint()` (`sceneTint.js:45`) writes the three vars on `:root`,
  updates the numeral/label, sets `document.title`, and dispatches
  `ct:scene-enter`.
- `initSceneTintObserver()` (`sceneTint.js:71`) is an IntersectionObserver
  (thresholds `[0,0.25,0.5,0.75,1]`) that picks the **highest-visibility** scene
  and applies its tint — avoiding the ScrollTrigger creation-order firing bug.
- `--scene-tint` is registered via `@property` (`base.css:1`) so it interpolates
  as a color over a 900ms transition.
- `initSceneColorTransitions()` (`sceneTint.js:131`) separately scrubs the
  `[data-ct-bg-blend]` layer between adjacent scenes' `bgColor` values.

**Every scene must supply `bgColor`, `tint`, `ink`, `grainTint`** in the manifest.
The current palette is almost entirely **warm rose** with one green (triptych) —
new scenes are the chance to introduce **teal, violet, amber, navy** for contrast.

### Motion presets (`src/experience/velocityParallax.js:22`)

| Preset | Motion | Used by |
|---|---|---|
| `parallaxDeep` | yPercent 14→-8, scale 1.12→1, saturate 0.8→1, scrub 1.2 | drift (prologue/triptych skip — own treatment) |
| `crossfadeLong` | yPercent 3→-2, scale 1.04→1, saturate 0.92→1, scrub 0.8 | bloom-wash, stillness |
| `driftSlow` | xPercent ±2, rotate ±0.5°, scrub 1.4 | color-field, epilogue |

A scene picks a preset via `data-motion-preset` on its `<section>` (set from the
manifest by `applySceneManifest()` in `src/main.js:40`). `initVelocityParallax`
applies media + matte + text counter-parallax automatically; `prologue-webgl` and
`triptych` are skipped (`velocityParallax.js:42`).

---

## 2. Add-a-scene playbook (verified path)

The nav dot is **automatic** — `sceneNav.js` builds dots from the manifest, so
you never touch nav. Steps:

1. **Manifest entry** — append/insert an object in `src/content/sceneManifest.js`
   (the array is `Object.freeze`d; just add to the literal). Required fields:
   `id`, `label`, `numeral` (two-digit string), `type` (`"image"|"composite"|"webgl"`),
   `assets` (informational), `motionPreset`, `heightVh`, `preload` (true only for
   the first two scenes), `bgColor`, `tint`, `ink`, `grainTint`.

2. **`<section>` in `index.html`** — add inside `<main id="experience">` at the
   desired scroll position (**DOM order == scroll order**). Mirror a sibling:
   `class="scene scene-<name>" data-ct-scene="<id>"`, plus `.scene-matte`,
   `.scene-text[data-ct-text]` (with `.scene-title[data-ct-split]` +
   `.scene-subtitle[data-ct-subtitle]`), and for photographic scenes a
   `<picture class="scene-media" data-scene-media>` using the **lazy** pattern
   (`data-srcset`/`data-src`, hydrated by `sceneController.js`).
   - **`data-ct-scene` must exactly equal the manifest `id`** — `sceneTint.js:86`
     does `querySelector('[data-ct-scene="${scene.id}"]')`.
   - The id is also the deep-link hash (`/#<id>`), see `sceneNav.js`. Note the
     existing reality: ids are `prologue-webgl`, `bloom-wash`, etc. (not bare
     `prologue`/`bloom`).

3. **Image asset (photographic scenes only)** — drop `<name>.jpg` in
   `assets-source/` and run `npm run optimize-assets`. It emits AVIF/WebP/JPEG at
   `[3840,2560,1920,1280]` + a `-lqip.jpg` into
   `public/assets/images/generated/` (`scripts/optimize-assets.mjs`). Reference
   those generated paths in the `<picture>`. **Procedural scenes need no asset.**

4. **Scene CSS** in `src/styles/scenes.css` — add `.scene-<name>` background
   (gradient fallback always visible before media loads), title color/shadow, and
   any overlay (see catalog). For white-title photo scenes, reuse the new
   `.scene-text::before` legibility-halo pattern instead of re-enabling the matte.

5. **Custom motion (optional)** — standard parallax/crossfade/drift needs **zero
   JS**. For a clip-path reveal, add a block to `initClipPathReveals()` in
   `sceneController.js` (mirror the bloom iris / stillness curtain). For a pinned
   timeline, add an `init…Timeline()` and push it into `initSceneController`.

6. **Validate** — `npm run validate` (the showcase check counts scenes and
   verifies every referenced file exists) and `npm run test:smoke` (update the
   `SCENE_IDS` array in `tests/smoke.spec.js` to include the new id).

---

## 3. Scene catalog (ranked, with palettes)

Each entry lists the reused preset, new cost, and a suggested tint that extends
the hue range. "Procedural" = CSS-gradient backdrop + animated overlay, **~0 KB**,
no photo. "Photographic" = needs one JPG through `optimize-assets`.

### Zero-asset / procedural (ship without touching asset weight)

**Dusk — golden-hour field** · `parallaxDeep` · *Easy*
Warmest scene in the gallery; a CSS `radial-gradient` sun-haze that pulses on a
slow `@keyframes`. Tint `#d4853a` (amber — new hue). Good bridge before Epilogue.

**Rain — rain on glass** · `parallaxDeep` · *Easy-Med*
Blurred garden gradient + a `repeating-linear-gradient` streak overlay animated
by `background-position`. Tint `#6688aa` (steel-blue — new hue). Gate the overlay
animation behind `html[data-motion="reduced"] … { animation: none }`.

**Koi — living pond** · `driftSlow` · *Medium* · ✅ **SHIPPED (scene 06)**
Shipped as a **full-bleed real koi-pond video** (CC0, Pexels — a calm, sparse
top-down clip of a few koi drifting in dark water) covering the whole scene
viewport. Sources are lazy/visibility-driven via `src/experience/koiVideo.js`
(`preload="none"` → hydrate + play on approach, pause offscreen; reduced motion
shows the poster only). Optimised to WebM (2.9 MB) + MP4 (3.5 MB) at 1080p/12s in
`public/assets/video/`. Light title over a soft scrim; tint `#e8a24a` (koi gold).

**Dark-scene pattern (reusable):** the manifest carries `dark: true`, which
`sceneTint.js` turns into `html.is-scene-dark`; `scenes.css` uses that to flip the
persistent chrome (brand mark, editorial numeral/label, control buttons, nav dots)
to light and drop the `mix-blend-mode: multiply` that would otherwise vanish over
dark footage. This is the exact override Aurora (the catalog's other dark scene)
will need. Note: this is the one scene that carries an asset — a deliberate
exception for a photoreal centerpiece. (The zero-asset procedural ripple version
lives in git history if a lighter variant is ever wanted.)

**Snow — winter branches** · `crossfadeLong` · *Easy*
High-key grey-blue gradient + falling particles. Literally invert the existing
`epiloguePetalsRise` keyframe (`scenes.css:355`) direction and recolor white.
Tint `#9aaccb` (cool grey-blue — new hue).

**Aurora — night sky** · `driftSlow` · *Med-High*
The **only dark scene** — dramatic `bgColor` swing. Animated green→blue gradient
bands with `mix-blend-mode: screen`. Tint `#40c888` (teal-green — new hue).
**Caveat:** dark scenes break the all-dark-`--scene-ink` assumption and the
editorial-chrome `mix-blend-mode: multiply` (`base.css:544`). Requires a
per-scene light-text override: `.scene-aurora .scene-title { color: rgba(255,255,255,0.92) }`
and `.scene-aurora .editorial-chrome { mix-blend-mode: normal }`. Set the
manifest `ink` to a light value too.

### Photographic (need one JPG each)

**Mist — morning haze** · `crossfadeLong` · *Easy*
Pale forest/bamboo in fog; reuse the stillness curtain reveal. Tint `#7aabb0`
(celadon — new cool hue). High-key photo, gentle motion.

**Canopy — light through leaves** · `parallaxDeep` · *Easy*
Upward into a leaf canopy; invert `.scene-vignette` to push light from center.
Tint `#5c8f52` (forest-green — second green).

**Wisteria — violet tunnel** · `parallaxDeep` · *Medium*
Perspective down a wisteria tunnel; new **side-curtain** clip reveal
(`inset(0 50% 0 50%)` → `inset(0 0% 0 0%)`, ~6 lines in `initClipPathReveals`).
Tint `#8860b0` (violet — entirely new hue).

---

## 4. Sequencing notes

- Tint flow currently runs warm-rose with a green interruption at triptych. When
  inserting, aim for a deliberate temperature arc — e.g. a cool scene (Mist /
  Rain) as a "rest" between warm ones, or Aurora as a dramatic dark beat before
  the Epilogue's warm close.
- Keep `preload: false` for any new scene (only prologue + bloom preload).
- If a new scene changes the total count, the README ("seven scenes"), the
  `index.html` scene count, and `tests/smoke.spec.js` `SCENE_IDS` all must update
  together — `scripts/showcase-check.mjs` enforces index/manifest parity.
