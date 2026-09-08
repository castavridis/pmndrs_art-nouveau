import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { tokens } from '../nav/tokens'
import { preloadCalloutIcon, useCalloutIcon } from './calloutAssets'
import { Ready } from '../nav/Nav3D/Ready'
import iconOutline from '../nav/assets/fallback/outline/callout-icon.svg'
import fallback from '../nav/assets/fallback/manifest.json'
import styles from './Callout.module.css'
import { callout } from './calloutMetrics'
import { calloutKinds, kindHex, type CalloutKind } from './calloutKinds'
import type { GlassPreset } from '../nav/Nav3D/tuning'
import { useDomTilt, usePointerParallax } from './parallax'
import { useMeasure } from './useMeasure'
import { useOutlines } from '../nav/outlines'
import { ParallaxRig } from './ParallaxRig'

const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

if (typeof window !== 'undefined') preloadCalloutIcon()

export interface CalloutProps {
  /**
   * `surface`: a 3D glass slab behind DOM content. `plain`: a CSS card with only the icon in 3D.
   * `svg`: vector outlines only (the traced icon, an outlined card), no WebGL. The 3D variants
   * show the svg look while their canvas loads and cross-fade once it has rendered.
   */
  variant: 'surface' | 'plain' | 'svg'
  /** GitHub-style kind: sets the symbol inside the lens, the label and the palette tint. */
  kind?: CalloutKind
  title: string
  children: ReactNode
  postprocessing?: boolean
  /** Show the scene's light strips in this surface's reflections (the refracted lines are a global tuning). */
  strips?: boolean
  /** Maximum card width; the card fills its container up to this (default 560). */
  maxWidth?: number | string
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
  strips = true,
  maxWidth = callout.width,
}: CalloutProps) {
  // The card is sized by its DOM content (width from the container, height from the text) and
  // the 3D slab follows the measured box; until measured (and in SSR) it uses the metrics.
  const outer: CSSProperties = { width: '100%', maxWidth }
  const bleed = tokens.clusterBleedX
  const k = calloutKinds[kind]
  const tint = kindHex(kind)
  const preset: GlassPreset = k.colour
  // Parallax: the pointer over the card tilts the 3D layers (icon more than surface) and the
  // DOM content; the plain card tilts as a whole in CSS.
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pointer = usePointerParallax(rootRef)
  const size = useMeasure(rootRef, { width: callout.width, height: callout.height })
  useDomTilt(contentRef, pointer, variant === 'plain' ? 0 : 1.5, 4)
  const cardRef = useRef<HTMLDivElement>(null)
  useDomTilt(cardRef, pointer, variant === 'plain' ? 4 : 0, 0)
  // 3D readiness: vector outlines until the canvas has drawn its first frames.
  const [ready, setReady] = useState(false)
  const vector = variant === 'svg' || !ready
  // Dev: outlines over the live 3D as well.
  const overlay = useOutlines((s) => s.overlay)
  const outlines = vector || overlay
  const m = fallback['callout-icon']
  return (
    <div ref={rootRef} className={styles.parallaxRoot} style={outer}>
      <div
        ref={cardRef}
        className={`${styles.root} ${variant === 'plain' && !vector ? styles.plain : ''} ${vector ? styles.vector : ''} ${outlines ? styles.outlined : ''}`}
      >
        {/* Vector layer: traced outline of the icon, in place until the 3D one is up. */}
        <img
          className={styles.vectorIcon}
          src={iconOutline}
          data-outline={outlines || undefined}
          alt=""
          aria-hidden="true"
          width={m.width}
          height={m.height}
          style={{
            left: callout.iconX - m.originX,
            top: callout.iconY - m.originY,
            opacity: outlines ? 1 : 0,
          }}
        />
        {variant === 'surface' ? (
          // One canvas covers the card plus a bleed so the icon can overhang the corner.
          <div
            className={styles.canvas}
            style={{ inset: -bleed, opacity: ready ? 1 : 0 }}
            aria-hidden="true"
          >
            <NavCanvas postprocessing={postprocessing} strips={strips}>
              <Suspense fallback={null}>
                <ParallaxRig pointer={pointer} depth={0}>
                  <Surface preset={preset} width={size.width} height={size.height} />
                </ParallaxRig>
                <ParallaxRig pointer={pointer} depth={1}>
                  <IconAtCorner preset={preset} width={size.width} height={size.height} />
                </ParallaxRig>
                <Ready onReady={() => setReady(true)} />
              </Suspense>
              {DevHandles && (
                <Suspense fallback={null}>
                  <DevHandles />
                </Suspense>
              )}
            </NavCanvas>
          </div>
        ) : variant === 'plain' ? (
          // CSS card; a small transparent canvas holds just the icon at the corner.
          <div
            className={styles.canvas}
            style={{
              left: callout.iconX - callout.icon * 1.6,
              top: callout.iconY - callout.icon * 1.6,
              width: callout.icon * 3.2,
              height: callout.icon * 3.2,
              opacity: ready ? 1 : 0,
            }}
            aria-hidden="true"
          >
            <NavCanvas postprocessing={false} strips={strips}>
              <Suspense fallback={null}>
                <ParallaxRig pointer={pointer} depth={1} tilt={0.15}>
                  <Icon preset={preset} />
                </ParallaxRig>
                <Ready onReady={() => setReady(true)} />
              </Suspense>
              {DevHandles && (
                <Suspense fallback={null}>
                  <DevHandles />
                </Suspense>
              )}
            </NavCanvas>
          </div>
        ) : null}
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
          style={{
            padding: callout.padding,
            paddingLeft: callout.iconX + callout.icon * 0.75,
            // Never shorter than the icon needs, however little content there is.
            minHeight: callout.iconY + callout.icon / 2 + callout.padding,
          }}
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

interface Box {
  width: number
  height: number
}

/** The glass slab, centred in the canvas (which is the card plus bleed), rebuilt per card size. */
function Surface({ preset, width, height }: { preset: GlassPreset } & Box) {
  const geometry = useMemo(
    () => makeRoundedRectGeometry(width, height, callout.radius, callout.depth),
    [width, height],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <Glass preset={preset} />
    </mesh>
  )
}

/** Icon placed at the card's top-left corner (canvas origin is the card centre). */
function IconAtCorner({ preset, width, height }: { preset: GlassPreset } & Box) {
  const x = (-width / 2 + callout.iconX) / tokens.pxPerUnit
  const y = (height / 2 - callout.iconY) / tokens.pxPerUnit
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
