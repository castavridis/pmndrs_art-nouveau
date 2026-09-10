import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Container, Svg, type VanillaContainer } from '@react-three/uikit'
import { useSpring, type SpringValue } from '@react-spring/three'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group } from 'three'
import { useNavStore } from '../store'
import { px, tokens } from '../tokens'
import { Pill } from './Pill'
import { Clusters } from './Clusters'
import { Petals } from './Petals'
import { PetalField } from './PetalField'
import { Indicator } from './Indicator'
import { Glows } from './Glows'
import { SelectionPill } from './SelectionPill'
import { PillMorph } from './pillGeometry'
import { useTuning } from './tuning'
import type { ProbeRegion } from './LcProbe'
import { navAim } from './aim'
import { useItemRegistry } from './items'

const LcProbe = import.meta.env.DEV ? lazy(() => import('./LcProbe')) : null
import { ItemRegistryContext, type ItemRegistry } from './items'
import { transmissionExcluded } from './materials'
import { NavItem } from './NavItem'
import { triggerDom, useInk } from './dom'
import logoUrl from '../assets/logo.svg'

/**
 * The 3D nav. A uikit row lays out Logo → links → Cmd in px (pixelSize = 1/pxPerUnit);
 * its measured width drives one spring that the Pill and the Clusters both read.
 * Logo and Cmd are hard-coded here; only the middle links come from the store.
 */
export function NavRoot() {
  const links = useNavStore((s) => s.links)
  const mode = useNavStore((s) => s.mode)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const rootRef = useRef<VanillaContainer>(null)
  const uiRef = useRef<Group>(null)
  const [measured, setMeasured] = useState<number | null>(null)
  const seen = useRef(false)
  const [animate, setAnimate] = useState(false)
  const [registry] = useState<ItemRegistry>(() => new Map())
  const { ink } = useInk()
  // The whole nav can sit away from the canvas origin (shared scenes); items report positions
  // relative to it, so the aim and probe add its world offset.
  const rootRef3d = useRef<Group>(null)
  // Dev legibility probe: the label boxes (uikit px → canvas px) and a way to hide the labels.
  const size = useThree((s) => s.size)
  const probeRegions = useCallback((): ProbeRegion[] => {
    const out: ProbeRegion[] = []
    for (const [id, el] of registry) {
      const rc = el.relativeCenter.peek()
      const sz = el.size.peek()
      if (!rc || !sz) continue
      const ox = (rootRef3d.current?.position.x ?? 0) * tokens.pxPerUnit
      const oy = (rootRef3d.current?.position.y ?? 0) * tokens.pxPerUnit
      out.push({ name: `nav: ${id}`, x: size.width / 2 + ox + rc[0] - sz[0] / 2, y: size.height / 2 - oy - rc[1] - sz[1] / 2, w: sz[0], h: sz[1] })
    }
    return out
  }, [registry, size.width, size.height])
  const hideLabels = useCallback((hidden: boolean) => {
    const g = uiRef.current
    if (!g) return
    for (const c of g.children) if (c.name !== 'label-scrim') c.visible = !hidden
  }, [])

  // The text layer sits on the glass; it must not be refracted by it.
  useEffect(() => {
    const g = uiRef.current
    if (!g) return
    transmissionExcluded.add(g)
    return () => void transmissionExcluded.delete(g)
  }, [])

  // uikit@1.0: the ref is the vanilla component; `size` is a signal of [w, h] in px.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    return root.size.subscribe((size) => {
      if (!size || size[0] <= 0) return
      setMeasured(size[0])
      // Only measurements after the first one animate (see `animate` below).
      if (seen.current) setAnimate(true)
      seen.current = true
    })
  }, [])

  const width = measured ?? tokens.pillRadius * 2
  // The first measurement lands instantly (no pill growing in from a circle as the 3D layer
  // fades up); `animate` is only set by the second measurement onwards. (`measured === null`
  // would not do: it flips in the same render that delivers the width, which then animates.)
  const spring = useSpring({
    width,
    immediate: !animate || reducedMotion,
    config: { tension: 210, friction: 26 },
  })

  const z = px(tokens.pillDepth) / 2 + 0.004

  return (
    <ItemRegistryContext.Provider value={registry}>
      <group ref={rootRef3d}>
      <Pill width={spring.width} />
      <Clusters width={spring.width} />
      <Indicator />
      <SelectionPill />
      <Glows />
      <AimTracker root={rootRef3d} />
      {mode === 'full' && <PetalField count={100} />}
      {mode === 'full' && (
        <Petals
          width={spring.width}
          layoutWidth={width}
          count={Math.min(Math.max(links.length, 1), 3)}
          float={!reducedMotion}
        />
      )}
      {LcProbe && (
        <Suspense fallback={null}>
          <LcProbe ink={ink} regions={probeRegions} hideText={hideLabels} />
        </Suspense>
      )}
      <group ref={uiRef} position-z={z}>
        <Scrim width={spring.width} light={ink === '#f2f2ef'} />
        <Suspense fallback={null}>
          <Container
            ref={rootRef}
            pixelSize={1 / tokens.pxPerUnit}
            anchorX="center"
            anchorY="center"
            flexDirection="row"
            alignItems="center"
            height={tokens.pillHeight}
            paddingLeft={tokens.pillPadStart[mode]}
            paddingRight={tokens.pillPadEnd[mode]}
            gap={tokens.gap[mode]}
            fontSize={tokens.fontSize[mode]}
            color={ink}
            depthTest={false}
          >
            <Container
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation()
                triggerDom('logo')
              }}
            >
              {/* The mark itself (assets/logo.svg), in the ink colour like the labels. */}
              <Svg src={logoUrl} width={tokens.logoSize} height={tokens.logoSize} color={ink} />
            </Container>
            {mode === 'collapsed' ? (
              // Links live in Nav2D's disclosure; this item opens it.
              <NavItem id="menu" label="Menu" />
            ) : (
              links.map((l) => <NavItem key={l.id} id={l.id} label={l.label} />)
            )}
            <NavItem id="cmd" label="Cmd" kbd={mode === 'full' ? '⌘K' : undefined} />
          </Container>
        </Suspense>
      </group>
      </group>
    </ItemRegistryContext.Provider>
  )
}

