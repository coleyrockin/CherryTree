import "./styles/base.css";
import "./styles/scenes.css";

import { sceneManifest } from "./content/sceneManifest";
import { initAudioController } from "./experience/audioController";

const MOTION_STORAGE_KEY = "cherrytree.motion.reduced";
const HERO_SCENE_SELECTOR = '[data-ct-scene="prologue-webgl"]';

const safeStorageGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restrictive browser modes.
  }
};

const getMotionPreference = () => {
  const stored = safeStorageGet(MOTION_STORAGE_KEY);
  const mode = stored === "reduced" ? "reduced" : "auto";

  if (stored !== "auto" && stored !== "reduced") {
    safeStorageSet(MOTION_STORAGE_KEY, "auto");
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reduced = mode === "reduced" || (mode === "auto" && prefersReduced);

  return { mode, reduced };
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

const boot = async () => {
  const motion = getMotionPreference();
  document.documentElement.dataset.motion = motion.reduced ? "reduced" : "full";

  applySceneManifest(sceneManifest);

  const cleanup = [];
  const heroHost = document.querySelector(HERO_SCENE_SELECTOR);

  const { initLazySceneMedia, initSceneController } = await import("./experience/sceneController");

  cleanup.push(initLazySceneMedia(sceneManifest));
  cleanup.push(
    await initSceneController({
      manifest: sceneManifest,
      reducedMotion: motion.reduced
    })
  );

  if (!motion.reduced && supportsWebGLContext()) {
    const { initHeroWebgl } = await import("./experience/heroWebgl");
    cleanup.push(
      await initHeroWebgl({
        canvas: document.getElementById("hero-webgl"),
        host: heroHost,
        reducedMotion: motion.reduced
      })
    );
  } else {
    heroHost?.classList.add("is-webgl-fallback");
  }

  cleanup.push(
    initAudioController({
      selector: "[data-ct-sound-toggle]"
    })
  );

  window.addEventListener(
    "beforeunload",
    () => {
      cleanup.forEach((dispose) => dispose?.());
    },
    { once: true }
  );
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
