# Changelog

A decision log for the iridescent 3D nav, 2026-09-07 to 2026-09-09, plus the papers,
algorithms and theories the implementation leans on.

Entries record **what was decided and why**, not every edit; commit hashes are anchors, not a
complete list. Reversals are kept rather than rewritten, because most of them were forced by
something the code taught us. See [References](#references) for the external work cited.

---

## 1. Foundations

| Decision | Rationale |
| --- | --- |
| **Vite SPA with a prerender step**, not a framework with built-in SSR | The nav must exist without JavaScript; a single `vite build --ssr` pass that bakes the DOM nav into `index.html` gets that for a fraction of the framework's weight. User's call at kickoff. |
| **Proceed on placeholder geometry**, swap in the real Womp exports later | Unblocked layout, springs and the enhancement ladder before any asset existed. User's call. |
| **Cmd owns its own command palette** | Keeps ⌘K, the dialog and its focus trap in one component instead of spreading palette state through the nav. User's call. |
| **three pinned to `0.182`** via a pnpm override, with `gltfjsx` pinned to `0.159` | r183 deprecates `Clock`, which drei and fiber still use; gltfjsx's own three copy must not be hoisted over the app's. |
| **terser with `keep_classnames` / `keep_fnames`** | `@react-three/uikit` dispatches on `constructor.name`; default mangling silently drops the nav to 2D in production only. |
| **Self-host draco and the detect-gpu benchmarks** | A third-party CDN in the critical path would make the 3D layer fail in exactly the environments the fallback exists for. |

## 2. Progressive enhancement

- **The DOM `<nav>` is the source of truth** (`fe86107`, `1f58686`). The 3D layer is an
  absolutely positioned overlay that never affects layout, so there is no CLS when it arrives
  and no second implementation of navigation semantics.
- **Pointer events on 3D items forward to their DOM twin** by `data-id`, rather than
  navigating themselves. One code path for navigation, analytics and focus.
- **`@react-three/a11y` was dropped**: it crashes under React 19 StrictMode, and uikit refuses
  non-uikit children anyway. The DOM anchors stay in the tab order with their visuals hidden,
  and their focus is mirrored into the store to light the 3D item.
- **Four enhancement levels** — `2d`, `svg`, `3d-lite`, `3d` — chosen by `detect-gpu`, with
  `?nav=` to force one (`1f58686`). `3d-lite` drops postprocessing rather than dropping 3D.
- **`Fallback2D` error boundary** around the whole 3D layer: a failed chunk, asset or WebGL
  context leaves the DOM nav untouched.
- **Vector outlines are the loading state** (`b1e39aa`). The traced SVGs are a few KB and need
  no WebGL, so they stand in until the models render, then cross-fade.

## 3. Space, camera and assets

- **Perspective FOV 22, calibrated so 100 px = 1 world unit at z = 0.** An orthographic camera
  was tried first and rejected: a flat glass face under it reflects a single environment
  direction and renders as a uniform slab, with no Fresnel gradient.
- **Every Womp export shares one absolute space** (1 unit ≈ 1 px). Nav exports are viewed from
  behind and get a 180° Y flip; callout and announcement exports already face the camera and
  must not be flipped — the mirrored callout icon was the tell (`40e8748`).
- **Parts are flattened and re-origined at load.** Exports place flourishes hundreds of units
  in front of their surface; each part is flattened onto a thin stack just above the surface,
  keeping the exported front-to-back order, then re-origined at the end it decorates.
- **Two levels of detail per model.** Full meshes where one copy is seen close up; `--simplify`
  variants (roughly a tenth of the triangles) for the instanced swarms.
- **The export names do not describe their contents, so the geometry decides.** "announcement
  left flourishes" holds the surface, "surface" holds the left flourishes, and "announcement
  right flourishes v0.2" is the *navbar's* right cluster — it sits in the nav's absolute space
  and shares the identical flower component with `right.glb`. Every export lands in one absolute
  space, so a bounding box says what a file really is; check that before wiring a new one up.
- **Traced SVG fallbacks are generated, not drawn** (`ff31182`): `/dev/trace` renders each
  component flat and white, `scripts/trace-svgs.mjs` traces the alpha mask and writes an SVG
  plus a manifest of px size and origin, so 2D and 3D place the same shape identically.

## 4. Materials

- **"Rough Glass" transcribed from the Womp inspector** (`c37c961`), including a derivation
  where three has no equivalent: Womp's *translucency weight* became volume attenuation via
  **Beer–Lambert**, with `attenuationDistance = thickness / 0.2813` so the tint acts at 28.13%
  strength through the pill.
- **`silverGlass` became the default** (`73e7ca7`) — neutral body, iridescent rim — after the
  reference screenshot showed the tinted look was too green.
- **`Glass` has three render forms**: `buffered` (its own transmission buffer, the pill),
  `sampler` (three's scene-wide transmission pass, everything instanced), and `solid` (no
  transmission; the subsurface tint is blended into the base colour, since there is no volume
  for it to act in).
- **Two visibility sets**, driven from `scene.onBeforeRender`: `transmissionExcluded` keeps the
  text layer out of the pill's buffer, `transmissionOnly` shows the light emitters *only*
  inside it — matching how the DCC hides light bodies from camera.
- **Tint strength depends on mesh scale**, which is why a blossom shrunk to a quarter scale
  reads pale next to a petal at 2×: Beer–Lambert path length is `thickness × world scale`.
  Left as-is; documented rather than normalised.
- **Palette, then overrides, then user presets** — three layers added in that order as the need
  appeared: nine palette tints from the supplied hex list (`712eff9`), per-colour overrides
  shipped in `palette.saved.json` (`4db25d9`), and arbitrary user presets in
  `presets.saved.json` (`37b30fc`).
- **Every GLB part gets a material choice** (`e848132`, `0f99ea3`): clusters, loose petals,
  indicator, announcement flourishes, cube model, and each of the callout icon's three parts,
  plus preset *pools* the petal and flower swarms draw from.
- **Callout surfaces use the main glass by default** (`56bb937`), so the pill, banner and cards
  read as one family; the kind colour stays on the lens and label.

## 5. Lighting

- **The Womp light frame is converted, not eyeballed**: inches × 2.54 → px, and the Womp Euler
  (XYZ) premultiplied by the same Y-flip the meshes get (`e61862a`).
- **Emitters are visible only through the glass** (`b6cf360`) — the strips light the scene and
  refract, but are not drawn to camera, as in the DCC.
- **Refracted strips off by default** (`c6c098a`). The hard diagonal lines inside the glass
  read as artefacts; the same strips stay in the environment map, so the soft linear
  reflections along the bevels remain. Split into `emitters` (reflections) and
  `stripsInGlass` (refraction), plus a per-canvas `strips` switch (`de15521`).
- **The roaming light became the interaction light**, in five steps: follows the pointer and is
  clamped inside the canvas (`c23afac`), tunable depth (`24e6c1e`), settles on a hovered petal
  or flower (`faf6857`, `5608265`), lifts off that surface by `hoverOffset` so it glints
  instead of sinking in (`f637e16`), and holds the hovered depth afterwards instead of snapping
  back (`e7b801a`). A **Lissajous** path when the pointer is off the page.
- **The overhead spot is the glint light** (`4525198`): on at Womp z −315, aimed at the hovered
  nav item and falling back to the current page. An earlier attempt turned the *rect panel*
  instead (`832547b`) and was reverted — only direct light follows, since the environment
  cubemap is baked once and would have to re-render on every page change.
- **Rainbow mode advances with distance travelled**, not with time (`f45d0c1`), so a resting
  light holds its hue.

## 6. Post-processing

- **ACES filmic tone mapping is re-applied inside the composer.** `postprocessing@6` disables
  `gl.toneMapping` while a composer is active.
- **A `Sanitize` pass runs before bloom** (`40be389`, `f45d0c1`) doing two jobs: replacing
  non-finite pixels with black, and clamping HDR to ~6 (above which ACES renders white anyway).
  Both exist because bloom's mip chain turns a single bad or extreme pixel into a page-wide
  haze — see [§10](#10-diagnoses-that-changed-the-design).
- **Film grain is opt-in** (`379edf7`), with blend mode and premultiply, defaulting to off so
  the shipped look and cost are unchanged.

## 7. Tuning, theming and legibility

- **Tuning lives in a zustand store, edited by leva, shipped as JSON.** Dev edits persist to
  localStorage; "save to project" writes `tuning.saved.json`, which merges over code defaults
  in dev *and* production, so what you tuned is what ships.
- **Per-page persistence keys with a versioned migration** (`7451821`, `c1dd9c8`, `73e7ca7`).
  A shared key let the cube page's black backdrop blank the nav; the migration discards state
  that predates the split rather than trying to repair it.
- **The store remembers which preset the glass came from** (`f124663`) and the panel shows
  whether the values still match it — "I thought my clearCube edits were lost" was a real
  failure of the old UI, not of the data.
- **Light and dark are two complete tunings** (`1c2502c`), swapped by the page theme, saved
  together as `{ dark, light }`. The alternative — one tuning plus a light backdrop override —
  did not survive contact with a saved look that was black in both schemes.
- **Dark is the default theme** (`42d2836`); `system` remains a choice. The CSS fallback that
  followed the OS before hydration was removed so the first paint is never wrong.
- **Ink follows the glass backdrop's luminance, not the page theme** (`40be389`). Theme only
  decides in the mid range. This is what makes text legible when a dark-tuned glass sits on a
  light page.
- **Legibility is measured, not eyeballed** (`40be389`, `a72d9a2`): `pnpm apca` samples the
  actual rendered pixels behind each label with the text hidden and scores them with **APCA**;
  an in-canvas probe publishes the same numbers live into the panel. Target Lc ≥ 75 for body
  text, 60 as the floor.
- **A label scrim was added because of those numbers.** Medians were fine (77–84) but the worst
  10% of backdrop fell to Lc 22–28 where a petal or glow passed behind the text. A translucent
  slab between glass and labels lifted the worst case to 77–91.
- **The panel is ordered by use** (`6a0b73c`): preset, file, view, glass, then lights with roam
  and ray first. Per-folder collapse was tried and removed — see [§10](#10-diagnoses-that-changed-the-design).

## 8. Layout, responsiveness and deployment

- **Components size to their content** (`3f63be4`, `c908328`): callout and announcement fill
  their container up to a max width and grow with their text, with the 3D slab geometry
  rebuilt from the measured box each time. A fixed 652 px banner was what broke mobile.
- **Horizontal overflow is clipped at the body**, since clusters and flourishes deliberately
  overhang their boxes.
- **All routes ship in production builds** (`97a116c`). The dev-only gate meant `/dev/*` served
  the home page even with a correct rewrite.
- **A separate `app.html` shell + SPA rewrite** for non-prerendered routes, so `/` keeps its
  prerendered DOM nav while `/dev/*` client-renders.
- **`base: '/'`, not `'./'`** — relative asset URLs resolved against `/dev/cube/` and returned
  HTML for JavaScript.
- **`cleanUrls` removed from `vercel.json`** (`2c1d986`): Vercel silently drops a rewrite whose
  destination is an `.html` file when clean URLs are on. This was the actual cause of the live
  404s, found by probing the deployment rather than by reasoning about the config.

## 9. Interaction and motion

- **One glass chip is the nav's only highlight** (`d7d10c9`). It slides and resizes between
  items — the pointer's, else the focused one, else the current page — replacing the soft
  lights that used to sit behind each item. A glow reads as an effect applied to the nav; a
  second piece of glass reads as part of it, takes the same per-part material tuning as every
  other surface, and says what a set of independent lights could not: that these are positions
  in one row. The chip is rebuilt at the item's width rather than scaled, since scaling a
  rounded rectangle stretches its caps, and it grows out of the nav's face rather than fading,
  an opaque material having no opacity to animate. The current page keeps its permanent mark
  in the indicator petal below, which is what frees the chip to wander.
- **The announcement's dismiss mark shares the nav's travelling chip.** A glass chip parks under
  an X in the top right, follows the pointer across the banner, and shrinks away over a link so
  it never sits on the words you are reaching for. Two placement facts came out of measuring the
  scene rather than guessing. The chip straddles the top-right corner and hangs off it the way
  the flourishes do, which is the one place it clears both the blossom (which owns that corner
  from 16px below the top edge down) and the copy (which never reaches the last 64px), so the
  banner gives up no room for it. And it is centred on the slab's face writing no depth, the way
  the nav's chip sits behind its labels, because proud of the face it slid over the printed copy
  and sunk inside a 6px slab it disappeared altogether.
- **The dismiss cross is etched into the chip, not laid over it.** Baked to a normal map the way
  `/dev/glyph` etches text (`textRelief.ts`, generalised to take a paint callback so a stroked
  mark can use it), so the cross travels with the glass instead of staying where the DOM drew it,
  and refracts and catches highlights like the rest of the surface. It is baked on first render
  rather than after a font load: a map arriving later changes the shader's defines. The DOM copy
  keeps the hit area, the focus ring and the accessible name, and gives up only its paint. The
  chip has its own material choice (`materials.dismiss`), and on a strike it lets go from wherever
  it was standing — which needed the pointer tracker frozen at the click, since dismissing takes
  the banner's pointer events away and the chip would race home in the frames before it is told
  it is falling.
- **A DOM control can borrow the nav's glass.** The bento page's article launchers are plain
  buttons whose background is a slab in the shared scene, tracking their box; the painted
  gradient stands down once it draws, exactly as the DOM nav's does. A control that keeps its own
  face instead — the copy bar's green is the brand, not a surface — takes the same slab grown a
  few px past its box, so the glass reads as a tray around it rather than hiding behind it. Glass drawn through the
  shared transmission pass needs a `Backing` behind it — the buffered material clears its own
  buffer to the tuned ground colour, and without that the sampler sees the page and the glass
  comes up pale.
- **The pill springs on intent, not on measurements.** It animates when its width is *meant* to
  change — a link added or removed, or a resize that moves the nav to another mode, which is the
  only way a resize touches a content-driven width. Everything else that moves the measurement is
  the nav arriving, and it arrives at its final width. The previous rule, "every measurement after
  the first animates", could not tell those apart: uikit reports several sizes while it settles
  its layout and a webfont lands, so the pill grew in over 14 distinct widths. It is one now, with
  the spring intact for both real cases (22 steps on removing a link, 21 on collapsing).
- **Traced outlines draw themselves in, curve by curve** (`009bbd1`). Each closed loop of the
  trace becomes its own path with a stroke-dash sweep, staggered; rendered inline in
  `currentColor` so no image inversion is needed per theme.
- **Motion is tunable, and the pointer stirs it** (`0d0d0af`): speed, spin, sway, plus a
  pointer force that pushes nearby petals away — except the one the pointer is holding, which
  is captured so hovering does not chase it off.
- **Clicking the announcement shatters it** (`42734c6`) and the banner falls away. Refined
  three times: shards fade in place on wall-clock time rather than shrinking (`d2263ee`), the
  shard set is frozen at the size captured on the strike (it re-formed when the banner
  collapsed), and the backing that keeps the shards' tone falls as one tilting body behind them
  rather than sitting static (`9dac22a`, `f8364b8`).
- **Palette slabs shatter and re-form** (`f8364b8`), because there the break is a material test
  rather than a dismissal.
- **One shared scene on the bento page** (`541ad37`): the nav, banner and callout are drawn by a
  single fixed canvas whose parts track their DOM slots every frame, sharing petals, lights and
  the composer. Events come from the page element so DOM controls above the canvas stay live.
- **The callout's kind symbol is a 3D glyph, not a DOM overlay** (`7563285`). The live inline
  SVG is serialised and rasterised, so the artwork has one source and the symbol rides the
  parallax with the glass instead of floating over it. Three constraints shaped it: a
  standalone data-URL SVG has no cascade, so `currentColor` is substituted into the markup;
  the symbol sits on the lens's *outer* face rather than under the glass, because transmission
  slides whatever is behind a surface by the material's own thickness and that slide grows
  with how far off the camera's axis the lens sits; and a per-frame projection solve holds it
  on the ring's optical axis, since the face is nearer the camera than the ring's widest
  circle. Blended at a quarter opacity — a watermark in the glass rather than a printed label.
- **The announcement's flourishes are cut at the band's centre line** (`7563285`). They were
  drawn against a 94 px band, but a banner is as tall as its copy, so a whole flourish pinned
  to the middle stranded its upper pieces below the top edge and its lower ones above the
  bottom. Each half now rides the edge it was drawn against, in the 3D pieces and — by
  filtering the traced loops by their vertical centre — in the vector fallback too.
- **The callout's head block is centred on the lens.** The eyebrow, its gap and the title's
  first line straddle the lens's centre line, which means their line heights are fixed in
  `calloutMetrics` rather than left to whatever font loads.

## 10. Diagnoses that changed the design

Bugs whose *cause* is worth keeping, because each one constrains future work.

- **Punctual lights blacked out every canvas.** three's sheen BRDF divides by zero at grazing
  angles (`V_Neubelt` when `dotNL` and `dotNV` are both 0; `D_Charlie` on roughness underflow),
  and bloom smeared the resulting NaN across the frame. Rect area lights never hit that path,
  which is why it only appeared when a point light was added — and why the overhead spot had
  always blanked the scene. Fixed by clamping the shader chunks *and* the sanitize pass.
  Test with `?nav=3d-lite`: isolated black patches with no composer mean NaN, not lighting.
- **Instanced petals were only hit-testable inside a stale sphere.** three computes an
  `InstancedMesh` bounding sphere once, from wherever the instances were at first raycast, and
  skips the mesh when the ray misses it. Drifting swarms therefore stopped responding except
  for the one piece that had not moved. Fixed with fixed spheres covering each swarm's volume.
- **leva's collapsed folders captured the first Tab.** Ordering the panel was fine; collapsing
  folders moved the browser's tab start inside the panel and broke the nav's keyboard order.
  Caught by the e2e keyboard spec, bisected across four commits.
- **The panel's lights effect overwrote the store every render**, because leva returns fresh
  objects; any change made from outside the panel was reverted within a frame. Now keyed on a
  value signature.
- **`react-postprocessing` shares one module-level size vector** across composers, so a second
  canvas could resize the first. `SizeGuard` re-applies each root's own size, including the CSS
  box.
- **A "blobby light artifact" on the live site was bloom, not layout.** A specular glint on a
  hovered flower reached HDR values in the hundreds; at bloom radius 0.85 it survived every mip
  level. Could not be reproduced locally in Chrome or WebKit, so the fix was a guard (the HDR
  clamp) rather than a chase.
- **The shards re-formed mid-flight because their pieces depended on the printed texture.**
  `Shards` builds its pieces in a memo, and the printed raster was one of its inputs — but the
  banner re-bakes that raster whenever its measured box changes, and the box is collapsing to
  zero for most of the fall. Each re-bake rebuilt every piece, resetting it to its place on the
  slab with its launch velocity, so the glass flew apart four times over. Measured: piece spread
  1.29 → 3.51 world units, then straight back to 1.29 at the moment the texture's uuid changed.
  The memo now depends on *whether* there is printed text, since only the UVs are baked from it;
  the map itself is a material input and can change freely. The banner also stops re-baking once
  struck, the copy being frozen with the pieces that carry it.
- **Transmission renders only opaque objects, and displaces what is behind the surface.** Two
  separate limits, both found while putting a symbol inside the callout's lens. A blended mesh
  never reaches the transmission buffer at all, so it cannot appear inside glass; and what does
  reach it is sampled along a refracted ray offset by the material's `thickness`, which is a
  fixed slide no depth adjustment can undo. Anything that must read as *inside* glass and stay
  where it was put has to be printed on the surface, not placed under it.
- **Playwright's stability check never settles under load.** With a system load average near
  100, clicks on a completely static element time out with "waiting for element to be visible,
  enabled and stable": the check compares bounding boxes across animation frames, and the
  WebGL scenes starve `requestAnimationFrame`. Reproduced identically against an older commit
  in a second worktree before blaming any change.
- **Port 5173 can belong to another project.** A verification run once rendered a different app
  entirely. Check `document.title` before trusting a headless run; the preview now uses
  `autoPort`.

---

## References

### Papers and standards

| Work | Where it is used |
| --- | --- |
| **APCA** — Accessible Perceptual Contrast Algorithm (Somers, `apca-w3`), the contrast method drafted for WCAG 3 | `scripts/dev/apca.mjs`, `src/nav/Nav3D/LcProbe.tsx`. Lc thresholds: ≥ 75 body text, 60 floor. |
| **Estevez & Kulla 2017**, *Production Friendly Microfacet Sheen BRDF* | The `D_Charlie` distribution term in three's sheen; patched for underflow in `materials.ts`. |
| **Neubelt & Pettineo 2013**, *Crafting a Next-Gen Material Pipeline for The Order: 1886* | The `V_Neubelt` visibility term in the same BRDF; the grazing-angle divide-by-zero fixed there. |
| **Beer–Lambert law** | Volume attenuation standing in for subsurface scattering; sets `attenuationDistance` from Womp's translucency weight (`tuning.ts`). |
| **ACES filmic tone mapping** (Academy Color Encoding System; Narkowicz's curve fit for the analytic approximation) | The composer's `ToneMapping` pass, and re-implemented in `LcProbe.tsx` to predict displayed pixels from the linear framebuffer. |
| **MSDF text** — multi-channel signed distance fields (Chlumský) | How `@react-three/uikit` renders the nav labels; contrasted with baked relief on `/dev/glyph`. |
| **Fresnel reflectance / IOR** | Why the camera is perspective rather than orthographic, and why a too-low IOR made the pill read flat. |

### Algorithms

| Algorithm | Where it is used |
| --- | --- |
| **Voronoi diagram by half-plane intersection** | `shatter.ts` — each cell is the rectangle clipped against the perpendicular bisector to every other seed. O(n²) and fine for a few dozen shards. |
| **Sutherland–Hodgman polygon clipping** | `shatter.ts` — the clip primitive underneath that. |
| **Ramer–Douglas–Peucker** simplification | `scripts/trace-svgs.mjs` — reduces traced pixel loops to SVG paths, with closed loops split before simplifying. |
| **Crack-edge contour tracing** | `scripts/trace-svgs.mjs` — directed edges between filled and empty pixels of an alpha mask, chained into loops. Chosen over marching squares because it yields exact pixel-boundary loops with no ambiguous saddle cases. |
| **Sobel operator** | `textRelief.ts` — gradients of a glyph height field, converted to a tangent-space normal map so text etches into glass. |
| **Union–find (disjoint set)** | `components.ts` — recovers individual parts from a GLB that gltfjsx joined into one mesh, welding coincident vertices first. |
| **Largest remainder apportionment** (Hare quota) | `Inside.tsx` — distributes swarm bodies across boxes by volume so small boxes are not each given one. |
| **Value noise with octave summation** (fBm-style) | `surfaceNormals.ts` — tileable height field for the sheen and roughness noise maps and the glass's waviness. |
| **Lissajous curve** | `Lights.tsx` — the roaming light's idle path when the pointer is off the page. |
| **Exponential (frame-rate independent) smoothing**, `1 − e^(−k·dt)`, and maath's critically damped `damp` | Every follow behaviour: light targets, indicator, parallax, scheme swaps. Chosen over a fixed lerp factor so behaviour does not change with frame rate. |
| **Stroke-dash offset reveal** | `DrawnOutline.tsx` — `pathLength=1` with an animated `stroke-dashoffset` per loop draws each curve in sequence. |

### Upstream behaviour worth remembering

- **three r183 deprecates `Clock`** — the reason for the version pin.
- **`postprocessing@6` disables `gl.toneMapping`** while a composer is active.
- **`@react-three/postprocessing@3.1` shares a module-level size vector** between composers.
- **`@react-three/uikit` reads `constructor.name`** and refuses non-uikit children.
- **`InstancedMesh.boundingSphere` is computed once** and gates raycasting.
- **Vercel drops `.html` rewrite destinations when `cleanUrls` is on.**
- **leva collapsed folders alter document tab order.**

---

*Written 2026-09-09, covering `8ca4979` through `f8364b8`.*
