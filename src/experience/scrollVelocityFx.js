/**
 * Visual effects driven by scroll velocity.
 * - Fast scroll: subtle blur on images, grain intensifies
 */

export const initScrollVelocityFx = ({ velocityTracker, gsap }) => {
  const root = document.documentElement;

  const onTick = () => {
    const v = velocityTracker.getNormalized();

    // Blur on scene images (0 to 2.5px)
    root.style.setProperty("--scroll-blur", `${(v * 2.5).toFixed(2)}px`);

    // Grain opacity boost (0.22 base + up to 0.12)
    root.style.setProperty("--scroll-grain-boost", (v * 0.12).toFixed(3));
  };

  gsap.ticker.add(onTick);

  return () => {
    gsap.ticker.remove(onTick);
    root.style.removeProperty("--scroll-blur");
    root.style.removeProperty("--scroll-grain-boost");
  };
};
