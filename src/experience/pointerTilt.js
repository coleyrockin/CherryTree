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

    const state = { targetX: 0, targetY: 0, currentX: 0, currentY: 0, lastRotY: null, lastRotX: null };
    tiltTargets.push({ media, state });

    scene.addEventListener(
      "pointermove",
      (event) => {
        const bounds = scene.getBoundingClientRect();
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
    tiltTargets.forEach(({ media, state }) => {
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

      media.style.transform =
        `perspective(1200px) rotateY(${rotY}deg) rotateX(${rotX}deg)`;
    });
  };

  gsap.ticker.add(onTick);

  return () => {
    gsap.ticker.remove(onTick);
    abortController.abort();
    tiltTargets.forEach(({ media }) => {
      media.style.transform = "";
    });
  };
};
