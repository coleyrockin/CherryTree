import { test, expect } from "@playwright/test";

/**
 * Smoke checks for the Cherry Tree build.
 *
 * Asserts that:
 *   a. The page loads with the expected title and no console errors.
 *   b. All eight scenes are present in the DOM.
 *   c. With prefers-reduced-motion: reduce, the WebGL hero is suppressed
 *      and the static fallback image is in the DOM.
 *   d. Keyboard scene navigation and the motion preference control remain
 *      available in both full- and reduced-motion modes.
 *
 * NOTE: the eight scene IDs live in `data-ct-scene` and correspond to the
 * URL deep-link hashes — `prologue-webgl`, `bloom-wash`, `drift`, `triptych`,
 * `color-field`, `koi`, `stillness`, `epilogue`.
 */

const SCENE_IDS = [
  "prologue-webgl",
  "bloom-wash",
  "drift",
  "triptych",
  "color-field",
  "koi",
  "stillness",
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

  test("all eight scenes are present in the DOM", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    for (const id of SCENE_IDS) {
      const locator = page.locator(`[data-ct-scene="${id}"]`);
      await expect(locator, `scene "${id}" missing`).toHaveCount(1);
    }
  });

  test("keyboard navigation updates the full-motion scene state", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 10_000
    });

    await page.keyboard.press("PageDown");

    await expect.poll(() => page.evaluate(() => window.location.hash), {
      timeout: 5_000
    }).toBe("#bloom-wash");
    await expect(page).toHaveTitle("Bloom — Cherry Tree");
    await expect(page.locator("[data-ct-scene-announce]")).toHaveText("Now viewing: Bloom");
  });

  test("motion control starts in system mode and records explicit choices", async ({ page }) => {
    await page.goto("/#bloom-wash");
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 10_000
    });

    const motionToggle = page.getByRole("button", { name: "Toggle motion mode" });
    await expect(motionToggle.locator("[data-ct-motion-state]")).toHaveText("System");
    await expect(motionToggle).toHaveAttribute("aria-pressed", "false");

    await motionToggle.focus();
    await page.keyboard.press("Enter");
    await expect(motionToggle.locator("[data-ct-motion-state]")).toHaveText("Reduced");
    await expect(motionToggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

    await page.keyboard.press("Enter");
    await expect(motionToggle.locator("[data-ct-motion-state]")).toHaveText("Full");
    await expect(motionToggle).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
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

      // The static fallback picture is in the DOM.
      const fallback = heroScene.locator("picture.scene-media-fallback");
      await expect(fallback).toHaveCount(1);
      await expect(fallback.locator("img")).toHaveAttribute(
        "src",
        /prologue-fallback/
      );

      await page.keyboard.press("PageDown");
      await expect.poll(() => page.evaluate(() => window.location.hash), {
        timeout: 5_000
      }).toBe("#bloom-wash");
      await expect(page.locator("[data-ct-scene-announce]")).toHaveText("Now viewing: Bloom");
    } finally {
      await context.close();
    }
  });
});
