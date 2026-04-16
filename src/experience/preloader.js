import { splitByChars } from "../utils/splitText";

const MIN_DISPLAY_MS = 800;

export const initPreloader = () => {
  const el = document.querySelector("[data-ct-preloader]");
  const bar = document.querySelector("[data-ct-preloader-bar]");
  const brandEl = el?.querySelector(".preloader-brand");

  if (!el) {
    return { ready: Promise.resolve(), onProgress: () => {}, exit: () => Promise.resolve() };
  }

  const split = splitByChars(brandEl);

  let progress = 0;
  let displayedProgress = 0;
  let rafId = 0;
  const startTime = performance.now();

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

  const flipIntoHero = async (gsap) => {
    const heroTitle = document.querySelector('[data-ct-scene="prologue-webgl"] .scene-title');
    if (!heroTitle || !brandEl) return false;

    const startRect = brandEl.getBoundingClientRect();
    const endRect = heroTitle.getBoundingClientRect();
    if (!startRect.width || !endRect.width) return false;

    const startFont = parseFloat(getComputedStyle(brandEl).fontSize);
    const endFont = parseFloat(getComputedStyle(heroTitle).fontSize);
    if (!startFont || !endFont) return false;

    const deltaX =
      endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
    const deltaY =
      endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);
    const scale = endFont / startFont;

    gsap.to(el, { backgroundColor: "rgba(247, 239, 231, 0)", duration: 1.1, ease: "power2.out" });
    gsap.to(bar, { opacity: 0, duration: 0.4, ease: "power2.out" });

    const flipTween = gsap.to(brandEl, {
      x: deltaX,
      y: deltaY,
      scale,
      duration: 1.25,
      ease: "expo.inOut"
    });

    // Race the tween against a hard timeout so we never hang the page.
    await Promise.race([
      flipTween,
      new Promise((resolve) => setTimeout(resolve, 1800))
    ]);

    gsap.set(brandEl, { opacity: 0 });
    return true;
  };

  const exit = async (gsap) => {
    const elapsed = performance.now() - startTime;
    if (elapsed < MIN_DISPLAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_DISPLAY_MS - elapsed));
    }

    progress = 1;
    if (bar) {
      bar.style.transform = "scaleX(1)";
    }
    cancelAnimationFrame(rafId);

    const isReduced = document.documentElement.dataset.motion === "reduced";

    if (gsap && !isReduced && split.chars.length) {
      await gsap.to(split.chars, {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.035,
        ease: "power3.out",
        delay: 0.15
      });

      await new Promise((resolve) => setTimeout(resolve, 260));

      const flipped = await flipIntoHero(gsap);
      if (!flipped) {
        el.classList.add("is-exiting");
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    } else {
      el.style.opacity = "0";
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    el.classList.add("is-done");
    document.body.classList.remove("is-loading");
    split.revert();
  };

  return { onProgress, exit };
};
