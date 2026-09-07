# dev scripts

Headless helpers (Playwright, local Chrome with GPU). Dev server must be running on :5173.

- `node scripts/dev/shot.mjs [out.png]` — screenshot the 3D preview (`/?3d`), report renderer, fps and console warnings.
- `node scripts/dev/sweep.mjs '{"name":{"glass":{...},"env":{...},"post":{...}}}'` — apply tuning presets via `window.__navTuning` and screenshot each.
