/**
 * Custom magnetic cursor with trailing ring and contextual glyph label.
 * Ring snaps toward interactive elements on hover and reveals a per-target label.
 */

const LERP_DOT = 0.2;
const LERP_RING = 0.09;

const INTERACTIVE_SELECTOR = "button, a, [data-magnetic]";

const resolveCursorLabel = (el) => {
  if (el.dataset?.cursorLabel) return el.dataset.cursorLabel;
  if (el.matches?.(".scene-nav-dot")) return el.getAttribute("aria-label")?.replace(/^Scene \d+:\s*/, "") ?? "View";
  if (el.matches?.(".motion-toggle")) return "Toggle";
  if (el.matches?.(".sound-toggle")) return "Sound";
  if (el.matches?.("a")) return "Open →";
  return "View";
};

export const initMagneticCursor = ({ gsap }) => {
  // Skip on touch devices
  if (window.matchMedia("(pointer: coarse)").matches) {
    return () => {};
  }

  const dot = document.querySelector("[data-ct-cursor-dot]");
  const ring = document.querySelector("[data-ct-cursor-ring]");
  const labelNode = document.querySelector("[data-ct-cursor-label]");
  if (!dot || !ring) {
    return () => {};
  }

  document.documentElement.classList.add("has-custom-cursor");

  let mouseX = -100;
  let mouseY = -100;
  let dotX = -100;
  let dotY = -100;
  let ringX = -100;
  let ringY = -100;
  let ringTargetX = -100;
  let ringTargetY = -100;
  let isMagnetic = false;

  const abortController = new AbortController();
  const signal = abortController.signal;

  const onMouseMove = (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isMagnetic) {
      ringTargetX = mouseX;
      ringTargetY = mouseY;
    }
  };

  window.addEventListener("mousemove", onMouseMove, { passive: true, signal });

  const onEnterInteractive = (e) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    ringTargetX = rect.left + rect.width / 2;
    ringTargetY = rect.top + rect.height / 2;
    isMagnetic = true;
    ring.classList.add("is-magnetic");

    if (labelNode) {
      labelNode.textContent = resolveCursorLabel(target);
    }
  };

  const onLeaveInteractive = () => {
    isMagnetic = false;
    ring.classList.remove("is-magnetic");
    ringTargetX = mouseX;
    ringTargetY = mouseY;
  };

  const onPressDown = () => ring.classList.add("is-pressed");
  const onPressUp = () => ring.classList.remove("is-pressed");

  const attachMagnetic = () => {
    document.querySelectorAll(INTERACTIVE_SELECTOR).forEach((el) => {
      if (el.dataset.ctCursorBound) return;
      el.dataset.ctCursorBound = "1";
      el.addEventListener("mouseenter", onEnterInteractive, { passive: true, signal });
      el.addEventListener("mouseleave", onLeaveInteractive, { passive: true, signal });
    });
  };

  attachMagnetic();

  window.addEventListener("mousedown", onPressDown, { passive: true, signal });
  window.addEventListener("mouseup", onPressUp, { passive: true, signal });

  const mutationObserver = new MutationObserver(() => {
    attachMagnetic();
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  const onTick = () => {
    dotX += (mouseX - dotX) * LERP_DOT;
    dotY += (mouseY - dotY) * LERP_DOT;
    ringX += (ringTargetX - ringX) * LERP_RING;
    ringY += (ringTargetY - ringY) * LERP_RING;

    dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
  };

  gsap.ticker.add(onTick);

  const onMouseLeave = () => {
    dot.style.opacity = "0";
    ring.style.opacity = "0";
  };

  const onMouseEnter = () => {
    dot.style.opacity = "";
    ring.style.opacity = "";
  };

  document.addEventListener("mouseleave", onMouseLeave, { signal });
  document.addEventListener("mouseenter", onMouseEnter, { signal });

  return () => {
    gsap.ticker.remove(onTick);
    abortController.abort();
    mutationObserver.disconnect();
    document.documentElement.classList.remove("has-custom-cursor");
    document.querySelectorAll("[data-ct-cursor-bound]").forEach((el) => {
      delete el.dataset.ctCursorBound;
    });
  };
};
