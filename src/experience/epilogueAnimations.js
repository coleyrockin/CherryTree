/**
 * Split-text + bloom animations for the closing epilogue scene.
 *
 * Title chars flip up on rotateX, the horizontal rule self-draws to its final
 * width, the subtitle reveals word-by-word, and three soft blooms scale-rotate
 * into place. All driven by scrub against the epilogue scene's scroll range.
 */

import { splitByChars, splitByWords } from "../utils/splitText";

export const initEpilogueAnimations = (gsap) => {
  const epilogue = document.querySelector('[data-ct-scene="epilogue"]');
  if (!epilogue) {
    return () => { };
  }

  const animations = [];
  const splitCleanups = [];

  // Epilogue blooms
  const epilogueBlooms = epilogue.querySelectorAll(".epilogue-bloom");
  epilogueBlooms.forEach((bloom, index) => {
    animations.push(
      gsap.fromTo(
        bloom,
        { scale: 0.6, opacity: 0, rotate: index % 2 === 0 ? -12 : 10 },
        {
          scale: 1.15,
          opacity: 0.45,
          rotate: index % 2 === 0 ? 8 : -6,
          ease: "elastic.out(1, 0.6)",
          scrollTrigger: {
            trigger: epilogue,
            start: "top 80%",
            end: "top 15%",
            scrub: 1
          }
        }
      )
    );
  });

  // Split-text title: chars flip up with rotateX
  const titleEl = epilogue.querySelector(".epilogue-title");
  if (titleEl) {
    const titleSplit = splitByChars(titleEl);
    splitCleanups.push(titleSplit.revert);

    if (titleSplit.chars.length) {
      gsap.set(titleSplit.chars, {
        opacity: 0,
        rotateX: -90,
        transformOrigin: "bottom center",
        y: 20
      });

      animations.push(
        gsap.to(titleSplit.chars, {
          opacity: 0.84,
          rotateX: 0,
          y: 0,
          duration: 0.8,
          stagger: 0.04,
          ease: "power3.out",
          scrollTrigger: {
            trigger: epilogue,
            start: "top 65%",
            end: "top 25%",
            scrub: 0.8
          }
        })
      );
    }
  }

  // Self-drawing horizontal rule
  const ruleEl = epilogue.querySelector(".epilogue-rule");
  if (ruleEl) {
    animations.push(
      gsap.to(ruleEl, {
        width: "min(280px, 60vw)",
        opacity: 0.6,
        duration: 1,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: epilogue,
          start: "top 55%",
          end: "top 25%",
          scrub: 0.6
        }
      })
    );
  }

  // Subtitle word stagger
  const subtitleEl = epilogue.querySelector(".epilogue-subtitle");
  if (subtitleEl) {
    const subtitleSplit = splitByWords(subtitleEl);
    splitCleanups.push(subtitleSplit.revert);

    if (subtitleSplit.words.length) {
      // Reveal the container: its CSS opacity is 0 (it expects an `.is-visible`
      // class that nothing adds), so the word-stagger below was animating inside
      // an invisible parent in full motion. Show the parent and let the words
      // carry the reveal. Reduced motion keeps the CSS `!important` opacity.
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
