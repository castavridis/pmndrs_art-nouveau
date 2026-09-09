import { useMemo, type CSSProperties } from 'react'

export interface DrawnOutlineProps {
  /** The traced outline SVG's source text (import with `?raw`). */
  src: string
  width: number
  height: number
  className?: string
  style?: CSSProperties
  /** Draw the curves in (stroke reveal); false shows them complete. */
  play?: boolean
  /** Per-curve draw time and the delay between successive curves, in ms. */
  duration?: number
  stagger?: number
  /** Delay before the first curve starts, in ms. */
  delay?: number
}

const VIEWBOX = /viewBox="([^"]+)"/
const PATH_D = /<path[^>]*\sd="([^"]+)"/g
const STROKE_W = /stroke-width="([^"]+)"/

/**
 * A traced outline drawn in curve by curve: each closed loop of the trace becomes its own
 * path, revealed with a stroke-dash sweep, one after another. Strokes use currentColor, so
 * the ink follows the page (no image inversion needed). Same box as the `<img>` it replaces.
 */
export function DrawnOutline({ src, width, height, className, style, play = true, duration = 900, stagger = 160, delay = 0 }: DrawnOutlineProps) {
  const { viewBox, curves, strokeWidth } = useMemo(() => {
    const viewBox = VIEWBOX.exec(src)?.[1] ?? `0 0 ${width} ${height}`
    const strokeWidth = Number(STROKE_W.exec(src)?.[1] ?? 1.2)
    const curves: string[] = []
    for (const m of src.matchAll(PATH_D)) {
      // One <path> may hold several closed loops (M … Z M … Z): split so each draws separately.
      for (const part of m[1]!.split(/(?=M)/)) if (part.trim()) curves.push(part.trim())
    }
    return { viewBox, curves, strokeWidth }
  }, [src, width, height])
  return (
    <svg
      className={className}
      style={style}
      viewBox={viewBox}
      width={width}
      height={height}
      aria-hidden="true"
      data-drawn-outline=""
    >
      {curves.map((d, i) => (
        <path
          key={i}
          d={d}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: play ? 1 : 0,
            animation: play ? `outline-draw ${duration}ms cubic-bezier(0.3, 0, 0.2, 1) ${delay + i * stagger}ms forwards` : undefined,
          }}
        />
      ))}
    </svg>
  )
}
