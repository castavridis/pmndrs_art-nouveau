import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { Container, Text } from '@react-three/uikit'
import { useControls } from 'leva'
import { createNavStore, NavStoreContext } from '../nav/store'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { RecenterButton } from '../nav/Nav3D/recenter'
import { useGlassProps, transmissionExcluded } from '../nav/Nav3D/materials'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { Backing } from '../nav/Nav3D/Backing'
import { useInk } from '../nav/Nav3D/dom'
import { px, tokens } from '../nav/tokens'
import { bakeRelief, uvFromBounds } from './textRelief'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null

const SLAB = { width: 640, height: 220, radius: 8, depth: 6 }

/**
 * `/dev/glyph`: text baked into a glass surface, two ways, on one slab of the main glass.
 *  - etched: the text is a relief in the surface itself (a normal map baked from the glyphs),
 *    so it refracts and catches the lights like the rest of the glass;
 *  - MSDF: uikit's text (the nav's renderer) laid on the surface, crisp at any size.
 * The panel's "glyph" folder switches and tunes them.
 */
export function GlyphPage() {
  const [store] = useState(() => createNavStore({ links: [] }))
  return (
    <NavStoreContext.Provider value={store}>
      <div style={{ position: 'fixed', inset: 0 }}>
        <NavCanvas orbit framePosition={[0, 0.2, 10]}>
          <Suspense fallback={null}>
            <Slab />
          </Suspense>
        </NavCanvas>
        <RecenterButton />
        {DevControls && (
          <Suspense fallback={null}>
            <DevControls />
          </Suspense>
        )}
      </div>
    </NavStoreContext.Provider>
  )
}

function Slab() {
  const glass = useGlassProps()
  const { ink } = useInk()
  const c = useControls('glyph', {
    text: 'v10 is out.',
    line2: 'Petals, glass and the growing pill.',
    treatment: { value: 'etched', options: ['etched', 'msdf', 'both'] as const },
    size: { value: 44, min: 12, max: 120, step: 1 },
    depth: { value: 2, min: 0, max: 6, step: 0.1, label: 'etch depth' },
    soften: { value: 1.5, min: 0, max: 6, step: 0.5, label: 'etch softness' },
    emboss: false,
  })
  const geometry = useMemo(() => uvFromBounds(makeRoundedRectGeometry(SLAB.width, SLAB.height, SLAB.radius, SLAB.depth)), [])
  useEffect(() => () => geometry.dispose(), [geometry])

  // Bake the relief once the page font is in (re-baked when the text or its size changes).
  const [relief, setRelief] = useState<THREE.DataTexture | null>(null)
  useEffect(() => {
    let alive = true
    const bake = () => {
      if (!alive) return
      const tex = bakeRelief({
        lines: [c.text, c.line2].filter(Boolean),
        width: SLAB.width * 2,
        height: SLAB.height * 2,
        fontPx: c.size * 2,
        insetX: 80,
        insetY: 70,
        soften: c.soften * 2,
        strength: c.depth,
        emboss: c.emboss,
      })
      setRelief((old) => (old?.dispose(), tex))
    }
    document.fonts?.ready.then(bake).catch(bake)
    return () => {
      alive = false
    }
  }, [c.text, c.line2, c.size, c.soften, c.depth, c.emboss])

  const etched = c.treatment !== 'msdf' && relief
  // The MSDF layer sits on the front face and must stay out of the slab's own buffer.
  const ui = useRef<THREE.Group>(null)
  useEffect(() => {
    const g = ui.current
    if (!g) return
    transmissionExcluded.add(g)
    return () => void transmissionExcluded.delete(g)
  }, [])
  const front = px(SLAB.depth / 2) + 0.004
  return (
    <group>
      <Backing width={SLAB.width} height={SLAB.height} depth={SLAB.depth} />
      <mesh geometry={geometry}>
        <MeshTransmissionMaterial
          key={etched ? 'etched' : 'plain'}
          {...glass}
          normalMap={etched ? relief : glass.normalMap}
          normalScale={etched ? new THREE.Vector2(1, 1) : glass.normalScale}
        />
      </mesh>
      {c.treatment !== 'etched' && (
        <group ref={ui} position-z={front}>
          <Container
            pixelSize={1 / tokens.pxPerUnit}
            anchorX="center"
            anchorY="center"
            width={SLAB.width}
            height={SLAB.height}
            flexDirection="column"
            justifyContent="flex-start"
            paddingLeft={40}
            paddingTop={35}
            gap={6}
            depthTest={false}
          >
            <Text fontSize={c.size} fontWeight="medium" color={ink}>
              {c.text}
            </Text>
            <Text fontSize={c.size * 0.5} color={ink}>
              {c.line2}
            </Text>
          </Container>
        </group>
      )}
    </group>
  )
}
