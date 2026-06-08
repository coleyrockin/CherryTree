import { createVelocityTracker } from "../utils/scrollVelocity";
import { initSceneColorTransitions } from "./sceneTint";
import { initVelocityParallax } from "./velocityParallax";
import { initEpilogueAnimations } from "./epilogueAnimations";
import { initPointerTilt } from "./pointerTilt";

/* ── Lazy media hydration ──────────────────────────────────── */

const hydrateLazyMedia = (root) => {
  root
    .querySelectorAll("source[data-srcset], img[data-src], img[data-srcset]")
    .forEach((node) => {
      if (node.dataset.srcset) {
        node.setAttribute("srcset", node.dataset.srcset);
        node.removeAttribute("data-srcset");
      }
      if (node.dataset.src) {
        node.setAttribute("src", node.dataset.src);
        node.removeAttribute("data-src");
      }
    });
};

export const initLazySceneMedia = (manifest) => {
  const lazyScenes = manifest
    .filter((scene) => !scene.preload)
    .map((scene) => document.querySelector(`[data-ct-scene="${scene.id}"]`))
    .filter(Boolean);

  if (!lazyScenes.length) {
    return () => { };
  }

  if (!("IntersectionObserver" in window)) {
    lazyScenes.forEach(hydrateLazyMedia);
    return () => { };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        hydrateLazyMedia(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "280px 0px"
    }
  );

  lazyScenes.forEach((scene) => observer.observe(scene));

  return () => {
    observer.disconnect();
  };
};

/* ── Presence observer (reduced-motion fallback) ────────── */

const initPresenceObserver = (scenes) => {
  if (!("IntersectionObserver" in window)) {
    scenes.forEach((scene) => scene.classList.add("is-in-view"));
    return () => { };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-in-view", entry.isIntersecting);
      });
    },
    {
      threshold: 0.22
    }
  );

  scenes.forEach((scene) => observer.observe(scene));

  return () => {
    observer.disconnect();
  };
};

/* ── Scroll progress bar ────────────────────────────────── */

const initScrollProgress = (ScrollTrigger) => {
  const bar = document.querySelector("[data-ct-scroll-progress]");
  if (!bar) {
    return () => { };
  }

  const trigger = ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      bar.style.transform = `scaleX(${self.progress})`;
    }
  });

  return () => {
    trigger.kill();
  };
};

/* ── Clip-path image reveals ────────────────────────────── */

const initClipPathReveals = (gsap) => {
  const animations = [];

  // Bloom-wash: iris-open (circle reveal)
  const bloomMedia = document.querySelector('[data-ct-scene="bloom-wash"] .scene-media');
  if (bloomMedia) {
    animations.push(
      gsap.fromTo(
        bloomMedia,
        { clipPath: "circle(0% at 50% 50%)" },
        {
          clipPath: "circle(75% at 50% 50%)",
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: bloomMedia.closest(".scene"),
            start: "top 80%",
            end: "top 20%",
            scrub: 0.8
          }
        }
      )
    );
  }

  // Stillness: curtain-open (inset reveal from top)
  const stillnessMedia = document.querySelector('[data-ct-scene="stillness"] .scene-media');
  if (stillnessMedia) {
    animations.push(
      gsap.fromTo(
        stillnessMedia,
        { clipPath: "inset(100% 0 0 0)" },
        {
          clipPath: "inset(0% 0 0 0)",
          ease: "power2.out",
          scrollTrigger: {
            trigger: stillnessMedia.closest(".scene"),
            start: "top 85%",
            end: "top 25%",
            scrub: 0.8
          }
        }
      )
    );
  }

  return () => {
    animations.forEach((a) => a.kill());
  };
};

/* ── Triptych pin-and-reveal timeline ─────────────────── */

