/**
 * Reduced-motion dark-scene chrome.
 *
 * In FULL motion, sceneTint.js toggles `html.is-scene-dark` as part of the tint
 * cut (it reads each scene's `dark` flag). That observer never runs in reduced
 * motion, so this module covers the reduced path: it watches every dark scene
 * and lights up `is-scene-dark` whenever one dominates the viewport, keeping the
 * persistent chrome legible over a dark full-bleed scene.
 *
 * A single observer across all dark scenes (rather than one per scene) avoids
 * the boundary race two adjacent dark scenes would otherwise hit, where one
 * scene's observer clears the class the other just set.
 */
export const initDarkSceneChrome = ({ manifest }) => {
  const root = document.documentElement;
  const darkEls = manifest
    .filter((scene) => scene.dark)
    .map((scene) => document.querySelector(`[data-ct-scene="${scene.id}"]`))
    .filter(Boolean);

  if (!darkEls.length || !("IntersectionObserver" in window)) {
    return () => { };
  }

  const ratios = new Map(darkEls.map((el) => [el, 0]));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => ratios.set(entry.target, entry.intersectionRatio));
      let dark = false;
      ratios.forEach((ratio) => {
        if (ratio >= 0.5) dark = true;
      });
      root.classList.toggle("is-scene-dark", dark);
    },
    { threshold: [0, 0.5, 1] }
  );

  darkEls.forEach((el) => observer.observe(el));

  return () => {
    observer.disconnect();
    root.classList.remove("is-scene-dark");
  };
};
