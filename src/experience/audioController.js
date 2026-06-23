import { safeStorageGet, safeStorageSet } from "../utils/storage";

const STORAGE_KEY = "cherrytree.audio.enabled";

const readStoredState = () => safeStorageGet(STORAGE_KEY) === "true";

const writeStoredState = (enabled) => {
  safeStorageSet(STORAGE_KEY, String(enabled));
};

const fadeValue = ({ from, to, durationMs, onUpdate, onComplete }) => {
  const start = performance.now();
  let rafId = 0;
  let cancelled = false;

  const step = (now) => {
    if (cancelled) {
      return;
    }

    const progress = Math.min(1, (now - start) / durationMs);
    const eased = 1 - (1 - progress) ** 3;
    onUpdate(from + (to - from) * eased);

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
      return;
    }

    onComplete?.();
  };

  rafId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
  };
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

export const initAudioController = ({
  selector = "[data-ct-sound-toggle]",
  getVelocity = null
} = {}) => {
  const button = document.querySelector(selector);
  if (!button) {
    return () => {};
  }

  const stateNode = button.querySelector("[data-ct-sound-state]");
  const fileAudio = new Audio("/assets/audio/ambient-loop.mp3");
  fileAudio.loop = true;
  fileAudio.preload = "none";
  fileAudio.volume = 0;

  // Base volumes — modulated by scroll velocity once fade-in completes.
  // Swing is small and asymmetric (boost only) so the bed doesn't dip below
  // its resting level when the user stops scrolling.
  const FILE_BASE_VOLUME = 0.55;
  const FILE_VELOCITY_BOOST = 0.1;
  const SYNTH_BASE_GAIN = 0.1;
  const SYNTH_VELOCITY_BOOST = 0.06;

  let synth = null;
  let usingSynth = false;
  let isEnabled = false;
  let hasUnlocked = false;
  let pendingEnable = readStoredState();
  let isToggling = false;
  let canModulate = false;
  let velocityRafId = 0;
  let cancelFileFade = () => {};
  let cancelSynthFade = () => {};
  let skipNextButtonToggle = false;

  const listenerController = new AbortController();

  const runFileFade = (config) => {
    cancelFileFade();
    cancelFileFade = fadeValue(config);
  };

  const runSynthFade = (config) => {
    cancelSynthFade();
    cancelSynthFade = fadeValue(config);
  };

  const markUnavailable = () => {
    pendingEnable = false;
    isEnabled = false;
    writeStoredState(false);
    setButtonState(button, stateNode, false, "N/A");
  };

  const disableCurrentAudio = ({ immediate = false } = {}) => {
    canModulate = false;
    if (usingSynth && synth) {
      const target = synth;
      if (immediate) {
        cancelSynthFade();
        target.master.gain.value = 0;
        target.oscillators.forEach((osc) => {
          try {
            osc.stop();
          } catch {
            // Ignore stop calls on already-stopped oscillators.
          }
        });
        void target.context.close().catch(() => {});
        synth = null;
        usingSynth = false;
        return;
      }

      runSynthFade({
        from: target.master.gain.value,
        to: 0,
        durationMs: 750,
        onUpdate: (value) => {
          target.master.gain.value = value;
        },
        onComplete: () => {
          target.oscillators.forEach((osc) => osc.stop());
          void target.context.close().catch(() => {});
        }
      });
      synth = null;
      usingSynth = false;
      return;
    }

    if (!fileAudio.paused) {
      if (immediate) {
        cancelFileFade();
        fileAudio.volume = 0;
        fileAudio.pause();
        fileAudio.currentTime = 0;
        return;
      }

      runFileFade({
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
    canModulate = false;
    runSynthFade({
      from: 0,
      to: SYNTH_BASE_GAIN,
      durationMs: 1000,
      onUpdate: (value) => {
        if (synth) {
          synth.master.gain.value = value;
        }
      },
      onComplete: () => {
        canModulate = true;
      }
    });
  };

  const startFileAudio = async () => {
    usingSynth = false;
    canModulate = false;
    fileAudio.volume = 0;
    await fileAudio.play();

    runFileFade({
      from: 0,
      to: FILE_BASE_VOLUME,
      durationMs: 1100,
      onUpdate: (value) => {
        fileAudio.volume = Math.min(0.65, Math.max(0, value));
      },
      onComplete: () => {
        canModulate = true;
      }
    });
  };

  const enable = async () => {
    try {
      await startFileAudio();
      setButtonState(button, stateNode, true);
    } catch (fileError) {
      try {
        await startFallbackSynth();
        setButtonState(button, stateNode, true, "On*");
      } catch (fallbackError) {
        console.error("Audio unavailable for this session.", fileError, fallbackError);
        markUnavailable();
        return;
      }
    }

    isEnabled = true;
    writeStoredState(true);
    startVelocityLoop();
  };

  const disable = () => {
    disableCurrentAudio();
    isEnabled = false;
    writeStoredState(false);
    setButtonState(button, stateNode, false);
    stopVelocityLoop();
  };

  const onToggle = async () => {
    if (skipNextButtonToggle) {
      skipNextButtonToggle = false;
      return;
    }

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

  const unlockAudio = async (event) => {
    if (hasUnlocked) {
      return;
    }

    hasUnlocked = true;

    if (!pendingEnable || isEnabled) {
      return;
    }

    if (event?.target instanceof Node && button.contains(event.target)) {
      skipNextButtonToggle = true;
    }

    await enable();
  };

  // Velocity-driven volume boost — the ambient bed leans in when the user
  // scrolls, settles when still. The RAF only runs while audio is enabled
  // and modulation is unlocked — otherwise it would burn battery 60×/sec
  // doing nothing. Started by enable(), stopped by disable().
  let tickVelocity = null;
  const startVelocityLoop = () => {
    if (typeof getVelocity !== "function" || velocityRafId) return;
    tickVelocity = () => {
      if (!isEnabled) {
        velocityRafId = 0;
        return;
      }
      if (canModulate) {
        const v = Math.max(0, Math.min(1, getVelocity()));
        if (usingSynth && synth) {
          synth.master.gain.value = SYNTH_BASE_GAIN + v * SYNTH_VELOCITY_BOOST;
        } else if (!fileAudio.paused) {
          fileAudio.volume = Math.min(0.7, FILE_BASE_VOLUME + v * FILE_VELOCITY_BOOST);
        }
      }
      velocityRafId = requestAnimationFrame(tickVelocity);
    };
    velocityRafId = requestAnimationFrame(tickVelocity);
  };
  const stopVelocityLoop = () => {
    if (velocityRafId) {
      cancelAnimationFrame(velocityRafId);
      velocityRafId = 0;
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
    passive: true,
    signal: listenerController.signal
  });

  return () => {
    listenerController.abort();
    stopVelocityLoop();
    disableCurrentAudio({ immediate: true });
    fileAudio.removeAttribute("src");
    fileAudio.load();
  };
};
