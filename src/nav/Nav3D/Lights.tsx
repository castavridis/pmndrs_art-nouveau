import { useContext, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js'
import { Lightformer, useHelper } from '@react-three/drei'
import { px } from '../tokens'
import { palette, useTuning, type RectLightTuning, type Vec3 } from './tuning'
import { LAYER, useLayer } from './layers'
import { StripsContext } from './strips'
import { hoverAim, navAim, pagePointer, usePagePointer } from './aim'

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
      <Ray debug={debug} />
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

/**
 * The overhead spot. Its aim follows the current page's item (the nav publishes it, see
 * aim.ts), offset by the tuning's target, so the pill's top edge lights up above that page.
 */
function Overhead({ debug }: { debug: boolean }) {
  const o = useTuning((s) => s.lights.overhead)
  const ref = useRef<THREE.SpotLight>(null!)
  const target = useMemo(() => new THREE.Object3D(), [])
  const pos = wompPosition(o.position)
  const offset = useMemo(() => wompPosition(o.target), [o.target])
  useLayoutEffect(() => {
    target.position.copy(offset)
    target.updateMatrixWorld()
  }, [offset, target])
  useFrame((_, dt) => {
    overheadAim.copy(offset)
    if (navAim.active) overheadAim.x += navAim.x
    target.position.lerp(overheadAim, 1 - Math.exp(-dt * 10))
    target.updateMatrixWorld()
  })
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

/** The bright palette colours, in wheel order (the dark and light neutrals left out). */
const RAINBOW = [palette.purple, palette.red, palette.orange, palette.yellow, palette.green, palette.teal, palette.blue].map(
  (h) => new THREE.Color(h),
)
/** Colour `t` steps around the wheel (fractional steps blend between neighbours). */
function rainbowAt(t: number, out: THREE.Color) {
  const n = RAINBOW.length
  const i = Math.floor(((t % n) + n) % n)
  const f = ((t % 1) + 1) % 1
  out.copy(RAINBOW[i]!).lerp(RAINBOW[(i + 1) % n]!, f)
}

const overheadAim = new THREE.Vector3()
const rectAim = new THREE.Vector3()
const rectLook = new THREE.Matrix4()
const UP = new THREE.Vector3(0, 1, 0)

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
  const scene = useThree((s) => s.scene)
  const group = useRef<THREE.Group>(null!)
  const light = useRef<THREE.PointLight>(null!)
  /** Depth the light is currently holding (see the follow branch below). */
  const heldZ = useRef(r.z)
  /** Rainbow mode: position in the colour cycle, advanced by distance travelled. */
  const cycle = useRef(0)
  const lastPos = useRef<THREE.Vector3 | null>(null)
  usePagePointer()
  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const hw = px(size.width) / 2
    const hh = px(size.height) / 2
    // Keep the light (and its light pool) inside the canvas: a margin of a few px.
    const margin = px(Math.max(r.size, 8))
    if (r.hover && hoverAim.active && hoverAim.scene === scene) {
      // On a hovered petal or flower: the hit point, lifted toward the camera by hoverOffset
      // so the light glints on the surface instead of sitting inside it.
      target.copy(hoverAim.point)
      target.z += r.hoverOffset
      heldZ.current = target.z
    } else if (r.follow && pagePointer.current) {
      // Off a petal: x/y keep following the pointer; the depth stays exactly where the last
      // petal left it until the next petal is hit.
      const pointer = pagePointer.current
      const rect = gl.domElement.getBoundingClientRect()
      target.set(px(pointer.x - rect.left) - hw, hh - px(pointer.y - rect.top), heldZ.current)
    } else {
      heldZ.current = r.z
      const t = state.clock.elapsedTime * r.speed * Math.PI * 2
      target.set(Math.sin(t) * hw * 0.8, Math.sin(t * 0.63 + 1.3) * hh * 0.8, r.z + Math.sin(t * 0.41) * 0.4)
    }
    target.x = THREE.MathUtils.clamp(target.x, -hw + margin, hw - margin)
    target.y = THREE.MathUtils.clamp(target.y, -hh + margin, hh - margin)
    g.position.lerp(target, 1 - Math.exp(-dt * 14))
    // Rainbow: the colour advances only with movement, so a resting light holds its hue.
    if (r.mode === 'rainbow' && light.current) {
      if (lastPos.current) cycle.current += lastPos.current.distanceTo(g.position) * r.rainbowRate
      else lastPos.current = new THREE.Vector3()
      lastPos.current.copy(g.position)
      rainbowAt(cycle.current, light.current.color)
    }
  })
  if (r.intensity <= 0) return null
  return (
    <group ref={group}>
      <pointLight ref={light} color={r.mode === 'rainbow' ? undefined : r.color} intensity={r.intensity} decay={2} />
      {r.body && (
        <Emitter debug={debug}>
          <sphereGeometry args={[px(r.size), 16, 12]} />
          <meshBasicMaterial color={new THREE.Color(r.color).multiplyScalar(6)} toneMapped={false} />
        </Emitter>
      )}
    </group>
  )
}

