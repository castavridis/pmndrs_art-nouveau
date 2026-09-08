import { useEffect, useRef, type RefObject } from 'react'
import { damp } from 'maath/easing'

/** Pointer position over an element, normalised to [-1, 1] on both axes; 0 when the pointer leaves. */
export interface Pointer {
  x: number
  y: number
}

/**
 * Tracks the pointer over `ref` into a mutable object (no React re-renders per move).
 * The 3D rig and the DOM tilt read it every frame.
 */
export function usePointerParallax(ref: RefObject<HTMLElement | null>): RefObject<Pointer> {
  const pointer = useRef<Pointer>({ x: 0, y: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1
      pointer.current.y = ((e.clientY - r.top) / r.height) * 2 - 1
    }
    const leave = () => {
      pointer.current.x = 0
      pointer.current.y = 0
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [ref])
  return pointer
}

/** Applies a matching CSS perspective tilt to a DOM element every frame (rAF, damped). */
export function useDomTilt(
  ref: RefObject<HTMLElement | null>,
  pointer: RefObject<Pointer>,
  degrees = 5,
  translate = 6,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let last = performance.now()
    const cur = { rx: 0, ry: 0, tx: 0, ty: 0 }
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const { x, y } = pointer.current
      damp(cur, 'ry', x * degrees, 0.18, dt)
      damp(cur, 'rx', -y * degrees, 0.18, dt)
      damp(cur, 'tx', x * translate, 0.18, dt)
      damp(cur, 'ty', y * translate, 0.18, dt)
      el.style.transform = `perspective(900px) rotateX(${cur.rx.toFixed(3)}deg) rotateY(${cur.ry.toFixed(3)}deg) translate3d(${cur.tx.toFixed(2)}px, ${cur.ty.toFixed(2)}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref, pointer, degrees, translate])
}
