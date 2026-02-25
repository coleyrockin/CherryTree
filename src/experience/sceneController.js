/* ── Motion-preset configurations ─────────────────────────── */

const MOTION_PRESETS = {
  parallaxDeep: {
    from: { yPercent: 14, scale: 1.12, filter: "saturate(0.8)" },
    to: { yPercent: -8, scale: 1, filter: "saturate(1)" },
    scrub: 1.2
  },
  crossfadeLong: {
    from: { yPercent: 3, scale: 1.04, filter: "saturate(0.92)" },
    to: { yPercent: -2, scale: 1, filter: "saturate(1)" },
    scrub: 0.8
  },
  driftSlow: {
    from: { xPercent: -2, rotate: -0.5 },
    to: { xPercent: 2, rotate: 0.5 },
    scrub: 1.4
  }
};

const DEFAULT_PRESET = MOTION_PRESETS.parallaxDeep;

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

/* ── Pointer-reactive tilt (desktop image scenes only) ─── */

const initPointerTilt = (scenes, gsap) => {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  if (isCoarse) {
    return () => { };
  }

  const MAX_DEG = 1.5;
  const tiltTargets = [];
  const abortController = new AbortController();

  scenes.forEach((scene) => {
    // Skip WebGL hero (has its own pointer system) and triptych (pinned)
    const id = scene.dataset.ctScene;
    if (id === "prologue-webgl" || id === "triptych") {
      return;
    }

    const media = scene.querySelector("[data-scene-media]");
    if (!media) {
      return;
    }

    const state = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
    tiltTargets.push({ media, state });

    scene.addEventListener(
      "pointermove",
      (event) => {
        const bounds = scene.getBoundingClientRect();
        if (!bounds.width || !bounds.height) {
          return;
        }
        state.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        state.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      },
      { passive: true, signal: abortController.signal }
    );

    scene.addEventListener(
      "pointerleave",
      () => {
        state.targetX = 0;
        state.targetY = 0;
      },
      { passive: true, signal: abortController.signal }
    );
  });

  if (!tiltTargets.length) {
    return () => { };
  }

  const onTick = () => {
    tiltTargets.forEach(({ media, state }) => {
      state.currentX += (state.targetX - state.currentX) * 0.06;
      state.currentY += (state.targetY - state.currentY) * 0.06;

      const rotY = state.currentX * MAX_DEG;
      const rotX = -state.currentY * MAX_DEG;

      media.style.transform =
        `perspective(1200px) rotateY(${rotY.toFixed(3)}deg) rotateX(${rotX.toFixed(3)}deg)`;
    });
  };

  gsap.ticker.add(onTick);

  return () => {
    gsap.ticker.remove(onTick);
    abortController.abort();
    tiltTargets.forEach(({ media }) => {
      media.style.transform = "";
    });
  };
};

/* ── Scroll progress bar ────────────────────────────────── */

const initScrollProgress = (gsap, ScrollTrigger) => {
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

/* ── Scene controller ───────────────────────────────────── */

export const initSceneController = async ({ manifest, reducedMotion = false }) => {
  const scenes = manifest
    .map((scene) => document.querySelector(`[data-ct-scene="${scene.id}"]`))
    .filter(Boolean);

  if (!scenes.length) {
    return () => { };
  }

  const cleanup = [];
  cleanup.push(initPresenceObserver(scenes));

  if (reducedMotion) {
    scenes.forEach((scene) => {
      scene.classList.add("is-reduced");
      scene.classList.add("is-in-view");
    });
    return () => {
      cleanup.forEach((fn) => fn());
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

  cleanup.push(() => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  });

  const animations = [];

  /* ── Per-scene crossfade (enter/exit) ─── */
  scenes.forEach((scene) => {
    // Skip the first scene (prologue) — it starts visible
    const id = scene.dataset.ctScene;
    if (id === "prologue-webgl") {
      return;
    }

    // Fade in as scene enters
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

  /* ── Per-scene media animation (preset-driven) ─── */
  scenes.forEach((scene) => {
    const preset = MOTION_PRESETS[scene.dataset.motionPreset] || DEFAULT_PRESET;
    const id = scene.dataset.ctScene;

    // Triptych uses its own pinned timeline
    if (id === "triptych") {
      return;
    }

    const media = scene.querySelector("[data-scene-media]");
    if (media) {
      animations.push(
        gsap.fromTo(
          media,
          { ...preset.from },
          {
            ...preset.to,
            ease: "none",
            scrollTrigger: {
              trigger: scene,
              start: "top bottom",
              end: "bottom top",
              scrub: preset.scrub
            }
          }
        )
      );
    }

    const matte = scene.querySelector(".scene-matte");
    if (matte) {
      animations.push(
        gsap.fromTo(
          matte,
          { opacity: 0.45 },
          {
            opacity: 0.18,
            ease: "none",
            scrollTrigger: {
              trigger: scene,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.9
            }
          }
        )
      );
    }
  });

  /* ── Triptych pin-and-reveal timeline ─── */
  const triptych = document.querySelector('[data-ct-scene="triptych"]');
  if (triptych) {
    const stage = triptych.querySelector(".triptych-stage");
    const panels = triptych.querySelectorAll(".triptych-panel");

    if (stage && panels.length) {
      const timeline = gsap.timeline({
        defaults: {
          ease: "power3.out",
          duration: 1.1
        },
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
            yPercent: 28 - index * 6,
            xPercent: index === 1 ? 0 : index === 0 ? -14 : 14,
            opacity: 0.15,
            scale: 0.88
          },
          {
            yPercent: 0,
            xPercent: 0,
            opacity: 1,
            scale: 1
          },
          index * 0.22
        );
      });

      timeline.to(
        stage,
        {
          rotate: -0.7,
          duration: 0.8,
          ease: "sine.inOut"
        },
        0
      );

      animations.push(timeline);
    }
  }

  /* ── Color-field bloom animation ─── */
  const colorField = document.querySelector('[data-ct-scene="color-field"] .color-field');
  if (colorField) {
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
  }

  /* ── Epilogue bloom & text animation ─── */
  const epilogue = document.querySelector('[data-ct-scene="epilogue"]');
  if (epilogue) {
    const epilogueBlooms = epilogue.querySelectorAll(".epilogue-bloom");
    epilogueBlooms.forEach((bloom, index) => {
      animations.push(
        gsap.fromTo(
          bloom,
          { scale: 0.6, opacity: 0, rotate: index % 2 === 0 ? -12 : 10 },
          {
            scale: 1,
            opacity: 0.45,
            rotate: index % 2 === 0 ? 8 : -6,
            ease: "power2.out",
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

    const lockupText = epilogue.querySelector(".epilogue-lockup p");
    if (lockupText) {
      animations.push(
        gsap.fromTo(
          lockupText,
          { letterSpacing: "0.20em", opacity: 0.3, y: 30 },
          {
            letterSpacing: "0.12em",
            opacity: 0.84,
            y: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: epilogue,
              start: "top 75%",
              end: "top 20%",
              scrub: 0.8
            }
          }
        )
      );
    }
  }

  /* ── Pointer tilt ─── */
  cleanup.push(initPointerTilt(scenes, gsap));

  /* ── Scroll progress ─── */
  cleanup.push(initScrollProgress(gsap, ScrollTrigger));

  cleanup.push(() => {
    animations.forEach((animation) => animation.kill());
  });

  return () => {
    cleanup.forEach((fn) => fn());
  };
};