/**
 * A ray of light: a spot anchored above the canvas, aimed at the pointer while the mouse is
 * over the page, otherwise sweeping slowly across. Its angle, not its position, follows.
 */
function Ray({ debug }: { debug: boolean }) {
  const r = useTuning((s) => s.lights.ray)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const light = useRef<THREE.SpotLight>(null!)
  const target = useMemo(() => new THREE.Object3D(), [])
  usePagePointer()
  useHelper(debug && r.enabled && r.intensity > 0 && light, THREE.SpotLightHelper, r.color)
  useFrame((state, dt) => {
    const l = light.current
    if (!l) return
    const hw = px(size.width) / 2
    const hh = px(size.height) / 2
    // Anchor: above the canvas, a little in front.
    l.position.set(0, hh * 1.6, 1.6)
    const pointer = pagePointer.current
    if (pointer) {
      const rect = gl.domElement.getBoundingClientRect()
      aim.set(px(pointer.x - rect.left) - hw, hh - px(pointer.y - rect.top), 0)
    } else {
      const t = state.clock.elapsedTime * r.speed * Math.PI * 2
      aim.set(Math.sin(t) * hw * 0.7, Math.sin(t * 0.5) * hh * 0.4, 0)
    }
    target.position.lerp(aim, 1 - Math.exp(-dt * 12))
    target.updateMatrixWorld()
  })
  if (!r.enabled || r.intensity <= 0) return null
  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={light}
        color={r.color}
        intensity={r.intensity}
        angle={(r.cone * Math.PI) / 180}
        penumbra={r.softness}
        decay={1}
        target={target}
      />
    </>
  )
}
const aim = new THREE.Vector3()

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
  const aimTarget = useMemo(() => new THREE.Vector3(), [])
  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const amp = px(sweepRange * IN)
    const s = sweep > 0 ? Math.sin(state.clock.elapsedTime * sweep * Math.PI * 2) * amp : 0
    g.position.copy(position).addScaledVector(SWEEP_DIR, s)
    if (light.followActive) {
      // Face the current page's item (the nav publishes it, see aim.ts); eased so a page
      // change swings the panel and its highlight across rather than snapping.
      rectAim.set(navAim.active ? navAim.x : 0, 0, 0)
      aimTarget.lerp(rectAim, 1 - Math.exp(-dt * 8))
      // RectAreaLight emits along its local −Z: camera-style lookAt points −Z at the target.
      rectLook.lookAt(g.position, aimTarget, UP)
      g.quaternion.setFromRotationMatrix(rectLook)
    }
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
 * refracted through the pill (its layer is in the transmission buffer's mask and not the
 * viewer's; see layers.ts). In debug mode it sits on the default layer and is simply visible.
 */
function Emitter({ debug, children }: { debug: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Mesh>(null)
  useLayer(ref, debug ? LAYER.DEFAULT : LAYER.BUFFER_ONLY)
  return <mesh ref={ref}>{children}</mesh>
}
