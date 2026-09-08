import { useEffect, useMemo, useRef } from 'react'
import { signal } from '@preact/signals-core'
import { useFrame } from '@react-three/fiber'
import { Container, Svg, Text, type VanillaContainer } from '@react-three/uikit'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useNavStore } from '../store'
import { tokens } from '../tokens'
import { INK, triggerDom } from './dom'
import { useItemRegistry } from './items'
import cmdIcon from '../assets/cmd.svg'

const INK_HOVER = '#3b2a6e'
const LIFT_PX = 2

export interface NavItemProps {
  /** Matches `data-id` on the DOM anchor/button in Nav2D. */
  id: string
  label: string
  /** Keyboard hint rendered like Nav2D's <kbd> (keeps both rows the same width). */
  kbd?: string
}

/**
 * One item in the 3D pill. Pointer interaction is uikit's. Keyboard focus and screen-reader
 * semantics are NOT re-implemented here: the DOM anchors in Nav2D stay the one focusable,
 * announced nav (Task 6 keeps them in the tab order while hiding their visuals) and their
 * focus is mirrored into the store, which lights this item up. Pointer clicks are forwarded
 * to the same DOM element, so navigation happens in exactly one place.
 */
export function NavItem({ id, label, kbd }: NavItemProps) {
  const setHovered = useNavStore((s) => s.setHovered)
  const mode = useNavStore((s) => s.mode)
  // uikit lengths are px; derive the em-based kbd metrics from the current font size.
  const em = tokens.fontSize[mode]
  const registry = useItemRegistry()
  const ref = useRef<VanillaContainer>(null)
  useEffect(() => {
    const el = ref.current
    if (!registry || !el) return
    registry.set(id, el)
    return () => void registry.delete(id)
  }, [id, registry])
  return (
    <Container
      ref={ref}
      cursor="pointer"
      onHoverChange={(h) => setHovered(h ? id : null)}
      onClick={(e) => {
        e.stopPropagation()
        triggerDom(id)
      }}
    >
      <Label id={id} label={label} />
      {kbd && (
        // Mirrors Nav2D.module.css `.kbd`: 0.7em, padding .15em .4em, margin-left .5em, radius 5.
        // The bundled Inter MSDF has no "⌘" glyph, so the symbol is an SVG; the rest is text.
        <Container
          marginLeft={0.5 * em}
          paddingX={0.4 * em}
          paddingY={0.15 * em}
          borderRadius={5}
          // uikit@1.0 has no background opacity; this is 8% black over the pill's tint.
          backgroundColor="#aab68a"
          flexDirection="row"
          alignItems="center"
          gap={0.05 * em}
        >
          {kbd.startsWith('⌘') && <Svg src={cmdIcon} width={0.75 * em} height={0.75 * em} color={INK} />}
          <Text fontSize={0.7 * em} color={INK}>
            {kbd.replace('⌘', '')}
          </Text>
        </Container>
      )}
    </Container>
  )
}

/** The text, lifted and tinted by a spring while hovered or focused. Transform-only: no layout shift. */
function Label({ id, label }: { id: string; label: string }) {
  const lit = useNavStore((s) => s.hovered === id || s.focused === id)
  const active = useNavStore((s) => s.active === id)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const spring = useSpring({ t: lit ? 1 : 0, immediate: reducedMotion, config: { tension: 300, friction: 18 } })
  const anim = useMemo(() => new LabelAnim(), [])
  useFrame(() => anim.update(spring.t.get()))
  return (
    <Text transformTranslateY={anim.y} color={anim.color} fontWeight={active ? 'medium' : 'normal'}>
      {label}
    </Text>
  )
}

/**
 * Bridge react-spring → uikit. uikit props accept signals, so the spring is written into
 * them every frame instead of re-rendering React.
 */
class LabelAnim {
  readonly y = signal(0)
  readonly color = signal(INK)
  private readonly from = new THREE.Color(INK)
  private readonly to = new THREE.Color(INK_HOVER)
  private readonly tmp = new THREE.Color()

  update(t: number) {
    const ny = -LIFT_PX * t
    if (this.y.value !== ny) this.y.value = ny
    const c = '#' + this.tmp.copy(this.from).lerp(this.to, t).getHexString()
    if (this.color.value !== c) this.color.value = c
  }
}
