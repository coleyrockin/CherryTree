/**
 * Spring-physics hover effects on buttons and interactive elements.
 */

export const initMicroInteractions = ({ gsap }) => {
  // Nav dots are intentionally excluded: they own a CSS "breathe" keyframe + a
  // scale(1.3) hover. A GSAP inline transform here would overwrite the keyframe
  // and the breathe never restarts after the first hover. Pills only.
  const buttons = document.querySelectorAll(".sound-toggle, .motion-toggle");
  const abortController = new AbortController();
  const signal = abortController.signal;

  buttons.forEach((btn) => {
    btn.addEventListener(
      "mouseenter",
      () => {
        gsap.to(btn, {
          scale: 1.06,
          y: -2,
          duration: 0.6,
          ease: "elastic.out(1, 0.4)",
          overwrite: true
        });
      },
      { passive: true, signal }
    );

    btn.addEventListener(
      "mouseleave",
      () => {
        gsap.to(btn, {
          scale: 1,
          y: 0,
          duration: 0.8,
          ease: "elastic.out(1, 0.5)",
          overwrite: true
        });
      },
      { passive: true, signal }
    );
  });

  return () => {
    abortController.abort();
    buttons.forEach((btn) => {
      gsap.set(btn, { scale: 1, y: 0 });
    });
  };
};
