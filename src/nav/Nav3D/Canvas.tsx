import { Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas as R3FCanvas, useFrame, useThree } from '@react-three/fiber'
import { Vector2 } from 'three'
import { Environment, Lightformer, OrbitControls, Preload } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, ToneMapping } from '@react-three/postprocessing'
import { Effect, ToneMappingMode } from 'postprocessing'
import type { PerspectiveCamera } from 'three'
import { tokens } from '../tokens'
import { useLightsKey, useTuning } from './tuning'
import { useResolvedTheme } from '../../theme'
import { Lights, RectLightformers } from './Lights'
import { Recenter } from './recenter'

export interface NavCanvasProps {
  children?: ReactNode
  /** Skip the EffectComposer entirely (low-tier GPUs). */
  postprocessing?: boolean
  className?: string
  /** Dev stage: orbit/zoom/pan controls own the camera after the initial framing. */
  orbit?: boolean
  /** Initial camera position for orbit mode (world units). */
  framePosition?: [number, number, number]
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
export function NavCanvas({ children, postprocessing = true, className, orbit = false, framePosition }: NavCanvasProps) {
  return (
    <R3FCanvas
      className={className}
      camera={{ fov: FOV, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
    >
      <CameraRig orbit={orbit} framePosition={framePosition} />
      <SizeGuard />
      {orbit && (
        <>
          <OrbitControls makeDefault enableDamping />
          <Recenter framePosition={framePosition ?? [0, 1.5, 8]} />
        </>
      )}
      <Suspense fallback={null}>
        <Studio />
        <Fog />
        <Lights />
        {children}
        {postprocessing && <Post />}
        <Preload all />
      </Suspense>
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
function CameraRig({ orbit, framePosition }: { orbit: boolean; framePosition?: [number, number, number] }) {
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
  const fog = useTuning((s) => s.env.fog)
  const background = useBackdrop()
  if (fog <= 0) return null
  return <fogExp2 attach="fog" args={[background, fog]} />
}

/** The environment backdrop for the page's colour scheme. */
function useBackdrop() {
  const { background, backgroundLight } = useTuning((s) => s.env)
  return useResolvedTheme() === 'light' ? backgroundLight : background
}

function Studio() {
  const { intensity, rotation } = useTuning((s) => s.env)
  const background = useBackdrop()
  const lightsKey = useLightsKey() + background
  return (
    // Keyed on the lights so the one-shot cubemap re-renders whenever a strip is tweaked.
    <Environment key={lightsKey} resolution={256} frames={1} environmentIntensity={intensity} environmentRotation={[0, rotation, 0]}>
      <color attach="background" args={[background]} />
      <RectLightformers />
      {/*
       * The pill's front face reflects the direction straight behind the camera (+z), so that is
       * where the colour has to be. A cluster of overlapping pastel panels behind the camera gives
       * the soft gradient seen in the reference; side/top panels light the bevels and clusters.
       */}
      <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 0, 9]} scale={[14, 9, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.4} color="#ffd6ea" position={[-4, 2.5, 8]} scale={[5, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.4} color="#cde4ff" position={[4.5, -1.5, 8]} scale={[5, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.2} color="#d3fff1" position={[-1.5, -3, 8]} scale={[5, 3, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.2} color="#fff0c8" position={[2.5, 3, 8]} scale={[4, 3, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.5} color="#e6d9ff" position={[6, 1, 6]} scale={[3, 6, 1]} target={[0, 0, 0]} />
      {/* key from top-left for bevel highlights */}
      <Lightformer form="rect" intensity={3} color="#ffffff" position={[-5, 6, 4]} scale={[6, 2, 1]} target={[0, 0, 0]} />
      {/* rim from behind so the back bevel catches a highlight */}
      <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 0, -6]} scale={4} target={[0, 0, 0]} />
    </Environment>
  )
}

/**
 * Replaces NaN/Inf pixels with black before bloom. A single non-finite pixel (a shader edge
 * case in a lit material) would otherwise spread through bloom's mip chain and black out
 * the whole frame. Its own pass (mergeMode "none") so bloom reads the cleaned buffer.
 */
class SanitizeEffect extends Effect {
  constructor() {
    super(
      'Sanitize',
      /* glsl */ `
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec4 c = inputColor;
        if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, c.a);
        outputColor = c;
      }`,
    )
  }
}

function Sanitize() {
  const effect = useMemo(() => new SanitizeEffect(), [])
  return <primitive object={effect} />
}

function Post() {
  const { bloomIntensity, bloomThreshold, bloomSmoothing, bloomRadius, aberration } = useTuning((s) => s.post)
  return (
    <EffectComposer multisampling={0} mergeMode="none">
      <Sanitize />
      <Bloom intensity={bloomIntensity} luminanceThreshold={bloomThreshold} luminanceSmoothing={bloomSmoothing} radius={bloomRadius} mipmapBlur />
      <ChromaticAberration offset={[aberration, aberration]} radialModulation={false} modulationOffset={0} />
      {/* postprocessing@6 turns off gl.toneMapping while a composer is active; re-add it here. */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
