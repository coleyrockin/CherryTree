/**
 * Given a Map of Element -> intersectionRatio, return the element with the
 * highest ratio, or null if every ratio is 0. Shared by the scene-tint observer
 * and the reduced-motion scene announcer, which both pick the most-visible scene.
 */
export const pickHighestRatio = (ratios) => {
  let bestEl = null;
  let bestRatio = 0;
  ratios.forEach((ratio, el) => {
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestEl = el;
    }
  });
  return bestEl;
};
