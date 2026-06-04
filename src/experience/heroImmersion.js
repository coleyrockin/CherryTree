/**
 * Cinematic arrival.
 *
 * On a fresh visit to the top of the Prologue, the persistent chrome — the
 * brand mark, the motion/sound controls, the editorial numeral, and the scene
 * rail — is held back so the hero opens on nothing but the title and the falling
 * petals. The chrome reveals the first time the visitor engages (a scroll or a
 * key) and never hides again; the mystery is in the opening frame, not the
 * whole journey. The fade itself is pure CSS (`html.is-immersive-hero`); this
 * module only owns the state and the reveal triggers.
 *
 * Deliberately a no-op when:
 *   - reduced motion is requested (those visitors get full chrome immediately),
 *   - the page was deep-linked to a scene other than the hero,
 *   - the visitor did not land at the top of the page.
 *
 * Safe by construction: the class is only ever *added* here, so if anything
 * throws the chrome simply stays visible. A fallback timer also guarantees the
 * controls surface for someone who just lingers on the hero without scrolling.
 */
export const initHeroImmersion = ({ reducedMotion = false } = {}) => {
  const root = document.documentElement;

  const hash = window.location.hash.replace(/^#/, "");
  const atHeroTop = (!hash || hash === "prologue-webgl") && window.scrollY < 12;

  if (reducedMotion || !atHeroTop) {
    return () => {};
  }

  root.classList.add("is-immersive-hero");

  let revealed = false;
  let fallbackTimer = 0;

  const teardown = () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("keydown", reveal);
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = 0;
    }
  };

  function reveal() {
    if (revealed) {
      return;
    }
    revealed = true;
    root.classList.remove("is-immersive-hero");
    teardown();
  }

  const onScroll = () => {
    if (window.scrollY > 24) {
      reveal();
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("keydown", reveal);
  // Never strand the controls if the visitor simply admires the opening.
  fallbackTimer = window.setTimeout(reveal, 9000);

  return () => {
    teardown();
    root.classList.remove("is-immersive-hero");
  };
};
