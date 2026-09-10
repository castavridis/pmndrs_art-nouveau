---
name: make-video
description: Make a punchy promo / demo video of this repo's UI — film the real app frame-exactly (Playwright on a virtual clock) and cut it in Remotion with camera moves, kinetic words, sound and music. Use when asked for a video, reel, clip, trailer, teaser, GIF or social post of the components, or to add a shot or re-cut an existing video.
---

# Making a video of the UI

Everything lives in `video/` (its own package; read `video/README.md` for the full API). The pipeline:

```
shots/*.ts ──pnpm capture──▶ public/clips/<shot>.{mp4,json,sheet.jpg}
remotion/cuts/*.ts ──pnpm hero / pnpm render──▶ out/*.mp4
```

Run everything from `video/`. If `node_modules` is missing, `pnpm install` first.

## Workflow

1. **Plan the reel before filming.** Pick a tempo (120 BPM = 30 frames a beat at 60 fps), then list the cuts:
   one effect per cut, 6–9 beats each (the establishing beat included), a climax two thirds in, a payoff at
   the end. A square hero runs about 64 beats (32 s).
2. **Find the moments.** Look at the page first (routes: `/` is the bento — nav, banner, copy bar,
   callout, theme launcher; `/dev/cube` is the logo cube with its swarms; `/dev/home`, `/dev/callout`,
   `/dev/announcement` are the component pages). Selectors that are stable: `shots/_common.ts` (the 3D
   nav's items are targeted through their DOM twins, `[data-id="docs"]`, which share their boxes).
3. **Write or reuse shots** in `video/shots/`. One interaction per shot: start `...SQUARE`, give the pointer
   the `APPROACH` travel before the action (the establishing beat), and 1–2 s of tail so the edit has handles. `mark()` every moment the edit will want to cut on or frame (pass a
   selector to record the element's box for `focus: 'mark:<name>'`). Put slow motion (`d.speed(0.25)`) in
   the capture, not the edit — captured slow-mo is made of real frames.
4. **Capture:** `pnpm capture <shot…>` (builds the app and serves it; `--url` to use a running server).
   Then **Read `public/clips/<shot>.sheet.jpg`** — a 4×3 grid of the take. Check the effect happened and
   read the timings you need from `public/clips/<shot>.json` (`marks`, and presses are frames where
   `cursor[i][2]` goes 0→1).
5. **Cut:** write the reel in `video/remotion/cuts/<reel>.ts` and register it in `remotion/Root.tsx`
   at the same shape as the shots' viewport (square: 1080×1080 with `...SQUARE` shots). Convert clip
   timings to the cut: `from` is seconds into the clip; camera `t`, `shake` and `hit` are seconds into the cut.
6. **Check stills before rendering the whole thing:** `pnpm still <Comp> out/f.png --frame=<n>` and Read the
   PNG. Check framing: wide frames show the whole component, close-ups keep the subject whole and centred,
   nothing important is cropped. A still takes ~20 s, a full 20 s render ~4 min.
7. **Render** (`pnpm render <Comp> out/<reel>.mp4 --codec=h264 --crf=16`), then make a contact sheet of the
   render and Read it:
   `ffmpeg -i out/x.mp4 -vf "select='not(mod(n\,55))',scale=480:-2,tile=4x6" -frames:v 1 out/x.sheet.jpg`.
   Check loudness with `-af volumedetect`: peaks should stay under 0 dB.
8. Send the user the video (SendUserFile) and say what each cut shows.

## The house style (from the user's notes on the first cut, made for the sister repo ink-splat)

- **Square 1:1, 1080×1080**, filmed in a square page (`...SQUARE` from `shots/_common.ts`: 960×960 at
  2.25×, so the footage is exactly twice the output and close-ups stay sharp).
- **Establish, then push in.** Show each component whole (zoom 1, the full page) for ~0.8 s while the
  pointer travels toward it, then push in over ~0.6 s so the camera is close when the action lands. Shots
  give the pointer a 1.1 s approach (`APPROACH`) for this; the cut's `establish()` helper does the camera.
- **No on-screen text** — no words, no closing card — unless the user asks for it again. The `word` and
  `card` fields still work.

## What makes it punchy

- **Cut on the beat, never mid-gesture.** Start a cut on the establishing frame, ~1.5 s before the action.
  End it as the effect peaks or settles, not after.
- **Get close — after the establishing beat.** Zoom 1.6–2.6 on the element for the interaction, then pull
  out to 1.0 for the big moments (a theme switch, the cube's burst) so their scale reads.
- **Move the camera in every cut:** a slow push (zoom +0.2–0.4 over the cut) or a pan along the gesture.
  A static frame reads as a screen recording.
- **Hit the impacts:** `shake` on the frame the effect lands (`hit` for a second impact in the same cut).
  Presses get a zoom punch and click sound automatically.
- If words come back: one per cut, imperative, with a full stop (`Glide.` `Shatter.` `Switch.`), landing
  with the impact (`wordAt`), each in its own pmndrs palette colour; don't repeat neighbours.
- **Build to a climax.** Save the biggest effect (a theme switch, the cube's burst) for about two thirds
  in, slow it down, and drop the drums under it (`audio/beat.py --drop a:b` in beats). Finish on the mark.
- Keep copy minimal. No explanations on screen — the effects are the point.

## Gotchas

- The page runs on virtual time: nothing moves unless the director records or skips frames. `wait()` is the only
  way to let an effect play out. Real-time waits (`setTimeout` in the shot script) do nothing for the page.
- Wait for `READY_3D` (`[data-3d]`): until the 3D layer is up the page shows the vector outlines, and
  a take that rolls early films the fallback. A glass-heavy tuning (a 4096 transmission buffer) takes a
  while to come up; give it `warmup: 2` or more.
- A theme switch (`d.key('t')`, the shell's toggle, the bento's launcher) is a 900 ms view transition:
  the old page fades off the new one. Wait ~1.5 s after it before the next action.
- Dark is the default on every page but `/dev/cube`, which opens light. For the other scheme, press `t`
  in `setup` and wait ~1.5 s.
- The film is of the shipped look: `src/nav/Nav3D/tuning.saved.json`, not a panel session's unsaved edits.
  Save to project first if a take should show them.
- Reduced motion drops the nav to 2D, so never emulate it for a take.
- On `/dev/cube` a drag orbits the camera and a press that stays put throws the petals and flowers
  (`d.click()` at one spot); `r` re-centres.
- Link clicks are blocked during a take (`allowNavigation: true` to allow). The Leva panel is hidden; press its
  buttons with `d.invoke('<label>')`.
- The shell's fixed theme toggle shows on the `/dev/*` pages; hide it with `css: HIDE_TOGGLE`.
- `--dev` captures pick up other people's hot reloads mid-take (page errors like "changed size between
  renders"); use the default production build for anything you'll keep.
- Captures are ~70–300 ms a frame depending on load (more for a heavy glass tuning); a 5 s shot takes
  30–90 s. Run long captures in the background.
- `public/clips`, `public/music`, `public/sfx` and `out/` are git-ignored; everything is regenerated from code.
