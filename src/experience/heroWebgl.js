import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer
} from "three";

const PETAL_COUNT_DESKTOP = 400;
const PETAL_COUNT_MOBILE = 200;
const PETAL_SIZE_DESKTOP = 0.22;
const PETAL_SIZE_MOBILE = 0.18;
const WORLD_WIDTH = 6.8;
const WORLD_HEIGHT = 8;

const isMobileDevice = () =>
  window.matchMedia("(max-width: 760px)").matches || navigator.maxTouchPoints > 1;

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

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
};

const randomBetween = (min, max) => min + Math.random() * (max - min);

/* ── Custom ShaderMaterial for depth-of-field + color shift ── */

const VERTEX_SHADER = `
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aRotSpeed;
  uniform float uTime;
  uniform float uSize;
  uniform vec2 uMouse;
  uniform float uRepelRadius;
  varying float vDepth;
  varying float vPhase;
  varying float vRot;

  void main() {
    // Cursor repulsion — visual displacement only, physics buffer unchanged
    // smoothstep requires edge0 < edge1, so we use (1 - smoothstep) for falloff
    vec2 diff = position.xy - uMouse;
    float dist = length(diff);
    float repel = (1.0 - smoothstep(uRepelRadius * 0.08, uRepelRadius, dist)) * 0.8;
    vec3 displaced = vec3(position.xy + normalize(diff + vec2(0.0001)) * repel, position.z);

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vDepth = clamp(-mvPosition.z / 12.0, 0.0, 1.0);
    vPhase = aPhase;
    vRot = uTime * aRotSpeed + aPhase;

    float sizeFactor = uSize * (300.0 / -mvPosition.z);
    sizeFactor *= mix(1.0, 1.3, vDepth);

    gl_PointSize = sizeFactor;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uOpacity;
  varying float vDepth;
  varying float vPhase;
  varying float vRot;

  void main() {
    // Rotate point sprite UVs so each petal flutters on its own axis
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vRot);
    float s = sin(vRot);
    uv = mat2(c, -s, s, c) * uv;
    uv += 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;

    vec4 texColor = texture2D(uMap, uv);
    if (texColor.a < 0.05) discard;

    float shift = sin(uTime * 0.3 + vPhase * 6.28) * 0.5 + 0.5;
    vec3 colorA = vec3(0.99, 0.86, 0.89);
    vec3 colorB = vec3(0.93, 0.69, 0.78);
    vec3 baseColor = mix(colorA, colorB, shift);

    float depthFade = mix(1.0, 0.35, vDepth);
    float depthDesaturate = mix(0.0, 0.4, vDepth);
    vec3 gray = vec3(dot(baseColor, vec3(0.299, 0.587, 0.114)));
    vec3 finalColor = mix(baseColor, gray, depthDesaturate);

    // Soft rim brightening (additive highlight near center of sprite)
    float rim = smoothstep(0.45, 0.1, length(gl_PointCoord - 0.5));
    finalColor += rim * 0.12 * vec3(1.0, 0.95, 0.98);

    gl_FragColor = vec4(finalColor * texColor.rgb, texColor.a * uOpacity * depthFade);
  }
`;

const createPetalField = ({ petalCount, petalSize, useShader }) => {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(petalCount * 3);
  const phases = new Float32Array(petalCount);
  const speeds = new Float32Array(petalCount);
  const rotSpeeds = new Float32Array(petalCount);

  for (let i = 0; i < petalCount; i += 1) {
    const i3 = i * 3;
    positions[i3] = randomBetween(-WORLD_WIDTH / 2, WORLD_WIDTH / 2);
    positions[i3 + 1] = randomBetween(-WORLD_HEIGHT / 2, WORLD_HEIGHT / 2);
    positions[i3 + 2] = randomBetween(-2.8, 1.8);
    phases[i] = randomBetween(0, Math.PI * 2);
    speeds[i] = randomBetween(0.16, 0.46);
    rotSpeeds[i] = randomBetween(-1.2, 1.2);
  }

  geometry.setAttribute("position", new BufferAttribute(positions, 3));

  const texture = createPetalTexture();
  let material;

  if (useShader && texture) {
    geometry.setAttribute("aPhase", new BufferAttribute(phases, 1));
    geometry.setAttribute("aSpeed", new BufferAttribute(speeds, 1));
    geometry.setAttribute("aRotSpeed", new BufferAttribute(rotSpeeds, 1));

    material = new ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uTime: { value: 0 },
        uSize: { value: petalSize * 100 },
        uOpacity: { value: 0.95 },
        uMouse: { value: new Vector2(999, 999) },
        uRepelRadius: { value: 1.5 }
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending
    });
  } else {
    material = new PointsMaterial({
      color: 0xfdd7e4,
      size: petalSize,
      map: texture ?? undefined,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: NormalBlending,
      sizeAttenuation: true
    });
  }

  const points = new Points(geometry, material);

  return {
    points,
    geometry,
    material,
    texture,
    positions,
    phases,
    speeds,
    rotSpeeds,
    petalCount,
    isShader: useShader && !!texture
  };
};

