import { Suspense, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas as R3FCanvas, useFrame, useThree } from '@react-three/fiber'
import { Uniform, Vector2 } from 'three'
import { Environment, Lightformer, OrbitControls, Preload } from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  ToneMapping,
} from '@react-three/postprocessing'
import { BlendFunction, Effect, ToneMappingMode } from 'postprocessing'
import type { PerspectiveCamera } from 'three'
import { tokens } from '../tokens'
import { useLightsKey, useTuning } from './tuning'
import { useResolvedTheme } from '../../theme'
import { Lights, RectLightformers } from './Lights'
import { StripsContext } from './strips'
import { studios } from './studios'
import { Recenter } from './recenter'
import { CameraLayers } from './layers'
import { ContrastProbe, ContrastScopeContext, createContrastScope, type ContrastScope } from './contrast'

export interface NavCanvasProps {
  children?: ReactNode
  /** Skip the EffectComposer entirely (low-tier GPUs). */
  postprocessing?: boolean
  className?: string
  /** Dev stage: orbit/zoom/pan controls own the camera after the initial framing. */
  orbit?: boolean
  /** Initial camera position for orbit mode (world units). */
  framePosition?: [number, number, number]
  /**
   * Draw the rect lights' emissive strips (seen refracted through the glass and reflected in
   * the environment). Off for surfaces where the diagonal lines read as artefacts.
   */
  strips?: boolean
  /**
   * Take pointer events from this element instead of the canvas (R3F `eventSource`), for a
   * full-page canvas that must not cover the DOM controls above it.
   */
  eventSource?: React.RefObject<HTMLElement | null>
  style?: React.CSSProperties
  /** Device pixel ratio range (default [1, 2]); a full-page canvas may cap it lower. */
  dpr?: [number, number]
  /** Show the environment cubemap itself as the scene background (the /dev/env page). */
  environmentBackground?: boolean
  /**
   * Where text on this canvas's glass registers to be measured (contrast.ts). Pass one when DOM
   * outside the canvas sits on its glass too; otherwise the canvas keeps its own.
   */
  contrast?: ContrastScope
}

/**
 * Camera field of view. Narrow, so the nav reads as flat, but not orthographic: a flat glass
 * face under an orthographic camera reflects one environment direction and renders as a
 * uniform slab. A little perspective gives the reflection/iridescence gradients seen in
 * docs/reference.png. (CLAUDE.md prefers ortho; this is the deliberate exception.)
 */
const FOV = 22

/**
 * Canvas where 1 world unit = `tokens.pxPerUnit` CSS px on the z=0 plane, so layout maths
 * done in px (uikit, tokens) map 1:1 onto the DOM nav underneath.
 * Transparent: the page background shows through, exactly like the DOM version.
 */
export function NavCanvas({
  children,
  postprocessing = true,
  className,
  orbit = false,
  framePosition,
  strips = true,
  eventSource,
  style,
  dpr = [1, 2],
  environmentBackground = false,
  contrast,
}: NavCanvasProps) {
  const [ownScope] = useState(createContrastScope)
  const scope = contrast ?? ownScope
  return (
    <R3FCanvas
      className={className}
      camera={{ fov: FOV, near: 0.1, far: 100 }}
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent', ...style }}
      eventSource={eventSource?.current ?? undefined}
      eventPrefix={eventSource ? 'client' : undefined}
      resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
    >
      <StripsContext.Provider value={strips}>
      <ContrastScopeContext.Provider value={scope}>
        <SchemeSync />
        {/* The viewer's mask, and a raycaster that reaches the labels (layers.ts). */}
        <CameraLayers />
      <CameraRig orbit={orbit} framePosition={framePosition} />
        <SizeGuard />
        {orbit && (
          <>
            <OrbitControls makeDefault enableDamping />
            <Recenter framePosition={framePosition ?? [0, 1.5, 8]} />
          </>
        )}
        <Suspense fallback={null}>
          <Studio background={environmentBackground} />
          <Fog />
          <Lights />
          {children}
          {postprocessing && <Post />}
          <Preload all />
        </Suspense>
        {/* Measures the glass behind every piece of text registered with this canvas. */}
        <ContrastProbe scope={scope} postprocessing={postprocessing} />
      </ContrastScopeContext.Provider>
      </StripsContext.Provider>
    </R3FCanvas>
  )
}

const measured = new Vector2()

/**
 * @react-three/postprocessing@3.1 shares one module-level size vector between every
 * EffectComposer, so with two canvases of different sizes on a page the second renderer can
 * be resized to the first one's dimensions. This re-applies the root's own size whenever the
 * renderer disagrees; runs before the composer's frame so it corrects itself the same frame.
 */
function SizeGuard() {
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  useFrame(() => {
    gl.getSize(measured)
    if (Math.abs(measured.x - size.width) > 0.5 || Math.abs(measured.y - size.height) > 0.5) {
      // updateStyle too: the foreign composer also rewrote the canvas's CSS box.
      gl.setSize(size.width, size.height, true)
    }
  }, -100)
  return null
}

/**
 * Keeps the camera at the distance where the visible height at z=0 equals size.height / pxPerUnit.
 * With `lights.debug` on, pulls back and up so the light helpers (which sit well outside the
 * nav's own viewport) are in frame.
 */
