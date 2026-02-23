Original prompt: Codebase needs to be perfect, website functional, and perfect with a great MD

## Work Log

- Removed the preview image ignore rule so `cherrytree-preview.png` is versionable.
- Expanded `README.md` from a minimal embed into a full project showcase doc with highlights and run/build commands.
- Ran Playwright validation via `web_game_playwright_client.js` against `http://127.0.0.1:5173` with 2 iterations and inspected `shot-0.png` / `shot-1.png` in `/tmp/cherrytree-finalcheck`.
- Confirmed no Playwright error artifacts were generated (`errors-*.json` absent).
- Re-ran `npm run build` successfully after markdown and gitignore updates.

## TODO

- Optional: tune vendor chunk splitting if smaller production chunks are a requirement.
