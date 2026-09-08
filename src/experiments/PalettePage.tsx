import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { createNavStore, NavStoreContext } from '../nav/store'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { Ready } from '../nav/Nav3D/Ready'
import { useNavAssets, preloadNavAssets } from '../nav/Nav3D/assets'
import { px } from '../nav/tokens'
import { palette, type PaletteName } from '../nav/Nav3D/tuning'
import { usePresetGlass } from '../nav/Nav3D/paletteTuning'
import { preloadFlower, useFlower } from './flowerAssets'
import { ThemeToggle } from '../ThemeToggle'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null
const PaletteControls = import.meta.env.DEV ? lazy(() => import('./PaletteControls')) : null

preloadNavAssets()
preloadFlower()

const PALETTE_NAMES = Object.keys(palette) as PaletteName[]

/** Sample canvas size in CSS px. */
const SAMPLE = { width: 300, height: 190 }

/**
 * `/dev/palette`: one card per palette colour with a live 3D sample (blossom + petals in that
 * material) and a leva folder to edit the material. Edits apply everywhere the preset is used
 * (the falling petals, the indicator, tinted callouts); "save to project" ships them.
 */
export function PalettePage() {
  const [store] = useState(() => createNavStore({ links: [] }))
  return (
    <NavStoreContext.Provider value={store}>
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 24px 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Palette</h1>
          <ThemeToggle />
        </div>
        <p style={{ margin: '0 0 28px', opacity: 0.6, maxWidth: 640 }}>
          Each colour is a glass preset. Open its folder in the panel to edit the material; the
          sample and every petal using that colour update live. "save to project" writes
          palette.saved.json.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {PALETTE_NAMES.map((name) => (
            <PaletteCard key={name} name={name} />
          ))}
        </div>
        {DevControls && PaletteControls && (
          <Suspense fallback={null}>
            <DevControls />
            <PaletteControls />
          </Suspense>
        )}
      </main>
    </NavStoreContext.Provider>
  )
}

function PaletteCard({ name }: { name: PaletteName }) {
  const g = usePresetGlass(name)
  const [ready, setReady] = useState(false)
  return (
    <section
      aria-label={name}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: 'color-mix(in srgb, currentColor 5%, transparent)',
        border: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
      }}
    >
      <div style={{ position: 'relative', height: SAMPLE.height, opacity: ready ? 1 : 0, transition: 'opacity 600ms ease' }}>
        <NavCanvas postprocessing={false}>
          <Suspense fallback={null}>
            <Sample name={name} />
            <Ready onReady={() => setReady(true)} />
          </Suspense>
        </NavCanvas>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <span
          aria-hidden="true"
          style={{ width: 28, height: 28, borderRadius: 8, background: palette[name], boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.15)' }}
        />
        <div style={{ display: 'grid', gap: 2 }}>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <code style={{ fontSize: 12, opacity: 0.55 }}>
            {palette[name]} · body {g.color} · tint {g.attenuationColor}
          </code>
        </div>
      </div>
    </section>
  )
}

/** A blossom with two loose petals, all in the colour's material, drifting gently. */
function Sample({ name }: { name: PaletteName }) {
  const flower = useFlower()
  const { petal } = useNavAssets()
  // The blossom is ~4.8 units wide natively; show it ~130 px wide.
  const s = px(130) / 4.8
  const rotations = useMemo(
    () => [
      [0.2, 0, 0.6],
      [-0.3, 0.2, -1.1],
    ] as [number, number, number][],
    [],
  )
  return (
    <group>
      <mesh geometry={flower} scale={s} rotation={[0.15, 0, 0]} position={[-0.25, 0, 0]}>
        <Glass sampler preset={name} />
      </mesh>
      <mesh geometry={petal} rotation={rotations[0]} position={[0.75, 0.35, 0.1]} scale={2}>
        <Glass sampler preset={name} />
      </mesh>
      <mesh geometry={petal} rotation={rotations[1]} position={[0.85, -0.35, 0.05]} scale={1.6}>
        <Glass sampler preset={name} />
      </mesh>
      <Drift />
    </group>
  )
}

function Drift() {
  const ref = useRef<THREE.Group>(null!)
  useFrame((state) => {
    const p = ref.current?.parent
    if (p) p.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.35
  })
  return <group ref={ref} />
}
