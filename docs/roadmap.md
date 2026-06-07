# Cherry Tree — Enhancement Roadmap

> Living document. Update when scope shifts.
> Current baseline: eight scenes deployed at cherry-tree-psi.vercel.app.

---

## Where we are

The core engine is complete and hardened. What shipped:

**Foundation** — scroll-driven tint system (`--scene-tint/ink/grain`), lazy media hydration, WebGL petal shader (Three.js r181, 400/200 particles, cursor repulsion), velocity parallax, magnetic cursor with scene labels, audio bed with synth fallback and velocity modulation, reduced-motion parity, screen-reader announcements, URL hash sync, keyboard navigation (1–8, J/K, Home/End).

**Phase 1 micro-details (shipped 7823c86):**
- `::selection` — rose at 22% opacity; selections feel like the site
- Per-scene `theme-color` — mobile browser chrome tracks the story
- Numeral roll — `01 → 02` ticks up from below on scene change
- Tab-away whisper — "🌸 still falling…" / "🌸 come back." on hidden tab
- Idle invitation — scroll-hint brightens after 45 s of stillness
- Sakura easter egg — brand-mark × 5 → golden-hour petal shower (28 petals, 11 s lifetime)

**Content** — 8 scenes with dedicated color temperatures, copy, and motion presets. Lanterns was attempted and pulled (photo sprite → compositor overload; live video or Blender-rendered sprite if it ever returns).

---

## Phase 2 — Sound

**Goal:** The ambient bed becomes scene-aware. Not background music — sound design. Each scene has a distinct acoustic signature tied to `ct:scene-enter`.

**Scope:**
- Add an optional `audio` field to the scene manifest — a path to a CC0 clip and a target gain level. Scenes without it inherit the current global bed. Stillness gets `null` (genuine silence — the contrast is the point).
- On `ct:scene-enter`, the audio controller crossfades from the outgoing clip to the incoming one. The fade system (`fadeValue`) is already in `audioController.js` — this is configuration work + audio curation, not architecture.
- Velocity modulation stays. The bed leans in when the user scrolls hard, regardless of which clip is active.
- The "Off" toggle mutes everything as before — no per-scene UI.

**Scene audio concept:**

| Scene | Character | Source type |
|---|---|---|
| Prologue | Petal fall, high shimmer, sparse reverb | CC0 ambience |
| Bloom | Garden warmth — bees, distant birdsong | CC0 nature |
| Drift | Open air, wind brushes | CC0 wind texture |
| Triptych | Quiet interior, room tone | CC0 room |
| Color Field | Pure tone — sine cluster, no naturalism | Web Audio synth |
| Koi | Water surface — close, still, breathing | CC0 water |
| Stillness | Silence | `null` |
| Epilogue | Deep resonance, slow decay | CC0 / synth hybrid |

**Principles:** No music. No melodic content. These are acoustic environments, not songs. Every source should be loopable with no obvious seam. Clip length < 90 s preferred — smaller bundle, easier loop points.

**Effort:** Audio curation (find / license CC0 clips) is the long pole. Code changes are ~1 day: manifest field, crossfade router in audioController, Stillness silence path.

---

## Phase 3 — Cinema

**Goal:** Motion that feels like it was authored for film, not assembled from scroll triggers.

### 3a. Hero petal dispersion
The WebGL petal field sits static until the first scroll. That moment — the first push — should feel like disturbing still water. On first `wheel`/`touch` event, a brief outward impulse fans the petal cloud: particles accelerate radially from center over ~600 ms then settle back into their orbit. One-shot, non-repeating. The shader already exposes per-petal velocity offsets; this is a GSAP timeline driving a uniform on the ShaderMaterial.

### 3b. Scene handoff threads
The bloom flash on scene cut exists. What's missing is *directional continuity* — the sense that scene A has already started becoming scene B before the cut fires. Approach: a subtle desaturation + micro-scale pulse (1.02×) on the incoming scene's media layer triggers at 60% scroll progress through the threshold, not at 100%. The scene doesn't wait for you to arrive — it opens toward you.

### 3c. Epilogue finale
The Epilogue is the last thing anyone sees. It currently fades in with the same drift-slow preset as Color Field. It should feel like an ending. Proposal: when the Epilogue scrolls fully into view and the user stops, a slow convergence animation plays — the Epilogue's bloom petals drift toward center, opacity dims, and the title holds alone. Not a hard fade-to-black; a settling, like a breath held and released. Triggered once, gated on `IntersectionObserver` full-scene threshold. No loop.

