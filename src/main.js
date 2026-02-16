import "./styles/base.css";
import "./styles/scenes.css";

import { sceneManifest } from "./content/sceneManifest";
import { initAudioController } from "./experience/audioController";
import { initHeroWebgl } from "./experience/heroWebgl";
import { initLazySceneMedia, initSceneController } from "./experience/sceneController";

const MOTION_STORAGE_KEY = "cherrytree.motion.reduced";

const getMotionPreference = () => {
  const stored = localStorage.getItem(MOTION_STORAGE_KEY);
  const mode = stored === "reduced" ? "reduced" : "auto";

  if (stored !== "auto" && stored !== "reduced") {
    localStorage.setItem(MOTION_STORAGE_KEY, "auto");
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reduced = mode === "reduced" || (mode === "auto" && prefersReduced);

  return { mode, reduced };
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

const boot = () => {
  const motion = getMotionPreference();
  document.documentElement.dataset.motion = motion.reduced ? "reduced" : "full";

  applySceneManifest(sceneManifest);

  const cleanup = [];

  cleanup.push(initLazySceneMedia(sceneManifest));
  cleanup.push(
    initSceneController({
      manifest: sceneManifest,
      reducedMotion: motion.reduced
    })
  );

  cleanup.push(
    initHeroWebgl({
      canvas: document.getElementById("hero-webgl"),
      host: document.querySelector('[data-ct-scene="prologue-webgl"]'),
      reducedMotion: motion.reduced
    })
  );

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
