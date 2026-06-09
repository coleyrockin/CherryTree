/**
 * Shared scroll velocity tracker that reads from a Lenis instance.
 * Returns a normalized 0–1 value smoothed with exponential decay.
 */

const VELOCITY_THRESHOLD = 2000;
const SMOOTH_FACTOR = 0.08;
const DECAY = 0.92;

export const createVelocityTracker = (lenis) => {
  let raw = 0;
  let smoothed = 0;
  let tickerGsap = null;

  const onScroll = () => {
    raw = Math.abs(lenis.velocity);
  };

  lenis.on("scroll", onScroll);

  const update = (_, deltaTime) => {
    // Normalize to 60fps frames so smoothing/decay feel identical on 30Hz,
    // 60Hz, and 120Hz displays. Clamp so a background-tab pause doesn't
    // produce one giant decay step.
    const frames = Math.min(deltaTime, 100) / (1000 / 60);
    const target = Math.min(1, raw / VELOCITY_THRESHOLD);
    smoothed += (target - smoothed) * (1 - (1 - SMOOTH_FACTOR) ** frames);

    // Decay raw toward zero when scroll stops
    raw *= DECAY ** frames;
  };

  return {
    getRaw: () => raw,
    getNormalized: () => smoothed,
    attachTicker: (gsap) => {
      tickerGsap = gsap;
      gsap.ticker.add(update);
    },
    destroy: () => {
      lenis.off("scroll", onScroll);
      tickerGsap?.ticker.remove(update);
      tickerGsap = null;
    }
  };
};
