import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { Ready } from '../nav/Nav3D/Ready'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { px, tokens } from '../nav/tokens'
import { preloadAnnouncementAssets, useAnnouncementAssets } from './announcementAssets'
import { announcement } from './announcementMetrics'
import leftOutline from '../nav/assets/fallback/outline/announcement-left.svg?raw'
import rightOutline from '../nav/assets/fallback/outline/announcement-right.svg?raw'
import { DrawnOutline } from '../nav/DrawnOutline'
import fallback from '../nav/assets/fallback/manifest.json'
import styles from './Announcement.module.css'

const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null
const LcProbe = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/LcProbe')) : null

if (typeof window !== 'undefined') preloadAnnouncementAssets()
import { useOutlines } from '../nav/outlines'
import { useMeasure } from './useMeasure'
import { useInk } from '../nav/Nav3D/dom'
import { useTuning } from '../nav/Nav3D/tuning'
import { Backing } from '../nav/Nav3D/Backing'
import { Shards } from './Shards'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { useIsClient } from '../isClient'

/** A strike on the banner: where (slab-local x/y, world units) and the slab size at that moment. */
export interface Shatter {
  hit: [number, number]
  width: number
  height: number
}

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
  /**
   * Shared mode: reports the banner element and its measured size for the page scene, and
   * (after a click) where the glass was struck, in the slab's local x/y in world units.
   */
  onSlot?: (el: HTMLDivElement | null, size: { width: number; height: number }, shatter?: Shatter | null) => void
  postprocessing?: boolean
  /** Clicking the banner shatters the glass under the pointer and the banner falls away. */
  dismissible?: boolean
  /** After the fall: the banner has unmounted its content. */
  onDismiss?: () => void
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
  dismissible = true,
  onDismiss,
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
  // Shatter: where the glass was struck (slab-local world units), then the fall and dismissal.
  const [shatter, setShatter] = useState<Shatter | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (variant === 'shared') onSlot?.(rootRef.current, size, shatter)
  }, [variant, onSlot, size, shatter])
  // After the strike: the banner drops (CSS), its space closes once it is out of sight, and
  // the element leaves only after the shards have fallen (own-canvas mode draws them in it).
  useEffect(() => {
    if (!shatter) return
    const a = window.setTimeout(() => setCollapsed(true), 1100)
    const b = window.setTimeout(() => {
      setGone(true)
      onDismiss?.()
    }, 2800)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [shatter, onDismiss])
  const strike = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dismissible || shatter || vector) return
    if ((e.target as HTMLElement).closest('a, button')) return
    const r = rootRef.current!.getBoundingClientRect()
    // The size is captured now: the banner collapses later and the shards must not re-form.
    setShatter({ hit: [px(e.clientX - r.left - r.width / 2), px(r.height / 2 - (e.clientY - r.top))], width: r.width, height: r.height })
  }
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
  if (gone) return null
  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${vector ? styles.vector : ''} ${outlines ? styles.outlined : ''} ${shatter ? styles.falling : ''}`}
      style={{
        width: '100%',
        maxWidth: width,
        minHeight: collapsed ? 0 : announcement.height,
        // Once struck the height is pinned, so it can close smoothly to 0 after the drop.
        height: shatter ? (collapsed ? 0 : size.height) : undefined,
        transition: shatter ? 'height 600ms cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
        color: client && !vector ? ink : undefined,
        cursor: dismissible && !vector ? 'pointer' : undefined,
      }}
      onClick={strike}
      title={dismissible && !vector ? 'Click to dismiss' : undefined}
    >
      {/* Vector layer: outlined banner (CSS) and the traced flourishes pinned to the ends. */}
      {/* The flourishes draw themselves in, curve by curve, whenever the outlines show. */}
      <DrawnOutline
        key={outlines ? 'left-on' : 'left-off'}
        className={styles.vectorPart}
        src={leftOutline}
        width={L.width}
        height={L.height}
        play={outlines}
        style={{ left: end - L.originX, top: end - L.originY, opacity: outlines ? 1 : 0 }}
      />
      <DrawnOutline
        key={outlines ? 'right-on' : 'right-off'}
        className={styles.vectorPart}
        src={rightOutline}
        width={R.width}
        height={R.height}
        play={outlines}
        stagger={200}
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
              <Scene width={size.width} height={size.height} shatter={shatter} />
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

function Scene({ width, height, shatter }: { width: number; height: number; shatter: Shatter | null }) {
  return <AnnouncementParts width={width} height={height} shatter={shatter} />
}

/**
 * The banner's 3D parts (slab + flourishes), centred at the origin, for its own canvas or a
 * shared page scene. `sampler` uses three's shared transmission pass for the slab, which a
 * scene with several glass surfaces prefers to one buffer per surface.
 */
export function AnnouncementParts({
  width,
  height,
  sampler = false,
  shatter = null,
}: {
  width: number
  height: number
  sampler?: boolean
  /** Struck: the slab becomes shards (built from the size at the strike) and the flourishes drop. */
  shatter?: Shatter | null
}) {
  const { left, right } = useAnnouncementAssets()
  const choice = useTuning((s) => s.materials.flourishes)
  const preset = choice === 'live' ? undefined : choice
  const geometry = useMemo(
    () => makeRoundedRectGeometry(width, height, announcement.radius, announcement.depth),
    [width, height],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  const end = px(width) / 2 - px(announcement.height / 2)
  // The flourishes fall away with the banner once it is struck.
  const fall = useRef<THREE.Group>(null)
  const fallT = useRef(0)
  useFrame((_, dt) => {
    const g = fall.current
    if (!g || !shatter) return
    fallT.current += Math.min(dt, 0.05)
    const t = fallT.current
    g.position.y = -4.5 * t * t
    g.rotation.z = -0.25 * t
    g.position.x = 0.4 * t
  })
  return (
    <group ref={fall}>
      {sampler && !shatter && <Backing width={width} height={height} depth={announcement.depth} />}
      {shatter ? (
        <Shards width={px(shatter.width)} height={px(shatter.height)} depth={px(announcement.depth)} hit={shatter.hit} />
      ) : (
        <mesh geometry={geometry}>
          <Glass sampler={sampler} />
        </mesh>
      )}
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
    </group>
  )
}
