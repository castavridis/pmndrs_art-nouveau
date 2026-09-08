import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { damp } from 'maath/easing'
import { useNavStore } from '../store'
import { px, tokens } from '../tokens'
import { useItemRegistry } from './items'
import { palette } from './tuning'

const GLOW_COLOR = palette.green
const MAX_OPACITY = 0.85

let glowTexture: THREE.CanvasTexture | null = null
/** A soft radial falloff, white to transparent, drawn once. */
function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  glowTexture = new THREE.CanvasTexture(c)
  glowTexture.colorSpace = THREE.SRGBColorSpace
  return glowTexture
}

/**
 * A soft light behind each item, seen through the glass: full for the hovered or focused
 * item, half for the current page. Sits just behind the pill so the transmission buffer
 * refracts it and the bloom pass lifts it; additive so it reads as light, not paint.
 */
export function Glows() {
  const links = useNavStore((s) => s.links)
  const mode = useNavStore((s) => s.mode)
  const ids = mode === 'collapsed' ? ['menu', 'cmd'] : [...links.map((l) => l.id), 'cmd']
  return (
    <>
      {ids.map((id) => (
        <Glow key={id} id={id} />
      ))}
    </>
  )
}

function Glow({ id }: { id: string }) {
  const registry = useItemRegistry()
  const lit = useNavStore((s) => s.hovered === id || s.focused === id)
  const active = useNavStore((s) => s.active === id)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const mesh = useRef<THREE.Mesh>(null!)
  const material = useRef<THREE.MeshBasicMaterial>(null!)
  const texture = useMemo(() => getGlowTexture(), [])

  useFrame((_, dt) => {
    const m = mesh.current
    const mat = material.current
    const el = registry?.get(id)
    const rc = el?.relativeCenter.peek()
    const size = el?.size.peek()
    if (!m || !mat || !rc || !size) return
    m.position.x = px(rc[0])
    m.scale.set(px(size[0] + 56), px(tokens.pillHeight * 2), 1)
    const target = (lit ? 1 : active ? 0.45 : 0) * MAX_OPACITY
    if (reducedMotion) mat.opacity = target
    else damp(mat, 'opacity', target, 0.12, dt)
    m.visible = mat.opacity > 0.005
  })

  return (
    <mesh ref={mesh} position-z={-px(tokens.pillDepth / 2) - 0.03} raycast={() => null} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={material}
        map={texture}
        color={GLOW_COLOR}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}
