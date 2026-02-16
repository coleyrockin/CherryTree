import * as THREE from "three";

const PETAL_COUNT = 240;
const WORLD_WIDTH = 6.8;
const WORLD_HEIGHT = 8;

const supportsWebGL = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
};

const createPetalTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 116);
  gradient.addColorStop(0, "rgba(255, 244, 248, 0.96)");
  gradient.addColorStop(0.35, "rgba(255, 178, 205, 0.88)");
  gradient.addColorStop(0.65, "rgba(237, 116, 151, 0.75)");
  gradient.addColorStop(1, "rgba(237, 116, 151, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(128, 128, 84, 104, Math.PI / 8, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
};

const randomBetween = (min, max) => min + Math.random() * (max - min);

const createPetalField = () => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PETAL_COUNT * 3);
  const scales = new Float32Array(PETAL_COUNT);
  const phases = new Float32Array(PETAL_COUNT);
  const speeds = new Float32Array(PETAL_COUNT);

  for (let i = 0; i < PETAL_COUNT; i += 1) {
    const i3 = i * 3;
    positions[i3] = randomBetween(-WORLD_WIDTH / 2, WORLD_WIDTH / 2);
    positions[i3 + 1] = randomBetween(-WORLD_HEIGHT / 2, WORLD_HEIGHT / 2);
    positions[i3 + 2] = randomBetween(-2.8, 1.8);
    scales[i] = randomBetween(0.11, 0.28);
    phases[i] = randomBetween(0, Math.PI * 2);
    speeds[i] = randomBetween(0.16, 0.46);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  const texture = createPetalTexture();
  const material = new THREE.PointsMaterial({
    color: 0xfdd7e4,
    size: 0.22,
    map: texture ?? undefined,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);

  return {
    points,
    geometry,
    material,
    texture,
    positions,
    phases,
    speeds
  };
};

export const initHeroWebgl = ({ canvas, host, reducedMotion = false }) => {
  if (!canvas || !host || !supportsWebGL()) {
    host?.classList.add("is-webgl-fallback");
    return () => {};
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf5ddd8, 3, 14);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
  camera.position.set(0, 0, 6.2);

  const petalRig = new THREE.Group();
  const field = createPetalField();
  petalRig.add(field.points);

  const hazeGeometry = new THREE.PlaneGeometry(14, 10);
  const hazeMaterial = new THREE.MeshBasicMaterial({
    color: 0xf4c7d3,
    transparent: true,
    opacity: 0.12,
    depthWrite: false
  });
  const haze = new THREE.Mesh(hazeGeometry, hazeMaterial);
  haze.position.z = -4;

  scene.add(haze);
  scene.add(petalRig);

  const ambientLight = new THREE.AmbientLight(0xfff4ed, 1.35);
  const rimLight = new THREE.DirectionalLight(0xffb9ce, 0.8);
  rimLight.position.set(-2, 2, 1.5);
  scene.add(ambientLight, rimLight);

  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;

  const handlePointerMove = (event) => {
    const bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return;
    }
    targetPointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    targetPointerY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
  };

  let rafId = 0;
  let lastTime = performance.now();
  let isActive = true;

  const updatePetals = (elapsed, deltaSeconds) => {
    const positionAttr = field.geometry.getAttribute("position");
    for (let i = 0; i < PETAL_COUNT; i += 1) {
      const i3 = i * 3;
      const driftX = Math.sin(elapsed * 0.00035 + field.phases[i]) * 0.2;
      positionAttr.array[i3] += driftX * deltaSeconds;
      positionAttr.array[i3 + 1] -= field.speeds[i] * deltaSeconds;

      if (positionAttr.array[i3 + 1] < -WORLD_HEIGHT / 2 - 0.4) {
        positionAttr.array[i3] = randomBetween(-WORLD_WIDTH / 2, WORLD_WIDTH / 2);
        positionAttr.array[i3 + 1] = WORLD_HEIGHT / 2 + 0.4;
        positionAttr.array[i3 + 2] = randomBetween(-2.8, 1.8);
      }
    }

    positionAttr.needsUpdate = true;
  };

  const resize = () => {
    const bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
  };

  const renderFrame = (time) => {
    if (!isActive) {
      rafId = 0;
      return;
    }

    const deltaSeconds = Math.min((time - lastTime) / 1000, 0.04);
    lastTime = time;

    pointerX += (targetPointerX - pointerX) * 0.045;
    pointerY += (targetPointerY - pointerY) * 0.045;
    petalRig.rotation.y = pointerX * 0.16;
    petalRig.rotation.x = -pointerY * 0.11;
    petalRig.position.x = pointerX * 0.18;
    petalRig.position.y = -pointerY * 0.12;

    updatePetals(time, deltaSeconds);
    renderer.render(scene, camera);

    rafId = requestAnimationFrame(renderFrame);
  };

  const startLoop = () => {
    if (reducedMotion || rafId) {
      return;
    }
    lastTime = performance.now();
    rafId = requestAnimationFrame(renderFrame);
  };

  const stopLoop = () => {
    if (!rafId) {
      return;
    }
    cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      isActive = !!entry?.isIntersecting;
      if (isActive) {
        if (reducedMotion) {
          renderer.render(scene, camera);
        } else {
          startLoop();
        }
      } else {
        stopLoop();
      }
    },
    { threshold: 0.1 }
  );

  window.addEventListener("resize", resize);
  host.addEventListener("pointermove", handlePointerMove, { passive: true });
  visibilityObserver.observe(host);

  resize();

  if (reducedMotion) {
    renderer.render(scene, camera);
  } else {
    startLoop();
  }

  host.classList.add("is-webgl-ready");

  return () => {
    stopLoop();
    visibilityObserver.disconnect();
    window.removeEventListener("resize", resize);
    host.removeEventListener("pointermove", handlePointerMove);

    field.geometry.dispose();
    field.material.dispose();
    field.texture?.dispose();
    hazeGeometry.dispose();
    hazeMaterial.dispose();

    renderer.dispose();
    host.classList.remove("is-webgl-ready");
  };
};
