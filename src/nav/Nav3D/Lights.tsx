import { useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js'
import { Lightformer, useHelper } from '@react-three/drei'
import { px } from '../tokens'
import { useTuning, type RectLightTuning, type Vec3 } from './tuning'
import { transmissionOnly } from './materials'
import { StripsContext } from './strips'

// three@0.182: RectAreaLight needs its BRDF LUTs registered once before any material compiles.
RectAreaLightUniformsLib.init()

const DEG = Math.PI / 180
/** Womp inches → CSS px (see tuning.ts). */
const IN = 2.54
/** The exported scene is viewed from behind; assets.ts rotates meshes 180° about Y. Same here. */
const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)

const wompPosition = (v: Vec3) =>
  new THREE.Vector3(px(v.x * IN), px(v.y * IN), px(v.z * IN)).applyQuaternion(FLIP)
const wompRotation = (r: Vec3) =>
  new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(r.x * DEG, r.y * DEG, r.z * DEG, 'XYZ'))
    .premultiply(FLIP)
/** Strips thinner than this are invisible at nav scale; clamp for the emitter and the light. */
const MIN_HEIGHT_IN = 0.5

/**
 * Direct lighting: the Womp rect lights (see tuning.ts for the frame conversion) plus an
 * optional overhead spot. Each rect light is also drawn as an emissive strip so the glass
 * refracts it; `RectLightformers` puts the same strips into the environment map for reflections.
 * `lights.debug` draws helpers.
 */
export function Lights() {
  const { debug, rects } = useTuning((s) => s.lights)
  return (
    <>
      <Overhead debug={debug} />
      <Roam debug={debug} />
      {rects.map((r, i) => (
        <Rect key={r.name ?? i} light={r} debug={debug} />
      ))}
    </>
  )
}

/** Render inside <Environment> so the strips are reflected by the glass. */
export function RectLightformers() {
  const { rects, emitters, emitterScale } = useTuning((s) => s.lights)
  const strips = useContext(StripsContext)
  if (!emitters || !strips) return null
  return (
    <>
      {rects.map((r, i) => (
        <Lightformer
          key={r.name ?? i}
          form="rect"
          color={r.color}
          intensity={r.luminance * emitterScale}
          position={wompPosition(r.position)}
          quaternion={wompRotation(r.rotation)}
          scale={[px(r.width * IN), px(Math.max(r.height, MIN_HEIGHT_IN) * IN), 1]}
        />
      ))}
    </>
  )
}

function Overhead({ debug }: { debug: boolean }) {
  const o = useTuning((s) => s.lights.overhead)
  const ref = useRef<THREE.SpotLight>(null!)
  const target = useMemo(() => new THREE.Object3D(), [])
  const pos = wompPosition(o.position)
  useLayoutEffect(() => {
    target.position.copy(wompPosition(o.target))
    target.updateMatrixWorld()
  }, [o.target, target])
  useHelper(debug && o.intensity > 0 && ref, THREE.SpotLightHelper, o.color)
  if (o.intensity <= 0) return null
  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={ref}
        color={o.color}
        intensity={o.intensity}
        position={pos}
        angle={o.angle * DEG}
        penumbra={o.penumbra}
        decay={2}
        target={target}
      />
    </>
  )
}

/** Last pointer position over the page (client px), shared by every canvas; null when it left. */
let pointer: { x: number; y: number } | null = null
let pointerListeners = 0
function usePagePointer() {
  useEffect(() => {
    if (pointerListeners++ === 0) {
      const move = (e: PointerEvent) => (pointer = { x: e.clientX, y: e.clientY })
      const leave = () => (pointer = null)
      window.addEventListener('pointermove', move, { passive: true })
      document.documentElement.addEventListener('pointerleave', leave)
      window.addEventListener('blur', leave)
      ;(window as Window & { __navPointerOff?: () => void }).__navPointerOff = () => {
        window.removeEventListener('pointermove', move)
        document.documentElement.removeEventListener('pointerleave', leave)
        window.removeEventListener('blur', leave)
      }
    }
    return () => {
      if (--pointerListeners === 0) (window as Window & { __navPointerOff?: () => void }).__navPointerOff?.()
    }
  }, [])
}

const target = new THREE.Vector3()