function CameraRig({
  orbit,
  framePosition,
}: {
  orbit: boolean
  framePosition?: [number, number, number]
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const height = useThree((s) => s.size.height)
  const debug = useTuning((s) => s.lights.debug)
  const framed = useRef(false)
  useLayoutEffect(() => {
    // With orbit controls the user owns the camera; only frame it once.
    if (orbit && framed.current) return
    const visible = height / tokens.pxPerUnit
    const dist = visible / 2 / Math.tan((camera.fov * Math.PI) / 360)
    if (debug && !orbit) {
      camera.position.set(0, dist * 2.2, dist * 5.5)
    } else if (orbit) {
      // Stage: the nav is ~1.3 units tall in a tall canvas; frame it at a comfortable distance.
      camera.position.set(...(framePosition ?? [0, 1.5, 8]))
    } else {
      camera.position.set(0, 0, dist)
    }
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    framed.current = true
  }, [camera, height, debug, orbit, framePosition])
  return null
}

/**
 * Soft studio built from Lightformers (no HDR needed). Rendered once into a cubemap
 * (`frames={1}`) and used as the scene environment only, never as background.
 * Pastel panels at different angles are what the iridescent glass picks up as gradients.
 */
/** Exponential depth fog in the backdrop colour, so far petals sink into the background. */
function Fog() {
  const { fog, background } = useTuning((s) => s.env)
  if (fog <= 0) return null
  return <fogExp2 attach="fog" args={[background, fog]} />
}

/** Loads the tuning scheme that matches the page's colour scheme (light / dark). */
function SchemeSync() {
  const resolved = useResolvedTheme()
  const setScheme = useTuning((s) => s.setScheme)
  useLayoutEffect(() => setScheme(resolved), [resolved, setScheme])
  return null
}

function Studio({ background: showBackground = false }: { background?: boolean }) {
  const { intensity, rotation, background, studio, panels } = useTuning((s) => s.env)
  const lightsKey = useLightsKey() + background + studio + panels
  return (
    // Keyed on the lights so the one-shot cubemap re-renders whenever a strip or panel changes.
    <Environment
      key={lightsKey}
      // 256 is plenty for reflections; shown as the sky (/dev/env) it needs more.
      resolution={showBackground ? 1024 : 256}
      frames={1}
      environmentIntensity={intensity}
      environmentRotation={[0, rotation, 0]}
      background={showBackground}
    >
      <color attach="background" args={[background]} />
      <RectLightformers />
      {/* The studio panels (studios.ts): what the glass reflects. */}
      {studios[studio].map((p, i) => (
        <Lightformer
          key={i}
          form={p.form}
          intensity={p.intensity * panels}
          color={p.color}
          position={p.position}
          scale={p.scale}
          target={[0, 0, 0]}
        />
      ))}
    </Environment>
  )
}

/**
 * Replaces NaN/Inf pixels with black before bloom. A single non-finite pixel (a shader edge
 * case in a lit material) would otherwise spread through bloom's mip chain and black out
 * the whole frame. Its own pass (mergeMode "none") so bloom reads the cleaned buffer.
 */
class SanitizeEffect extends Effect {
  constructor(clamp: number) {
    super(
      'Sanitize',
      /* glsl */ `
      uniform float maxValue;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec4 c = inputColor;
        if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, c.a);
        // Cap extreme HDR values so bloom cannot smear a single glint across the page.
        c.rgb = min(c.rgb, vec3(maxValue));
        outputColor = c;
      }`,
      { uniforms: new Map([['maxValue', new Uniform(clamp)]]) },
    )
  }
}

function Sanitize({ clamp }: { clamp: number }) {
  // Rebuilt on change (rare: a panel edit); the composer picks the new pass up.
  const effect = useMemo(() => new SanitizeEffect(clamp), [clamp])
  return <primitive object={effect} />
}

const NOISE_BLEND = {
  screen: BlendFunction.SCREEN,
  overlay: BlendFunction.OVERLAY,
  softLight: BlendFunction.SOFT_LIGHT,
  add: BlendFunction.ADD,
  multiply: BlendFunction.MULTIPLY,
  normal: BlendFunction.NORMAL,
} as const

function Post() {
  const {
    bloomIntensity,
    bloomThreshold,
    bloomSmoothing,
    bloomRadius,
    bloomClamp,
    aberration,
    noise,
    noiseBlend,
    noisePremultiply,
  } = useTuning(
    (s) => s.post,
  )
  return (
    <EffectComposer multisampling={0} mergeMode="none">
      <Sanitize clamp={bloomClamp} />
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomSmoothing}
        radius={bloomRadius}
        mipmapBlur
      />
      <ChromaticAberration
        offset={[aberration, aberration]}
        radialModulation={false}
        modulationOffset={0}
      />
      {/* postprocessing@6 turns off gl.toneMapping while a composer is active; re-add it here. */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/* Film grain after tone mapping, so it sits on the displayed image, not the HDR frame. */}
      {noise > 0 && <Noise opacity={noise} premultiply={noisePremultiply} blendFunction={NOISE_BLEND[noiseBlend]} />}
    </EffectComposer>
  )
}
