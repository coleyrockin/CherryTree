/**
 * Spring-physics hover effects on buttons and interactive elements.
 */

export const initMicroInteractions = ({ gsap }) => {
  const buttons = document.querySelectorAll(".sound-toggle, .motion-toggle, .scene-nav-dot");
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
