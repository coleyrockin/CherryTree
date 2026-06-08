# Repository maintenance

Operational notes for keeping the repo lean. None of this is required to build or
deploy — it's about clone time and long-term hygiene.

## Git history is ~117 MB; ~41 MB is reclaimable

The working tree is healthy, but `.git` carries dead binary blobs from earlier
iterations. A fresh `git clone` therefore downloads ~117 MB instead of ~76 MB.

| Source | Reclaimable |
|---|---|
| `koi.webm` — 4 historical versions, 3 now stale | ~5.7 MB |
| `koi.mp4` — 4 historical versions, 3 now stale | ~6.2 MB |
| `og-image.png` + `cherrytree-preview.png` (replaced by `.webp`) | ~5.6 MB |
| `.github/preview/*.png` (replaced by `.webp`, this pass) | ~5–8 MB |
| `triptych-a.jpg` source + old `*-3840.jpg` generated blobs | ~8.3 MB |
| **Total** | **~41 MB** |

### Why this is *not* done automatically

This repo has a **pushed remote**. Rewriting history is destructive to every
existing clone: collaborators and any forks must re-sync, and open PRs based on
the old history break. So it is documented here as a deliberate, coordinated
operation — never run silently as part of a feature change.

### How to do it (when the team agrees)

Requires [`git-filter-repo`](https://github.com/newren/git-filter-repo).

```bash
pip install git-filter-repo

# Strip dead blobs from all of history. --invert-paths means "remove these paths".
git filter-repo --force \
  --path public/assets/video/koi.webm \
  --path public/assets/video/koi.mp4 \
  --path public/og-image.png \
  --path public/cherrytree-preview.png \
  --path cherrytree-preview.png \
  --path assets-source/triptych-a.jpg \
  --invert-paths

# Then re-add ONLY the current koi video (the live one we still need):
git checkout origin/main -- public/assets/video/koi.webm public/assets/video/koi.mp4
git add public/assets/video/koi.webm public/assets/video/koi.mp4
git commit -m "Restore current koi video after history purge"

# Force-push, then every clone must run:  git fetch --all && git reset --hard origin/main
git push --force origin main
```

Expected result: `.git` drops from ~117 MB to ~76 MB.

> ⚠️ Coordinate before force-pushing. Anyone with an existing clone must hard-reset.

## Build-source images (`assets-source/`, ~14 MB)

The 4K masters in `assets-source/` are consumed only by
`scripts/optimize-assets.mjs` — they are never shipped. They sit in the repo so
regeneration works without external file supply, at the cost of ~14 MB per clone.

Options, in order of preference:

1. **Git LFS** — `git lfs track 'assets-source/*.jpg'`. Masters become pointer
   files (a few hundred bytes in the repo) and download on demand. Best balance.
2. **External storage** — move them to object storage / a backup, add
   `assets-source/` to `.gitignore`, document where to fetch them before running
   `npm run optimize-assets`. Saves the most clone weight; adds a manual step.
3. **Keep as-is** — simplest, but every clone pays the 14 MB.

## Koi video re-encode opportunity

`koi.webm` (VP9) is 9.25 MB — ~64% heavier than the 5.6 MB HEVC `koi.mp4` for the
same footage. It's lazy-loaded (`preload="none"`, hydrated on scroll approach), so
it costs nothing at first paint, but a Chrome visitor who reaches the Koi scene
downloads 9.25 MB. The `.mp4` also uses `hvc1` (HEVC), which only decodes on
Apple hardware — an `avc1` (H.264) encode would be a broader fallback.

When the source edit is available:

```bash
# Tighter VP9 (or try AV1 'av01' for ~30–50% better compression):
ffmpeg -i koi-source.mov -c:v libvpx-vp9 -crf 38 -b:v 0 -an -vf scale=1920:-2 koi.webm
# Broad-compatibility H.264 fallback instead of HEVC:
ffmpeg -i koi-source.mov -c:v libx264 -crf 23 -preset slow -an -movflags +faststart koi.mp4
```

Target ~4–6 MB for the WebM. Verify the loop is seamless and quality holds for an
ambient background before shipping.
