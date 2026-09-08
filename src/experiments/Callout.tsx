import { lazy, Suspense, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { tokens } from '../nav/tokens'
import { preloadCalloutIcon, useCalloutIcon } from './calloutAssets'
import styles from './Callout.module.css'
import { callout } from './calloutMetrics'

const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

preloadCalloutIcon()

export interface CalloutProps {
  /** `surface`: a 3D glass slab behind DOM content. `plain`: a CSS card with only the icon in 3D. */
  variant: 'surface' | 'plain'
  title: string
  children: ReactNode
  postprocessing?: boolean
}

/**
 * A callout: the announcement icon (lens + leaves) in the top-left corner and DOM content.
 * Content is always DOM (accessible, selectable, wraps); only the decoration is 3D.
 */
export function Callout({ variant, title, children, postprocessing = true }: CalloutProps) {
  const size: CSSProperties = { width: callout.width, height: callout.height }
  const bleed = tokens.clusterBleedX
  return (
    <div className={`${styles.root} ${variant === 'plain' ? styles.plain : ''}`} style={size}>
      {variant === 'surface' ? (
        // One canvas covers the card plus a bleed so the icon can overhang the corner.
        <div className={styles.canvas} style={{ inset: -bleed }} aria-hidden="true">
          <NavCanvas postprocessing={postprocessing}>
            <Suspense fallback={null}>
              <Surface />
              <IconAtCorner />
            </Suspense>
            {DevHandles && (
              <Suspense fallback={null}>
                <DevHandles />
              </Suspense>
            )}
          </NavCanvas>
        </div>
      ) : (
        // CSS card; a small transparent canvas holds just the icon at the corner.
        <div
          className={styles.canvas}
          style={{
            left: callout.iconX - callout.icon * 1.6,
            top: callout.iconY - callout.icon * 1.6,
            width: callout.icon * 3.2,
            height: callout.icon * 3.2,
          }}
          aria-hidden="true"
        >
          <NavCanvas postprocessing={postprocessing}>
            <Suspense fallback={null}>
              <Icon />
            </Suspense>
            {DevHandles && (
              <Suspense fallback={null}>
                <DevHandles />
              </Suspense>
            )}
          </NavCanvas>
        </div>
      )}
      <div className={styles.content} style={{ padding: callout.padding, paddingLeft: callout.iconX + callout.icon * 0.75 }}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}

/** The glass slab, centred in the canvas (which is the card plus bleed). */
function Surface() {
  const geometry = useMemo(() => makeRoundedRectGeometry(callout.width, callout.height, callout.radius, callout.depth), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <Glass />
    </mesh>
  )
}

/** Icon placed at the card's top-left corner (canvas origin is the card centre). */
function IconAtCorner() {
  const x = (-callout.width / 2 + callout.iconX) / tokens.pxPerUnit
  const y = (callout.height / 2 - callout.iconY) / tokens.pxPerUnit
  return (
    <group position={[x, y, callout.depth / 2 / tokens.pxPerUnit + 0.02]}>
      <Icon />
    </group>
  )
}

/** Lens ring with the two leaves, scaled so the ring is `callout.icon` px across. */
export function Icon() {
  const { lens, leafTop, leafBottom, size } = useCalloutIcon()
  const s = callout.icon / tokens.pxPerUnit / size
  return (
    <group scale={s}>
      <mesh geometry={lens}>
        <Glass sampler />
      </mesh>
      <mesh geometry={leafTop}>
        <Glass sampler />
      </mesh>
      <mesh geometry={leafBottom}>
        <Glass sampler />
      </mesh>
    </group>
  )
}
