import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Container, Svg, type VanillaContainer } from '@react-three/uikit'
import { useSpring, type SpringValue } from '@react-spring/three'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import * as THREE from 'three'
import { useNavStore } from '../store'
import { px, tokens } from '../tokens'
import { Pill } from './Pill'
import { Clusters } from './Clusters'
import { Petals } from './Petals'
import { PetalField } from './PetalField'
import { Indicator } from './Indicator'
import { SelectionPill } from './SelectionPill'
import { ItemContrast } from './NavContrast'
import { PillMorph } from './pillGeometry'
import { useTuning } from './tuning'
import { navAim } from './aim'
import { useItemInk, useItemRegistry } from './items'
import { ItemRegistryContext, type ItemRegistry } from './items'
import { LAYER, useLayer } from './layers'
import { NavItem } from './NavItem'
import { INKS, triggerDom, useNavInk } from './dom'
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
  const [animate, setAnimate] = useState(false)
  const [registry] = useState<ItemRegistry>(() => new Map())
  const { ink } = useNavInk()
  // The whole nav can sit away from the canvas origin (shared scenes); items report positions
  // relative to it, so the aim and the contrast regions add its world offset.
  const rootRef3d = useRef<Group>(null)
  const logoRef = useRef<VanillaContainer>(null)
  const logoInk = useItemInk('logo').ink
  // The items whose labels are measured, and the scrim's polarity: the ink most labels on the
  // pill take (the one under the chip reads against the chip, so it has no say).
  const itemIds = mode === 'collapsed' ? ['menu', 'cmd'] : [...links.map((l) => l.id), 'cmd']
  const idsKey = itemIds.join(' ')
  const scrimForLightInk = useNavStore((s) => {
    const chip = s.hovered ?? s.focused ?? s.active
    let light = 0
    let dark = 0
    for (const id of idsKey.split(' ')) {
      const r = id === chip ? undefined : s.readings[id]
      if (r?.scheme === 'dark') light++
      else if (r) dark++
    }
    return light + dark ? light > dark : null
  })
  // The labels are text on glass, the scrim under them a contrast aid (layers.ts). Re-tagged
  // every frame because uikit adds a mesh whenever a label's text changes.
  useLayer(uiRef, LAYER.TEXT, { live: true, skip: isScrim })

  // uikit@1.0: the ref is the vanilla component; `size` is a signal of [w, h] in px.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    return root.size.subscribe((size) => {
      if (!size || size[0] <= 0) return
      setMeasured(size[0])
    })
  }, [])

  /**
   * The pill springs only when its width is *meant* to change: a link added or removed, or a
   * resize that moves the nav into another mode (which is the only way a resize changes the
   * pill, its width being content-driven). Everything else that moves the measurement — uikit
   * settling its layout over the first frames, a webfont arriving — is the nav appearing, and
   * it should appear at its final width rather than growing into it. Counting measurements
   * could not tell those apart: settling reports several, so the pill grew in.
   */
  const intent = `${links.length}:${mode}`
  const baseline = useRef<string | null>(null)
  useEffect(() => {
    if (baseline.current === null) baseline.current = intent
    else if (baseline.current !== intent) {
      baseline.current = intent
      setAnimate(true)
    }
  }, [intent])

  const width = measured ?? tokens.pillRadius * 2
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
      {/* The glass behind each label and the logo, as drawn (contrast.ts). */}
      {itemIds.map((id) => (
        <ItemContrast key={id} id={id} root={rootRef3d} element={() => registry.get(id)} band={LABEL_BAND} />
      ))}
      <ItemContrast id="logo" root={rootRef3d} element={() => logoRef.current} band={LOGO_BAND} />
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
      <group ref={uiRef} position-z={z}>
        <Scrim width={spring.width} light={scrimForLightInk ?? ink === INKS.dark.ink} />
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
              ref={logoRef}
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation()
                triggerDom('logo')
              }}
            >
              {/* The mark itself (assets/logo.svg), in the ink measured behind it, like the labels. */}
              <Svg src={logoUrl} width={tokens.logoSize} height={tokens.logoSize} color={logoInk} />
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
const isScrim = (o: THREE.Object3D) => o.name === 'label-scrim'

/** Where a label's glyphs sit in its box, and the logo's mark in its. */
const LABEL_BAND: [number, number] = [0.7, 0.4]
const LOGO_BAND: [number, number] = [0.6, 0.6]

function Scrim({ width, light }: { width: SpringValue<number>; light: boolean }) {
  const opacity = useTuning((s) => s.env.labelScrim)
  const morph = useMemo(() => new PillMorph(), [])
  const ref = useRef<THREE.Mesh>(null)
  useLayer(ref, LAYER.VEIL)
  useEffect(() => () => morph.dispose(), [morph])
  useFrame(() => morph.setWidth(width.get()))
  if (opacity <= 0) return null
  return (
    <mesh ref={ref} name="label-scrim" geometry={morph.geometry} scale-z={0.04} position-z={-0.003} raycast={() => null}>
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
