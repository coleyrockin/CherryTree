import { splitByChars } from "../utils/splitText";

const MIN_DISPLAY_MS = 800;

export const initPreloader = () => {
  const el = document.querySelector("[data-ct-preloader]");
  const bar = document.querySelector("[data-ct-preloader-bar]");
  const brandEl = el?.querySelector(".preloader-brand");

  if (!el) {
    return { ready: Promise.resolve(), onProgress: () => {}, exit: () => Promise.resolve() };
  }

  // Split brand text for animation
  const split = splitByChars(brandEl);

  let progress = 0;
  let displayedProgress = 0;
  let rafId = 0;
  const startTime = performance.now();

  // Smooth progress bar animation
  const animateBar = () => {
    displayedProgress += (progress - displayedProgress) * 0.08;
    if (bar) {
      bar.style.transform = `scaleX(${Math.min(displayedProgress, 1)})`;
    }
    if (displayedProgress < 0.999) {
      rafId = requestAnimationFrame(animateBar);
    }
  };

  rafId = requestAnimationFrame(animateBar);

  const onProgress = (value) => {
    progress = Math.max(progress, value);
  };

  const exit = async (gsap) => {
    // Ensure minimum display time
    const elapsed = performance.now() - startTime;
    if (elapsed < MIN_DISPLAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_DISPLAY_MS - elapsed));
    }

    // Fill progress bar
    progress = 1;
    if (bar) {
      bar.style.transform = "scaleX(1)";
    }
    cancelAnimationFrame(rafId);

    const isReduced = document.documentElement.dataset.motion === "reduced";

    if (gsap && !isReduced && split.chars.length) {
      // Animate chars in
      await gsap.to(split.chars, {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.035,
        ease: "power3.out",
        delay: 0.15
      });

      // Brief pause
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Exit with clip-path wipe
      el.classList.add("is-exiting");
      await new Promise((resolve) => setTimeout(resolve, 1100));
    } else {
      // Reduced motion: instant
      el.style.opacity = "0";
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    el.classList.add("is-done");
    document.body.classList.remove("is-loading");
    split.revert();
  };

  return { onProgress, exit };
};
