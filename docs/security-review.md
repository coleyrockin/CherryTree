# CherryTree Security Review

**Reviewed:** 2026-07-21
**Scope:** browser source, static HTML/assets, Vite configuration, CI, deployment
headers, and production dependencies.

CherryTree is a static Vite experience. It has no backend, authentication,
database, upload endpoint, server-side API, or repository-managed secret
boundary.

## Findings

No critical, high, medium, or low-severity security findings are open.

## Verified Controls

- [`vercel.json`](../vercel.json) provides a restrictive header-delivered CSP,
  HSTS, `nosniff`, frame protection, referrer policy, and a deny-by-default
  permissions policy. The executable inline bootstrap in [`index.html`](../index.html)
  is SHA-256 pinned; the policy does not allow `unsafe-eval`.
- Runtime assets, fonts, media, and scripts are first-party. No remote script,
  stylesheet, API, analytics, or font request is required at runtime.
- The source scan found no `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
  `document.write`, `eval`, `new Function`, `postMessage`, dynamic script
  injection, or URL redirect assignment. Dynamic labels use DOM APIs and
  `textContent`.
- `localStorage` holds only motion, audio, and keyboard-shortcut preferences;
  the motion mode is allowlisted in [`src/main.js`](../src/main.js).
- [`scripts/optimize-assets.mjs`](../scripts/optimize-assets.mjs) accepts a
  short allowlist of raster formats and enforces Sharp's 50-megapixel input
  limit before image processing.
- Local Vite dev and preview servers bind to `127.0.0.1` by default. LAN or
  tunnel access is explicit in [`vite.config.js`](../vite.config.js).
- The CI workflow runs static showcase checks, a production build, the
  production dependency audit, and browser smoke tests.

## Validation

- Static high-risk sink and secret scans: no actionable findings.
- `npm run check:showcase`: passed.
- `npm run build`: passed.
- `npm audit`: 0 vulnerabilities.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm run test:smoke`: passed after this review's navigation coverage update.

## Residual Risk

`style-src 'unsafe-inline'` remains necessary for the authored inline style
variables used by the static 404 page and scene effects. It is not exposed to
untrusted content in the current static application. Any future CMS, markdown,
or user-supplied content must retain the current DOM-safe rendering approach
and should revisit a stricter style policy and Trusted Types.

For coordinated vulnerability reporting, see [`SECURITY.md`](../SECURITY.md).
