const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${index * 90}ms`;
    observer.observe(element);
  });
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const yearElement = document.getElementById("year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear().toString();
}
