/* ── Horizontal marquee ribbons (scroll-velocity driven) ───── */

const initMarqueeRibbons = (gsap, ScrollTrigger) => {
  const ribbons = document.querySelectorAll("[data-ct-marquee]");
  if (!ribbons.length) {
    return () => {};
  }

  const animations = [];
  const velocity = { value: 0 };

  // Track scroll velocity
  const velocityTracker = ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      velocity.value = self.getVelocity();
    }
  });

  ribbons.forEach((ribbon) => {
    const track = ribbon.querySelector(".marquee-track");
    if (!track) {
      return;
    }

    const isReverse = ribbon.classList.contains("marquee-ribbon-reverse");
    const baseSpeed = isReverse ? 0.03 : -0.03;

    // Continuous drift driven by GSAP ticker
    let xPos = 0;
    const trackWidth = track.scrollWidth / 2;

    const onTick = () => {
      const velocityBoost = velocity.value * 0.00004;
      xPos += baseSpeed + velocityBoost;

      // Loop seamlessly
      if (Math.abs(xPos) > trackWidth) {
        xPos = xPos % trackWidth;
      }

      track.style.transform = `translateX(${xPos}px)`;
    };

    gsap.ticker.add(onTick);
    animations.push(() => gsap.ticker.remove(onTick));

    // Fade in on scroll
    animations.push(
      gsap.fromTo(
        ribbon,
        { opacity: 0 },
        {
          opacity: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ribbon,
            start: "top 95%",
            end: "top 60%",
            scrub: 0.5
          }
        }
      )
    );
  });

  return () => {
    velocityTracker.kill();
    animations.forEach((fn) => (typeof fn === "function" ? fn() : fn.kill()));
  };
};

/* ── Cursor-following ambient glow ─────────────────────────── */

const initCursorGlow = () => {
  const glow = document.querySelector("[data-ct-cursor-glow]");
  if (!glow || window.matchMedia("(pointer: coarse)").matches) {
    return () => {};
  }

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let isVisible = false;
  let rafId = 0;

  const onMove = (e) => {
    targetX = e.clientX;
    targetY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      glow.style.opacity = "1";
    }
  };

  const onLeave = () => {
    isVisible = false;
    glow.style.opacity = "0";
  };

  const animate = () => {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    glow.style.left = `${currentX}px`;
    glow.style.top = `${currentY}px`;
    rafId = requestAnimationFrame(animate);
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave, { passive: true });
  rafId = requestAnimationFrame(animate);

  return () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    cancelAnimationFrame(rafId);
    glow.style.opacity = "0";
  };
};

/* ── Enhanced scroll progress with glow pulse ──────────────── */

const initScrollProgressGlow = (gsap, ScrollTrigger) => {
  const bar = document.querySelector("[data-ct-scroll-progress]");
  if (!bar) {
    return () => {};
  }

  // Add a glow effect to the progress bar
  bar.style.boxShadow = "0 0 12px rgba(204, 95, 135, 0.4)";
  bar.style.height = "3px";

  return () => {
    bar.style.boxShadow = "";
    bar.style.height = "";
  };
};

/* ── Main entry point ─────────────────────────────────────── */

export const initScrollEffects = async ({ reducedMotion = false }) => {
  const cleanup = [];

  // Cursor glow works even in reduced motion (it's pointer-driven, not scroll)
  cleanup.push(initCursorGlow());

  if (reducedMotion) {
    return () => cleanup.forEach((fn) => fn?.());
  }

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger")
  ]);

  gsap.registerPlugin(ScrollTrigger);

  cleanup.push(initMarqueeRibbons(gsap, ScrollTrigger));
  // Note: clip-path reveals are handled by sceneController.js
  cleanup.push(initScrollProgressGlow(gsap, ScrollTrigger));

  return () => cleanup.forEach((fn) => fn?.());
};
