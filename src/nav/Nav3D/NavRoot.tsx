import { Suspense, useEffect, useRef, useState } from 'react'
import { Container, Svg, Text, type VanillaContainer } from '@react-three/uikit'
import { useSpring } from '@react-spring/three'
import type { Group } from 'three'
import { useNavStore } from '../store'
import { px, tokens } from '../tokens'
import logoUrl from '../assets/logo.svg'
import { Pill } from './Pill'
import { Clusters } from './Clusters'
import { transmissionExcluded } from './materials'

const INK = '#111111'

/**
 * The 3D nav. A uikit row lays out Logo → links → Cmd in px (pixelSize = 1/pxPerUnit);
 * its measured width drives one spring that the Pill and the Clusters both read.
 * Logo and Cmd are hard-coded here; only the middle links come from the store.
 */
export function NavRoot() {
  const links = useNavStore((s) => s.links)
  const mode = useNavStore((s) => s.mode)
  const rootRef = useRef<VanillaContainer>(null)
  const uiRef = useRef<Group>(null)
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
    immediate: measured === null,
    config: { tension: 210, friction: 26 },
  })

  const z = px(tokens.pillDepth) / 2 + 0.004

  return (
    <>
      <Pill width={spring.width} />
      <Clusters width={spring.width} />
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
            paddingX={tokens.pillPadX[mode]}
            gap={tokens.gap[mode]}
            fontSize={tokens.fontSize[mode]}
            color={INK}
            depthTest={false}
          >
            <Svg src={logoUrl} width={tokens.logoSize} height={tokens.logoSize} color={INK} />
            {links.map((l) => (
              <Text key={l.id}>{l.label}</Text>
            ))}
            <Text>Cmd</Text>
          </Container>
        </Suspense>
      </group>
    </>
  )
}