/**
 * A translucent slab just behind the labels, following the pill's width: black under light
 * ink, white under dark ink. Evens out petals, highlights and the item glow passing behind the
 * text (APCA worst case; see scripts/dev/apca.mjs). Opacity is `env.labelScrim`; 0 removes it.
 */
function Scrim({ width, light }: { width: SpringValue<number>; light: boolean }) {
  const opacity = useTuning((s) => s.env.labelScrim)
  const morph = useMemo(() => new PillMorph(), [])
  useEffect(() => () => morph.dispose(), [morph])
  useFrame(() => morph.setWidth(width.get()))
  if (opacity <= 0) return null
  return (
    <mesh name="label-scrim" geometry={morph.geometry} scale-z={0.04} position-z={-0.003} raycast={() => null}>
      <meshBasicMaterial color={light ? '#000000' : '#ffffff'} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** Publishes the hovered (else current page) item's x for lights that aim at it (see aim.ts). */
function AimTracker({ root }: { root: React.RefObject<Group | null> }) {
  const registry = useItemRegistry()
  const active = useNavStore((s) => s.active)
  const hovered = useNavStore((s) => s.hovered ?? s.focused)
  useFrame(() => {
    // The item under the pointer (or keyboard focus) wins; otherwise the current page.
    const id = hovered ?? active
    const rc = id ? registry?.get(id)?.relativeCenter.peek() : undefined
    navAim.active = !!rc
    if (rc) navAim.x = px(rc[0]) + (root.current?.position.x ?? 0)
  })
  return null
}
