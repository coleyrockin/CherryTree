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
    return () => {};
  }

  if (!("IntersectionObserver" in window)) {
    lazyScenes.forEach(hydrateLazyMedia);
    return () => {};
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

const initPresenceObserver = (scenes) => {
  if (!("IntersectionObserver" in window)) {
    scenes.forEach((scene) => scene.classList.add("is-in-view"));
    return () => {};
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

export const initSceneController = async ({ manifest, reducedMotion = false }) => {
  const scenes = manifest
    .map((scene) => document.querySelector(`[data-ct-scene="${scene.id}"]`))
    .filter(Boolean);

  if (!scenes.length) {
    return () => {};
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

  scenes.forEach((scene) => {
    const media = scene.querySelector("[data-scene-media]");
    if (media) {
      animations.push(
        gsap.fromTo(
          media,
          { yPercent: 8, scale: 1.08, filter: "saturate(0.85)" },
          {
            yPercent: -4,
            scale: 1,
            filter: "saturate(1)",
            ease: "none",
            scrollTrigger: {
              trigger: scene,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.95
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

  cleanup.push(() => {
    animations.forEach((animation) => animation.kill());
  });

  return () => {
    cleanup.forEach((fn) => fn());
  };
};
