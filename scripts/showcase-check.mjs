#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sceneManifest } from "../src/content/sceneManifest.js";

const ROOT_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const EXPECTED_DESCRIPTION =
  "An eight-scene, scroll-driven cinematic gallery with real-time WebGL petals.";

let checkCount = 0;
const failures = [];

const readText = (relativePath) =>
  readFileSync(path.join(ROOT_DIR, relativePath), "utf8");

const readJson = (relativePath) => JSON.parse(readText(relativePath));

const getPath = (source, dottedPath) =>
  dottedPath.split(".").reduce((value, key) => value?.[key], source);

const check = (condition, message) => {
  checkCount += 1;
  if (!condition) {
    failures.push(message);
  }
};

const stripUrlSuffix = (ref) => ref.split("#")[0].split("?")[0];

const isExternalRef = (ref) =>
  /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith("//") || ref.startsWith("data:");

const resolveSiteRef = (fromFile, ref) => {
  const cleanRef = stripUrlSuffix(ref.trim());
  if (!cleanRef || cleanRef === "/" || cleanRef.startsWith("#") || isExternalRef(cleanRef)) {
    return null;
  }

  if (cleanRef.startsWith("/src/")) {
    return path.join(ROOT_DIR, cleanRef.slice(1));
  }

  if (cleanRef.startsWith("/")) {
    return path.join(ROOT_DIR, "public", cleanRef.slice(1));
  }

  return path.resolve(path.dirname(fromFile), cleanRef);
};

const collectHtmlRefs = (relativePath) => {
  const absolutePath = path.join(ROOT_DIR, relativePath);
  const html = readText(relativePath);
  const refs = [];

  const singleUrlAttributes = /\b(?:href|src|data-src)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(singleUrlAttributes)) {
    refs.push(match[1]);
  }

  const srcSetAttributes = /\b(?:srcset|data-srcset|imagesrcset)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(srcSetAttributes)) {
    match[1]
      .split(",")
      .map((candidate) => candidate.trim().split(/\s+/)[0])
      .filter(Boolean)
      .forEach((candidate) => refs.push(candidate));
  }

  const cssUrls = /url\((['"]?)([^'")]+)\1\)/gi;
  for (const match of html.matchAll(cssUrls)) {
    refs.push(match[2]);
  }

  return refs.map((ref) => ({ from: absolutePath, ref }));
};

const collectReadmeImageRefs = () => {
  const readmePath = path.join(ROOT_DIR, "README.md");
  const readme = readText("README.md");
  const refs = [];

  const markdownImages = /!\[[^\]]*]\(([^)]+)\)/g;
  for (const match of readme.matchAll(markdownImages)) {
    refs.push(match[1]);
  }

  const htmlImages = /<img\s+[^>]*src=["']([^"']+)["']/gi;
  for (const match of readme.matchAll(htmlImages)) {
    refs.push(match[1]);
  }

  return refs.map((ref) => ({ from: readmePath, ref }));
};

const checkPackageMetadata = () => {
  const packageJson = readJson("package.json");
  const packageLock = readJson("package-lock.json");
  const lockRoot = packageLock.packages?.[""];

  check(packageJson.private === true, "package.json should remain private");

  [
    "description",
    "author",
    "license",
    "homepage",
    "repository.url",
    "bugs.url",
    "engines.node"
  ].forEach((field) => {
    check(Boolean(getPath(packageJson, field)), `package.json is missing ${field}`);
  });

  check(
    Array.isArray(packageJson.keywords) && packageJson.keywords.length >= 6,
    "package.json should include showcase-friendly keywords"
  );

  ["check:showcase", "audit:prod", "validate"].forEach((script) => {
    check(Boolean(packageJson.scripts?.[script]), `package.json is missing script ${script}`);
  });

  check(lockRoot?.license === packageJson.license, "package-lock root license should match package.json");
  check(lockRoot?.engines?.node === packageJson.engines.node, "package-lock root node engine should match package.json");
};

const checkSceneConsistency = () => {
  const indexHtml = readText("index.html");
  const readme = readText("README.md");
  const manifest = readJson("public/manifest.webmanifest");
  const sceneIds = [...indexHtml.matchAll(/data-ct-scene="([^"]+)"/g)].map((match) => match[1]);
  const uniqueSceneIds = new Set(sceneIds);

  check(sceneIds.length === sceneManifest.length, "index.html scene count should match sceneManifest");
  check(uniqueSceneIds.size === sceneIds.length, "index.html scene ids should be unique");

  sceneManifest.forEach((scene) => {
    check(uniqueSceneIds.has(scene.id), `index.html is missing scene ${scene.id}`);
  });

  check(readme.includes("eight scenes"), "README should describe eight scenes");
  check(!manifest.description.includes("nine scenes"), "manifest should not describe nine scenes");
  check(manifest.description.includes("eight scenes"), "manifest should describe eight scenes");
};

const checkPublicMetadata = () => {
  const indexHtml = readText("index.html");
  const sitemap = readText("public/sitemap.xml");
  const manifest = readJson("public/manifest.webmanifest");
  const iconSizes = new Set(manifest.icons?.map((icon) => icon.sizes));

  [
    `<meta name="description" content="${EXPECTED_DESCRIPTION}" />`,
    `<meta property="og:description" content="${EXPECTED_DESCRIPTION}" />`,
    `<meta name="twitter:description" content="${EXPECTED_DESCRIPTION}" />`,
    `"description": "${EXPECTED_DESCRIPTION}"`
  ].forEach((snippet) => {
    check(indexHtml.includes(snippet), `index.html metadata is missing: ${snippet}`);
  });

  check(sitemap.includes("<lastmod>2026-05-27</lastmod>"), "sitemap lastmod should be 2026-05-27");

  ["180x180", "192x192", "512x512"].forEach((size) => {
    check(iconSizes.has(size), `manifest should include a ${size} icon`);
  });

  manifest.icons?.forEach((icon) => {
    const iconPath = resolveSiteRef(path.join(ROOT_DIR, "public/manifest.webmanifest"), icon.src);
    check(Boolean(iconPath && existsSync(iconPath)), `manifest icon is missing: ${icon.src}`);
  });
};

const checkReferencedFiles = () => {
  const references = [
    ...collectReadmeImageRefs(),
    ...collectHtmlRefs("index.html"),
    ...collectHtmlRefs("public/404.html")
  ];

  references.forEach(({ from, ref }) => {
    const resolved = resolveSiteRef(from, ref);
    if (!resolved) {
      return;
    }
    check(existsSync(resolved), `Missing referenced file: ${ref}`);
  });
};

checkPackageMetadata();
checkSceneConsistency();
checkPublicMetadata();
checkReferencedFiles();

if (failures.length) {
  console.error("Showcase check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Showcase check passed (${checkCount} checks).`);
