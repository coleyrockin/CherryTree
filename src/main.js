import "./styles/base.css";
import "./styles/scenes.css";

import { sceneManifest } from "./content/sceneManifest";
import { initAudioController } from "./experience/audioController";
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

const initMotionToggle = ({ mode, reduced, prefersReduced }) => {
  const button = document.querySelector("[data-ct-motion-toggle]");
  if (!button) {
    return () => {};
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
    const nextMode = currentReduced ? "full" : "reduced";
    safeStorageSet(MOTION_STORAGE_KEY, nextMode);
    window.location.reload();
  };

  button.addEventListener("click", onClick);

  return () => {
    button.removeEventListener("click", onClick);
  };
};

const initDeferredHeroWebgl = ({ reducedMotion, heroHost, cleanup }) => {
  if (!heroHost) {
    return;
  }

  if (reducedMotion || !supportsWebGLContext()) {
    heroHost.classList.add("is-webgl-fallback");
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
      const { initHeroWebgl } = await import("./experience/heroWebgl");
      cleanup.push(
        await initHeroWebgl({
          canvas: document.getElementById("hero-webgl"),
          host: heroHost,
          reducedMotion
        })
      );
    } catch (error) {
      console.error("Cherry Tree WebGL failed to initialize:", error);
      heroHost.classList.add("is-webgl-fallback");
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

const boot = async () => {
  const motion = getMotionPreference();
  document.documentElement.dataset.motion = motion.reduced ? "reduced" : "full";

  applySceneManifest(sceneManifest);

  const cleanup = [];
  const heroHost = document.querySelector(HERO_SCENE_SELECTOR);
  cleanup.push(initMotionToggle(motion));

  const { initLazySceneMedia, initSceneController } = await import("./experience/sceneController");

  cleanup.push(initLazySceneMedia(sceneManifest));
  cleanup.push(
    await initSceneController({
      manifest: sceneManifest,
      reducedMotion: motion.reduced
    })
  );

  initDeferredHeroWebgl({
    reducedMotion: motion.reduced,
    heroHost,
    cleanup
  });

  cleanup.push(
    initAudioController({
      selector: "[data-ct-sound-toggle]"
    })
  );

  const runCleanup = () => {
    cleanup.splice(0).forEach((dispose) => dispose?.());
  };

  window.addEventListener("pagehide", runCleanup, { once: true });
};

const handleBootError = (error) => {
  console.error("Cherry Tree failed to initialize:", error);
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
