# Cherry Tree

> A scroll-driven cinematic gallery — six scenes, one continuous film.

**[cherry-tree-psi.vercel.app](https://cherry-tree-psi.vercel.app)**

![Three.js](https://img.shields.io/badge/Three.js-r181-000?style=flat&logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3.13-88CE02?style=flat&logo=greensock&logoColor=black)
![Lenis](https://img.shields.io/badge/Lenis-1.3-111?style=flat)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat&logo=vite&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

![Cherry Tree preview](./cherrytree-preview.png)

---

Cherry Tree is a zero-framework, hand-authored web experience. Real-time WebGL petals fall through a Three.js hero scene. Scroll scrubs every animation through GSAP `ScrollTrigger`. Lenis shares a frame clock with GSAP so smoothing and animation never drift. Each of the six scenes carries its own color temperature and editorial numerals — the whole thing transitions like a cut between shots.

Built on vanilla ES modules. No React, no framework overhead — just full control over the browser, the render loop, and the timeline.

## Stack

| Layer | Technology |
|---|---|
| 3D / WebGL | Three.js r181, custom ShaderMaterial |
| Animation | GSAP 3.13 + ScrollTrigger |
| Scroll | Lenis 1.3 |
| Build | Vite 7, manual vendor chunking |
| Images | Sharp — AVIF / WebP / JPEG + LQIP |
| Language | Vanilla ES2021, no framework |

## What's under the hood

- **Custom ShaderMaterial** — per-petal UV rotation, depth-of-field color shift, additive light-speck layer; ~400 particles on desktop
- **FLIP preloader** — brand text measures its position, animates directly into the hero title via `expo.inOut`, no clone hack
- **Scene tinting** — `IntersectionObserver` tracks which scene occupies the most viewport and dispatches `--scene-tint`, `--scene-ink`, `--scene-grain` CSS vars in real time
- **Velocity parallax** — scene text layers scrub `yPercent` against scroll direction via `ScrollTrigger` scrub
- **Magnetic cursor** — ring snaps to interactive elements, morphs size, shows contextual label
- **Reduced motion** — full fallback: static image, no scrub, no WebGL; user-overridable toggle at runtime without reload

## Performance

Build output (gzipped): Three.js ~188 KB · GSAP ~45 KB · Lenis ~5 KB · app ~15 KB. Three.js defers behind `IntersectionObserver` + `requestIdleCallback` — it never touches first paint.

## Local setup

```bash
git clone https://github.com/coleyrockin/CherryTree.git
cd CherryTree
npm install
npm run dev
```

| Script | |
|---|---|
| `npm run dev` | Vite dev server at localhost:5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run optimize-assets` | Regenerate responsive image sets from source files |

## License

MIT — see [LICENSE](./LICENSE).

---

Built by [Boyd Roberts](https://github.com/coleyrockin).
