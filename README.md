# CherryTree

Interactive 3D animated website built with Three.js, GSAP, and Lenis smooth scrolling.

![Three.js](https://img.shields.io/badge/Three.js-000?style=flat&logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=flat&logo=greensock&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## About

CherryTree is a visually immersive 3D web experience that combines Three.js rendering, GSAP scroll-triggered animations, and Lenis butter-smooth scrolling. The result is a cinematic, interactive website that feels more like a creative showcase than a traditional page.

## Features

- Real-time 3D scene rendering with Three.js
- Scroll-driven animations powered by GSAP ScrollTrigger
- Ultra-smooth scrolling via Lenis
- Optimized asset pipeline with Sharp
- Fast HMR development with Vite

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Engine | Three.js r181 |
| Animation | GSAP 3.13 |
| Scrolling | Lenis 1.3 |
| Build Tool | Vite 7 |
| Asset Optimization | Sharp |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Installation

```bash
git clone https://github.com/coleyrockin/CherryTree.git
cd CherryTree
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Optimize Assets

```bash
npm run optimize-assets
```

## Project Structure

```
├── public/assets/   # Static 3D assets and textures
├── scripts/         # Build and optimization scripts
├── src/             # Application source code
├── index.html       # Entry point
├── vite.config.js   # Vite configuration
└── package.json
```

---

Built by [Boyd Roberts](https://github.com/coleyrockin)
