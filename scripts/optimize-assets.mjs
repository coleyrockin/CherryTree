import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT_DIR = process.cwd();
const SOURCE_DIR = path.join(ROOT_DIR, "assets-source");
const OUTPUT_DIR = path.join(ROOT_DIR, "public/assets/images/generated");
const WIDTHS = [3840, 2560, 1920, 1280];
// Per-image max-width caps. triptych-a is a tall 3:4 portrait (3840x5120 — ~2x
// the megapixels of the landscape panels), shown in a <=33vw (100vw on mobile)
// panel that never needs a 3840px tier. Capping it at 2560 drops a ~2.6MB JPEG /
// ~1.35MB AVIF that was effectively never selected, with no visible quality loss.
const MAX_WIDTH_OVERRIDES = { "triptych-a": 2560 };
const MAX_INPUT_PIXELS = 50_000_000;
const INPUT_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const isRenderableImage = (name) => INPUT_EXTENSIONS.has(path.extname(name).toLowerCase());

const buildOutputPath = (baseName, width, ext) => path.join(OUTPUT_DIR, `${baseName}-${width}.${ext}`);

const loadImage = (inputPath) => sharp(inputPath, { limitInputPixels: MAX_INPUT_PIXELS });

const writeFormatsForWidth = async (inputPath, baseName, width) => {
  const image = loadImage(inputPath).resize({
    width,
    fit: "inside",
    withoutEnlargement: true
  });

  await Promise.all([
    image
      .clone()
      .avif({ quality: 52, effort: 5 })
      .toFile(buildOutputPath(baseName, width, "avif")),
    image
      .clone()
      .webp({ quality: 74, effort: 5 })
      .toFile(buildOutputPath(baseName, width, "webp")),
    image
      .clone()
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(buildOutputPath(baseName, width, "jpg"))
  ]);
};

const writeLqip = async (inputPath, baseName) => {
  await loadImage(inputPath)
    .resize({ width: 36, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 48, mozjpeg: true })
    .toFile(path.join(OUTPUT_DIR, `${baseName}-lqip.jpg`));
};

const run = async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const inputFiles = entries.filter((entry) => entry.isFile() && isRenderableImage(entry.name));

  if (!inputFiles.length) {
    console.log(`No renderable images found in ${SOURCE_DIR}`);
    return;
  }

  for (const entry of inputFiles) {
    const inputPath = path.join(SOURCE_DIR, entry.name);
    const baseName = path.parse(entry.name).name;
    const maxWidth = MAX_WIDTH_OVERRIDES[baseName] ?? Infinity;
    const widths = WIDTHS.filter((width) => width <= maxWidth);

    for (const width of widths) {
      await writeFormatsForWidth(inputPath, baseName, width);
      console.log(`Generated ${baseName} at ${width}px (avif/webp/jpg)`);
    }

    await writeLqip(inputPath, baseName);
    console.log(`Generated ${baseName} LQIP`);
  }

  console.log("Asset optimization complete.");
};

run().catch((error) => {
  console.error("Asset optimization failed:");
  console.error(error);
  process.exit(1);
});
