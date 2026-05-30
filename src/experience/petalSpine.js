/**
 * Global petal spine — a sparse, fixed-position canvas layer that drifts 25
 * cherry-blossom petals over every scene. Tint color lerps to the active
 * scene's --scene-tint on ct:scene-enter, making the petals shift from rose
 * to olive to gold to amber as the gallery scrolls through its color arc.
 *
 * Full-motion only: registered in the !reducedMotion block of main.js.
 * No GSAP dependency — owns its own rAF loop.
 * z-index 7: above film-grain (6), below editorial-chrome (11).
 */

const PETAL_COUNT = 25;
const LERP_RATE = 0.007;

/** Parse a CSS hex color (#rrggbb or #rgb) into [r, g, b] 0–255. */
const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16)
    ];
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
};

/** Read --scene-tint from the document root; returns [r, g, b] or fallback. */
const readSceneTint = () => {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--scene-tint")
    .trim();
  if (!raw) return [239, 139, 176]; // prologue rose fallback
  try {
    if (raw.startsWith("#")) return hexToRgb(raw);
    // Handle rgb(...) format
    const m = raw.match(/\d+/g);
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  } catch { /* no-op */ }
  return [239, 139, 176];
};

const rand = (min, max) => min + Math.random() * (max - min);

const createPetal = (canvasW, canvasH, dpr) => ({
  x: rand(0, canvasW / dpr),
  y: rand(-canvasH / dpr, canvasH / dpr),
  vx: rand(-0.18, 0.18),
  vy: rand(0.12, 0.38),
  angle: rand(0, Math.PI * 2),
  angularVelocity: rand(-0.008, 0.008),
  size: rand(4, 13),
  alpha: rand(0.28, 0.62)
});

export const initPetalSpine = () => {
  const root = document.documentElement;

  // Canvas
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = [
    "position:fixed",
    "inset:0",
    "width:100%",
    "height:100%",
    "z-index:7",
    "pointer-events:none"
  ].join(";");
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
  };
  resize();

  const observer = new ResizeObserver(resize);
  observer.observe(document.documentElement);

  // Petals
  const petals = Array.from({ length: PETAL_COUNT }, () =>
    createPetal(canvas.width, canvas.height, dpr)
  );

  // Color state — lerp toward target scene tint each frame
  let [cr, cg, cb] = readSceneTint();
  let [tr, tg, tb] = [cr, cg, cb];

  const onSceneEnter = () => {
    const [r, g, b] = readSceneTint();
    tr = r; tg = g; tb = b;
  };
  document.addEventListener("ct:scene-enter", onSceneEnter);

  // rAF loop
  let rafId = 0;
  const W = () => canvas.width / dpr;
  const H = () => canvas.height / dpr;

  const draw = () => {
    rafId = requestAnimationFrame(draw);

    // Lerp color toward target
    cr += (tr - cr) * LERP_RATE;
    cg += (tg - cg) * LERP_RATE;
    cb += (tb - cb) * LERP_RATE;

    ctx.clearRect(0, 0, W(), H());

    for (const p of petals) {
      // Move
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.angularVelocity;

      // Wrap
      const w = W(), h = H();
      if (p.y > h + p.size) { p.y = -p.size; p.x = rand(0, w); }
      if (p.x < -p.size * 2) { p.x = w + p.size; }
      if (p.x > w + p.size * 2) { p.x = -p.size; }

      // Draw as petal ellipse (scale on y-axis for oval shape)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.scale(1, 1.55);
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${p.alpha})`;
      ctx.fill();
      ctx.restore();
    }
  };

  draw();

  return () => {
    cancelAnimationFrame(rafId);
    observer.disconnect();
    document.removeEventListener("ct:scene-enter", onSceneEnter);
    canvas.remove();
  };
};
