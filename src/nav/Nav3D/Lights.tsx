import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js'
import { useHelper } from '@react-three/drei'
import { px } from '../tokens'
import { useTuning, type RectLightTuning, type Vec3 } from './tuning'

// three@0.182: RectAreaLight needs its BRDF LUTs registered once before any material compiles.
RectAreaLightUniformsLib.init()

const DEG = Math.PI / 180
/** Womp inches → CSS px (see tuning.ts). */
const IN = 2.54
/** The exported scene is viewed from behind; assets.ts rotates meshes 180° about Y. Same here. */
const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)

const wompPosition = (v: Vec3) => new THREE.Vector3(px(v.x * IN), px(v.y * IN), px(v.z * IN)).applyQuaternion(FLIP)
const wompRotation = (r: Vec3) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler(r.x * DEG, r.y * DEG, r.z * DEG, 'XYZ')).premultiply(FLIP)

/**
 * Direct lighting: the Womp rect lights (see tuning.ts for the frame conversion) plus an
 * optional overhead spot. `lights.debug` draws helpers.
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

function Rect({ light, debug }: { light: RectLightTuning; debug: boolean }) {
  const scale = useTuning((s) => s.lights.luminanceScale)
  const ref = useRef<THREE.RectAreaLight>(null!)
  useHelper(debug && ref, RectAreaLightHelper, light.color)
  const position = useMemo(() => wompPosition(light.position), [light.position])
  const quaternion = useMemo(() => wompRotation(light.rotation), [light.rotation])
  return (
    <rectAreaLight
      ref={ref}
      color={light.color}
      intensity={light.luminance * scale}
      width={px(light.width * IN)}
      height={px(Math.max(light.height, 0.5) * IN)}
      position={position}
      quaternion={quaternion}
    />
  )
}
