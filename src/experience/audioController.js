const STORAGE_KEY = "cherrytree.audio.enabled";

const safeStorageGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restrictive browser modes.
  }
};

const readStoredState = () => safeStorageGet(STORAGE_KEY) === "true";

const writeStoredState = (enabled) => {
  safeStorageSet(STORAGE_KEY, String(enabled));
};

const fadeValue = ({ from, to, durationMs, onUpdate, onComplete }) => {
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / durationMs);
    const eased = 1 - (1 - progress) ** 3;
    onUpdate(from + (to - from) * eased);
    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }
    onComplete?.();
  };
  requestAnimationFrame(step);
};

const setButtonState = (button, stateNode, enabled, sourceLabel = null) => {
  button.setAttribute("aria-pressed", String(enabled));
  button.classList.toggle("is-enabled", enabled);

  if (!stateNode) {
    return;
  }

  if (sourceLabel) {
    stateNode.textContent = sourceLabel;
    return;
  }

  stateNode.textContent = enabled ? "On" : "Off";
};

const createSynthFallback = () => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }

  const context = new AudioCtx();
  const master = context.createGain();
  master.gain.value = 0;

  const lowOsc = context.createOscillator();
  lowOsc.type = "triangle";
  lowOsc.frequency.value = 133;

  const highOsc = context.createOscillator();
  highOsc.type = "sine";
  highOsc.frequency.value = 266;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 560;
  filter.Q.value = 1;

  lowOsc.connect(filter);
  highOsc.connect(filter);
  filter.connect(master);
  master.connect(context.destination);

  lowOsc.start();
  highOsc.start();

  return {
    context,
    master,
    oscillators: [lowOsc, highOsc]
  };
};

export const initAudioController = ({ selector = "[data-ct-sound-toggle]" } = {}) => {
  const button = document.querySelector(selector);
  if (!button) {
    return () => {};
  }

  const stateNode = button.querySelector("[data-ct-sound-state]");
  const fileAudio = new Audio("/assets/audio/ambient-loop.mp3");
  fileAudio.loop = true;
  fileAudio.preload = "none";
  fileAudio.volume = 0;

  let synth = null;
  let usingSynth = false;
  let isEnabled = false;
  let hasUnlocked = false;
  let pendingEnable = readStoredState();
  let isToggling = false;

  const listenerController = new AbortController();

  const disableCurrentAudio = () => {
    if (usingSynth && synth) {
      const target = synth;
      fadeValue({
        from: target.master.gain.value,
        to: 0,
        durationMs: 750,
        onUpdate: (value) => {
          target.master.gain.value = value;
        },
        onComplete: () => {
          target.oscillators.forEach((osc) => osc.stop());
          target.context.close();
        }
      });
      synth = null;
      usingSynth = false;
      return;
    }

    if (!fileAudio.paused) {
      fadeValue({
        from: fileAudio.volume,
        to: 0,
        durationMs: 750,
        onUpdate: (value) => {
          fileAudio.volume = Math.max(0, value);
        },
        onComplete: () => {
          fileAudio.pause();
          fileAudio.currentTime = 0;
        }
      });
    }
  };

  const startFallbackSynth = async () => {
    if (!synth) {
      synth = createSynthFallback();
    }

    if (!synth) {
      throw new Error("Synth fallback not supported in this browser.");
    }

    if (synth.context.state === "suspended") {
      await synth.context.resume();
    }

    usingSynth = true;
    fadeValue({
      from: 0,
      to: 0.1,
      durationMs: 1000,
      onUpdate: (value) => {
        if (synth) {
          synth.master.gain.value = value;
        }
      }
    });
  };

  const startFileAudio = async () => {
    usingSynth = false;
    fileAudio.volume = 0;
    await fileAudio.play();

    fadeValue({
      from: 0,
      to: 0.55,
      durationMs: 1100,
      onUpdate: (value) => {
        fileAudio.volume = Math.min(0.65, Math.max(0, value));
      }
    });
  };

  const enable = async () => {
    try {
      await startFileAudio();
      setButtonState(button, stateNode, true);
    } catch {
      await startFallbackSynth();
      setButtonState(button, stateNode, true, "On*");
    }

    isEnabled = true;
    writeStoredState(true);
  };

  const disable = () => {
    disableCurrentAudio();
    isEnabled = false;
    writeStoredState(false);
    setButtonState(button, stateNode, false);
  };

  const onToggle = async () => {
    if (isToggling) {
      return;
    }
    isToggling = true;
    try {
      if (isEnabled) {
        disable();
        pendingEnable = false;
        return;
      }

      pendingEnable = true;
      await enable();
    } finally {
      isToggling = false;
    }
  };

  const unlockAudio = async () => {
    if (hasUnlocked) {
      return;
    }

    hasUnlocked = true;

    if (pendingEnable && !isEnabled) {
      await enable();
    }
  };

  if (pendingEnable) {
    setButtonState(button, stateNode, false, "Armed");
  } else {
    setButtonState(button, stateNode, false);
  }

  button.addEventListener("click", onToggle, { signal: listenerController.signal });
  window.addEventListener("pointerdown", unlockAudio, {
    once: true,
    passive: true,
    signal: listenerController.signal
  });
  window.addEventListener("keydown", unlockAudio, {
    once: true,
    signal: listenerController.signal
  });

  return () => {
    listenerController.abort();
    disableCurrentAudio();
    fileAudio.removeAttribute("src");
    fileAudio.load();
  };
};
