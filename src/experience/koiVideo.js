/**
 * Lazy, visibility-driven controller for the Koi scene's background video.
 *
 * The <video> ships with no source and `preload="none"` — nothing is fetched
 * until the scene approaches the viewport. When it does, the data-src sources
 * are hydrated and playback starts; when the scene leaves, playback pauses to
 * save battery/CPU (mirroring the hero's offscreen-pause ethos).
 *
 * Reduced motion keeps the poster frame only — the video is never loaded or
 * played, and autoplay is suppressed.
 */

export const initKoiVideo = ({ reducedMotion = false } = {}) => {
  const video = document.querySelector(".koi-video");
  if (!video) {
    return () => { };
  }

  const scene = video.closest(".scene") || video;

  let hydrated = false;
  const hydrate = () => {
    if (hydrated) return;
    hydrated = true;
    video.querySelectorAll("source[data-src]").forEach((source) => {
      source.src = source.dataset.src;
    });
    video.load();
  };

  // Reduced motion: poster only — never fetch or play the footage.
  if (reducedMotion) {
    video.removeAttribute("autoplay");
    try { video.pause(); } catch { /* no-op */ }
    return () => { };
  }

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
