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
const v3 = (v: Vec3): [number, number, number] => [px(v.x), px(v.y), px(v.z)]
const euler = (r: Vec3): [number, number, number] => [r.x * DEG, r.y * DEG, r.z * DEG]

/**
 * Direct lighting on top of the Lightformer environment: one overhead spot and three
 * rect-area panels, all live-tunable from the `lights` tuning group (leva in dev).
 * `lights.debug` draws the spot cone and the rect outlines.
 */
export function Lights() {
  const { debug, overhead, rects } = useTuning((s) => s.lights)
  return (
    <>
      <Overhead debug={debug} />
      {rects.map((r, i) => (
        <Rect key={r.name ?? i} light={r} debug={debug} />
      ))}
      {/* Spot target must be in the scene graph for lookAt to apply. */}
      <object3D name="overhead-target" position={v3(overhead.target)} />
    </>
  )
}

function Overhead({ debug }: { debug: boolean }) {
  const o = useTuning((s) => s.lights.overhead)
  const ref = useRef<THREE.SpotLight>(null!)
  const target = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => {
    target.position.set(px(o.target.x), px(o.target.y), px(o.target.z))
    target.updateMatrixWorld()
  }, [o.target.x, o.target.y, o.target.z, target])
  useHelper(debug && ref, THREE.SpotLightHelper, o.color)
  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={ref}
        color={o.color}
        intensity={o.intensity}
        position={v3(o.position)}
        angle={o.angle * DEG}
        penumbra={o.penumbra}
        decay={2}
        target={target}
      />
    </>
  )
}

function Rect({ light, debug }: { light: RectLightTuning; debug: boolean }) {
  const ref = useRef<THREE.RectAreaLight>(null!)
  useHelper(debug && ref, RectAreaLightHelper, light.color)
  return (
    <rectAreaLight
      ref={ref}
      color={light.color}
      intensity={light.intensity}
      width={px(light.width)}
      height={px(light.height)}
      position={v3(light.position)}
      rotation={euler(light.rotation)}
    />
  )
}
