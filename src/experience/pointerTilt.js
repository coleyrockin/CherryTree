/**
 * Pointer-reactive 3D tilt for image scenes (desktop only).
 *
 * Reads the cursor position relative to each scene's bounds, smooths the
 * target toward the cursor each frame, and applies a small perspective tilt
 * to the scene-media layer. Skipped on coarse pointers (touch) and on scenes
 * that already have their own treatment (prologue WebGL, triptych pin/reveal).
 */

import { lerp } from "../utils/math";

const MAX_DEG = 1.5;
const SMOOTH = 0.06;
const SKIP_IDS = new Set(["prologue-webgl", "triptych"]);

export const initPointerTilt = (scenes, gsap) => {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  if (isCoarse) {
    return () => { };
  }

  const tiltTargets = [];
  const abortController = new AbortController();

  scenes.forEach((scene) => {
    if (SKIP_IDS.has(scene.dataset.ctScene)) {
      return;
    }

    const media = scene.querySelector("[data-scene-media]");
    if (!media) {
      return;
    }

    const state = {
      targetX: 0, targetY: 0, currentX: 0, currentY: 0,
      lastRotY: null, lastRotX: null,
      bounds: null, boundsAt: 0
    };
    // Write rotation through GSAP's transform cache so it composes with the
    // velocityParallax scrub (yPercent/scale) on the same element. A raw
    // style.transform write here would wipe the parallax state on every
    // pointer move — the same writer-collision bug the cursor ring had.
    gsap.set(media, { transformPerspective: 1200 });
    const setRotX = gsap.quickSetter(media, "rotationX", "deg");
    const setRotY = gsap.quickSetter(media, "rotationY", "deg");
    tiltTargets.push({ media, state, setRotX, setRotY });

    // getBoundingClientRect forces layout, so cache it and refresh at most
    // every 250ms — the ±1.5° tilt can't visibly drift in that window even
    // while scrolling under a held pointer.
    const readBounds = () => {
      state.bounds = scene.getBoundingClientRect();
      state.boundsAt = performance.now();
    };

    scene.addEventListener("pointerenter", readBounds, {
      passive: true,
      signal: abortController.signal
    });

    scene.addEventListener(
      "pointermove",
      (event) => {
        if (!state.bounds || performance.now() - state.boundsAt > 250) {
          readBounds();
        }
        const bounds = state.bounds;
        if (!bounds.width || !bounds.height) {
          return;
        }
        state.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        state.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      },
      { passive: true, signal: abortController.signal }
    );

    scene.addEventListener(
      "pointerleave",
      () => {
        state.targetX = 0;
        state.targetY = 0;
      },
      { passive: true, signal: abortController.signal }
    );
  });

  if (!tiltTargets.length) {
    return () => { };
  }

  const onTick = () => {
    tiltTargets.forEach(({ state, setRotX, setRotY }) => {
      state.currentX = lerp(state.currentX, state.targetX, SMOOTH);
      state.currentY = lerp(state.currentY, state.targetY, SMOOTH);

      const rotY = Number((state.currentX * MAX_DEG).toFixed(3));
      const rotX = Number((-state.currentY * MAX_DEG).toFixed(3));

      // Skip the style write once the tilt has settled — identical output,
      // no per-frame transform mutation while the pointer is still.
      if (rotY === state.lastRotY && rotX === state.lastRotX) {
        return;
      }
      state.lastRotY = rotY;
      state.lastRotX = rotX;

      setRotY(rotY);
      setRotX(rotX);
    });
  };

  gsap.ticker.add(onTick);

  return () => {
    gsap.ticker.remove(onTick);
    abortController.abort();
    tiltTargets.forEach(({ media }) => {
      gsap.set(media, { rotationX: 0, rotationY: 0 });
    });
  };
};
