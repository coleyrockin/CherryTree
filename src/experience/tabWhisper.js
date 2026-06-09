/**
 * Tab-away whisper.
 *
 * When the visitor switches to another tab, the document title quietly
 * changes to a poetic callback — the current scene name followed by a
 * gentle reminder the gallery is still here. When they return, the title
 * is restored to whatever scene they were on.
 *
 * Reads the live scene label from the DOM rather than tracking events, so
 * it stays accurate even after motion toggles re-init the tint observer.
 */

const WHISPER_MESSAGES = [
  "🌸 still falling…",
  "🌸 come back.",
];

export const initTabWhisper = () => {
  let timer = 0;
  let idx = 0;

  const getSceneTitle = () => {
    const label = document.querySelector("[data-ct-scene-label]")?.textContent?.trim();
    return label ? `${label} — Cherry Tree` : "Cherry Tree";
  };

  const onHidden = () => {
    // Guard against a double visibilitychange-to-hidden leaking the old interval
    clearInterval(timer);
    idx = 0;
    document.title = WHISPER_MESSAGES[0];
    timer = window.setInterval(() => {
      idx = (idx + 1) % WHISPER_MESSAGES.length;
      document.title = WHISPER_MESSAGES[idx];
    }, 3200);
  };

  const onVisible = () => {
    clearInterval(timer);
    document.title = getSceneTitle();
  };

  const onChange = () => {
    if (document.hidden) {
      onHidden();
    } else {
      onVisible();
    }
  };

  document.addEventListener("visibilitychange", onChange);

  return () => {
    document.removeEventListener("visibilitychange", onChange);
    clearInterval(timer);
  };
};
