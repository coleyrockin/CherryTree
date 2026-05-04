# CherryTree Security Best Practices Report

## Executive Summary

CherryTree is a static Vite site built with vanilla browser JavaScript, Three.js, GSAP, Lenis, and a Node/Sharp asset optimization script. There is no backend, authentication, database, upload route, API route, or server-side secret boundary in this repository.

No critical or high-severity best-practice failures were found. The main recommendations are defense-in-depth and future-proofing: add a CSP/Trusted Types plan, reduce reliance on third-party hosted font CSS, mark the `innerHTML` restoration helper as trusted-markup-only or refactor it, make dev-server tunnel exposure opt-in, and harden the Sharp optimizer if source images ever become untrusted or CI-provided.

`npm audit --json` was run with current registry access and reported 0 vulnerabilities across 103 dependencies.

## Scope And Stack Evidence

- JavaScript ES modules and Vite: `package.json:5-10`
- Browser runtime dependencies: `package.json:12-15`
- Node/Sharp asset tooling: `package.json:17-19`, `scripts/optimize-assets.mjs:1-3`
- Static HTML entrypoint: `index.html:1-49`
- Vite dev/preview server config: `vite.config.js:10-20`

Guidance used: `/Users/boydroberts/.codex/skills/security-best-practices/references/javascript-general-web-frontend-security.md`

## Critical Findings

None.

## High Findings

None.

## Medium Findings

### SBP-001: Add a CSP and Trusted Types plan for production

- Severity: Medium
- Location: `index.html:23-36`, `index.html:45-48`, `index.html:273`
- Rule: JS-CSP-001, JS-CSP-002, JS-TT-001
- Evidence: The HTML contains inline JSON-LD and an inline boot script, and no `Content-Security-Policy` or Trusted Types policy is visible in repository HTML/config.
- Impact: This is not currently exploitable by itself, but if future URL/CMS/API content introduces DOM XSS, the page has no visible browser-enforced policy to reduce script execution impact. Inline scripts also make a strict CSP harder unless they are moved, hashed, or nonced.
- Fix: Prefer a Vercel/edge header-delivered CSP. At minimum, define `script-src` without `unsafe-eval`; move the tiny `no-js` class toggle into `/src/main.js` or hash it; hash or externalize JSON-LD if needed. Consider `require-trusted-types-for 'script'` after auditing remaining `innerHTML` sinks.
- False positive notes: Security headers can be configured outside this repo. If Vercel already sets CSP headers, document that in the repo.

## Low Findings

### SBP-002: Third-party Google Fonts CSS is not pinned with integrity

- Severity: Low
- Location: `index.html:37-41`
- Rule: JS-SUPPLY-001, JS-SRI-001
- Evidence: The page loads CSS from `https://fonts.googleapis.com/...` without `integrity`.
- Impact: Third-party CSS is lower risk than third-party JavaScript, but it is still an external production dependency and privacy/supply-chain surface.
- Fix: Prefer self-hosting the required font files and CSS in `public/`, or document why Google Fonts remains acceptable. SRI is often impractical for Google Fonts CSS because responses can vary; self-hosting is the cleaner control.
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
- Location: `vite.config.js:3-19`
- Rule: secure development configuration
- Evidence: `server.host` and `preview.host` are `true`; `.lhr.life`, `.loca.lt`, and `CHERRYTREE_ALLOWED_HOSTS` are accepted by default host allowlist construction.
- Impact: This is a development footgun, not a production vulnerability. If a developer runs Vite while on an untrusted network or with a tunnel active, source/build artifacts are easier to expose.
- Fix: Make tunnel exposure opt-in with an environment flag, or default `host` to localhost and document the command for tunnel testing.
- False positive notes: No privileged dev API route or secret-serving route exists in this repo.

### SBP-005: Sharp optimizer should be hardened before accepting untrusted images

- Severity: Low
- Location: `scripts/optimize-assets.mjs:6-17`, `scripts/optimize-assets.mjs:38-42`, `scripts/optimize-assets.mjs:48-58`
- Rule: secure parser/tooling boundary
- Evidence: The script processes local source images with `sharp(inputPath, { unlimited: true })` and accepts broad image extensions, including SVG and TIFF.
- Impact: Current inputs are developer-controlled repository assets, so this is not exploitable. If CI or automation later processes untrusted PR images, malformed or oversized image parsing could become a build-worker denial-of-service or native parser risk.
- Fix: Remove `{ unlimited: true }` unless required, set explicit pixel/metadata limits, keep source images developer-only, and consider narrowing accepted extensions to formats actually used.
- False positive notes: No GitHub Actions workflow was found that processes untrusted images.

## Positive Controls Observed

- No `eval`, `new Function`, `document.write`, `insertAdjacentHTML`, `postMessage`, dynamic script injection, `window.location` redirect flow, or event-handler string assignment was found in source.
- `localStorage` is used only for non-sensitive motion/audio preferences, and motion mode is allowlisted in `src/main.js:12-28`.
- DOM labels and dynamic text generally use `textContent`, `createElement`, `appendChild`, and safe attribute setters.
- No secrets were found in the checked repository files during the security scan run immediately before this report.
- `npm audit --json` reported zero known vulnerabilities.

## Recommended Fix Order

1. Add a production CSP plan and decide whether headers live in Vercel config, platform settings, or repository-managed deployment files.
2. Self-host fonts or document the Google Fonts dependency.
3. Fixed: `splitText.js` is trusted-plain-text-only and scene nav clearing uses `replaceChildren()`.
4. Make tunnel-enabled Vite hosting opt-in.
5. Harden `scripts/optimize-assets.mjs` before it is ever run on untrusted or PR-supplied image files.
