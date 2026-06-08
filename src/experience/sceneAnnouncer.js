/**
 * Reduced-motion scene announcer + URL-hash sync.
 *
 * In FULL motion, sceneNav.js drives the aria-live scene announcements and the
 * `#scene-id` hash off ScrollTrigger. In REDUCED motion, ScrollTrigger / Lenis
 * never initialize, so this lightweight IntersectionObserver-based tracker
 * provides the same screen-reader announcements and URL-hash updates as the
 * user scrolls, plus an instant deep-link scroll on load / hashchange.
 *
 * It is only wired up in reduced motion (main.js), so it never double-runs with
 * sceneNav. The highest-visibility selection mirrors sceneTint.js.
 */

import { pickHighestRatio } from "../utils/intersection";

export const initSceneAnnouncer = ({ manifest }) => {
  const announceRegion = document.querySelector("[data-ct-scene-announce]");

  const scenes = manifest
    .map((scene) => ({ scene, el: document.querySelector(`[data-ct-scene="${scene.id}"]`) }))
    .filter((entry) => entry.el);

  if (!scenes.length) {
    return () => { };
  }

  const cleanup = [];
  let activeId = null;

  const setActive = (id) => {
    if (id === activeId) return;
    activeId = id;
    const scene = manifest.find((s) => s.id === id);
    if (!scene) return;

    if (announceRegion) {
      announceRegion.textContent = `Now viewing: ${scene.label || scene.id}`;
    }

    const desired = `#${scene.id}`;
    if (window.location.hash !== desired) {
      history.replaceState(null, "", desired);
    }
  };

  // Active-scene tracking — highest-visibility scene wins (mirrors sceneTint).
  if ("IntersectionObserver" in window) {
    const ratios = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => ratios.set(entry.target, entry.intersectionRatio));

        // pickHighestRatio returns null when every ratio is 0, so the prior
        // `bestRatio > 0` guard is implicit.
        const bestEl = pickHighestRatio(ratios);
        if (bestEl) {
          const match = scenes.find((entry) => entry.el === bestEl);
          if (match) setActive(match.scene.id);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    scenes.forEach(({ el }) => observer.observe(el));
    cleanup.push(() => observer.disconnect());
  }

  // Deep-link: jump to a scene from the initial hash (instant — reduced motion
  // has no smooth-scroll engine). Deferred until after the preloader settles.
  const scrollToId = (id) => {
    const match = scenes.find((entry) => entry.scene.id === id);
    if (match) match.el.scrollIntoView({ behavior: "auto", block: "start" });
  };

  const initialHash = window.location.hash.replace(/^#/, "");
  if (initialHash) {
    const timer = setTimeout(() => scrollToId(initialHash), 200);
    cleanup.push(() => clearTimeout(timer));
  }

  const onHashChange = () => scrollToId(window.location.hash.replace(/^#/, ""));
  window.addEventListener("hashchange", onHashChange);
  cleanup.push(() => window.removeEventListener("hashchange", onHashChange));

  return () => cleanup.forEach((fn) => fn());
};
