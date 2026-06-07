# CherryTree — Roadmap

**Status:** Stable and deployed. Eight scenes in production. Active development.

---

## Shipped

| Milestone | Notes |
|---|---|
| WebGL petal hero | Three.js r181, custom `ShaderMaterial`, depth-of-field, cursor repulsion |
| GSAP / ScrollTrigger / Lenis stack | Shared frame clock; smoothing and animation stay in sync |
| Scene tint system | `--scene-tint/ink/grain` via `IntersectionObserver`; chrome re-paints on every cut |
| 8 scenes with color arcs | Warm-rose with green (Triptych) and gold (Koi) interruptions |
| FLIP preloader | Brand text → hero title; hard 6 s safety timeout |
| Magnetic cursor | Contextual labels per scene; morphing ring |
| Audio controller | Ambient bed; synth fallback; velocity modulation; persisted preference |
| Keyboard navigation | `1`–`8`, `J`/`K`, `Home`/`End`; URL hash deep links |
| Full reduced-motion path | Runtime toggle; no page reload required |
| Screen-reader announcements | `aria-live="polite"` on scene change (WCAG 4.1.3) |
| `::selection` branding | Rose at 22% opacity — selections feel like the site |
| Per-scene `theme-color` | Mobile browser chrome tracks the current scene |
| Numeral roll | Scene counter ticks up from below on cut |
| Tab-away whisper | "🌸 still falling…" / "🌸 come back." when the tab is hidden |
| Idle invitation | Scroll-hint brightens after 45 s of stillness on the prologue |
| Sakura easter egg | Brand-mark × 5 → 28 golden-hour petals, 11 s lifetime |
| Cinematic arrival | Chrome holds back until the visitor's first interaction |

---

## Now

**Per-scene audio.** The ambient bed is global today. It should crossfade to a clip matched to each scene on `ct:scene-enter` — water sounds for Koi, silence for Stillness (the contrast is the point). The crossfade system already exists in `audioController.js`. The real work is audio curation: find loopable CC0 clips per scene, add an `audio` field to the scene manifest, add a silence path for Stillness. About a day of code, longer for curation.

**Hero petal dispersion.** The WebGL petal cloud sits static until the first scroll. That first push should feel like disturbing still water — a radial impulse fans the cloud over ~600 ms, then it settles back. One-shot. The shader already exposes per-petal velocity offsets; this is a GSAP timeline driving a uniform on the `ShaderMaterial`.

**Epilogue finale.** The Epilogue currently fades in with the same preset as Color Field. It should feel like an ending. When the scene scrolls fully into view and the user stops, the bloom petals slowly converge toward center and the title holds alone. Not a hard fade-to-black — a settling. Triggered once, not looping.

---

## Next

**Petal favicon.** The cherry-blossom silhouette from the WebGL shader rendered as a 32×32 SVG in `#ef8bb0` on transparent. Not the wordmark. Not a circle. The petal.

**OG / social card.** A single rendered petal against `#f8ebe2`, 1200×630, no text. When someone shares the URL, what arrives in the link preview is the experience distilled to one frame.

**New scenes — three hue gaps to fill:**

| Scene | Hue | Type | Placement |
|---|---|---|---|
| Wisteria | Violet `#8860b0` | Photographic | Between Triptych and Color Field |
| Aurora | Teal-green `#40c888` | Procedural / dark | Between Koi and Stillness |
| Snow | Cool grey-blue `#9aaccb` | Procedural | After Epilogue |

Each earns its position by changing the color temperature at a specific story beat, not just adding something pretty. Wisteria is the highest-priority — violet is the biggest gap in the current arc.

**Scene handoff threads.** On cut, the incoming scene should open toward you — a micro-scale pulse at 60% scroll threshold, before you've fully arrived. A half-day `ScrollTrigger` progress hook.

---

## Later

**Mobile-native pass.** Below 760 px the experience degrades gracefully — no parallax, no cursor. A real mobile pass means scroll-snap per scene and swipe-native transitions. Worth doing when the primary audience is mobile. A week of work.

**Devlog / case study.** The engineering decisions here are worth publishing: FLIP preloader, tint observer vs ScrollTrigger, WAAPI over CSS `animation-duration`, the lanterns postmortem. Written for senior frontend engineers and technical hiring managers.

**Headless content model.** All copy lives in `index.html`. If the gallery grows past ~12 scenes or needs non-developer edits, moving scene copy and manifest to JSON (Vite's native JSON import) makes the manifest the single source of truth. Low urgency until scale demands it.

---

## Won't Build

| | Reason |
|---|---|
| Framework migration (React, Svelte, etc.) | Zero-framework is load-bearing for performance and the portfolio story |
| SSR | Client-side gallery; no SEO-critical dynamic content; no benefit |
| API routes / backend | No user data, no auth, nothing to serve |
| CI beyond `validate` + `smoke` | Solo project — GitHub Actions adds friction for nothing |
| Lanterns scene (CSS or sprite) | Tried twice, pulled twice. Cheap-looking or compositor-overloaded. If lanterns return: real video (Koi-style) or Blender-rendered |
| WebGL for non-Prologue scenes | The shader investment lives where it earns the most; every other scene is photography + CSS motion |
