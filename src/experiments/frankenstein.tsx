import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Generator } from 'maath/random'
import { Glass } from '../nav/Nav3D/Glass'
import { glassPresets, palette, type GlassPreset, type PaletteName } from '../nav/Nav3D/tuning'
import { useNavStore } from '../nav/store'
import { useParts, type PartName } from './parts'
import { DiagonalField } from './DiagonalField'
import { ExperimentShell } from './ExperimentShell'

const PALETTE = Object.keys(palette) as PaletteName[]
const FIELD = new THREE.Box3(new THREE.Vector3(-9, -6, -2), new THREE.Vector3(9, 6, 2))

/** Slow whole-scene rotation, off under reduced motion. */
function Turntable({
  speed = 0.08,
  axis = 'y',
  children,
}: {
  speed?: number
  axis?: 'x' | 'y' | 'z'
  children: React.ReactNode
}) {
  const g = useRef<THREE.Group>(null!)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  useFrame((_, dt) => {
    if (!reducedMotion) g.current.rotation[axis] += speed * Math.min(dt, 0.05)
  })
  return <group ref={g}>{children}</group>
}

/** Petals drifting bottom-left → top-right behind everything. */
function Diagonal({ count = 80 }: { count?: number }) {
  const { petalLo } = useParts()
  return (
    <DiagonalField geometry={petalLo} bounds={FIELD} count={count} speed={0.7} scale={[1.2, 2.4]} />
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Bouquet: stems (tendrils) radiating from a centre with blossoms at their tips.
export function Bouquet() {
  const parts = useParts()
  const stems = useMemo(() => {
    const rng = new Generator(3)
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + rng.value() * 0.3
      const r = 1.2 + rng.value() * 0.8
      return {
        a,
        r,
        tilt: rng.value() * 0.6 - 0.3,
        preset: PALETTE[i % PALETTE.length]!,
        big: i % 3 === 0,
      }
    })
  }, [])
  return (
    <ExperimentShell frame={[0, 0.6, 30]}>
      <Diagonal />
      <Turntable speed={0.12}>
        {stems.map((s, i) => (
          <group key={i} rotation={[0, 0, s.a]}>
            {/* stem: the nav's right tendril, pointing outward */}
            <mesh
              geometry={parts.navRight}
              position={[s.r * 0.5, 0, s.tilt]}
              rotation={[0, 0, -Math.PI / 2]}
              scale={2.2}
            >
              <Glass sampler />
            </mesh>
            {/* blossom at the tip */}
            <mesh
              geometry={s.big ? parts.flower : parts.navLeft}
              position={[s.r + 0.9, 0, s.tilt]}
              rotation={[0.2, 0, -s.a]}
              scale={s.big ? 0.25 : 1.4}
            >
              <Glass sampler preset={s.preset} />
            </mesh>
          </group>
        ))}
        <mesh geometry={parts.lens} scale={1.2}>
          <Glass sampler />
        </mesh>
      </Turntable>
    </ExperimentShell>
  )
}

// ---------------------------------------------------------------------------------------------
// 2. Wreath: blossoms and leaves around a ring, the ring turning.
export function Wreath() {
  const parts = useParts()
  const n = 14
  return (
    <ExperimentShell frame={[0, 0.4, 34]}>
      <Diagonal count={60} />
      <Turntable speed={0.1} axis="z">
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2
          const R = 3
          const geo = i % 3 === 0 ? parts.flower : i % 3 === 1 ? parts.annRight : parts.annLeft
          return (
            <group
              key={i}
              position={[Math.cos(a) * R, Math.sin(a) * R, 0]}
              rotation={[0, 0, a + Math.PI / 2]}
            >
              <mesh geometry={geo} scale={i % 3 === 0 ? 0.28 : 1.1}>
                <Glass sampler preset={PALETTE[i % PALETTE.length]!} />
              </mesh>
            </group>
          )
        })}
      </Turntable>
    </ExperimentShell>
  )
}

// ---------------------------------------------------------------------------------------------
// 3. Garland: pieces strung along a sine wave that rolls slowly.
export function Garland() {
  return (
    <ExperimentShell frame={[0, 0.3, 40]}>
      <Diagonal count={50} />
      <GarlandWave />
    </ExperimentShell>
  )
}

