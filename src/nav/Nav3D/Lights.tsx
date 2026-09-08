import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js'
import { Lightformer, useHelper } from '@react-three/drei'
import { px } from '../tokens'
import { useTuning, type RectLightTuning, type Vec3 } from './tuning'
import { transmissionOnly } from './materials'

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
      {rects.map((r, i) => (
        <Rect key={r.name ?? i} light={r} debug={debug} />
      ))}
    </>
  )
}

/** Render inside <Environment> so the strips are reflected by the glass. */
export function RectLightformers() {
  const { rects, emitters, emitterScale } = useTuning((s) => s.lights)
  if (!emitters) return null
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

/** 45° in the plane: the strips lie along (1,1), so this is their perpendicular travel. */
const SWEEP_DIR = new THREE.Vector3(1, 1, 0).normalize()

function Rect({ light, debug }: { light: RectLightTuning; debug: boolean }) {
  const { luminanceScale, emitters, emitterScale, sweep, sweepRange } = useTuning((s) => s.lights)
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