/**
 * A small light in front of the scene. With `follow` it sits under the pointer whenever the
 * mouse is over the page (each canvas maps the same page position into its own world), and
 * otherwise wanders a slow Lissajous path; either way it is kept inside the canvas. Its body
 * (a glowing sphere seen through the glass) is optional; by default only the light shows.
 */
function Roam({ debug }: { debug: boolean }) {
  const r = useTuning((s) => s.lights.roam)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const group = useRef<THREE.Group>(null!)
  usePagePointer()
  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const hw = px(size.width) / 2
    const hh = px(size.height) / 2
    // Keep the light (and its light pool) inside the canvas: a margin of a few px.
    const margin = px(Math.max(r.size, 8))
    if (r.follow && pointer) {
      const rect = gl.domElement.getBoundingClientRect()
      target.set(px(pointer.x - rect.left) - hw, hh - px(pointer.y - rect.top), 1.0)
    } else {
      const t = state.clock.elapsedTime * r.speed * Math.PI * 2
      target.set(Math.sin(t) * hw * 0.8, Math.sin(t * 0.63 + 1.3) * hh * 0.8, 1.2 + Math.sin(t * 0.41) * 0.4)
    }
    target.x = THREE.MathUtils.clamp(target.x, -hw + margin, hw - margin)
    target.y = THREE.MathUtils.clamp(target.y, -hh + margin, hh - margin)
    g.position.lerp(target, 1 - Math.exp(-dt * 14))
  })
  if (r.intensity <= 0) return null
  return (
    <group ref={group}>
      <pointLight color={r.color} intensity={r.intensity} decay={2} />
      {r.body && (
        <Emitter debug={debug}>
          <sphereGeometry args={[px(r.size), 16, 12]} />
          <meshBasicMaterial color={new THREE.Color(r.color).multiplyScalar(6)} toneMapped={false} />
        </Emitter>
      )}
    </group>
  )
}

/** 45° in the plane: the strips lie along (1,1), so this is their perpendicular travel. */
const SWEEP_DIR = new THREE.Vector3(1, 1, 0).normalize()

function Rect({ light, debug }: { light: RectLightTuning; debug: boolean }) {
  const { luminanceScale, emitterScale, sweep, sweepRange } = useTuning((s) => s.lights)
  const strips = useContext(StripsContext)
  // The refracted strip is opt-in (tuning); the environment reflection follows `emitters`.
  const emitters = useTuning((s) => s.lights.emitters && s.lights.stripsInGlass) && strips
  const ref = useRef<THREE.RectAreaLight>(null!)
  useHelper(debug && ref, RectAreaLightHelper, light.color)
  const position = useMemo(() => wompPosition(light.position), [light.position])
  const quaternion = useMemo(() => wompRotation(light.rotation), [light.rotation])
  const group = useRef<THREE.Group>(null!)
  // Sweep: slide the strip (and its emitter) along the diagonal, bottom-left → top-right and back.
  useFrame((state) => {
    const g = group.current
    if (!g) return
    const amp = px(sweepRange * IN)
    const s = sweep > 0 ? Math.sin(state.clock.elapsedTime * sweep * Math.PI * 2) * amp : 0
    g.position.copy(position).addScaledVector(SWEEP_DIR, s)
  })
  const w = px(light.width * IN)
  const h = px(Math.max(light.height, MIN_HEIGHT_IN) * IN)
  const emissive = useMemo(
    () => new THREE.Color(light.color).multiplyScalar(light.luminance * emitterScale),
    [light.color, light.luminance, emitterScale],
  )
  return (
    <group ref={group} position={position} quaternion={quaternion}>
      <rectAreaLight
        ref={ref}
        color={light.color}
        intensity={light.luminance * luminanceScale}
        width={w}
        height={h}
      />
      {emitters && (
        <Emitter debug={debug}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color={emissive} toneMapped={false} side={THREE.DoubleSide} />
        </Emitter>
      )}
    </group>
  )
}

/**
 * The emissive strip. Like the DCC's light, it is hidden from the camera and only shows up
 * refracted through the pill (transmission buffer) and reflected via the environment map.
 * In debug mode it is simply visible.
 */
function Emitter({ debug, children }: { debug: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Mesh>(null!)
  useEffect(() => {
    const m = ref.current
    if (debug) {
      m.visible = true
      return
    }
    m.visible = false
    transmissionOnly.add(m)
    return () => {
      transmissionOnly.delete(m)
      m.visible = true
    }
  }, [debug])
  return <mesh ref={ref}>{children}</mesh>
}
