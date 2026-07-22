/**
 * Floating side navigation dots driven by scroll position.
 */

import { initKeyboardSceneNavigation } from "../utils/keyboardSceneNavigation";

export const initSceneNav = ({ manifest, gsap, ScrollTrigger, lenis }) => {
  const nav = document.querySelector("[data-ct-scene-nav]");
  const list = nav?.querySelector(".scene-nav-list");
  if (!nav || !list) {
    return () => {};
  }

  const cleanup = [];

  // Build dots from manifest
  manifest.forEach((scene, index) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "scene-nav-dot";
    btn.setAttribute("aria-label", `Scene ${index + 1}: ${scene.label || scene.id}`);
    btn.dataset.magnetic = "";
    btn.dataset.sceneTarget = scene.id;
    li.appendChild(btn);
    list.appendChild(li);
  });

  const dots = list.querySelectorAll(".scene-nav-dot");

  // Scroll to scene on click
  const onClick = (e) => {
    const target = e.currentTarget.dataset.sceneTarget;
    const el = document.querySelector(`[data-ct-scene="${target}"]`);
    if (el && lenis) {
      lenis.scrollTo(el, { offset: 0, duration: 1.8 });
    } else if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  dots.forEach((dot) => {
    dot.addEventListener("click", onClick);
  });
  cleanup.push(() => {
    dots.forEach((dot) => dot.removeEventListener("click", onClick));
  });

  // Screen reader announcement + URL hash sync on scene change
  const announceRegion = document.querySelector("[data-ct-scene-announce]");
  let lastAnnouncedIndex = -1;

  const setActive = (index) => {
    dots.forEach((dot, i) => {
      if (i === index) {
        dot.setAttribute("aria-current", "step");
      } else {
        dot.removeAttribute("aria-current");
      }
    });

    if (index !== lastAnnouncedIndex) {
      lastAnnouncedIndex = index;
      const scene = manifest[index];
      if (scene) {
        // Announce to assistive tech
        if (announceRegion) {
          announceRegion.textContent = `Now viewing: ${scene.label || scene.id}`;
        }
        // Sync URL hash without scroll / history pollution
        const desired = `#${scene.id}`;
        if (window.location.hash !== desired) {
          history.replaceState(null, "", desired);
        }
      }
    }
  };

  // Track active scene
  manifest.forEach((scene, index) => {
    const el = document.querySelector(`[data-ct-scene="${scene.id}"]`);
    if (!el) return;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 60%",
      end: "bottom 40%",
      onEnter: () => setActive(index),
      onEnterBack: () => setActive(index)
    });

    cleanup.push(() => trigger.kill());
  });

  const jumpToScene = (index) => {
    const clamped = Math.max(0, Math.min(manifest.length - 1, index));
    const scene = manifest[clamped];
    const el = document.querySelector(`[data-ct-scene="${scene.id}"]`);
    if (!el) return;
    if (lenis) {
      lenis.scrollTo(el, { offset: 0, duration: 1.4 });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // When no dot has aria-current (e.g., the user is between scenes), fall
  // back to whichever scene's element occupies the viewport midpoint. Lets
  // PageDown/PageUp behave naturally from any scroll position.
  const inferIndexFromScroll = () => {
    const midpoint = window.innerHeight / 2;
    let bestIndex = 0;
    let bestDistance = Infinity;
    manifest.forEach((scene, index) => {
      const el = document.querySelector(`[data-ct-scene="${scene.id}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(center - midpoint);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  };

  cleanup.push(
    initKeyboardSceneNavigation({
      sceneCount: manifest.length,
      getCurrentIndex: () => {
        const activeIndex = Array.from(dots).findIndex((dot) =>
          dot.hasAttribute("aria-current")
        );
        return activeIndex === -1 ? inferIndexFromScroll() : activeIndex;
      },
      navigateToIndex: jumpToScene,
      announce: (message) => {
        if (announceRegion) {
          announceRegion.textContent = message;
        }
      }
    })
  );

  // Hash-based deep linking. Capture the initial hash AT INIT so the
  // scroll-driven setActive can't overwrite it before our timer fires.
  const initialHash = window.location.hash.replace(/^#/, "");

  const navigateToSceneById = (id) => {
    if (!id) return;
    const index = manifest.findIndex((s) => s.id === id);
    if (index >= 0) jumpToScene(index);
  };

  // Defer initial hash jump until after preloader settles
  if (initialHash) {
    const initialHashTimer = setTimeout(() => navigateToSceneById(initialHash), 1500);
    cleanup.push(() => clearTimeout(initialHashTimer));
  }

  // Subsequent hashchange events (user pasting new # URL, browser back/forward)
  const onHashChange = () => {
    const id = window.location.hash.replace(/^#/, "");
    navigateToSceneById(id);
  };
  window.addEventListener("hashchange", onHashChange);
  cleanup.push(() => window.removeEventListener("hashchange", onHashChange));

  // Show nav after preloader. Tracked so a dispose racing this frame can't
  // re-add is-visible after teardown removed it.
  const visibleRafId = requestAnimationFrame(() => {
    nav.classList.add("is-visible");
  });
  cleanup.push(() => cancelAnimationFrame(visibleRafId));

  return () => {
    cleanup.forEach((fn) => fn());
    list.replaceChildren();
    nav.classList.remove("is-visible");
  };
};