const initTriptychTimeline = (gsap) => {
  const triptych = document.querySelector('[data-ct-scene="triptych"]');
  if (!triptych) {
    return () => { };
  }

  const stage = triptych.querySelector(".triptych-stage");
  const panels = triptych.querySelectorAll(".triptych-panel");
  if (!stage || !panels.length) {
    return () => { };
  }

  const timeline = gsap.timeline({
    defaults: { ease: "power3.out", duration: 1.1 },
    scrollTrigger: {
      trigger: triptych,
      start: "top top",
      end: "+=170%",
      scrub: 1,
      pin: true,
      anticipatePin: 1
    }
  });

  panels.forEach((panel, index) => {
    timeline.fromTo(
      panel,
      {
        // Start visible enough that the scene never reads as blank cream on
        // arrival or quick scroll — the convergence from 0.34 -> 1 still carries
        // the reveal. (Was 0.15, which looked empty before the user scrubbed.)
        yPercent: 28 - index * 6,
        xPercent: index === 1 ? 0 : index === 0 ? -14 : 14,
        opacity: 0.34,
        scale: 0.92
      },
      { yPercent: 0, xPercent: 0, opacity: 1, scale: 1 },
      index * 0.22
    );
  });

  timeline.to(stage, { rotate: -0.7, duration: 0.8, ease: "sine.inOut" }, 0);

  return () => {
    timeline.kill();
  };
};

/* ── Color-field bloom animation ──────────────────────── */

const initColorFieldBloom = (gsap) => {
  const colorField = document.querySelector('[data-ct-scene="color-field"] .color-field');
  if (!colorField) {
    return () => { };
  }

  const animations = [];
  const blooms = colorField.querySelectorAll(".color-bloom");
  blooms.forEach((bloom, index) => {
    animations.push(
      gsap.to(bloom, {
        scale: 1.25,
        rotate: index % 2 === 0 ? 16 : -14,
        duration: 1.5,
        ease: "none",
        scrollTrigger: {
          trigger: colorField,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2
        }
      })
    );
  });

  return () => {
    animations.forEach((a) => a.kill());
  };
};

/* ── Per-scene crossfade (enter/exit) ─────────────────── */

const initSceneCrossfade = (scenes, gsap) => {
  const animations = [];

  scenes.forEach((scene) => {
    if (scene.dataset.ctScene === "prologue-webgl") {
      return;
    }

    animations.push(
      gsap.fromTo(
        scene,
        { opacity: 0.15 },
        {
          opacity: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: scene,
            start: "top 92%",
            end: "top 35%",
            scrub: 0.6
          }
        }
      )
    );
  });

  return () => {
    animations.forEach((a) => a.kill());
  };
};

/* ── Scene controller ───────────────────────────────────── */

export const initSceneController = async ({ manifest, reducedMotion = false }) => {
  const scenes = manifest
    .map((scene) => document.querySelector(`[data-ct-scene="${scene.id}"]`))
    .filter(Boolean);

  if (!scenes.length) {
    return { dispose: () => { } };
  }

  const cleanup = [];
  cleanup.push(initPresenceObserver(scenes));

  if (reducedMotion) {
    scenes.forEach((scene) => {
      scene.classList.add("is-reduced");
      scene.classList.add("is-in-view");
    });
    return {
      dispose: () => {
        cleanup.forEach((fn) => fn());
      }
    };
  }

  const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
    import("lenis")
  ]);

  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({
    duration: 1.15,
    smoothWheel: true,
    smoothTouch: false,
    wheelMultiplier: 0.92,
    touchMultiplier: 1
  });

  const tick = (timeSeconds) => {
    lenis.raf(timeSeconds * 1000);
  };

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const velocityTracker = createVelocityTracker(lenis);
  velocityTracker.attachTicker(gsap);

  cleanup.push(() => {
    const tickFn = velocityTracker.destroy();
    if (tickFn) gsap.ticker.remove(tickFn);
    gsap.ticker.remove(tick);
    lenis.destroy();
  });

  cleanup.push(initSceneColorTransitions(manifest, gsap, ScrollTrigger));
  cleanup.push(initSceneCrossfade(scenes, gsap));
  cleanup.push(initVelocityParallax({ scenes, gsap }));
  cleanup.push(initTriptychTimeline(gsap));
  cleanup.push(initColorFieldBloom(gsap));
  cleanup.push(initClipPathReveals(gsap));
  cleanup.push(initEpilogueAnimations(gsap));
  cleanup.push(initPointerTilt(scenes, gsap));
  cleanup.push(initScrollProgress(ScrollTrigger));

  return {
    gsap,
    ScrollTrigger,
    lenis,
    velocityTracker,
    dispose: () => {
      cleanup.forEach((fn) => fn());
    }
  };
};
