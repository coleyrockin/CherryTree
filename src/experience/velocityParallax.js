/**
 * Per-scene velocity-driven parallax.
 *
 * Each scene's media layer scrubs through a motion preset against scroll
 * position; the matte fades on the same scrub clock; the text layer
 * counter-parallaxes (floats slower than the media) for depth.
 *
 * Text counter-parallax is suppressed below 760px to keep mobile scrolling
 * smooth and prevent the text drifting into the fixed nav zone.
 *
 * Triptych is skipped here because it has its own pin-and-reveal timeline
 * handled inside sceneController.
 *
 * This module is a consumer of GSAP/ScrollTrigger; it can read normalized
 * scroll velocity from `src/utils/scrollVelocity.js` when a caller passes a
 * `velocityTracker`, though all current presets are scrub-driven and do not
 * read velocity directly. The shared tracker is plumbed in for future presets
 * that want a per-frame velocity signal without each module instantiating its
 * own.
 */

const MOTION_PRESETS = {
  parallaxDeep: {
    from: { yPercent: 14, scale: 1.12, filter: "saturate(0.8)" },
    to: { yPercent: -8, scale: 1, filter: "saturate(1)" },
    scrub: 1.2
  },
  crossfadeLong: {
    from: { yPercent: 3, scale: 1.04, filter: "saturate(0.92)" },
    to: { yPercent: -2, scale: 1, filter: "saturate(1)" },
    scrub: 0.8
  },
  driftSlow: {
    from: { xPercent: -2, rotate: -0.5 },
    to: { xPercent: 2, rotate: 0.5 },
    scrub: 1.4
  }
};

const DEFAULT_PRESET = MOTION_PRESETS.parallaxDeep;

const SKIP_IDS = new Set(["prologue-webgl", "triptych"]);

export const initVelocityParallax = ({ scenes, gsap }) => {
  const animations = [];
  const isMobileViewport = window.matchMedia("(max-width: 760px)").matches;

  scenes.forEach((scene) => {
    const id = scene.dataset.ctScene;
    const preset = MOTION_PRESETS[scene.dataset.motionPreset] || DEFAULT_PRESET;

    if (SKIP_IDS.has(id)) {
      return;
    }

    const media = scene.querySelector("[data-scene-media]");
    if (media) {
      animations.push(
        gsap.fromTo(
          media,
          { ...preset.from },
          {
            ...preset.to,
            ease: "none",
            scrollTrigger: {
              trigger: scene,
              start: "top bottom",
              end: "bottom top",
              scrub: preset.scrub
            }
          }
        )
      );
    }

    const matte = scene.querySelector(".scene-matte");
    if (matte) {
      animations.push(
        gsap.fromTo(
          matte,
          { opacity: 0.45 },
          {
            opacity: 0.18,
            ease: "none",
            scrollTrigger: {
              trigger: scene,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.9
            }
          }
        )
      );
    }

    // Text layer counter-parallax: text floats slower than media for depth.
    // Disabled on mobile to prevent text drifting into the fixed nav zone.
    const textLayer = scene.querySelector(".scene-text");
    if (textLayer && id !== "triptych" && !isMobileViewport) {
      animations.push(
        gsap.fromTo(
          textLayer,
          { yPercent: -6 },
          {
            yPercent: 10,
            ease: "none",
            scrollTrigger: {
              trigger: scene,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.4
            }
          }
        )
      );
    }
  });

  return () => {
    animations.forEach((animation) => animation.kill());
  };
};
