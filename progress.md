Original prompt: Codebase needs to be perfect, website functional, and perfect with a great MD

## Work Log

- Removed the preview image ignore rule so `cherrytree-preview.png` is versionable.
- Expanded `README.md` from a minimal embed into a full project showcase doc with highlights and run/build commands.
- Ran Playwright validation via `web_game_playwright_client.js` against `http://127.0.0.1:5173` with 2 iterations and inspected `shot-0.png` / `shot-1.png` in `/tmp/cherrytree-finalcheck`.
- Confirmed no Playwright error artifacts were generated (`errors-*.json` absent).
- Re-ran `npm run build` successfully after markdown and gitignore updates.
- Added SEO + social metadata (`og:*`, `twitter:*`, canonical, robots, theme-color) in `index.html`.
- Added a new UI motion toggle (`Motion: Full/Reduced`) with persistent storage wiring in `src/main.js` and styles in `src/styles/base.css`.
- Tuned startup performance by removing bloom preload and deferring WebGL hero initialization until intersection/idle.
- Ran Playwright runtime verification:
  - Default mode capture loop in `/tmp/cherrytree-go-full`.
  - Motion-toggle reload path using direct Playwright probe (`state: Reduced`, `errorCount: 0`) with screenshot at `/tmp/cherrytree-go-motion-toggle/shot-toggle.png`.
- Added deterministic motion-toggle proof pass:
  - `before: Full`
  - `after: Reduced`
  - screenshots: `/tmp/cherrytree-go-motion-toggle/before-toggle.png` and `/tmp/cherrytree-go-motion-toggle/after-toggle.png`
- Re-ran `npm run build` after all changes; build passed.

## TODO

- Optional: split `vendor-three` further if sub-500k chunk targets are required.
