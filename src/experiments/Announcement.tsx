import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
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

if (typeof window !== 'undefined') preloadAnnouncementAssets()
import { useOutlines } from '../nav/outlines'

export interface AnnouncementProps {
  children: ReactNode
  /** Banner width in px; the flourishes stay pinned to the ends. */
  width?: number
  /** `3d` (default) cross-fades from the vector outlines once rendered; `svg` stays vector. */
  variant?: '3d' | 'svg'
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
  postprocessing = true,
}: AnnouncementProps) {
  const bleedX = tokens.clusterBleedX
  const bleedY = tokens.clusterBleedY + 20
  const [ready, setReady] = useState(false)
  const vector = variant === 'svg' || !ready
  // Dev: outlines over the live 3D as well.
  const overlay = useOutlines((s) => s.overlay)
  const outlines = vector || overlay
  const L = fallback['announcement-left']
  const R = fallback['announcement-right']
  const end = announcement.height / 2
  return (
    <div
      className={`${styles.root} ${vector ? styles.vector : ''} ${outlines ? styles.outlined : ''}`}
      style={{ width, height: announcement.height }}
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
          className={styles.canvas}
          style={{ inset: `${-bleedY}px ${-bleedX}px`, opacity: ready ? 1 : 0 }}
          aria-hidden="true"
        >
          <NavCanvas postprocessing={postprocessing}>
            <Suspense fallback={null}>
              <Scene width={width} />
              <Ready onReady={() => setReady(true)} />
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
        className={styles.content}
        style={{ padding: `0 ${announcement.paddingX}px`, paddingLeft: announcement.paddingX + 48 }}
      >
        {children}
      </div>
    </div>
  )
}

function Scene({ width }: { width: number }) {
  const { left, right } = useAnnouncementAssets()
  const geometry = useMemo(
    () =>
      makeRoundedRectGeometry(width, announcement.height, announcement.radius, announcement.depth),
    [width],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  const end = px(width) / 2 - px(announcement.height / 2)
  return (
    <>
      <mesh geometry={geometry}>
        <Glass />
      </mesh>
      <group position-x={-end}>
        <mesh geometry={left}>
          <Glass sampler />
        </mesh>
      </group>
      <group position-x={end}>
        <mesh geometry={right}>
          <Glass sampler />
        </mesh>
      </group>
    </>
  )
}
