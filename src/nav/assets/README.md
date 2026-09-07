# nav assets

| File | Status |
|---|---|
| `left.glb`, `right.glb`, `petal.glb`, `navbar.glb`, `logo.glb` | **source exports** (2026-09-07). Run `pnpm gltfjsx` after changes → `Nav3D/generated/*-transformed.glb` (draco, textures 64px). All meshes share one absolute space, viewed from behind, 1 unit ≈ 1 CSS px; `Nav3D/assets.ts` normalises origins. `navbar.glb` is only used for measurements (the pill is procedural). |
| `logo.svg` | placeholder approximation of the mark, used by the 2D nav; replace with the real flat SVG |
| `left.svg`, `right.svg` | procedural placeholders for the 2D fallback's clusters; replace with pre-rendered `left.webp` / `right.webp` (and `pill.png`) once available |
| `env.hdr` | not provided; the 3D studio is built from `Lightformer`s in `Nav3D/Canvas.tsx` |
