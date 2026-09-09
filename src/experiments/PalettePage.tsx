import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
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
import { preloadCalloutIcon, useCalloutIcon } from './calloutAssets'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { Backing } from '../nav/Nav3D/Backing'
import { Shards } from './Shards'
import type { ThreeEvent } from '@react-three/fiber'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null
const PaletteControls = import.meta.env.DEV ? lazy(() => import('./PaletteControls')) : null

preloadNavAssets()
preloadFlower()
preloadCalloutIcon()

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
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '72px 24px 96px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 500 }}>Palette</h1>
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

/** The sample slab in CSS px: the announcement / callout glass, 8px corners. */
const SLAB = { width: 168, height: 118, radius: 8, depth: 6 }

/**
 * A slab of the main glass (as the announcement and callouts wear it) with the colour's
 * material on the pieces around it: the blossom on the bottom-left corner, a callout leaf
 * over the top edge, and two petals just off the right edge. Each piece overlaps the slab so
 * the colour can be judged against the shared glass, not only against the page.
 */
function Sample({ name }: { name: PaletteName }) {
  const flower = useFlower()
  const { petal } = useNavAssets()
  const { leafTop, size: iconSize } = useCalloutIcon()
  const slab = useMemo(() => makeRoundedRectGeometry(SLAB.width, SLAB.height, SLAB.radius, SLAB.depth), [])
  useEffect(() => () => slab.dispose(), [slab])
  // The blossom is ~4.8 units wide natively; show it ~110 px wide. The leaf ~70 px tall.
  const fs = px(110) / 4.8
  const ls = px(70) / iconSize
  const hw = px(SLAB.width) / 2
  const hh = px(SLAB.height) / 2
  const front = px(SLAB.depth / 2)
  // Click the slab to shatter it under the pointer; it re-forms once the shards have gone.
  const [hit, setHit] = useState<[number, number] | null>(null)
  const strike = (e: ThreeEvent<MouseEvent>) => {
    if (hit) return
    e.stopPropagation()
    const local = e.object.worldToLocal(e.point.clone())
    setHit([local.x, local.y])
  }
  return (
    <group>
      {hit ? (
        <Shards width={px(SLAB.width)} height={px(SLAB.height)} depth={px(SLAB.depth)} hit={hit} radius={SLAB.radius} onDone={() => setHit(null)} />
      ) : (
        <>
          <Backing width={SLAB.width} height={SLAB.height} depth={SLAB.depth} />
          <mesh geometry={slab} onClick={strike}>
            <Glass sampler />
          </mesh>
        </>
      )}
      {/* Blossom on the bottom-left corner, half over the slab. */}
      <mesh geometry={flower} scale={fs} rotation={[0.15, 0, 0.2]} position={[-hw + 0.1, -hh + 0.05, front + 0.08]}>
        <Glass sampler preset={name} />
      </mesh>
      {/* Callout leaf curling over the top edge. */}
      <mesh geometry={leafTop} scale={ls} rotation={[0, 0, -0.2]} position={[0.15, hh - 0.05, front + 0.1]}>
        <Glass sampler preset={name} />
      </mesh>
      {/* Petals slightly off the right edge. */}
      <mesh geometry={petal} rotation={[0.2, 0, 0.6]} position={[hw + 0.08, 0.25, front + 0.05]} scale={2}>
        <Glass sampler preset={name} />
      </mesh>
      <mesh geometry={petal} rotation={[-0.3, 0.2, -1.1]} position={[hw + 0.02, -0.3, front + 0.02]} scale={1.6}>
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
