export const sceneManifest = Object.freeze([
  {
    id: "prologue-webgl",
    label: "Prologue",
    type: "webgl",
    assets: ["heroTextureA", "grain01", "prologueFallback"],
    motionPreset: "parallaxDeep",
    heightVh: 100,
    preload: true,
    bgColor: "#f8ebe2"
  },
  {
    id: "bloom-wash",
    label: "Bloom",
    type: "image",
    assets: ["bloomWashPrimary", "matteWarm01"],
    motionPreset: "crossfadeLong",
    heightVh: 100,
    preload: true,
    bgColor: "#f2ddd6"
  },
  {
    id: "triptych",
    label: "Triptych",
    type: "composite",
    assets: ["triptychLeft", "triptychCenter", "triptychRight", "grain02"],
    motionPreset: "parallaxDeep",
    heightVh: 140,
    preload: false,
    bgColor: "#e8d4cd"
  },
  {
    id: "color-field",
    label: "Color Field",
    type: "composite",
    assets: ["colorBloomA", "colorBloomB", "colorBloomC"],
    motionPreset: "driftSlow",
    heightVh: 100,
    preload: false,
    bgColor: "#edddd2"
  },
  {
    id: "stillness",
    label: "Stillness",
    type: "image",
    assets: ["stillnessHero", "filmDust01"],
    motionPreset: "crossfadeLong",
    heightVh: 100,
    preload: false,
    bgColor: "#ead6cc"
  },
  {
    id: "epilogue",
    label: "Epilogue",
    type: "composite",
    assets: ["epilogueGlow"],
    motionPreset: "driftSlow",
    heightVh: 140,
    preload: false,
    bgColor: "#e3cbc0"
  }
]);

export const sceneManifestById = new Map(sceneManifest.map((scene) => [scene.id, scene]));
