/**
 * Shared scroll velocity tracker that reads from a Lenis instance.
 * Returns a normalized 0–1 value smoothed with exponential decay.
 */

const VELOCITY_THRESHOLD = 2000;
const SMOOTH_FACTOR = 0.08;

export const createVelocityTracker = (lenis) => {
  let raw = 0;
  let smoothed = 0;
  let tickId = null;

  const onScroll = () => {
    raw = Math.abs(lenis.velocity);
  };

  lenis.on("scroll", onScroll);

  const update = (_, deltaTime) => {
    const target = Math.min(1, raw / VELOCITY_THRESHOLD);
    smoothed += (target - smoothed) * SMOOTH_FACTOR;

    // Decay raw toward zero when scroll stops
    raw *= 0.92;
  };

  return {
    getRaw: () => raw,
    getNormalized: () => smoothed,
    attachTicker: (gsap) => {
      gsap.ticker.add(update);
      tickId = update;
    },
    destroy: () => {
      lenis.off("scroll", onScroll);
      return tickId;
    }
  };
};
