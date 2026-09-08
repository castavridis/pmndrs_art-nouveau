import { lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { px, tokens } from '../nav/tokens'
import { preloadAnnouncementAssets, useAnnouncementAssets } from './announcementAssets'
import styles from './Announcement.module.css'

const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

preloadAnnouncementAssets()

import { announcement } from './announcementMetrics'

export interface AnnouncementProps {
  children: ReactNode
  /** Banner width in px; the flourishes stay pinned to the ends. */
  width?: number
  postprocessing?: boolean
}

/**
 * A wide glass banner with the exported flourishes pinned to both ends (flower, bird-leaf and
 * petal on the left; flower, tendril and petal on the right). Content is DOM over the canvas.
 */
export function Announcement({
  children,
  width = announcement.width,
  postprocessing = true,
}: AnnouncementProps) {
  const bleedX = tokens.clusterBleedX
  const bleedY = tokens.clusterBleedY + 20
  return (
    <div className={styles.root} style={{ width, height: announcement.height }}>
      <div
        className={styles.canvas}
        style={{ inset: `${-bleedY}px ${-bleedX}px` }}
        aria-hidden="true"
      >
        <NavCanvas postprocessing={postprocessing}>
          <Suspense fallback={null}>
            <Scene width={width} />
          </Suspense>
          {DevHandles && (
            <Suspense fallback={null}>
              <DevHandles />
            </Suspense>
          )}
        </NavCanvas>
      </div>
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
