/* ── Horizontal marquee ribbons (scroll-velocity driven) ───── */

const initMarqueeRibbons = (gsap, ScrollTrigger) => {
  const ribbons = document.querySelectorAll("[data-ct-marquee]");
  if (!ribbons.length) {
    return () => {};
  }

  const animations = [];
  const velocity = { value: 0 };

  // Track scroll velocity (single ScrollTrigger, onUpdate is scroll-driven)
  const velocityTracker = ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      velocity.value = self.getVelocity();
    }
  });

  // Build per-ribbon drift state once; a single shared ticker updates them all
  // (one gsap.ticker callback for N ribbons rather than one per ribbon).
  const tracks = [];

  ribbons.forEach((ribbon) => {
    const track = ribbon.querySelector(".marquee-track");
    if (!track) {
      return;
    }

    const isReverse = ribbon.classList.contains("marquee-ribbon-reverse");
    tracks.push({
      track,
      baseSpeed: isReverse ? 0.03 : -0.03,
      xPos: 0,
      trackWidth: track.scrollWidth / 2
    });

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

  let sharedTick = null;
  if (tracks.length) {
    sharedTick = () => {
      const velocityBoost = velocity.value * 0.00004;
      tracks.forEach((t) => {
        t.xPos += t.baseSpeed + velocityBoost;
        if (Math.abs(t.xPos) > t.trackWidth) {
          t.xPos = t.xPos % t.trackWidth;
        }
        t.track.style.transform = `translateX(${t.xPos}px)`;
      });
    };
    gsap.ticker.add(sharedTick);
  }

  return () => {
    velocityTracker.kill();
    if (sharedTick) gsap.ticker.remove(sharedTick);
    animations.forEach((a) => a.kill());
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

  // Position via transform from the viewport origin so the per-frame update is
  // composite-only (no layout). The -50%/-50% preserves the centered glow.
  glow.style.left = "0";
  glow.style.top = "0";

  const paint = () => {
    glow.style.transform =
      `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
  };

  const animate = () => {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    paint();

    // Stop the loop once we've caught up to the pointer — restarts on move.
    if (Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1) {
      currentX = targetX;
      currentY = targetY;
      paint();
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(animate);
  };

  const ensureRunning = () => {
    if (!rafId) {
      rafId = requestAnimationFrame(animate);
    }
  };

  const onMove = (e) => {
    targetX = e.clientX;
    targetY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      glow.style.opacity = "1";
    }
    ensureRunning();
  };

  const onLeave = () => {
    isVisible = false;
    glow.style.opacity = "0";
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave, { passive: true });

  return () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    if (rafId) cancelAnimationFrame(rafId);
    glow.style.opacity = "0";
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
  // Note: clip-path reveals are handled by sceneController.js.
  // The scroll-progress glow/height now lives in CSS (.scroll-progress).

  return () => cleanup.forEach((fn) => fn?.());
};
