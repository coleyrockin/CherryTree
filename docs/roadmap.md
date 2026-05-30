# Cherry Tree — Project Roadmap

> Living document. Update when scope shifts.
> Current baseline: nine scenes, green validate + smoke, deployed at cherry-tree-psi.vercel.app.

---

## Where we are

The core engine is complete and hardened: scroll-driven tint system, lazy media hydration, WebGL petal shader, velocity parallax, magnetic cursor, audio bed, reduced-motion parity, screen-reader announcements, URL hash sync, keyboard navigation. Nine scenes are shipped — the newest is **Lanterns**, a full-bleed night of rising paper-lantern glows with a few drifting gold petals (the second dark scene after Koi). Color Field was reworked from a boxed card into a full-bleed Rothko-in-motion wash. The pipeline (`optimize-assets`, `validate`, `smoke`) is repeatable.

The scene-expansion playbook in `docs/scene-expansion.md` documents the add-a-scene path — no new runtime deps required, just manifest + markup + CSS + optional one JPG.

---

## Horizon 1 — Gallery completion (next 2–4 scenes)

Goal: fill the hue range with scenes that cost little and pay off visually. Add no runtime dependencies. Ship each scene behind `npm run validate` + `npm run test:smoke`.

### Candidates (ordered by effort, lowest first)

| Scene | Type | Effort | New hue introduced |
|---|---|---|---|
| **Snow** | Procedural | ~2h | Cool grey-blue `#9aaccb` — winter beat |
| **Dusk** | Procedural | ~3h | Amber `#d4853a` — warmest scene in gallery |
| **Rain** | Procedural | ~3h | Steel-blue `#6688aa` — first cool/wet scene |
| **Mist** | Photographic | ~4h | Celadon `#7aabb0` — pale fog, curtain reveal |
| **Canopy** | Photographic | ~4h | Forest green `#5c8f52` — second green, upward angle |
| **Wisteria** | Photographic | ~5h | Violet `#8860b0` — most novel hue, side-curtain reveal |
| **Aurora** | Procedural/dark | ~6h | Teal-green `#40c888` — second dark scene, dramatic beat |

**Recommended arc:** Snow → Dusk → Wisteria. Snow costs nearly nothing (invert existing petal keyframe), Dusk closes the warm loop, Wisteria introduces violet and a new clip-path reveal pattern. That brings the count to eleven scenes with full hue coverage (rose, green, amber, grey-blue, violet). Aurora can follow if a second dark scene feels earned.

**Sequencing principle:** aim for a temperature arc rather than arbitrary insertion. A cool scene (Mist/Rain) between warm ones reads as a "breath." The current warm-rose sequence broken only by koi-gold and olive could use an earlier cool interruption.

---

## Horizon 2 — Experience depth

Core interactions are solid. These deepen what's already there without adding scenes.

### Audio (medium effort)
The ambient bed is global and uniform. Per-scene audio transitions — same crossfade system, just swap the source file on `ct:scene-enter` — would make the gallery feel alive in a completely new way. Koi scene deserves water/nature ambience; Epilogue a fadeout. Cost: curate CC0 clips, extend `audioController.js` to accept a manifest `audio` field.

### Mobile experience (medium effort)
Below 760px the experience is intentionally stripped: no parallax, no cursor, no scroll rail. That's correct for the current build. A dedicated mobile pass — scroll-snap per scene, full-screen swipe, touch-tuned transitions — could make CherryTree feel native on iPhone rather than gracefully degraded. Not urgent; the desktop experience is the main showcase.

### Performance ceiling (low effort, high leverage)
- LCP is dominated by the hero image (Bloom). Add `fetchpriority="high"` to its `<img>` if not already set.
- The koi video poster is served on first load. Verify the poster JPEG is ≤80 KB (current encoded size unknown) — if it's heavier, re-encode at lower quality.
- Consider `modulepreload` for the Three.js chunk; it's already deferred behind IntersectionObserver but module evaluation still costs ~100ms.

### Visual regression testing (low effort, high confidence)
Playwright smoke tests check load and scene existence. A visual-diff pass — screenshot each scene at 1280×800, diff against a golden set — would catch CSS regressions that smoke currently misses. `@playwright/test` already installed; just add a `visual.spec.js` suite with `toHaveScreenshot`.

---

## Horizon 3 — Platform evolution

Further out. Only worthwhile if the project grows beyond a portfolio piece.

### Case study / writing layer
The engineering decisions here (FLIP preloader, tint observer vs ScrollTrigger, WAAPI over CSS animation, lazy video hydration pattern) are genuinely interesting and worth documenting as a devlog or series of posts. Could live at `/log` as a minimal second page or as external writing that links back.

### Headless content model
All copy is hardcoded in `index.html`. If the gallery ever grows past ~15 scenes or needs non-developer editing, moving scene copy + manifest data to a headless CMS (Notion, Contentful, or even a JSON file fetched at build time) and generating `index.html` via a build-step template would de-risk future edits.

### Versioning / alternate themes
The tint system is fully data-driven — it would take a single JSON swap to render the gallery in a night-mode or high-contrast palette. A user-facing theme picker (in addition to the existing motion/sound toggles) could expose this as a genuine accessibility and aesthetic feature.

---

## What to skip (permanently deprioritized)

- **Framework migration** — the zero-framework constraint is load-bearing for performance and showcaseability. No React/Svelte.
- **Build-time SSR** — this is a client-side gallery. SSR adds complexity for zero benefit (no SEO-critical content beyond the landing page).
- **API routes / backend** — no user data, no auth. Nothing to serve.
- **CI beyond validate + smoke** — the current local pipeline is fast and reliable. GitHub Actions adds friction for a solo project.

---

## Principles that stay fixed

1. `npm run validate` + `npm run test:smoke` must stay green before every push.
2. No new runtime dependencies without a clear performance budget justification.
3. `preload: false` on every scene except prologue + bloom.
4. Every scene must degrade gracefully under `prefers-reduced-motion`.
5. `ALL agent-generated output → ~/agents/` — no exceptions.
