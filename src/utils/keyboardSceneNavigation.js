import { safeStorageGet, safeStorageSet } from "./storage";

const SHORTCUTS_STORAGE_KEY = "cherrytree.shortcuts.enabled";

const isEditableTarget = (target) => {
  if (!target || target.nodeType !== 1) {
    return false;
  }

  return target.matches("input, textarea, select") || target.isContentEditable;
};

export const initKeyboardSceneNavigation = ({
  sceneCount,
  getCurrentIndex,
  navigateToIndex,
  announce
}) => {
  let shortcutsEnabled = safeStorageGet(SHORTCUTS_STORAGE_KEY) !== "false";

  const onKeyDown = (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.key === "?") {
      shortcutsEnabled = !shortcutsEnabled;
      safeStorageSet(SHORTCUTS_STORAGE_KEY, String(shortcutsEnabled));
      announce?.(`Keyboard scene shortcuts ${shortcutsEnabled ? "on" : "off"}`);
      event.preventDefault();
      return;
    }

    const isCharacterShortcut =
      event.key === "j" || event.key === "J" ||
      event.key === "k" || event.key === "K" ||
      /^[1-9]$/.test(event.key);
    if (isCharacterShortcut && !shortcutsEnabled) {
      return;
    }

    let nextIndex = null;
    const currentIndex = getCurrentIndex();
    if (event.key === "PageDown" || event.key === "j" || event.key === "J") {
      nextIndex = currentIndex + 1;
    } else if (event.key === "PageUp" || event.key === "k" || event.key === "K") {
      nextIndex = currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = sceneCount - 1;
    } else if (/^[1-9]$/.test(event.key)) {
      const numericIndex = Number.parseInt(event.key, 10) - 1;
      if (numericIndex < sceneCount) {
        nextIndex = numericIndex;
      }
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    navigateToIndex(Math.max(0, Math.min(sceneCount - 1, nextIndex)));
  };

  window.addEventListener("keydown", onKeyDown);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
  };
};
