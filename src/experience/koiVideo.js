/**
 * Lazy, visibility-driven controller for the Koi scene's background video.
 *
 * The <video> ships with no source, no poster, and `preload="none"` — nothing
 * is fetched until the scene approaches the viewport. When it does, the
 * data-src sources + data-poster are hydrated and playback starts; when the
 * scene leaves, playback pauses (mirroring the hero's offscreen-pause ethos).
 *
 * Reduced motion keeps the poster only — the video is never played, and the
 * dark-scene chrome (html.is-scene-dark) is driven here, because the tint
 * observer in sceneTint.js does not run in reduced motion.
 */

/**
 * Toggle the light-chrome treatment while the dark koi scene dominates the
 * viewport. In FULL motion sceneTint.js already does this (synced with the tint
 * cut); this covers the REDUCED-motion path where the tint observer is absent
 * but the dark poster is still on screen and the chrome would be illegible.
 */
const observeDarkChrome = (sceneEl) => {
  const root = document.documentElement;
  if (!("IntersectionObserver" in window)) {
    return () => { };
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        root.classList.toggle("is-scene-dark", entry.intersectionRatio >= 0.5);
      });
    },
    { threshold: [0, 0.5, 1] }
  );
  observer.observe(sceneEl);
  return () => {
    observer.disconnect();
    root.classList.remove("is-scene-dark");
  };
};

export const initKoiVideo = ({ reducedMotion = false } = {}) => {
  const video = document.querySelector(".koi-video");
  if (!video) {
    return () => { };
  }

  const scene = video.closest(".scene") || video;

  // Reduced motion: poster only — never fetch or play the footage. Show the
  // still frame and drive the dark-scene chrome (tint observer is inactive).
  if (reducedMotion) {
    if (video.dataset.poster) video.poster = video.dataset.poster;
    try { video.pause(); } catch { /* no-op */ }
    return observeDarkChrome(scene);
  }

  let hydrated = false;
  const hydrate = () => {
    if (hydrated) return;
    hydrated = true;
    if (video.dataset.poster) video.poster = video.dataset.poster;
    video.querySelectorAll("source[data-src]").forEach((source) => {
      source.src = source.dataset.src;
    });
    video.load();
  };

  let observer = null;

  const onIntersect = (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        hydrate();
        video.play().catch(() => { /* autoplay policy — harmless */ });
      } else {
        try { video.pause(); } catch { /* no-op */ }
      }
    });
  };

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(onIntersect, {
      rootMargin: "300px 0px",
      threshold: 0.01
    });
    observer.observe(scene);
  } else {
    hydrate();
    video.play().catch(() => { /* no-op */ });
  }

  return () => {
    observer?.disconnect();
    try { video.pause(); } catch { /* no-op */ }
  };
};
