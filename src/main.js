import "./styles/base.css";
import "./styles/scenes.css";
import "./styles/preloader.css";
import "./styles/cursor.css";
import "./styles/nav.css";

import { sceneManifest } from "./content/sceneManifest";
import { initAudioController } from "./experience/audioController";
import { initPreloader } from "./experience/preloader";
import { safeStorageGet, safeStorageSet } from "./utils/storage";

const MOTION_STORAGE_KEY = "cherrytree.motion.reduced";
const HERO_SCENE_SELECTOR = '[data-ct-scene="prologue-webgl"]';
const MOTION_MODES = new Set(["auto", "reduced", "full"]);

const getMotionPreference = () => {
  const stored = safeStorageGet(MOTION_STORAGE_KEY);
  const mode = MOTION_MODES.has(stored) ? stored : "auto";

  if (!MOTION_MODES.has(stored)) {
    safeStorageSet(MOTION_STORAGE_KEY, "auto");
  }

  const prefersReduced = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const reduced =
    mode === "reduced" || (mode === "auto" && prefersReduced);

  return { mode, reduced, prefersReduced };
};

const supportsWebGLContext = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
};

const applySceneManifest = (manifest) => {
  manifest.forEach((scene) => {
    const element = document.querySelector(`[data-ct-scene="${scene.id}"]`);
    if (!element) {
      return;
    }

    element.style.setProperty("--scene-height", `${scene.heightVh}vh`);
    element.dataset.motionPreset = scene.motionPreset;
    element.dataset.sceneType = scene.type;
    element.dataset.preload = String(scene.preload);
  });
};

/* ── Live motion toggle (no reload) ─────────────────────── */

const initMotionToggle = ({ mode, reduced, prefersReduced, onToggle }) => {
  const button = document.querySelector("[data-ct-motion-toggle]");
  if (!button) {
    return () => { };
  }

  const stateNode = button.querySelector("[data-ct-motion-state]");

  const setState = ({ isReduced, nextMode }) => {
    button.setAttribute("aria-pressed", String(isReduced));
    button.classList.toggle("is-enabled", isReduced);

    if (!stateNode) {
      return;
    }

    if (nextMode === "auto") {
      stateNode.textContent = prefersReduced ? "Reduced*" : "Full*";
      return;
    }

    stateNode.textContent = isReduced ? "Reduced" : "Full";
  };

  setState({ isReduced: reduced, nextMode: mode });

  const onClick = () => {
    const currentReduced = button.getAttribute("aria-pressed") === "true";
    const nextReduced = !currentReduced;
    const nextMode = nextReduced ? "reduced" : "full";

    safeStorageSet(MOTION_STORAGE_KEY, nextMode);
    setState({ isReduced: nextReduced, nextMode });
    document.documentElement.dataset.motion = nextReduced ? "reduced" : "full";

    onToggle(nextReduced);
  };

  button.addEventListener("click", onClick);

  return () => {
    button.removeEventListener("click", onClick);
  };
};

/* ── WebGL hero initialization ──────────────────────────── */

const initDeferredHeroWebgl = ({ reducedMotion, heroHost, cleanup, onProgress }) => {
  if (!heroHost) {
    return;
  }

  if (reducedMotion || !supportsWebGLContext()) {
    heroHost.classList.add("is-webgl-fallback");
    onProgress?.(1);
    return;
  }

  let started = false;
  let timeoutId = 0;
  let idleId = 0;
  let observer = null;

  const start = async () => {
    if (started) {
      return;
    }
    started = true;

    try {
      onProgress?.(0.4);
      const { initHeroWebgl } = await import("./experience/heroWebgl");
      onProgress?.(0.7);
      cleanup.push(
        await initHeroWebgl({
          canvas: document.getElementById("hero-webgl"),
          host: heroHost,
          reducedMotion
        })
      );
      onProgress?.(1);
    } catch (error) {
      console.error("Cherry Tree WebGL failed to initialize:", error);
      heroHost.classList.add("is-webgl-fallback");
      onProgress?.(1);
    }
  };

  const scheduleStart = () => {
    if (started) {
      return;
    }

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(
        () => {
          void start();
        },
        { timeout: 900 }
      );
      return;
    }

    timeoutId = window.setTimeout(() => {
      void start();
    }, 220);
  };

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        observer?.disconnect();
        scheduleStart();
      },
      {
        rootMargin: "220px 0px",
        threshold: 0.05
      }
    );

    observer.observe(heroHost);
  } else {
    scheduleStart();
  }

  const bounds = heroHost.getBoundingClientRect();
  if (bounds.top < window.innerHeight + 220) {
    scheduleStart();
  }

  cleanup.push(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    if (idleId && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(idleId);
    }
    observer?.disconnect();
  });
};

