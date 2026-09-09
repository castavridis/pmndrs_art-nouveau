import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { Ready } from '../nav/Nav3D/Ready'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { px, tokens } from '../nav/tokens'
import { preloadAnnouncementAssets, useAnnouncementAssets } from './announcementAssets'
import { announcement } from './announcementMetrics'
import leftOutline from '../nav/assets/fallback/outline/announcement-left.svg'
import rightOutline from '../nav/assets/fallback/outline/announcement-right.svg'
import fallback from '../nav/assets/fallback/manifest.json'
import styles from './Announcement.module.css'

const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null
const LcProbe = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/LcProbe')) : null

if (typeof window !== 'undefined') preloadAnnouncementAssets()
import { useOutlines } from '../nav/outlines'
import { useMeasure } from './useMeasure'
import { useInk } from '../nav/Nav3D/dom'
import { useTuning } from '../nav/Nav3D/tuning'
import { useIsClient } from '../isClient'

export interface AnnouncementProps {
  children: ReactNode
  /** Maximum banner width in px; it fills its container up to this. The flourishes stay pinned to the ends. */
  width?: number
  /**
   * `3d` (default) cross-fades from the vector outlines once rendered; `svg` stays vector;
   * `shared`: no canvas of its own — a page-level scene draws `AnnouncementParts` at this
   * element (see `onSlot`), and `sharedReady` says when it has.
   */
  variant?: '3d' | 'svg' | 'shared'
  sharedReady?: boolean
  /** Shared mode: reports the banner element and its measured size for the page scene. */
  onSlot?: (el: HTMLDivElement | null, size: { width: number; height: number }) => void
  postprocessing?: boolean
}

/**
 * A wide glass banner with the exported flourishes pinned to both ends (flower, bird-leaf and
 * petal on the left; flower, tendril and petal on the right). Content is DOM over the canvas.
 * Shows the traced outlines until the 3D has rendered, then cross-fades.
 */
export function Announcement({
  children,
  width = announcement.width,
  variant = '3d',
  sharedReady = false,
  onSlot,
  postprocessing = true,
}: AnnouncementProps) {
  const bleedX = tokens.clusterBleedX
  const bleedY = tokens.clusterBleedY + 20
  // The banner is sized by its container (up to `width`) and its content (at least
  // announcement.height); the glass slab follows the measured box.
  const rootRef = useRef<HTMLDivElement>(null)
  const size = useMeasure(rootRef, { width, height: announcement.height })
  const [ownReady, setReady] = useState(false)
  const ready = variant === 'shared' ? sharedReady : ownReady
  const vector = variant === 'svg' || !ready
  useEffect(() => {
    if (variant === 'shared') onSlot?.(rootRef.current, size)
  }, [variant, onSlot, size])
  // Ink follows the glass backdrop (see useInk); applied after hydration, CSS covers SSR/vector.
  const { ink } = useInk()
  const client = useIsClient()
  const contentRef = useRef<HTMLDivElement>(null)
  const canvasBox = useRef<HTMLDivElement>(null)
  // Dev legibility probe: the text box in canvas px (the canvas is inset by the bleed).
  const probeRegions = useCallback(() => {
    const c = contentRef.current
    const k = canvasBox.current
    if (!c || !k) return []
    const r = c.getBoundingClientRect()
    const b = k.getBoundingClientRect()
    return [{ name: 'announcement', x: r.x - b.x, y: r.y - b.y, w: r.width, h: r.height }]
  }, [])
  // Dev: outlines over the live 3D as well.
  const overlay = useOutlines((s) => s.overlay)
  const outlines = vector || overlay
  const L = fallback['announcement-left']
  const R = fallback['announcement-right']
  const end = announcement.height / 2
  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${vector ? styles.vector : ''} ${outlines ? styles.outlined : ''}`}
      style={{ width: '100%', maxWidth: width, minHeight: announcement.height, color: client && !vector ? ink : undefined }}
    >
      {/* Vector layer: outlined banner (CSS) and the traced flourishes pinned to the ends. */}
      <img
        className={styles.vectorPart}
        data-outline={outlines || undefined}
        src={leftOutline}
        alt=""
        aria-hidden="true"
        width={L.width}
        height={L.height}
        style={{ left: end - L.originX, top: end - L.originY, opacity: outlines ? 1 : 0 }}
      />
      <img
        className={styles.vectorPart}
        data-outline={outlines || undefined}
        src={rightOutline}
        alt=""
        aria-hidden="true"
        width={R.width}
        height={R.height}
        style={{
          right: end - (R.width - R.originX),
          top: end - R.originY,
          opacity: outlines ? 1 : 0,
        }}
      />
      {variant === '3d' && (
        <div
          ref={canvasBox}
          className={styles.canvas}
          style={{ inset: `${-bleedY}px ${-bleedX}px`, opacity: ready ? 1 : 0 }}
          aria-hidden="true"
        >
          <NavCanvas postprocessing={postprocessing}>
            <Suspense fallback={null}>
              <Scene width={size.width} height={size.height} />
              <Ready onReady={() => setReady(true)} />
              {LcProbe && <LcProbe ink={ink} regions={probeRegions} />}
            </Suspense>
            {DevHandles && (
              <Suspense fallback={null}>
                <DevHandles />
              </Suspense>
            )}
          </NavCanvas>
        </div>
      )}
      <div
        ref={contentRef}
        className={styles.content}
        style={{
          minHeight: announcement.height,
          padding: `16px ${announcement.paddingX}px`,
          paddingLeft: announcement.paddingX + 48,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Scene({ width, height }: { width: number; height: number }) {
  return <AnnouncementParts width={width} height={height} />
}

/**
 * The banner's 3D parts (slab + flourishes), centred at the origin, for its own canvas or a
 * shared page scene. `sampler` uses three's shared transmission pass for the slab, which a
 * scene with several glass surfaces prefers to one buffer per surface.
 */
export function AnnouncementParts({ width, height, sampler = false }: { width: number; height: number; sampler?: boolean }) {
  const { left, right } = useAnnouncementAssets()
  const choice = useTuning((s) => s.materials.flourishes)
  const preset = choice === 'live' ? undefined : choice
  const geometry = useMemo(
    () => makeRoundedRectGeometry(width, height, announcement.radius, announcement.depth),
    [width, height],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  const end = px(width) / 2 - px(announcement.height / 2)
  return (
    <>
      <mesh geometry={geometry}>
        <Glass sampler={sampler} />
      </mesh>
      <group position-x={-end}>
        <mesh geometry={left}>
          <Glass sampler preset={preset} />
        </mesh>
      </group>
      <group position-x={end}>
        <mesh geometry={right}>
          <Glass sampler preset={preset} />
        </mesh>
      </group>
    </>
  )
}