**Effort:** 3a = half day (shader + GSAP). 3b = half day (ScrollTrigger progress hook). 3c = one day (IntersectionObserver + keyframe sequence).

---

## Phase 4 — Identity

**Goal:** CherryTree as a full identity object — the petal lives in every touchpoint.

### 4a. Favicon
A cherry-blossom petal SVG — the same silhouette as the WebGL hero particle, rendered at 32×32. Not a generic circle. Not the wordmark. The petal itself, in `#ef8bb0` on transparent. Generate the SVG manually from the hero shader's clip math; no external tools needed.

### 4b. OG / social card
A single rendered petal in golden-hour light against `#f8ebe2` — 1200×630, centered composition, no text. The scene alone carries the identity. When someone shares the URL, what arrives in the preview is the experience distilled to one frame. Generated with sharp + a Three.js canvas render, exported to `public/assets/og.png`.

### 4c. Copy revisit
Live with the current copy for two weeks, then re-read it cold. The editorial voice is close but a few lines are still reaching. Specifically: the Prologue subtitle and the Epilogue closing line need a pass. No timeline — this is an instinct check, not a task.

**Effort:** 4a = 2 hours. 4b = half day. 4c = async.

---

## Phase 5 — New Scenes

**Goal:** Fill hue gaps in the temperature arc. Current arc runs warm-rose, with green (Triptych) and gold (Koi) interruptions. Three hues are worth adding.

| Scene | Hue | Type | Placement |
|---|---|---|---|
| **Wisteria** | Violet `#8860b0` | Photographic | Between Triptych and Color Field |
| **Aurora** | Teal-green `#40c888` | Procedural / dark | Between Koi and Stillness |
| **Snow** | Cool grey-blue `#9aaccb` | Procedural | After Epilogue (or Stillness pre-sequence) |

**Wisteria** — photographic tunnel or curtain. Side-clip reveal, perspective depth. The most novel hue currently absent from the arc. Uses `bright` flag (photographic chrome) and `crossfadeLong` preset.

**Aurora** — animated aurora bands, screen-blend. Follows the Koi dark-scene chrome pattern. Third dark scene. All infrastructure already present — this is a CSS `@keyframes` aurora + scene entry in the manifest. Medium effort.

**Snow** — invert the existing petal keyframe direction. Snow petals fall slowly, drift on a cool palette. Trivially close to the existing sakura egg infrastructure. Could be procedural CSS, no Three.js needed.

**Principle:** each new scene must earn its position in the arc. It changes the color temperature at a specific story beat — not just adds a pretty thing. Place before committing to a slot.

---

## Phase 6 — Platform

### Mobile-native pass
Below 760 px the gallery degrades gracefully — no parallax, no cursor, stripped chrome. Correct for now. A real mobile pass would be scroll-snap per scene, swipe-native transitions, and a separate touch-optimized animation budget. A week of work. Worth when the primary audience is mobile.

### Devlog / case study
The engineering decisions here are worth publishing: FLIP preloader, tint observer vs ScrollTrigger, WAAPI over CSS `animation-duration`, lazy video hydration, the lanterns postmortem. A technical essay linking back to the live experience. Audience: senior frontend engineers and technical hiring managers. Platform: anywhere, linking out.

### Headless content model
All copy lives in `index.html`. If the gallery grows past ~12 scenes or needs non-developer edits, moving scene copy + manifest to JSON fetched at build time de-risks future changes and makes the manifest the single source of truth for every scene property. Vite's JSON import is zero-config. Low urgency until scale demands it.

---

## Permanently out

- **Framework migration** — zero-framework is load-bearing for performance and the portfolio story. No React/Svelte.
- **SSR** — client-side gallery, no SEO-critical dynamic content, no benefit.
- **API routes / backend** — no user data, no auth.
- **CI beyond validate + smoke** — solo project, GitHub Actions adds friction for nothing.
- **Lanterns (CSS/sprite)** — pulled once; procedural CSS was cheap-looking, real sprite caused compositor overload. If lanterns return: Blender-rendered sprite or real video, Koi-style.
- **WebGL for non-Prologue scenes** — the shader investment lives where it matters most. Every other scene is photography + CSS motion.

---

## Fixed principles

1. `npm run validate` + `npm run test:smoke` green before every push.
2. No new runtime dependencies without a clear performance-budget justification.
3. `preload: false` on every scene except Prologue + Bloom.
4. Every scene degrades gracefully under `prefers-reduced-motion`.
5. Reduced-motion path is not an afterthought — test it after every significant motion addition.
6. Sound is opt-in, never autoplay. The experience must be whole without it.
7. No assets outside `~/agents/` from agent sessions.
