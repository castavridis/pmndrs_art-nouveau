import { Suspense, useEffect, useRef, useState } from 'react'
import { Container, Content, type VanillaContainer } from '@react-three/uikit'
import { useSpring } from '@react-spring/three'
import type { Group } from 'three'
import { useNavStore } from '../store'
import { px, tokens } from '../tokens'
import { Pill } from './Pill'
import { Clusters } from './Clusters'
import { Petals } from './Petals'
import { transmissionExcluded } from './materials'
import { useNavAssets } from './assets'
import { NavItem } from './NavItem'
import { INK, triggerDom } from './dom'

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
  const { logo } = useNavAssets()
  const [measured, setMeasured] = useState<number | null>(null)

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
      if (size && size[0] > 0) setMeasured(size[0])
    })
  }, [])

  const width = measured ?? tokens.pillRadius * 2
  const spring = useSpring({
    width,
    // Skip the opening animation on first measure; animate every change after that.
    immediate: measured === null || reducedMotion,
    config: { tension: 210, friction: 26 },
  })

  const z = px(tokens.pillDepth) / 2 + 0.004

  return (
    <>
      <Pill width={spring.width} />
      <Clusters width={spring.width} />
      {mode === 'full' && (
        <Petals
          width={spring.width}
          layoutWidth={width}
          count={Math.min(Math.max(links.length, 1), 3)}
          float={!reducedMotion}
        />
      )}
      <group ref={uiRef} position-z={z}>
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
            color={INK}
            depthTest={false}
          >
            <Container
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation()
                triggerDom('logo')
              }}
            >
              <Content width={tokens.logoSize} height={tokens.logoSize} depthAlign="back" keepAspectRatio>
                <mesh geometry={logo}>
                  <meshStandardMaterial color={INK} roughness={0.6} />
                </mesh>
              </Content>
            </Container>
            {mode === 'collapsed' ? (
              // Links live in Nav2D's disclosure; this item opens it.
              <NavItem id="menu" label="Menu" />
            ) : (
              links.map((l) => <NavItem key={l.id} id={l.id} label={l.label} />)
            )}
            <NavItem id="cmd" label="Cmd" />
          </Container>
        </Suspense>
      </group>
    </>
  )
}
