import { useLayoutEffect, useState, type RefObject } from 'react'

export interface Measured {
  width: number
  height: number
}

/**
 * The element's border-box size in CSS px, kept current with a ResizeObserver.
 * Returns `initial` until the first measurement (and during SSR).
 */
export function useMeasure(ref: RefObject<HTMLElement | null>, initial: Measured): Measured {
  const [size, setSize] = useState(initial)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const r = el.getBoundingClientRect()
      const next = { width: Math.round(r.width), height: Math.round(r.height) }
      setSize((s) => (s.width === next.width && s.height === next.height ? s : next))
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}
