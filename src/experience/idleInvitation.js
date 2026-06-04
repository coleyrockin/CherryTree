/**
 * Idle invitation.
 *
 * After 45 s of no scroll or pointer movement on the hero, adds
 * `html.is-idle` so the scroll-hint line brightens its pulse — a
 * quiet invitation to begin the journey. Removed on the next
 * interaction. Only active while the visitor is on the prologue;
 * once they scroll past it the hint is off-screen anyway.
 */

const IDLE_MS = 45_000;

export const initIdleInvitation = () => {
  const root = document.documentElement;
  let timer = 0;

  const dismiss = () => {
    root.classList.remove("is-idle");
    clearTimeout(timer);
  };

  const arm = () => {
    dismiss();
    timer = window.setTimeout(() => {
      // Only flag idle if the visitor is still near the top (prologue in view).
      // Past the first scene the scroll-hint is invisible anyway — no point.
      if (window.scrollY < window.innerHeight * 0.9) {
        root.classList.add("is-idle");
      }
    }, IDLE_MS);
  };

  const onInteract = () => {
    dismiss();
    arm();
  };

  window.addEventListener("scroll",       onInteract, { passive: true });
  window.addEventListener("pointermove",  onInteract, { passive: true });
  window.addEventListener("keydown",      onInteract);
  window.addEventListener("pointerdown",  onInteract, { passive: true });

  arm(); // start the clock

  return () => {
    dismiss();
    window.removeEventListener("scroll",      onInteract);
    window.removeEventListener("pointermove", onInteract);
    window.removeEventListener("keydown",     onInteract);
    window.removeEventListener("pointerdown", onInteract);
  };
};