/* ── Sparse "light specks" additive layer ── */
const createSpeckField = (count) => {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    positions[i3] = randomBetween(-WORLD_WIDTH / 2 - 1, WORLD_WIDTH / 2 + 1);
    positions[i3 + 1] = randomBetween(-WORLD_HEIGHT / 2, WORLD_HEIGHT / 2);
    positions[i3 + 2] = randomBetween(-3.5, 1.5);
  }
  geometry.setAttribute("position", new BufferAttribute(positions, 3));

  const material = new PointsMaterial({
    color: 0xfff2df,
    size: 0.045,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true
  });

  return { points: new Points(geometry, material), geometry, material, positions, count };
};

const isWeakGPU = () => {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return true;
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return false;
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    return (
      renderer.includes("intel") ||
      renderer.includes("swiftshader") ||
      renderer.includes("llvmpipe") ||
      renderer.includes("mesa")
    );
  } catch {
    return false;
  }
};

export const initHeroWebgl = async ({
  canvas,
  host,
  reducedMotion = false,
  gsap = null,
  ScrollTrigger = null
}) => {
  if (!canvas || !host || !supportsWebGL()) {
    host?.classList.add("is-webgl-fallback");
    return () => { };
  }

  const mobile = isMobileDevice();
  const petalCount = mobile ? PETAL_COUNT_MOBILE : PETAL_COUNT_DESKTOP;
  const petalSize = mobile ? PETAL_SIZE_MOBILE : PETAL_SIZE_DESKTOP;
  const useShader = !isWeakGPU();

  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  scene.fog = new Fog(0xf5ddd8, 3, 14);

  const camera = new PerspectiveCamera(42, 1, 0.1, 30);
  const baseCameraZ = 6.2;
  camera.position.set(0, 0, baseCameraZ);

  const petalRig = new Group();
  const field = createPetalField({ petalCount, petalSize, useShader });
  const positionAttr = field.geometry.getAttribute("position");
  const positionArray = positionAttr.array;
  petalRig.add(field.points);

  const speckField = createSpeckField(mobile ? 60 : 120);
  const speckPositionAttr = speckField.geometry.getAttribute("position");
  const speckPositions = speckPositionAttr.array;
  petalRig.add(speckField.points);

  const hazeGeometry = new PlaneGeometry(14, 10);
  const hazeMaterial = new MeshBasicMaterial({
    color: 0xf4c7d3,
    transparent: true,
    opacity: 0.12,
    depthWrite: false
  });
  const haze = new Mesh(hazeGeometry, hazeMaterial);
  haze.position.z = -4;

  scene.add(haze);
  scene.add(petalRig);

  const ambientLight = new AmbientLight(0xfff4ed, 1.35);
  const rimLight = new DirectionalLight(0xffb9ce, 0.8);
  rimLight.position.set(-2, 2, 1.5);
  scene.add(ambientLight, rimLight);

  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let hasPointer = false;

  const handlePointerMove = (event) => {
    hasPointer = true;
    const bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return;
    }
    targetPointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    targetPointerY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
  };

  const handlePointerLeave = () => {
    hasPointer = false;
  };

  let rafId = 0;
  let lastTime = performance.now();
  let isActive = true;

  const updatePetals = (elapsed, deltaSeconds) => {
    const t = elapsed * 0.00035;
    for (let i = 0; i < field.petalCount; i += 1) {
      const i3 = i * 3;
      const px = positionArray[i3];
      const py = positionArray[i3 + 1];
      const phase = field.phases[i];

      // Multi-octave wind field. Spatial terms (px, py) make nearby petals
      // drift together momentarily; irrational frequency ratios (1.0/0.43/
      // 0.27/0.51/0.36) prevent the field from settling into a visible loop.
      const windX =
        Math.sin(t + px * 0.18 + phase * 0.4) * 0.18 +
        Math.cos(t * 0.43 + py * 0.22) * 0.12 +
        Math.sin(t * 0.27 + px * 0.07 + py * 0.13 + phase) * 0.07;

      const windY =
        Math.cos(t * 0.51 + py * 0.16 + phase * 0.3) * 0.05 +
        Math.sin(t * 0.36 + px * 0.09) * 0.03;

      positionArray[i3] += windX * deltaSeconds;
      positionArray[i3 + 1] += (windY - field.speeds[i]) * deltaSeconds;

      if (positionArray[i3 + 1] < -WORLD_HEIGHT / 2 - 0.4) {
        positionArray[i3] = randomBetween(-WORLD_WIDTH / 2, WORLD_WIDTH / 2);
        positionArray[i3 + 1] = WORLD_HEIGHT / 2 + 0.4;
        positionArray[i3 + 2] = randomBetween(-2.8, 1.8);
      }
    }

    positionAttr.needsUpdate = true;

    // Light specks drift slowly upward
    for (let i = 0; i < speckField.count; i += 1) {
      const i3 = i * 3;
      speckPositions[i3 + 1] += 0.04 * deltaSeconds;
      if (speckPositions[i3 + 1] > WORLD_HEIGHT / 2) {
        speckPositions[i3 + 1] = -WORLD_HEIGHT / 2;
        speckPositions[i3] = randomBetween(-WORLD_WIDTH / 2 - 1, WORLD_WIDTH / 2 + 1);
      }
    }
    speckPositionAttr.needsUpdate = true;
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

    if (field.isShader && field.material.uniforms) {
      field.material.uniforms.uTime.value = time * 0.001;
      field.material.uniforms.uMouse.value.set(
        hasPointer ? pointerX * (WORLD_WIDTH / 2) : 999,
        hasPointer ? -pointerY * (WORLD_HEIGHT / 2) : 999
      );
    }

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

  // Scroll-tied dolly — camera pulls in across the prologue scene so you
  // feel like you're moving through the petal field rather than watching it.
  // No-op if GSAP wasn't passed in.
  let dollyTrigger = null;
  if (gsap && ScrollTrigger && !reducedMotion) {
    dollyTrigger = ScrollTrigger.create({
      trigger: host,
      start: "top top",
      end: "bottom top",
      scrub: 1.2,
      onUpdate: (self) => {
        camera.position.z = baseCameraZ - self.progress * 1.8;
      }
    });
  }

  // Pause the dolly along with the render loop — otherwise camera.position.z
  // keeps mutating on scroll while we're not rendering, and the next time
  // the prologue comes into view the first frame can pop.
  let visibilityObserver = null;
  if ("IntersectionObserver" in window) {
    visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isActive = !!entry?.isIntersecting;
        if (isActive) {
          dollyTrigger?.enable();
          if (reducedMotion) {
            renderer.render(scene, camera);
          } else {
            startLoop();
          }
        } else {
          stopLoop();
          dollyTrigger?.disable();
        }
      },
      { threshold: 0.1 }
    );
  }

  window.addEventListener("resize", resize);
  host.addEventListener("pointermove", handlePointerMove, { passive: true });
  host.addEventListener("pointerleave", handlePointerLeave, { passive: true });
  visibilityObserver?.observe(host);

  resize();

  if (reducedMotion) {
    renderer.render(scene, camera);
  } else {
    startLoop();
  }

  host.classList.add("is-webgl-ready");

  return () => {
    stopLoop();
    dollyTrigger?.kill();
    visibilityObserver?.disconnect();
    window.removeEventListener("resize", resize);
    host.removeEventListener("pointermove", handlePointerMove);
    host.removeEventListener("pointerleave", handlePointerLeave);

    field.geometry.dispose();
    field.material.dispose();
    field.texture?.dispose();
    speckField.geometry.dispose();
    speckField.material.dispose();
    hazeGeometry.dispose();
    hazeMaterial.dispose();

    renderer.dispose();
    host.classList.remove("is-webgl-ready");
  };
};
