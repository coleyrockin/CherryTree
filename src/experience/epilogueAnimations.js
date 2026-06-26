/**
 * Subtitle reveal for the closing winter scene.
 *
 * "Every spring, again." splits into words and staggers up on scrub against the
 * epilogue's scroll range. (The centered wordmark + self-drawing rule that used
 * to live here were removed so the lone-tree photograph carries the close.)
 */

import { splitByWords } from "../utils/splitText";

export const initEpilogueAnimations = (gsap) => {
  const epilogue = document.querySelector('[data-ct-scene="epilogue"]');
  if (!epilogue) {
    return () => { };
  }

  const animations = [];
  const splitCleanups = [];

  const subtitleEl = epilogue.querySelector(".epilogue-subtitle");
  if (subtitleEl) {
    const subtitleSplit = splitByWords(subtitleEl);
    splitCleanups.push(subtitleSplit.revert);

    if (subtitleSplit.words.length) {
      // The subtitle's CSS opacity is 0; reveal the parent and let the words
      // carry the entrance. Reduced motion keeps the CSS `!important` opacity.
      gsap.set(subtitleEl, { opacity: 1 });
      gsap.set(subtitleSplit.words, { opacity: 0, y: 14 });

      animations.push(
        gsap.to(subtitleSplit.words, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: epilogue,
            start: "top 50%",
            end: "top 20%",
            scrub: 0.6
          }
        })
      );
    }
  }

  return () => {
    animations.forEach((a) => a.kill());
    splitCleanups.forEach((fn) => fn());
  };
};
