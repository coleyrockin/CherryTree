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

  // Show nav after preloader
  requestAnimationFrame(() => {
    nav.classList.add("is-visible");
  });

  return () => {
    cleanup.forEach((fn) => fn());
    list.innerHTML = "";
    nav.classList.remove("is-visible");
  };
};