/** Inside the shell (needs the store for reduced motion). */
function GarlandWave() {
  const parts = useParts()
  const g = useRef<THREE.Group>(null!)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const items = useMemo(() => {
    const cycle: PartName[] = ['flower', 'navRight', 'annLeft', 'petal', 'annRight', 'leafTop']
    return Array.from({ length: 16 }, (_, i) => ({
      x: -7.5 + i,
      part: cycle[i % cycle.length]!,
      preset: PALETTE[(i * 2) % PALETTE.length]!,
    }))
  }, [])
  useFrame((state) => {
    const t = reducedMotion ? 0 : state.clock.elapsedTime
    g.current.children.forEach((c, i) => {
      const x = items[i]!.x
      c.position.y = Math.sin(x * 0.8 + t * 0.6) * 1.2
      c.rotation.z = Math.cos(x * 0.8 + t * 0.6) * 0.5
    })
  })
  return (
    <group ref={g}>
      {items.map((it, i) => (
        <group key={i} position={[it.x, 0, 0]}>
          <mesh
            geometry={parts[it.part]}
            scale={it.part === 'flower' ? 0.2 : it.part === 'petal' ? 3 : 1}
          >
            <Glass sampler preset={it.preset} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------------------------
// 4. Totem: the logo blocks stacked into a column, blossoms growing from the seams.
export function Totem() {
  const parts = useParts()
  const levels = 4
  return (
    <ExperimentShell frame={[0, 1, 46]}>
      <Diagonal count={70} />
      <Turntable speed={0.15}>
        {Array.from({ length: levels }, (_, i) => (
          <group
            key={i}
            position={[0, (i - (levels - 1) / 2) * 4.2, 0]}
            rotation={[0, (i * Math.PI) / 2, 0]}
            scale={0.5}
          >
            <mesh geometry={parts.cube}>
              {/* sampler: a buffered material here would re-render the scene per block */}
              <Glass sampler preset={i % 2 ? 'blue' : 'silverGlass'} />
            </mesh>
            {parts.cubeBoxes.map((b, j) => {
              const c = b.getCenter(new THREE.Vector3())
              return (
                <mesh
                  key={j}
                  geometry={parts.flower}
                  position={[c.x, b.max.y, b.max.z]}
                  rotation={[-0.6, 0, 0]}
                  scale={0.4}
                >
                  <Glass sampler preset={PALETTE[(i + j) % PALETTE.length]!} />
                </mesh>
              )
            })}
          </group>
        ))}
      </Turntable>
    </ExperimentShell>
  )
}

// ---------------------------------------------------------------------------------------------
// 5. Chimera: a seeded random assembly of parts, regenerated on demand.
interface Piece {
  part: PartName
  pos: [number, number, number]
  rot: [number, number, number]
  scale: number
  preset: GlassPreset
}

const CHIMERA_PARTS: PartName[] = [
  'navLeft',
  'navRight',
  'flower',
  'lens',
  'leafTop',
  'leafBottom',
  'annLeft',
  'annRight',
  'logo',
  'petal',
]
const NATIVE_SCALE: Record<PartName, number> = {
  navLeft: 1.6,
  navRight: 1.6,
  petal: 4,
  petalLo: 4,
  flower: 0.3,
  logo: 3,
  lens: 1.2,
  leafTop: 1.4,
  leafBottom: 1.4,
  annLeft: 1.2,
  annRight: 1.2,
  cube: 0.15,
}

function makeChimera(seed: number): Piece[] {
  const rng = new Generator(seed)
  const r = () => rng.value()
  const n = 8 + Math.floor(r() * 5)
  return Array.from({ length: n }, (_, i) => {
    const part = CHIMERA_PARTS[Math.floor(r() * CHIMERA_PARTS.length)]!
    const a = r() * Math.PI * 2
    const d = i === 0 ? 0 : 0.6 + r() * 1.6
    return {
      part,
      pos: [Math.cos(a) * d, Math.sin(a) * d, (r() - 0.5) * 0.8],
      rot: [r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2],
      scale: NATIVE_SCALE[part] * (0.7 + r() * 0.7),
      preset:
        (Object.keys(glassPresets) as GlassPreset[]).filter((k) =>
          PALETTE.includes(k as PaletteName),
        )[Math.floor(r() * PALETTE.length)] ?? 'silverGlass',
    }
  })
}

export function Chimera() {
  const parts = useParts()
  const [seed, setSeed] = useState(1)
  const pieces = useMemo(() => makeChimera(seed), [seed])
  return (
    <ExperimentShell
      frame={[0, 0.4, 28]}
      overlay={
        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          style={{
            position: 'fixed',
            left: 16,
            bottom: 16,
            zIndex: 10,
            padding: '8px 12px',
            borderRadius: 999,
            border: '1px solid rgb(255 255 255 / 0.15)',
            background: 'rgb(20 20 18 / 0.85)',
            color: '#eee',
            font: '500 13px system-ui',
            cursor: 'pointer',
          }}
        >
          Regenerate · seed {seed}
        </button>
      }
    >
      <Diagonal count={60} />
      <Turntable speed={0.2}>
        {pieces.map((p, i) => (
          <mesh
            key={`${seed}-${i}`}
            geometry={parts[p.part]}
            position={p.pos}
            rotation={p.rot}
            scale={p.scale}
          >
            <Glass sampler preset={p.preset} />
          </mesh>
        ))}
      </Turntable>
    </ExperimentShell>
  )
}
