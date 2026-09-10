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
  /**
   * Break the outline apart: each curve drifts off on its own arc under the same gravity the
   * 3D pieces fall with. The trace is already one path per closed loop (that is what draws it
   * in curve by curve), so the pieces are the shapes the artwork is actually made of.
   */
  scatter?: boolean
  /**
   * Draw only the loops on one side of `splitY` (in viewBox units). The announcement's
   * flourishes are cut this way so each half can be pinned to the banner edge it was drawn
   * against, instead of the pair drifting into the middle of a tall banner.
   */
  half?: 'top' | 'bottom'
  splitY?: number
}

const VIEWBOX = /viewBox="([^"]+)"/
const PATH_D = /<path[^>]*\sd="([^"]+)"/g
const STROKE_W = /stroke-width="([^"]+)"/

/**
 * A traced outline drawn in curve by curve: each closed loop of the trace becomes its own
 * path, revealed with a stroke-dash sweep, one after another. Strokes use currentColor, so
 * the ink follows the page (no image inversion needed). Same box as the `<img>` it replaces.
 */
export function DrawnOutline({ src, width, height, className, style, play = true, duration = 900, stagger = 160, delay = 0, scatter = false, half, splitY = 0 }: DrawnOutlineProps) {
  const { viewBox, curves, strokeWidth } = useMemo(() => {
    const viewBox = VIEWBOX.exec(src)?.[1] ?? `0 0 ${width} ${height}`
    const strokeWidth = Number(STROKE_W.exec(src)?.[1] ?? 1.2)
    let curves: string[] = []
    for (const m of src.matchAll(PATH_D)) {
      // One <path> may hold several closed loops (M … Z M … Z): split so each draws separately.
      for (const part of m[1]!.split(/(?=M)/)) if (part.trim()) curves.push(part.trim())
    }
    if (half) curves = curves.filter((d) => (loopMidY(d) >= splitY) === (half === 'bottom'))
    return { viewBox, curves, strokeWidth }
  }, [src, width, height, half, splitY])
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
      {curves.map((d, i) => {
        // A stable pseudo-random per curve, so a given outline always breaks the same way.
        const r = Math.sin((i + 1) * 12.9898) * 43758.5453
        const rand = r - Math.floor(r)
        return (
          <path
            key={i}
            d={d}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={
              scatter
                ? ({
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    animation: `outline-scatter 1500ms cubic-bezier(0.3, 0, 0.8, 0.6) ${i * 40}ms forwards`,
                    '--drift-x': `${(rand - 0.5) * 90}px`,
                    '--drift-r': `${(rand - 0.5) * 140}deg`,
                  } as React.CSSProperties)
                : {
                    strokeDasharray: 1,
                    strokeDashoffset: play ? 1 : 0,
                    animation: play
                      ? `outline-draw ${duration}ms cubic-bezier(0.3, 0, 0.2, 1) ${delay + i * stagger}ms forwards`
                      : undefined,
                  }
            }
          />
        )
      })}
    </svg>
  )
}

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi

/**
 * Vertical centre of one traced loop. The trace is absolute coordinate pairs throughout
 * (potrace emits M/L/C), so every second number is a y.
 */
function loopMidY(d: string): number {
  let min = Infinity
  let max = -Infinity
  let i = 0
  for (const m of d.matchAll(NUMBER)) {
    if (i++ % 2 === 1) {
      const y = Number(m[0])
      if (y < min) min = y
      if (y > max) max = y
    }
  }
  return min === Infinity ? 0 : (min + max) / 2
}
