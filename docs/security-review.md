# CherryTree Security Best Practices Report

## Executive Summary

CherryTree is a static Vite site built with vanilla browser JavaScript, Three.js, GSAP, Lenis, and a Node/Sharp asset optimization script. There is no backend, authentication, database, upload route, API route, or server-side secret boundary in this repository.

No critical or high-severity best-practice failures were found. The remaining recommendations are defense-in-depth and future-proofing: reduce reliance on third-party hosted font CSS if the site becomes privacy-sensitive, and keep Trusted Types in mind if future raw HTML sinks are introduced.

`npm audit --json` was run with current registry access and reported 0 vulnerabilities across 103 dependencies.

## Scope And Stack Evidence

- JavaScript ES modules and Vite: `package.json:5-10`
- Browser runtime dependencies: `package.json:12-15`
- Node/Sharp asset tooling: `package.json:17-19`, `scripts/optimize-assets.mjs:1-3`
- Static HTML entrypoint: `index.html:1-51`
- Vite dev/preview server config: `vite.config.js:14-24`

Guidance used: `/Users/boydroberts/.codex/skills/security-best-practices/references/javascript-general-web-frontend-security.md`

## Critical Findings

None.

## High Findings

None.

## Medium Findings

### SBP-001: Add a CSP and Trusted Types plan for production

- Severity: Medium
- Status: Fixed
- Location: `index.html:25-38`, `index.html:47-50`, `index.html:296`, `vercel.json:1-24`
- Rule: JS-CSP-001, JS-CSP-002, JS-TT-001
- Evidence: `vercel.json` now ships a header-delivered CSP. Inline script execution is limited to hashes for the existing JSON-LD and no-js boot blocks, and the policy avoids `unsafe-eval`.
- Impact: This remains defense-in-depth for the current static site, but future DOM/content regressions now have browser-enforced guardrails.
- Validation: `npm run build` passed after adding the header config; `vercel.json` parses as valid JSON; CSP inline allowances were checked against both `index.html` and `dist/index.html`.
- False positive notes: Trusted Types enforcement is not enabled yet because the current app has no remaining raw HTML sink in source and the immediate fix is a deployable CSP baseline.

## Low Findings

### SBP-002: Third-party Google Fonts CSS is not pinned with integrity

- Severity: Low
- Status: Accepted
- Location: `index.html:39-43`
- Rule: JS-SUPPLY-001, JS-SRI-001
- Evidence: The page loads CSS from `https://fonts.googleapis.com/...` without `integrity`.
- Impact: Third-party CSS is lower risk than third-party JavaScript, but it is still an external production dependency and privacy/supply-chain surface.
- Fix: Prefer self-hosting the required font files and CSS in `public/`, or document why Google Fonts remains acceptable. SRI is often impractical for Google Fonts CSS because responses can vary; self-hosting is the cleaner control.
- Decision: Accepted for this public portfolio site because the dependency is CSS/font-only, no third-party JavaScript is loaded, and the CSP restricts remote execution. Revisit self-hosting if the site becomes privacy-sensitive or needs zero third-party production requests.
- False positive notes: No remote third-party JavaScript was found.

### SBP-003: `innerHTML` helper should stay trusted-markup-only

- Severity: Low
- Status: Fixed
- Location: `src/utils/splitText.js:46-52`, `src/utils/splitText.js:63-69`, `src/experience/sceneNav.js:77-79`
- Rule: JS-XSS-001
- Evidence: `splitText` now treats inputs as trusted plain text and restores with `element.textContent`; `sceneNav` clears generated children with `list.replaceChildren()`.
- Impact: The previous usage was fed by repository-authored static text, so this was not exploitable. The fix removes the reusable HTML sink pattern before future user/CMS/API content can accidentally flow through it.
- Validation: `rg -n "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function|setAttribute\(['\"]on" src index.html scripts vite.config.js` returned no matches, and `npm run build` passed.
- False positive notes: No attacker-controlled source reached these sinks before the fix.

### SBP-004: Dev and preview servers expose all interfaces and tunnel hosts by default

- Severity: Low
- Status: Fixed
- Location: `vite.config.js:3-24`
- Rule: secure development configuration
- Evidence: `server.host` and `preview.host` now bind to `127.0.0.1` by default. LAN and tunnel exposure require `CHERRYTREE_EXPOSE_DEV_SERVER=true`; tunnel hosts and `CHERRYTREE_ALLOWED_HOSTS` are only applied in that opt-in mode.
- Impact: This was a development footgun, not a production vulnerability. Default local runs no longer expose source/build artifacts on the LAN.
- Validation: `npm run build` passed after the config change, and the README now documents the explicit opt-in command for LAN or tunnel testing.
- False positive notes: No privileged dev API route or secret-serving route exists in this repo.

### SBP-005: Sharp optimizer should be hardened before accepting untrusted images

- Severity: Low
- Status: Fixed
- Location: `scripts/optimize-assets.mjs:6-17`, `scripts/optimize-assets.mjs:38-42`, `scripts/optimize-assets.mjs:48-58`
- Rule: secure parser/tooling boundary
- Evidence: The optimizer now uses `limitInputPixels: 50_000_000`, removes `{ unlimited: true }`, and accepts only raster web image formats currently expected by the project (`jpg`, `jpeg`, `png`, `webp`, `avif`).
- Impact: Current inputs are still developer-controlled repository assets, but malformed or oversized image parsing now has an explicit pixel ceiling before the script is ever wired to automation.
- Validation: `npm run optimize-assets` regenerated all current responsive image outputs with the new loader limits, and `npm run build` passed after the optimizer hardening.
- False positive notes: No GitHub Actions workflow was found that processes untrusted images.

## Positive Controls Observed

- No `eval`, `new Function`, `document.write`, `insertAdjacentHTML`, `postMessage`, dynamic script injection, `window.location` redirect flow, or event-handler string assignment was found in source.
- `localStorage` is used only for non-sensitive motion/audio preferences, and motion mode is allowlisted in `src/main.js:12-28`.
- DOM labels and dynamic text generally use `textContent`, `createElement`, `appendChild`, and safe attribute setters.
- No secrets were found in the checked repository files during the security scan run immediately before this report.
- `npm audit --json` reported zero known vulnerabilities.

## Recommended Fix Order

1. Fixed: production CSP and baseline security headers are defined in `vercel.json`.
2. Accepted: Google Fonts remains documented as a CSS/font-only third-party dependency behind a restrictive CSP.
3. Fixed: `splitText.js` is trusted-plain-text-only and scene nav clearing uses `replaceChildren()`.
4. Fixed: tunnel-enabled Vite hosting is opt-in.
5. Fixed: `scripts/optimize-assets.mjs` has explicit input format and pixel limits.
