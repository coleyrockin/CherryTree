# Cherry Tree

A cinematic, scroll-driven gallery experience built with WebGL, GSAP, and Lenis — engineered to feel like a film rather than a web page.

![Three.js](https://img.shields.io/badge/Three.js-r181-000?style=flat&logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3.13-88CE02?style=flat&logo=greensock&logoColor=black)
![Lenis](https://img.shields.io/badge/Lenis-1.3-111?style=flat)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat&logo=vite&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

![Cherry Tree preview](./cherrytree-preview.png)

---

## Overview

Cherry Tree is a zero-framework, hand-authored web experience that pairs a real-time WebGL hero scene with a scroll-orchestrated gallery. Every section — prologue, bloom, triptych, color field, stillness, epilogue — is scrubbed to scroll position through GSAP `ScrollTrigger`, smoothed by Lenis, and progressively enhanced so it stays accessible and performant on low-end devices.

It is deliberately built on vanilla ES modules — no React, no framework runtime — to showcase control over the browser, the rendering loop, and the animation timeline at a first-principles level.

## What it demonstrates

- **Real-time WebGL** with Three.js r181: a custom hero scene deferred behind `IntersectionObserver` + `requestIdleCallback` so it never blocks first paint.
- **Timeline-driven animation** with GSAP 3 + `ScrollTrigger`: per-scene scrubbed animations, split-text reveals, magnetic cursor, micro-interactions.
- **Butter-smooth scrolling** with Lenis, wired into GSAP's ticker so scroll and animation share a single frame clock.
- **Progressive enhancement**: full experience, reduced-motion fallback, and no-JS fallback, each tested. A persistent `Motion: Full/Reduced` toggle lets users override `prefers-reduced-motion` at runtime without a reload.
- **Asset pipeline**: a Sharp-based build script generates AVIF / WebP / JPEG responsive sets plus LQIP placeholders for every hero image.
- **Build engineering**: Vite 7 with explicit manual chunking (`vendor-three`, `vendor-gsap`, `vendor-lenis`) — ~190 KB gzipped for the full 3D stack, code-split from app logic.
- **Accessibility**: semantic landmarks, skip link, visually-hidden `h1`, `aria-pressed` toggles, ambient audio off by default, reduced-motion honored.

## Tech stack

| Layer | Technology |
|-------|-----------|
| 3D rendering | Three.js r181 |
| Animation | GSAP 3.13 + ScrollTrigger |
| Scroll | Lenis 1.3 |
| Build | Vite 7 |
| Asset pipeline | Sharp (AVIF / WebP / JPEG + LQIP) |
| Language | Vanilla ES2021 modules, no framework |

## Getting started

**Prerequisites:** Node.js ≥ 18, npm.

```bash
git clone https://github.com/coleyrockin/CherryTree.git
cd CherryTree
npm install
npm run dev          # Vite dev server at http://localhost:5173
```

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run optimize-assets` | Regenerate responsive AVIF / WebP / JPEG sets from `public/assets/images/` source files |

## Project structure

```
├── public/assets/         # Audio + source and generated images
├── scripts/
│   └── optimize-assets.mjs  # Sharp-based responsive-image pipeline
├── src/
│   ├── content/           # Scene manifest (heights, motion presets, preload hints)
│   ├── experience/        # Hero WebGL, scene controller, scroll + text FX, cursor, audio
│   ├── styles/            # Base, scenes, cursor, nav, preloader CSS
│   ├── utils/             # Split-text, scroll velocity, safe storage
│   └── main.js            # Boot orchestrator
├── index.html             # Entry + SEO / OpenGraph metadata
└── vite.config.js         # Manual chunking for three/gsap/lenis
```

## Architecture notes

- **Boot flow** (`src/main.js`): read motion preference → apply scene manifest → boot preloader → lazily import scene controller, text and scroll effects → defer the WebGL hero behind intersection + idle → exit preloader. The motion toggle re-runs this pipeline in place, tearing down and reinitializing motion-dependent modules without a page reload.
- **Rendering contract**: GSAP's ticker drives every animation; Lenis publishes scroll state into the same ticker, so scrub-linked animations and scroll-smoothing never desync.
- **Reduced motion**: when reduced, the hero drops to a pre-rendered responsive `<picture>` fallback and scrub-animations swap for instant state.

## Performance

- First load is static HTML + a ~5 KB gzipped boot chunk; Three.js and GSAP load only once the hero scrolls into view.
- Hero imagery is served as AVIF with WebP and JPEG fallbacks, LQIP-previewed, and `fetchpriority="high"` on the prologue image.
- Build output (gzipped): `vendor-three` ~188 KB, `vendor-gsap` ~45 KB, `vendor-lenis` ~5 KB, app code ~15 KB.

## License

MIT — see [LICENSE](./LICENSE).

---

Built by [Boyd Roberts](https://github.com/coleyrockin).
