/**
 * Visual effects driven by scroll velocity.
 * - Fast scroll: subtle blur on images, grain intensifies
 *
 * The tick runs every frame, but the CSS custom-property writes are gated by a
 * dirty check: we only touch the DOM when the rounded value actually changes,
 * and once velocity decays to ~0 we write the resting values a single time and
 * idle. Output is identical to writing every frame, minus the constant
 * root-element style recalculations.
 */

export const initScrollVelocityFx = ({ velocityTracker, gsap }) => {
  const root = document.documentElement;

  let lastBlur = null;
  let lastGrain = null;

  const onTick = () => {
    const v = velocityTracker.getNormalized();

    // Snap tiny residual velocity to a clean zero so we settle and stop writing.
    const effective = v < 0.001 ? 0 : v;

    const blur = (effective * 2.5).toFixed(2);
    const grain = (effective * 0.12).toFixed(3);

    if (blur !== lastBlur) {
      root.style.setProperty("--scroll-blur", `${blur}px`);
      lastBlur = blur;
    }
    if (grain !== lastGrain) {
      root.style.setProperty("--scroll-grain-boost", grain);
      lastGrain = grain;
    }
  };

  gsap.ticker.add(onTick);

  return () => {
    gsap.ticker.remove(onTick);
    root.style.removeProperty("--scroll-blur");
    root.style.removeProperty("--scroll-grain-boost");
  };
};
