export const sceneManifest = Object.freeze([
  {
    id: "prologue-webgl",
    type: "webgl",
    assets: ["heroTextureA", "grain01", "prologueFallback"],
    motionPreset: "parallaxDeep",
    heightVh: 100,
    preload: true
  },
  {
    id: "bloom-wash",
    type: "image",
    assets: ["bloomWashPrimary", "matteWarm01"],
    motionPreset: "crossfadeLong",
    heightVh: 100,
    preload: true
  },
  {
    id: "triptych",
    type: "composite",
    assets: ["triptychLeft", "triptychCenter", "triptychRight", "grain02"],
    motionPreset: "parallaxDeep",
    heightVh: 140,
    preload: false
  },
  {
    id: "color-field",
    type: "composite",
    assets: ["colorBloomA", "colorBloomB", "colorBloomC"],
    motionPreset: "driftSlow",
    heightVh: 100,
    preload: false
  },
  {
    id: "stillness",
    type: "image",
    assets: ["stillnessHero", "filmDust01"],
    motionPreset: "crossfadeLong",
    heightVh: 100,
    preload: false
  },
  {
    id: "epilogue",
    type: "composite",
    assets: ["epilogueGlow"],
    motionPreset: "driftSlow",
    heightVh: 100,
    preload: false
  }
]);

export const sceneManifestById = new Map(sceneManifest.map((scene) => [scene.id, scene]));
