# Cherry Tree — Visual Improvement Roadmap

> Living document. Update when scope shifts.
> Current baseline: nine scenes, petal spine, rebuilt Epilogue, deployed at cherry-tree-psi.vercel.app.

---

## Where we are

The core engine is complete and hardened: scroll-driven tint system, lazy media hydration, WebGL petal shader, velocity parallax, magnetic cursor, audio bed, reduced-motion parity, screen-reader announcements, URL hash sync, keyboard navigation. Nine scenes are shipped — Lanterns being the newest (procedural dark scene, paper-lantern barrel shapes, water reflection, filmic depth). Color Field is a full-bleed Rothko-in-motion wash. A global petal spine threads all nine scenes with color-shifting cherry blossoms. The Epilogue was rebuilt with rich blooms and real rising petal shapes. The pipeline (`optimize-assets`, `validate`, `smoke`) is repeatable.

---

## Near-term — finish the current visual pass

**Prologue text legibility**
The hero title fights with WebGL petals for legibility on certain frames. A faint scrim behind the text anchors it without dimming the petal field. One-time petal dispersion on load adds a sense of arrival.

**Scene transition polish**
The tint cut and bloom flash work. The moment of cut — especially dark↔light (Koi→Stillness, Lanterns→Epilogue) — could feel more cinematic. A brief desaturation + scale micro-pulse on the media layer on cut gives it shot-change energy.

---

## Medium-term — raise the ceiling

### WebGL petal-spine upgrade
The current petal spine is 2D canvas — lightweight, present, correct. The real version uses the existing Three.js petal shader from the Prologue: same depth-of-field, same cursor repulsion, same color-shift. Running global, tinted per scene. This is the difference between "petals are present" and "it genuinely feels like a cherry tree." The biggest quality jump available without new assets. Half-day of work.

### Per-scene audio transitions
The ambient bed is global and uniform. Swapping the source on `ct:scene-enter` — water sounds for Koi, silence for Stillness, a low resonance for Lanterns — adds an entirely new sensory layer. The crossfade system is already built in `audioController.js`. This is curation work (source CC0 clips) + one new `audio` manifest field per scene.

### New scenes — hue gaps to fill

| Scene | Type | New hue | Notes |
|---|---|---|---|
| **Wisteria** | Photographic | Violet `#8860b0` | Perspective tunnel, side-curtain clip reveal. Most novel hue missing from the arc. |
| **Aurora** | Procedural/dark | Teal-green `#40c888` | Animated aurora bands, screen-blend. Third dark scene. `is-scene-dark` chrome pattern already reusable. |
| **Snow** | Procedural | Cool grey-blue `#9aaccb` | Invert existing petal keyframe direction. Near-zero cost. |

Sequencing principle: aim for a deliberate temperature arc. The gallery runs warm-rose with green (Triptych) and gold (Koi/Lanterns) interruptions. Wisteria introduces violet; Aurora closes the dark thread; Snow gives a cool rest between warm beats.

---

## Longer-term — platform decisions

### Mobile-native experience
Below 760px the gallery is gracefully degraded — no parallax, no cursor, stripped chrome. Correct for now. A real mobile pass (scroll-snap per scene, swipe-native transitions) would make CherryTree feel intentional on iPhone rather than reduced. A week of work. Worth doing if the portfolio audience is mobile-first.

### Devlog / case study
The engineering decisions here are worth publishing: FLIP preloader, tint observer vs ScrollTrigger, WAAPI over CSS animation, lazy video hydration, procedural lanterns without assets. Could live at `/log` or as external writing linking back to the live experience.

### Headless content model
All copy is hardcoded in `index.html`. If the gallery grows past ~15 scenes or needs non-developer editing, moving scene copy + manifest to a JSON file (or headless CMS) fetched at build time would de-risk future edits.

---

## What to skip (permanently deprioritized)

- **Framework migration** — zero-framework is load-bearing for performance and the showcase story. No React/Svelte.
- **SSR** — client-side gallery, no SEO-critical dynamic content, no benefit.
- **API routes / backend** — no user data, no auth.
- **CI beyond validate + smoke** — solo project, GitHub Actions adds friction for nothing.
- **Real footage for Lanterns** — procedural CSS is the right call. Control > realism here.

---

## Principles that stay fixed

1. `npm run validate` + `npm run test:smoke` green before every push.
2. No new runtime dependencies without a clear performance budget justification.
3. `preload: false` on every scene except Prologue + Bloom.
4. Every scene degrades gracefully under `prefers-reduced-motion`.
5. No assets outside `~/agents/` from agent sessions.
