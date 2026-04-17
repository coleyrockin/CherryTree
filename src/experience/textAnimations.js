/* ── Character splitting utility ───────────────────────────── */

const splitTextToChars = (element) => {
  const text = element.textContent || "";
  const srOnly = document.createElement("span");
  srOnly.className = "visually-hidden";
  srOnly.textContent = text;

  const chars = [];

  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }

  element.appendChild(srOnly);

  for (const char of text) {
    const span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");

    if (char === " ") {
      span.className = "ct-char ct-char-space";
      span.textContent = "\u00A0";
    } else {
      span.className = "ct-char";
      span.textContent = char;
    }

    element.appendChild(span);
    chars.push(span);
  }

  return chars;
};

/* ── Hero entrance animation (plays once on load) ─────────── */

const initHeroTextAnimation = (gsap) => {
  const heroText = document.querySelector('[data-ct-text="prologue"]');
  if (!heroText) {
    return [];
  }

  const titleEl = heroText.querySelector("[data-ct-split]");
  const subtitleEl = heroText.querySelector("[data-ct-subtitle]");
  const animations = [];

  if (titleEl) {
    const chars = splitTextToChars(titleEl);

    // Entrance: characters cascade in
    const entranceTl = gsap.timeline({ delay: 0.6 });
    entranceTl.set(chars, { opacity: 0, y: 40, rotateX: -45 });
    entranceTl.to(chars, {
      opacity: 1,
      y: 0,
      rotateX: 0,
      duration: 0.8,
      stagger: 0.04,
      ease: "power3.out"
    });
    animations.push(entranceTl);

    // Exit on scroll: fade out + drift up
    animations.push(
      gsap.to(heroText, {
        opacity: 0,
        y: -60,
        ease: "power2.in",
        scrollTrigger: {
          trigger: heroText.closest(".scene"),
          start: "top top",
          end: "40% top",
          scrub: 0.6
        }
      })
    );
  }

  if (subtitleEl) {
    gsap.set(subtitleEl, { opacity: 0, y: 20 });
    const subtitleTl = gsap.timeline({ delay: 1.2 });
    subtitleTl.to(subtitleEl, {
      opacity: 0.58,
      y: 0,
      duration: 1,
      ease: "power2.out"
    });
    animations.push(subtitleTl);
  }

  // Scroll hint: fade in after hero text, fade out immediately on scroll
  const scrollHint = document.querySelector(".scroll-hint");
  if (scrollHint) {
    const hintTl = gsap.timeline({ delay: 3 });
    hintTl.fromTo(
      scrollHint,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }
    );
    gsap.to(scrollHint, {
      opacity: 0,
      ease: "power1.in",
      scrollTrigger: {
        trigger: scrollHint.closest(".scene"),
        start: "top top",
        end: "12% top",
        scrub: 0.3
      }
    });
    animations.push(hintTl);
  }

  return animations;
};

/* ── Scene title scroll-reveal animations ─────────────────── */

const SCENE_TEXT_IDS = ["bloom", "triptych", "color-field", "stillness"];

const initSceneTextAnimations = (gsap, ScrollTrigger) => {
  const animations = [];

  SCENE_TEXT_IDS.forEach((id) => {
    const textBlock = document.querySelector(`[data-ct-text="${id}"]`);
    if (!textBlock) {
      return;
    }

    const titleEl = textBlock.querySelector("[data-ct-split]");
    const subtitleEl = textBlock.querySelector("[data-ct-subtitle]");
    const scene = textBlock.closest(".scene");
    if (!scene) {
      return;
    }

    if (titleEl) {
      const chars = splitTextToChars(titleEl);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scene,
          start: "top 85%",
          end: "top 40%",
          scrub: 0.8
        }
      });

      tl.fromTo(
        chars,
        { opacity: 0, y: 30, scale: 0.92 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.03,
          ease: "power2.out"
        }
      );

      animations.push(tl);
    }

    if (subtitleEl) {
      animations.push(
        gsap.fromTo(
          subtitleEl,
          { opacity: 0, y: 16 },
          {
            opacity: 0.54,
            y: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: scene,
              start: "top 65%",
              end: "top 30%",
              scrub: 0.8
            }
          }
        )
      );
    }

    // Fade out as scene exits (except triptych which is pinned)
    if (id !== "triptych") {
      animations.push(
        gsap.to(textBlock, {
          opacity: 0,
          y: -30,
          ease: "power2.in",
          scrollTrigger: {
            trigger: scene,
            start: "60% top",
            end: "bottom top",
            scrub: 0.6
          }
        })
      );
    }
  });

  return animations;
};

/* ── Main entry point ─────────────────────────────────────── */
// Note: epilogue animations are handled by sceneController.js

export const initTextAnimations = async ({ reducedMotion = false }) => {
  if (reducedMotion) {
    // Ensure all text is visible
    document.querySelectorAll(".scene-text, .epilogue-subtitle").forEach((el) => {
      el.style.opacity = "1";
    });
    const scrollHint = document.querySelector(".scroll-hint");
    if (scrollHint) scrollHint.style.opacity = "0.7";
    return () => {};
  }

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger")
  ]);

  gsap.registerPlugin(ScrollTrigger);

  const animations = [
    ...initHeroTextAnimation(gsap),
    ...initSceneTextAnimations(gsap, ScrollTrigger)
  ];

  return () => {
    animations.forEach((anim) => anim.kill());
  };
};
