/**
 * Scene-tint dispatcher.
 *
 * An IntersectionObserver tracks which scene occupies the most viewport and
 * applies its `--scene-tint`, `--scene-ink`, and `--scene-grain` CSS variables
 * to the document root. On every cut, a transient bloom flash plays via
 * `[data-ct-scene-bloom]`.
 *
 * Picking the highest-ratio scene avoids the ScrollTrigger creation-time
 * firing issue where all onEnter callbacks run in creation order.
 *
 * The CSS variable contract (--scene-tint, --scene-ink, --scene-grain) is
 * preserved exactly — chrome and grain layers inherit and re-paint on cut.
 */

const createSceneBloomTrigger = () => {
  let bloomTimer = null;

  const trigger = () => {
    const bloom = document.querySelector("[data-ct-scene-bloom]");
    if (!bloom) return;

    bloom.classList.add("is-blooming");
    if (bloomTimer) {
      clearTimeout(bloomTimer);
    }

    bloomTimer = window.setTimeout(() => {
      bloom.classList.remove("is-blooming");
    }, 650);
  };

  const dispose = () => {
    if (bloomTimer) {
      clearTimeout(bloomTimer);
      bloomTimer = null;
    }
  };

  return { trigger, dispose };
};

let lastTintedSceneId = null;

const applySceneTint = (scene, triggerBloom = null) => {
  const root = document.documentElement;
  if (scene.tint) root.style.setProperty("--scene-tint", scene.tint);
  if (scene.ink) root.style.setProperty("--scene-ink", scene.ink);
  if (scene.grainTint) root.style.setProperty("--scene-grain", scene.grainTint);

  // Dark scenes (e.g. full-bleed video) flip the persistent chrome to light.
  root.classList.toggle("is-scene-dark", Boolean(scene.dark));
  // Bright photographic scenes lift the dark chrome's contrast (see scenes.css).
  root.classList.toggle("is-scene-bright", Boolean(scene.bright));

  const numeralNode = document.querySelector("[data-ct-numeral]");
  const labelNode = document.querySelector("[data-ct-scene-label]");

  if (numeralNode && scene.numeral) {
    const isFirstLoad = !lastTintedSceneId;
    if (!isFirstLoad && numeralNode.textContent !== scene.numeral) {
      // Roll the new numeral up from below
      numeralNode.textContent = scene.numeral;
      numeralNode.classList.remove("is-rolling");
      void numeralNode.offsetWidth; // force reflow so animation restarts
      numeralNode.classList.add("is-rolling");
      numeralNode.addEventListener(
        "animationend",
        () => numeralNode.classList.remove("is-rolling"),
        { once: true }
      );
    } else {
      numeralNode.textContent = scene.numeral;
    }
  }

  if (labelNode && scene.label) labelNode.textContent = scene.label;

  // Per-scene document title
  document.title = scene.label ? `${scene.label} — Cherry Tree` : "Cherry Tree";

  // Per-scene browser chrome color (mobile tab bar / PWA title bar)
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta && scene.bgColor) {
    themeColorMeta.setAttribute("content", scene.bgColor);
  }

  // Color-bloom flash on scene transition (not on initial load)
  if (lastTintedSceneId && lastTintedSceneId !== scene.id) {
    triggerBloom?.();
  }
  lastTintedSceneId = scene.id;

  // Broadcast scene change so cursor labels and other modules can react
  document.dispatchEvent(
    new CustomEvent("ct:scene-enter", { detail: { id: scene.id, label: scene.label } })
  );
};

export const initSceneTintObserver = (manifest) => {
  // Reset cross-init state so a motion-toggle re-init doesn't fire a spurious
  // bloom flash for a scene the user is already on.
  lastTintedSceneId = null;
  applySceneTint(manifest[0]);
  const bloomTrigger = createSceneBloomTrigger();

  if (!("IntersectionObserver" in window)) {
    return () => {
      bloomTrigger.dispose();
    };
  }

  const sceneByEl = new Map();
  const ratios = new Map();

  manifest.forEach((scene) => {
    const el = document.querySelector(`[data-ct-scene="${scene.id}"]`);
    if (!el) return;
    sceneByEl.set(el, scene);
    ratios.set(el, 0);
  });

  let activeId = manifest[0].id;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        ratios.set(entry.target, entry.intersectionRatio);
      });

      let bestEl = null;
      let bestRatio = 0;
      ratios.forEach((ratio, el) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestEl = el;
        }
      });

      if (bestEl) {
        const scene = sceneByEl.get(bestEl);
        if (scene && scene.id !== activeId) {
          activeId = scene.id;
          applySceneTint(scene, bloomTrigger.trigger);
        }
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] }
  );

  sceneByEl.forEach((_scene, el) => observer.observe(el));

  return () => {
    observer.disconnect();
    bloomTrigger.dispose();
  };
};

/**
 * Cross-scene background-color blend driven by ScrollTrigger, paired with the
 * tint observer. Returns a single dispose function that tears down both.
 */
export const initSceneColorTransitions = (manifest, gsap, ScrollTrigger) => {
  const bgBlend = document.querySelector("[data-ct-bg-blend]");
  const triggers = [];

  if (bgBlend) {
    bgBlend.style.backgroundColor = manifest[0].bgColor;
    manifest.forEach((scene, index) => {
      if (index === 0) return;
      const el = document.querySelector(`[data-ct-scene="${scene.id}"]`);
      if (!el) return;

      const trigger = ScrollTrigger.create({
        trigger: el,
        start: "top 70%",
        end: "top 30%",
        scrub: 0.6,
        onUpdate: (self) => {
          const prevColor = manifest[index - 1].bgColor;
          const nextColor = scene.bgColor;
          const interpolated = gsap.utils.interpolate(prevColor, nextColor, self.progress);
          bgBlend.style.backgroundColor = interpolated;
        }
      });
      triggers.push(trigger);
    });
  }

  const tintCleanup = initSceneTintObserver(manifest);

  return () => {
    triggers.forEach((t) => t.kill());
    tintCleanup();
    if (bgBlend) bgBlend.style.backgroundColor = "";
  };
};
