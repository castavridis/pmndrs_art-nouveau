import { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { Ready } from '../nav/Nav3D/Ready'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { px, tokens } from '../nav/tokens'
import { preloadAnnouncementAssets, useAnnouncementAssets, type FlourishHalves } from './announcementAssets'
import { announcement } from './announcementMetrics'
import leftOutline from '../nav/assets/fallback/outline/announcement-left.svg?raw'
import rightOutline from '../nav/assets/fallback/outline/announcement-right.svg?raw'
import { DrawnOutline } from '../nav/DrawnOutline'
import fallback from '../nav/assets/fallback/manifest.json'
import styles from './Announcement.module.css'

const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

if (typeof window !== 'undefined') preloadAnnouncementAssets()
import { useOutlines } from '../nav/outlines'
import { useMeasure } from './useMeasure'
import { luminance, useInk } from '../nav/Nav3D/dom'
import { ContrastScopeContext, useContrastScope, useMeasuredInk } from '../nav/Nav3D/contrast'
import { useTuning } from '../nav/Nav3D/tuning'
import type { PresetName } from '../nav/Nav3D/customPresets'
import { Backing } from '../nav/Nav3D/Backing'
import { Shards } from './Shards'
import { printSegments, readPrintSegments, slabUv } from './announcementPrint'
import { usePrintText } from '../nav/printText'
import { PrintLayer, usePrintMaterial } from './PrintLayer'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useIsClient } from '../isClient'
import { HoverPill, useHoverPointer, type HoverState } from './HoverPill'

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
  onSlot?: (slot: {
    el: HTMLDivElement | null
    width: number
    height: number
    shatter: Shatter | null
    print: THREE.Texture | null
    ink: string
    /** Pointer over the banner, for the chip the page scene draws (see HoverPill). */
    hover: RefObject<HoverState> | null
  }) => void
  postprocessing?: boolean
  /**
   * Print the copy into the glass itself instead of laying DOM text over it: it is measured
   * from this component's own markup, so nothing is repeated at the call site. The DOM copy
   * stays for SSR, search and screen readers, and its links stay focusable and clickable;
   * only its paint is hidden. Printed text breaks apart with the glass.
   *
   * Defaults to on, and the dev panel can turn it off globally (view → printed text).
   */
  print?: boolean
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
  print,
}: AnnouncementProps) {
  // The flourishes reach ~50px past each end and sit in front of the slab, so perspective
  // pushes them further out again; the canvas needs more room than the nav's cluster bleed.
  // Vertically a fixed 72px: this grew with the nav's cluster bleed until the nav's frame was
  // scaled up, which the banner's own flourishes have nothing to do with.
  const bleedX = tokens.clusterBleedX * 2
  const bleedY = 72
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

  // The chip that follows the pointer across the banner and parks under the close button. It
  // freezes on the strike so it drops from where it was standing rather than gliding home first.
  const hover = useHoverPointer(rootRef, { frozen: !!shatter })
  const strikeAt = useCallback(
    (clientX: number, clientY: number) => {
      const r = rootRef.current!.getBoundingClientRect()
      // The size is captured now: the banner collapses later and the shards must not re-form.
      setShatter({
        hit: [px(clientX - r.left - r.width / 2), px(r.height / 2 - (clientY - r.top))],
        width: r.width,
        height: r.height,
      })
    },
    [],
  )
  const strike = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dismissible || shatter || vector) return
    // Links and the close button handle their own clicks.
    if ((e.target as HTMLElement).closest('a, button')) return
    strikeAt(e.clientX, e.clientY)
  }
  // Ink as measured on the glass behind the copy (contrast.ts), by the canvas that draws that
  // glass: the banner's own, or the page's when it rides a shared scene. The glass-keyed guess
  // stands in until the first reading; applied after hydration, CSS covers SSR and the vector.
  const contentRef = useRef<HTMLDivElement>(null)
  const pageScope = useContext(ContrastScopeContext)
  const ownScope = useContrastScope()
  const { ink } = useMeasuredInk(contentRef, useInk(), {
    scope: variant === 'shared' ? pageScope : ownScope,
    name: 'announcement',
    enabled: !vector,
  })
  const client = useIsClient()
  const printAllowed = usePrintText((st) => st.enabled)
  // The print is drawn by a basic material with tone mapping off, so its colour reaches the
  // frame untouched: snap the page ink to pure white (or near-black) for maximum legibility
  // on the glass, without changing any scene-wide setting.
  const printInk = luminance(ink) > 0.5 ? '#ffffff' : '#0a0a0a'
  const printOn = print !== false && printAllowed && !vector
  // Measured from the rendered copy once the page font is in, so the raster matches the DOM
  // exactly — including where it wraps. Re-baked when the box, the ink or the switch changes.
  const [printed, setPrinted] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let alive = true
    if (!printOn) {
      queueMicrotask(() => alive && setPrinted((old) => (old?.dispose(), null)))
      return () => {
        alive = false
      }
    }
    // Struck: the copy is frozen with the pieces that carry it. The banner's box is closing to
    // zero from here, so every re-bake would be a worse raster than the one already in flight.
    if (shatter) return
    const bake = () => {
      const content = contentRef.current
      const root = rootRef.current
      if (!alive || !content || !root) return
      const segments = readPrintSegments(content, root.getBoundingClientRect())
      if (!segments.length) return
      const tex = printSegments(segments, { width: size.width, height: size.height, color: printInk })
      setPrinted((old) => (old?.dispose(), tex))
    }
    document.fonts?.ready.then(bake).catch(bake)
    return () => {
      alive = false
    }
  }, [printOn, size.width, size.height, printInk, shatter])

  useEffect(() => {
    if (variant === 'shared') onSlot?.({ el: rootRef.current, ...size, shatter, print: printed, ink: printInk, hover })
  }, [variant, onSlot, size, shatter, printed, printInk, hover])
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
      {/* Each end is cut at the band's centre line and its halves pinned to the banner's own
          top and bottom edges, so a tall banner keeps its corners decorated (same split as
          the 3D pieces). The horizontal placement is unchanged. */}
      {(['top', 'bottom'] as const).map((half) => (
        <DrawnOutline
          key={`left-${half}-${outlines ? 'on' : 'off'}`}
          className={styles.vectorPart}
          src={leftOutline}
          width={L.width}
          height={L.height}
          play={outlines}
          scatter={!!shatter}
          half={half}
          splitY={L.originY}
          style={{
            left: end - L.originX,
            [half === 'top' ? 'top' : 'bottom']:
              half === 'top' ? end - L.originY : end - (L.height - L.originY),
            opacity: outlines ? 1 : 0,
          }}
        />
      ))}
      {(['top', 'bottom'] as const).map((half) => (
        <DrawnOutline
          key={`right-${half}-${outlines ? 'on' : 'off'}`}
          className={styles.vectorPart}
          src={rightOutline}
          width={R.width}
          height={R.height}
          play={outlines}
          scatter={!!shatter}
          stagger={200}
          half={half}
          splitY={R.originY}
          style={{
            right: end - (R.width - R.originX),
            [half === 'top' ? 'top' : 'bottom']:
              half === 'top' ? end - R.originY : end - (R.height - R.originY),
            opacity: outlines ? 1 : 0,
          }}
        />
      ))}
      {variant === '3d' && (
        <div
          className={styles.canvas}
          style={{ inset: `${-bleedY}px ${-bleedX}px`, opacity: ready ? 1 : 0 }}
          aria-hidden="true"
        >
          <NavCanvas postprocessing={postprocessing} contrast={ownScope}>
            <Suspense fallback={null}>
              <Scene width={size.width} height={size.height} shatter={shatter} print={printed} ink={printInk} hover={dismissible ? hover : null} />
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
        ref={contentRef}
        className={`${styles.content} ${printed ? styles.printed : ''}`}
        style={{
          minHeight: announcement.height,
          // Symmetric insets that clear both flourishes, so the copy sits centred in the band
          // and still fits on one line at the banner's full width. The close chip needs no room
          // of its own: it hangs off the corner, well outside this.
          padding: `16px ${announcement.paddingX + 24}px`,
        }}
      >
        {children}
      </div>
      {dismissible && !gone && (
        // The chip behind it is 3D (HoverPill), so this carries only the mark and the hit area.
        // `data-pill-home` tells the tracker this is where the chip lives, so approaching the
        // button parks it rather than making it retreat the way a link does.
        <button
          type="button"
          data-pill-home=""
          data-etched={!vector || undefined}
          className={styles.close}
          style={{
            width: announcement.close.size,
            height: announcement.close.size,
            top: announcement.close.inset - announcement.close.size / 2,
            right: announcement.close.inset - announcement.close.size / 2,
          }}
          aria-label="Dismiss announcement"
          onClick={(e) => {
            e.stopPropagation()
            if (shatter) return
            const r = e.currentTarget.getBoundingClientRect()
            strikeAt(r.left + r.width / 2, r.top + r.height / 2)
          }}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path
              d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

function Scene({
  width,
  height,
  shatter,
  print,
  ink,
  hover,
}: {
  width: number
  height: number
  shatter: Shatter | null
  print?: THREE.Texture | null
  ink?: string
  hover?: RefObject<HoverState> | null
}) {
  return <AnnouncementParts width={width} height={height} shatter={shatter} print={print} ink={ink} hover={hover} />
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
  print,
  ink = '#f2f2ef',
  hover,
}: {
  width: number
  height: number
  sampler?: boolean
  /** Struck: the slab becomes shards (built from the size at the strike) and the flourishes drop. */
  shatter?: Shatter | null
  /** The baked copy, printed into the glass so it breaks with it. */
  print?: THREE.Texture | null
  /** Ink for the printed text. */
  ink?: string
  /** Pointer over the banner; drives the chip under the close button. Omit for no chip. */
  hover?: RefObject<HoverState> | null
}) {
  const { leftHalves, rightHalves, rightAnchor } = useAnnouncementAssets()
  const choice = useTuning((s) => s.materials.flourishes)
  const preset = choice === 'live' ? undefined : choice
  const dismissChoice = useTuning((s) => s.materials.dismiss)
  const dismissPreset = dismissChoice === 'live' ? undefined : dismissChoice
  const geometry = useMemo(() => {
    const g = makeRoundedRectGeometry(width, height, announcement.radius, announcement.depth)
    // UVs across the whole slab, so the printed raster lands where the DOM copy would.
    return print ? slabUv(g, px(width), px(height)) : g
  }, [width, height, print])
  useEffect(() => () => geometry.dispose(), [geometry])
  const printed = print ?? null
  const printMaterial = usePrintMaterial(printed, ink)
  // A flat plane on the slab's face, rather than the extruded slab itself: the extrusion's
  // back and bevel faces carry the same UVs, which ghosted and smeared the glyphs.
  const printPlane = useMemo(() => new THREE.PlaneGeometry(px(width), px(height)), [width, height])
  useEffect(() => () => printPlane.dispose(), [printPlane])
  const end = px(width) / 2 - px(announcement.height / 2)
  // The flourishes were drawn against a 94px band. A banner is as tall as its copy, so the
  // halves are pushed apart by whatever the banner gained: each stays on the edge it belongs to
  // instead of both drifting toward the middle of a tall panel.
  const grow = Math.max(0, (px(height) - px(announcement.height)) / 2)
  // The flourishes sit in front of the slab, and a perspective camera magnifies what is
  // nearer — enough to push the right blossom clear of the end it decorates. Solve for the
  // placement that projects its centre onto the slab's own edge:
  //   (x + anchorX) / (camZ - anchorZ) == edgeX / (camZ - frontZ)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const camZ = Math.max(0.001, camera.position.z)
  const edgeX = px(width) / 2
  const frontZ = px(announcement.depth) / 2
  const rightEnd =
    (edgeX * Math.max(0.001, camZ - rightAnchor.z)) / Math.max(0.001, camZ - frontZ) - rightAnchor.x

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
        <Shards
          width={px(shatter.width)}
          height={px(shatter.height)}
          depth={px(announcement.depth)}
          hit={shatter.hit}
          print={printed ? { texture: printed, ink: ink ?? '#ffffff' } : undefined}
        />
      ) : (
        <mesh geometry={geometry}>
          <Glass sampler={sampler} />
        </mesh>
      )}
      {!shatter && printed && (
        <PrintLayer geometry={printPlane} material={printMaterial} position={[0, 0, px(announcement.depth) / 2 + 0.002]} />
      )}
      {hover && (
        <HoverPill
          hover={hover}
          falling={!!shatter}
          home={[width / 2 - announcement.close.inset, height / 2 - announcement.close.inset]}
          size={announcement.close.size}
          surfaceDepth={announcement.depth}
          preset={dismissPreset}
          // A plus turned 45°, not "×": uikit's atlas has no multiplication sign and renders
          // the missing glyph as a box. A plus is in every font and makes a truer cross anyway.
          label="+"
          labelRotate={45}
        />
      )}
      <Flourish halves={leftHalves} x={-end} grow={grow} preset={preset} />
      <Flourish halves={rightHalves} x={rightEnd} grow={grow} preset={preset} />
    </group>
  )
}

/** One end's flourishes: the upper pieces ride the top edge, the lower ones the bottom edge. */
function Flourish({
  halves,
  x,
  grow,
  preset,
}: {
  halves: FlourishHalves
  x: number
  grow: number
  preset?: PresetName
}) {
  return (
    <>
      {halves.top && (
        <mesh geometry={halves.top} position={[x, grow, 0]}>
          <Glass sampler preset={preset} />
        </mesh>
      )}
      {halves.bottom && (
        <mesh geometry={halves.bottom} position={[x, -grow, 0]}>
          <Glass sampler preset={preset} />
        </mesh>
      )}
    </>
  )
}