/* ── Boot orchestrator ──────────────────────────────────── */

const boot = async () => {
  const motion = getMotionPreference();
  document.documentElement.dataset.motion = motion.reduced ? "reduced" : "full";

  // Start preloader immediately
  const preloader = initPreloader();

  applySceneManifest(sceneManifest);

  const heroHost = document.querySelector(HERO_SCENE_SELECTOR);

  // Stable cleanup array for resources that survive motion toggles
  const stableCleanup = [];

  // Mutable cleanup array for motion-dependent resources
  let motionCleanup = [];

  const initMotionDependentSystems = async (reducedMotion) => {
    // Tear down previous motion-dependent systems
    motionCleanup.splice(0).forEach((dispose) => {
      if (typeof dispose === "function") dispose();
      else if (dispose && typeof dispose.dispose === "function") dispose.dispose();
    });

    // Remove stale state classes from scenes
    document.querySelectorAll(".scene").forEach((scene) => {
      scene.classList.remove("is-reduced", "is-in-view");
      scene.style.opacity = "";
    });

    // Remove WebGL fallback state so it can re-init
    heroHost?.classList.remove("is-webgl-fallback", "is-webgl-ready");

    preloader.onProgress(0.1);

    const { initLazySceneMedia, initSceneController } = await import(
      "./experience/sceneController"
    );

    preloader.onProgress(0.3);

    motionCleanup.push(initLazySceneMedia(sceneManifest));

    const sceneResult = await initSceneController({
      manifest: sceneManifest,
      reducedMotion
    });

    // sceneResult is { dispose, gsap?, ScrollTrigger?, lenis?, velocityTracker? }
    motionCleanup.push(sceneResult);

    preloader.onProgress(0.6);

    initDeferredHeroWebgl({
      reducedMotion,
      heroHost,
      cleanup: motionCleanup,
      onProgress: (v) => preloader.onProgress(0.6 + v * 0.3)
    });

    // Wire up motion-dependent enhancement modules
    if (!reducedMotion && sceneResult.gsap) {
      const { gsap, ScrollTrigger, lenis, velocityTracker } = sceneResult;

      // Scroll velocity visual effects
      const { initScrollVelocityFx } = await import("./experience/scrollVelocityFx");
      motionCleanup.push(initScrollVelocityFx({ velocityTracker, gsap }));

      // Scene navigation dots
      const { initSceneNav } = await import("./experience/sceneNav");
      motionCleanup.push(
        initSceneNav({ manifest: sceneManifest, gsap, ScrollTrigger, lenis })
      );

      // Magnetic cursor
      const { initMagneticCursor } = await import("./experience/magneticCursor");
      motionCleanup.push(initMagneticCursor({ gsap }));

      // Micro-interactions (spring hover)
      const { initMicroInteractions } = await import("./experience/microInteractions");
      motionCleanup.push(initMicroInteractions({ gsap }));
    }

    preloader.onProgress(0.95);
  };

  // Initial boot of motion-dependent systems
  await initMotionDependentSystems(motion.reduced);

  // Exit preloader
  let gsapForPreloader = null;
  const sceneResult = motionCleanup.find((item) => item && typeof item === "object" && item.gsap);
  if (sceneResult) {
    gsapForPreloader = sceneResult.gsap;
  }
  await preloader.exit(gsapForPreloader);

  // Motion toggle with live re-init
  stableCleanup.push(
    initMotionToggle({
      ...motion,
      onToggle: (nextReduced) => {
        void initMotionDependentSystems(nextReduced).catch((error) => {
          console.error("Cherry Tree motion toggle failed:", error);
        });
      }
    })
  );

  stableCleanup.push(
    initAudioController({
      selector: "[data-ct-sound-toggle]"
    })
  );

  const runCleanup = () => {
    motionCleanup.splice(0).forEach((dispose) => {
      if (typeof dispose === "function") dispose();
      else if (dispose && typeof dispose.dispose === "function") dispose.dispose();
    });
    stableCleanup.splice(0).forEach((dispose) => dispose?.());
  };

  window.addEventListener("pagehide", runCleanup, { once: true });
};

const handleBootError = (error) => {
  console.error("Cherry Tree failed to initialize:", error);
  // Ensure preloader exits even on error
  document.body.classList.remove("is-loading");
  const preloaderEl = document.querySelector("[data-ct-preloader]");
  if (preloaderEl) preloaderEl.classList.add("is-done");
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      void boot().catch(handleBootError);
    },
    { once: true }
  );
} else {
  void boot().catch(handleBootError);
}
