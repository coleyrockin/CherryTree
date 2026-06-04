/**
 * Sakura Easter Egg.
 *
 * Click the CHERRY TREE brand-mark five times within three seconds
 * and a brief golden-hour petal shower falls across the screen.
 * Nothing is explained. Worth finding.
 *
 * Skipped in reduced-motion mode — the petals would flash and
 * vanish in 1 ms, which isn't a reward.
 */

const PETAL_COUNT  = 28;
const TRIGGER_N    = 5;
const TRIGGER_MS   = 3_000;
const RAIN_LIFE_MS = 11_000; // a little past the longest animation

export const initSakuraEgg = ({ reducedMotion = false } = {}) => {
  if (reducedMotion) return () => {};

  const brandMark = document.querySelector(".brand-mark");
  if (!brandMark) return () => {};

  let clicks      = 0;
  let resetTimer  = 0;
  let cleanTimer  = 0;
  let container   = null;

  const spawnRain = () => {
    // Remove any existing shower first
    container?.remove();

    container = document.createElement("div");
    container.className = "sakura-rain";
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);

    for (let i = 0; i < PETAL_COUNT; i++) {
      const petal = document.createElement("div");
      petal.className = "sakura-rain-petal";

      const size  = 9  + Math.random() * 18;
      const left  = Math.random() * 100;
      const drift = (Math.random() - 0.5) * 280;
      const spin  = Math.random() * 540 - 270;
      const dur   = 5.5 + Math.random() * 5.5;
      const delay = Math.random() * 4.5;

      petal.style.cssText = [
        `left: ${left}%`,
        `width: ${size}px`,
        `height: ${size}px`,
        `--sakura-drift: ${drift}px`,
        `--sakura-spin: ${spin}deg`,
        `--sakura-dur: ${dur}s`,
        `--sakura-delay: ${delay}s`,
      ].join(";");

      container.appendChild(petal);
    }

    clearTimeout(cleanTimer);
    cleanTimer = window.setTimeout(() => {
      container?.remove();
      container = null;
    }, RAIN_LIFE_MS);
  };

  const onClick = () => {
    clicks++;
    clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => { clicks = 0; }, TRIGGER_MS);

    if (clicks >= TRIGGER_N) {
      clicks = 0;
      spawnRain();
    }
  };

  brandMark.addEventListener("click", onClick);

  return () => {
    brandMark.removeEventListener("click", onClick);
    clearTimeout(resetTimer);
    clearTimeout(cleanTimer);
    container?.remove();
    container = null;
  };
};
