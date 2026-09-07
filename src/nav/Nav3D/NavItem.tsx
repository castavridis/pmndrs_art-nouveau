import { useMemo } from 'react'
import { signal } from '@preact/signals-core'
import { useFrame } from '@react-three/fiber'
import { Container, Text } from '@react-three/uikit'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useNavStore } from '../store'
import { INK, triggerDom } from './dom'

const INK_HOVER = '#3b2a6e'
const LIFT_PX = 2

export interface NavItemProps {
  /** Matches `data-id` on the DOM anchor/button in Nav2D. */
  id: string
  label: string
}

/**
 * One item in the 3D pill. Pointer interaction is uikit's. Keyboard focus and screen-reader
 * semantics are NOT re-implemented here: the DOM anchors in Nav2D stay the one focusable,
 * announced nav (Task 6 keeps them in the tab order while hiding their visuals) and their
 * focus is mirrored into the store, which lights this item up. Pointer clicks are forwarded
 * to the same DOM element, so navigation happens in exactly one place.
 */
export function NavItem({ id, label }: NavItemProps) {
  const setHovered = useNavStore((s) => s.setHovered)
  return (
    <Container
      cursor="pointer"
      onHoverChange={(h) => setHovered(h ? id : null)}
      onClick={(e) => {
        e.stopPropagation()
        triggerDom(id)
      }}
    >
      <Label id={id} label={label} />
    </Container>
  )
}

/** The text, lifted and tinted by a spring while hovered or focused. Transform-only: no layout shift. */
function Label({ id, label }: { id: string; label: string }) {
  const lit = useNavStore((s) => s.hovered === id || s.focused === id)
  const active = useNavStore((s) => s.active === id)
  const spring = useSpring({ t: lit ? 1 : 0, config: { tension: 300, friction: 18 } })
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
