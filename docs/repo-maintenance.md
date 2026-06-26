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

## Koi video encoding (done)

The Koi background loop was 4K (3840×2160) — pure waste, since it renders
`object-fit: cover` inside a viewport box. It's now 1080p in three formats, served
in order of efficiency, all muted and lazy-hydrated on scroll approach:

| File | Codec | Size | Served to |
|---|---|---|---|
| `koi-av1.mp4` | AV1 (`av01`) | ~2.1 MB | Chrome/Firefox/Edge, Safari 17+ |
| `koi.webm` | VP9 | ~2.4 MB | Safari 14–16 and any VP9 browser |
| `koi.mp4` | H.264 (`avc1`) | ~4.7 MB | last-resort fallback (legacy) |

Down from a single 9.25 MB 4K VP9 + a 5.6 MB Apple-only HEVC `mp4`. Modern
browsers now pull ~2 MB instead of 9.25 MB. Re-encode from the highest-quality
source available (1080p, muted, seamless loop preserved):

```bash
ffmpeg -i koi-src -an -c:v libsvtav1 -crf 34 -preset 6 -vf scale=1920:1080:flags=lanczos koi-av1.mp4
ffmpeg -i koi-src -an -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -vf scale=1920:1080:flags=lanczos koi.webm
ffmpeg -i koi-src -an -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart -vf scale=1920:1080:flags=lanczos koi.mp4
```

Target ~4–6 MB for the WebM. Verify the loop is seamless and quality holds for an
ambient background before shipping.
