import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { tokens } from '../nav/tokens'
import { preloadCalloutIcon, useCalloutIcon } from './calloutAssets'
import styles from './Callout.module.css'
import { callout } from './calloutMetrics'
import { calloutKinds, kindHex, type CalloutKind } from './calloutKinds'
import type { GlassPreset } from '../nav/Nav3D/tuning'
import { useDomTilt, usePointerParallax } from './parallax'
import { ParallaxRig } from './ParallaxRig'

const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

preloadCalloutIcon()

export interface CalloutProps {
  /** `surface`: a 3D glass slab behind DOM content. `plain`: a CSS card with only the icon in 3D. */
  variant: 'surface' | 'plain'
  /** GitHub-style kind: sets the symbol inside the lens, the label and the palette tint. */
  kind?: CalloutKind
  title: string
  children: ReactNode
  postprocessing?: boolean
}

/**
 * A callout: the announcement icon (lens + leaves) in the top-left corner and DOM content.
 * Content is always DOM (accessible, selectable, wraps); only the decoration is 3D.
 */
export function Callout({
  variant,
  kind = 'note',
  title,
  children,
  postprocessing = true,
}: CalloutProps) {
  const size: CSSProperties = { width: callout.width, height: callout.height }
  const bleed = tokens.clusterBleedX
  const k = calloutKinds[kind]
  const tint = kindHex(kind)
  const preset: GlassPreset = k.colour
  // Parallax: the pointer over the card tilts the 3D layers (icon more than surface) and the
  // DOM content; the plain card tilts as a whole in CSS.
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pointer = usePointerParallax(rootRef)
  useDomTilt(contentRef, pointer, variant === 'plain' ? 0 : 1.5, 4)
  const cardRef = useRef<HTMLDivElement>(null)
  useDomTilt(cardRef, pointer, variant === 'plain' ? 4 : 0, 0)
  return (
    <div ref={rootRef} className={styles.parallaxRoot} style={size}>
      <div
        ref={cardRef}
        className={`${styles.root} ${variant === 'plain' ? styles.plain : ''}`}
        style={{ width: '100%', height: '100%' }}
      >
        {variant === 'surface' ? (
          // One canvas covers the card plus a bleed so the icon can overhang the corner.
          <div className={styles.canvas} style={{ inset: -bleed }} aria-hidden="true">
            <NavCanvas postprocessing={postprocessing}>
              <Suspense fallback={null}>
                <ParallaxRig pointer={pointer} depth={0}>
                  <Surface preset={preset} />
                </ParallaxRig>
                <ParallaxRig pointer={pointer} depth={1}>
                  <IconAtCorner preset={preset} />
                </ParallaxRig>
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
            <NavCanvas postprocessing={false}>
              <Suspense fallback={null}>
                <ParallaxRig pointer={pointer} depth={1} tilt={0.15}>
                  <Icon preset={preset} />
                </ParallaxRig>
              </Suspense>
              {DevHandles && (
                <Suspense fallback={null}>
                  <DevHandles />
                </Suspense>
              )}
            </NavCanvas>
          </div>
        )}
        {/* The kind's symbol, centred in the lens (DOM, so it stays crisp at any size). */}
        <div
          className={styles.symbol}
          style={{
            left: callout.iconX,
            top: callout.iconY,
            fontSize: callout.icon * 0.42,
            color: tint,
          }}
          aria-hidden="true"
        >
          {k.icon}
        </div>
        <div
          ref={contentRef}
          className={styles.content}
          style={{ padding: callout.padding, paddingLeft: callout.iconX + callout.icon * 0.75 }}
        >
          <div className={styles.kind} style={{ color: tint }}>
            {k.label}
          </div>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    </div>
  )
}

/** The glass slab, centred in the canvas (which is the card plus bleed). */
function Surface({ preset }: { preset: GlassPreset }) {
  const geometry = useMemo(
    () => makeRoundedRectGeometry(callout.width, callout.height, callout.radius, callout.depth),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <Glass preset={preset} />
    </mesh>
  )
}

/** Icon placed at the card's top-left corner (canvas origin is the card centre). */
function IconAtCorner({ preset }: { preset: GlassPreset }) {
  const x = (-callout.width / 2 + callout.iconX) / tokens.pxPerUnit
  const y = (callout.height / 2 - callout.iconY) / tokens.pxPerUnit
  return (
    <group position={[x, y, callout.depth / 2 / tokens.pxPerUnit + 0.02]}>
      <Icon preset={preset} />
    </group>
  )
}

/** Lens ring with the two leaves, scaled so the ring is `callout.icon` px across. */
export function Icon({ preset }: { preset: GlassPreset }) {
  const { lens, leafTop, leafBottom, size } = useCalloutIcon()
  const s = callout.icon / tokens.pxPerUnit / size
  return (
    <group scale={s}>
      <mesh geometry={lens}>
        <Glass sampler preset={preset} />
      </mesh>
      <mesh geometry={leafTop}>
        <Glass sampler preset={preset} />
      </mesh>
      <mesh geometry={leafBottom}>
        <Glass sampler preset={preset} />
      </mesh>
    </group>
  )
}
