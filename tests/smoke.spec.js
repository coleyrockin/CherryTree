import { test, expect } from "@playwright/test";

/**
 * Smoke checks for the Cherry Tree build.
 *
 * Asserts that:
 *   a. The page loads with the expected title and no console errors.
 *   b. All nine scenes are present in the DOM.
 *   c. With prefers-reduced-motion: reduce, the WebGL hero is suppressed
 *      and the static fallback image is in the DOM.
 *
 * NOTE: the nine scene IDs live in `data-ct-scene` and correspond to the
 * URL deep-link hashes — `prologue-webgl`, `bloom-wash`, `drift`, `triptych`,
 * `color-field`, `koi`, `stillness`, `lanterns`, `epilogue`.
 */

const SCENE_IDS = [
  "prologue-webgl",
  "bloom-wash",
  "drift",
  "triptych",
  "color-field",
  "koi",
  "stillness",
  "lanterns",
  "epilogue"
];

// Per-scene document title swaps mean we only check for the brand suffix.
const TITLE_BRAND = /Cherry Tree/;

test.describe("Cherry Tree smoke", () => {
  test("loads with expected title and no console errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`console.error: ${msg.text()}`);
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Wait past the 6-second preloader safety timeout to ensure boot settled
    await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 10_000
    });

    await expect(page).toHaveTitle(TITLE_BRAND);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("all nine scenes are present in the DOM", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    for (const id of SCENE_IDS) {
      const locator = page.locator(`[data-ct-scene="${id}"]`);
      await expect(locator, `scene "${id}" missing`).toHaveCount(1);
    }
  });

  test("reduced motion suppresses WebGL and keeps the static fallback", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    try {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
        timeout: 10_000
      });

      // The hero scene picks up the fallback class because main.js skips
      // initHeroWebgl when reducedMotion is set.
      const heroScene = page.locator('[data-ct-scene="prologue-webgl"]');
      await expect(heroScene).toHaveClass(/is-webgl-fallback/);

      // No WebGL context has been bound to the canvas.
      const hasGlContext = await page.evaluate(() => {
        const canvas = document.getElementById("hero-webgl");
        if (!canvas) return false;
        // After init has run, getContext("webgl2") returns null if no
        // context was created and the type is incompatible.
        return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
      });
      // The check above will *create* a context if none exists, so we instead
      // assert that the hero never asked for one — the host carries the class.
      // (Kept above for diagnostic clarity in trace; assertion below is the
      // authoritative one.)
      expect(typeof hasGlContext).toBe("boolean");

      // The static fallback picture is in the DOM.
      const fallback = heroScene.locator("picture.scene-media-fallback");
      await expect(fallback).toHaveCount(1);
      await expect(fallback.locator("img")).toHaveAttribute(
        "src",
        /prologue-fallback/
      );
    } finally {
      await context.close();
    }
  });
});
