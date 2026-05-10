/**
 * Floating side navigation dots driven by scroll position.
 */

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

  const setActive = (index) => {
    dots.forEach((dot, i) => {
      if (i === index) {
        dot.setAttribute("aria-current", "step");
      } else {
        dot.removeAttribute("aria-current");
      }
    });
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

  // Keyboard navigation: PageUp/PageDown jump scenes; Home/End go to first/
  // last. Arrow keys are deliberately left alone so users keep native fine-
  // grained scrolling. Skipped when focus is in an editable field.
  const isEditableTarget = (target) => {
    if (!target || target.nodeType !== 1) return false;
    if (target.matches("input, textarea, select")) return true;
    return target.isContentEditable;
  };

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

  const onKeyDown = (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }

    const activeIndex = Array.from(dots).findIndex((dot) =>
      dot.hasAttribute("aria-current")
    );
    const currentIndex = activeIndex === -1 ? inferIndexFromScroll() : activeIndex;

    let nextIndex = null;
    if (event.key === "PageDown") nextIndex = currentIndex + 1;
    else if (event.key === "PageUp") nextIndex = currentIndex - 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = manifest.length - 1;

    if (nextIndex === null) return;

    event.preventDefault();
    jumpToScene(nextIndex);
  };

  window.addEventListener("keydown", onKeyDown);
  cleanup.push(() => window.removeEventListener("keydown", onKeyDown));

  // Show nav after preloader
  requestAnimationFrame(() => {
    nav.classList.add("is-visible");
  });

  return () => {
    cleanup.forEach((fn) => fn());
    list.replaceChildren();
    nav.classList.remove("is-visible");
  };
};
