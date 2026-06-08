import "./styles/fonts.css";
import "./styles/base.css";
import "./styles/scenes.css";
import "./styles/preloader.css";
import "./styles/cursor.css";
import "./styles/nav.css";

import { sceneManifest } from "./content/sceneManifest";
import { initAudioController } from "./experience/audioController";
import { initPreloader } from "./experience/preloader";
import { initHeroImmersion } from "./experience/heroImmersion";
import { initTabWhisper } from "./experience/tabWhisper";
import { initSakuraEgg } from "./experience/sakuraEgg";
import { safeStorageGet, safeStorageSet } from "./utils/storage";
import { canUseWebGL } from "./utils/webgl";

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

const disposeResource = (resource) => {
  if (typeof resource === "function") {
    resource();
    return;
  }
  if (resource && typeof resource.dispose === "function") {
    resource.dispose();
  }
};

const disposeCollection = (collection) => {
  collection.splice(0).forEach((resource) => {
    disposeResource(resource);
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
      stateNode.textContent = "System";
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

const initDeferredHeroWebgl = ({
  reducedMotion,
  heroHost,
  cleanup,
  onProgress,
  gsap = null,
  ScrollTrigger = null
}) => {
  if (!heroHost) {
    return;
  }

  if (reducedMotion || !canUseWebGL()) {
    heroHost.classList.add("is-webgl-fallback");
    onProgress?.(1);
    return;
  }

  let started = false;
  let startScheduled = false;
  let cancelled = false;
  let timeoutId = 0;
  let idleId = 0;
  let observer = null;

  const start = async () => {
    if (started || cancelled) {
      return;
    }
    started = true;

    try {
      onProgress?.(0.4);
      const { initHeroWebgl } = await import("./experience/heroWebgl");
      if (cancelled) {
        return;
      }
      onProgress?.(0.7);
      const disposeHeroWebgl = await initHeroWebgl({
        canvas: document.getElementById("hero-webgl"),
        host: heroHost,
        reducedMotion,
        gsap,
        ScrollTrigger
      });

      if (cancelled) {
        disposeResource(disposeHeroWebgl);
        return;
      }

      cleanup.push(disposeHeroWebgl);
      onProgress?.(1);
    } catch (error) {
      if (cancelled) {
        return;
      }
      console.error("Cherry Tree WebGL failed to initialize:", error);
      heroHost.classList.add("is-webgl-fallback");
      onProgress?.(1);
    }
  };

  const scheduleStart = () => {
    if (started || startScheduled || cancelled) {
      return;
    }
    startScheduled = true;

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
    cancelled = true;
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

const HARD_PRELOADER_TIMEOUT_MS = 6000;

const forceHidePreloader = () => {
  document.body.classList.remove("is-loading");
  const preloaderEl = document.querySelector("[data-ct-preloader]");
  if (preloaderEl) {
    preloaderEl.classList.add("is-done");
  }
};

const boot = async () => {
  const motion = getMotionPreference();
  document.documentElement.dataset.motion = motion.reduced ? "reduced" : "full";

  // Hard safety timeout — no matter what happens during boot, the preloader
  // is guaranteed to be gone after this window. Prevents any UI hang.
  const safetyTimer = window.setTimeout(forceHidePreloader, HARD_PRELOADER_TIMEOUT_MS);

  // Start preloader immediately
  const preloader = initPreloader();

  applySceneManifest(sceneManifest);

  const heroHost = document.querySelector(HERO_SCENE_SELECTOR);

  // Stable cleanup array for resources that survive motion toggles
  const stableCleanup = [];

  // Cinematic arrival — hold the chrome back until the visitor first engages.
  stableCleanup.push(initHeroImmersion({ reducedMotion: motion.reduced }));

  // Tab-away whisper — title changes when the visitor leaves, calls them back.
  stableCleanup.push(initTabWhisper());

  // Sakura easter egg — click the brand-mark 5× for a golden-hour shower.
  stableCleanup.push(initSakuraEgg({ reducedMotion: motion.reduced }));

  // Mutable cleanup array for motion-dependent resources
  let motionCleanup = [];
  let motionInitToken = 0;

  // Stable handle to the latest velocity tracker — survives motion toggles.
  // The audio controller closes over this so it can follow scroll velocity
  // without being torn down each time motion changes.
  let activeVelocityTracker = null;
  const getScrollVelocity = () => activeVelocityTracker?.getNormalized() ?? 0;

  const initMotionDependentSystems = async (reducedMotion) => {
    const initToken = ++motionInitToken;
    const pendingCleanup = [];
    const registerCleanup = (resource) => {
      pendingCleanup.push(resource);
      return resource;
    };
    const isStale = () => initToken !== motionInitToken;

    // Tear down previous motion-dependent systems
    disposeCollection(motionCleanup);
    activeVelocityTracker = null;

    // Clear dark-scene chrome so it can't stick across a motion toggle. Full
    // motion re-evaluates it via sceneTint; reduced motion via darkSceneChrome.
    document.documentElement.classList.remove("is-scene-dark");
    // is-scene-bright is only (re)applied by the full-motion tint observer, so
    // clear it too — otherwise toggling to reduced motion on a bright scene
    // leaves the lifted-contrast chrome stuck on for the whole session.
    document.documentElement.classList.remove("is-scene-bright");

    // Remove stale state classes from scenes
    document.querySelectorAll(".scene").forEach((scene) => {
      scene.classList.remove("is-reduced", "is-in-view");
      scene.style.opacity = "";
    });

    // Remove WebGL fallback state so it can re-init
    heroHost?.classList.remove("is-webgl-fallback", "is-webgl-ready");

    preloader.onProgress(0.1);

    const [
      { initLazySceneMedia, initSceneController },
      { initTextAnimations },
      { initScrollEffects }
    ] = await Promise.all([
      import("./experience/sceneController"),
      import("./experience/textAnimations"),
      import("./experience/scrollEffects")
    ]);

    if (isStale()) {
      disposeCollection(pendingCleanup);
      return;
    }

    preloader.onProgress(0.3);

    registerCleanup(initLazySceneMedia(sceneManifest));

    const sceneResult = await initSceneController({
      manifest: sceneManifest,
      reducedMotion
    });

    if (isStale()) {
      disposeResource(sceneResult);
      disposeCollection(pendingCleanup);
      return;
    }

    // sceneResult is { dispose, gsap?, ScrollTrigger?, lenis?, velocityTracker? }
    registerCleanup(sceneResult);

    registerCleanup(
      await initTextAnimations({ reducedMotion })
    );
    registerCleanup(
      await initScrollEffects({ reducedMotion })
    );

    // Koi scene background video — lazy, visibility-driven, reduced-motion aware
    const { initKoiVideo } = await import("./experience/koiVideo");
    registerCleanup(initKoiVideo({ reducedMotion }));

    // Reduced motion: sceneNav (which drives screen-reader announcements + the
    // URL hash) is full-motion-only, so wire an IntersectionObserver-based
    // announcer here for accessibility parity (WCAG 4.1.3).
    if (reducedMotion) {
      const { initSceneAnnouncer } = await import("./experience/sceneAnnouncer");
      registerCleanup(initSceneAnnouncer({ manifest: sceneManifest }));

      // Dark-scene chrome: sceneTint drives this in full motion only, so the
      // reduced path needs its own observer over every dark scene.
      const { initDarkSceneChrome } = await import("./experience/darkSceneChrome");
      registerCleanup(initDarkSceneChrome({ manifest: sceneManifest }));
    }

    if (isStale()) {
      disposeCollection(pendingCleanup);
      return;
    }

    preloader.onProgress(0.6);

    initDeferredHeroWebgl({
      reducedMotion,
      heroHost,
      cleanup: pendingCleanup,
      onProgress: (v) => preloader.onProgress(0.6 + v * 0.3),
      gsap: sceneResult.gsap ?? null,
      ScrollTrigger: sceneResult.ScrollTrigger ?? null
    });

    // Wire up motion-dependent enhancement modules
    if (!reducedMotion && sceneResult.gsap) {
      const { gsap, ScrollTrigger, lenis, velocityTracker } = sceneResult;

      // Idle invitation — gently amplifies the scroll-hint after 45 s of stillness.
      const { initIdleInvitation } = await import("./experience/idleInvitation");
      registerCleanup(initIdleInvitation());

      // Scroll velocity visual effects
      const { initScrollVelocityFx } = await import("./experience/scrollVelocityFx");
      registerCleanup(initScrollVelocityFx({ velocityTracker, gsap }));

      // Scene navigation dots
      const { initSceneNav } = await import("./experience/sceneNav");
      registerCleanup(
        initSceneNav({ manifest: sceneManifest, gsap, ScrollTrigger, lenis })
      );

      // Magnetic cursor
      const { initMagneticCursor } = await import("./experience/magneticCursor");
      registerCleanup(initMagneticCursor({ gsap }));

      // Micro-interactions (spring hover)
      const { initMicroInteractions } = await import("./experience/microInteractions");
      registerCleanup(initMicroInteractions({ gsap }));
    }

    if (isStale()) {
      disposeCollection(pendingCleanup);
      return;
    }

    motionCleanup = pendingCleanup;
    activeVelocityTracker = sceneResult.velocityTracker ?? null;
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
  window.clearTimeout(safetyTimer);

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
      selector: "[data-ct-sound-toggle]",
      getVelocity: getScrollVelocity
    })
  );

  const runCleanup = () => {
    disposeCollection(motionCleanup);
    stableCleanup.splice(0).forEach((dispose) => dispose?.());
  };

  window.addEventListener("pagehide", runCleanup, { once: true });
};

const handleBootError = (error) => {
  console.error("Cherry Tree failed to initialize:", error);
  forceHidePreloader();
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
