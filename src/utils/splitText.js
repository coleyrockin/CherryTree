/**
 * Splits an element's text content into individually animatable spans.
 * Preserves the original text in an aria-label for screen readers.
 */

const wrapNodes = (element, mode) => {
  const original = element.textContent || "";
  element.setAttribute("aria-label", original);

  const items = mode === "chars" ? [...original] : original.split(/(\s+)/);
  element.textContent = "";

  const spans = [];
  let index = 0;

  items.forEach((item) => {
    if (mode === "words" && /^\s+$/.test(item)) {
      element.appendChild(document.createTextNode(item));
      return;
    }

    if (mode === "chars" && item === " ") {
      element.appendChild(document.createTextNode(" "));
      return;
    }

    const span = document.createElement("span");
    span.className = mode === "chars" ? "char" : "word";
    span.style.display = "inline-block";
    span.style.willChange = "transform, opacity";
    span.textContent = item;
    span.style.setProperty("--i", String(index));
    element.appendChild(span);
    spans.push(span);
    index += 1;
  });

  return spans;
};

export const splitByChars = (element) => {
  if (!element) {
    return { chars: [], revert: () => {} };
  }

  const originalHTML = element.innerHTML;
  const chars = wrapNodes(element, "chars");

  return {
    chars,
    revert: () => {
      element.innerHTML = originalHTML;
      element.removeAttribute("aria-label");
    }
  };
};

export const splitByWords = (element) => {
  if (!element) {
    return { words: [], revert: () => {} };
  }

  const originalHTML = element.innerHTML;
  const words = wrapNodes(element, "words");

  return {
    words,
    revert: () => {
      element.innerHTML = originalHTML;
      element.removeAttribute("aria-label");
    }
  };
};
