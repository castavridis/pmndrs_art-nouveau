import { lazy, Suspense, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { NavRoot } from '../nav/Nav3D/NavRoot'
import { Ready } from '../nav/Nav3D/Ready'
import { px } from '../nav/tokens'
import { AnnouncementParts, type Shatter } from './Announcement'
import type { HoverState } from './HoverPill'
import { CalloutParts } from './Callout'
import type { CalloutKind } from './calloutKinds'
import { preloadNavAssets } from '../nav/Nav3D/assets'
import { preloadAnnouncementAssets } from './announcementAssets'
import { preloadCalloutIcon } from './calloutAssets'
import { Glass } from '../nav/Nav3D/Glass'
import { Backing } from '../nav/Nav3D/Backing'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import type { PresetName } from '../nav/Nav3D/customPresets'
import { tokens } from '../nav/tokens'

// Fetch every GLB the scene needs as soon as this chunk is evaluated.
if (typeof window !== 'undefined') {
  preloadNavAssets()
  preloadAnnouncementAssets()
  preloadCalloutIcon()
}

const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

export interface SlotBox {
  el: HTMLElement | null
  width: number
  height: number
  /** Announcement: the strike, once clicked. */
  shatter?: Shatter | null
  /** Announcement: the copy baked into the glass, and the ink it was drawn in. */
  print?: THREE.Texture | null
  ink?: string
  /** Callout: the kind's symbol, rasterised from the card's own markup, for the lens. */
  glyph?: THREE.Texture | null
  /** Announcement: the pointer over the banner, for the chip that follows it. */
  hover?: RefObject<HoverState> | null
}

/** A DOM control that wants the nav's glass behind it (the article launchers, the copy bar). */
export interface GlassBackedSlot {
  el: RefObject<HTMLElement | null>
  width: number
  height: number
  /** The disabled control wears a duller glass; live tuning otherwise, like the pill. */
  preset?: PresetName
  /**
   * Grow the glass beyond the control's own box, in px. A control that paints its own face —
   * the copy bar's green — needs the glass to show around it rather than behind it.
   */
  pad?: number
  /** Corner radius before padding; fully rounded when omitted. */
  radius?: number
}

export interface BentoSceneProps {
  /** The page element pointer events come from (the canvas itself is inert). */
  eventSource: RefObject<HTMLElement | null>
  /** The nav's `<nav>` element: the pill is centred on it. */
  navEl: RefObject<HTMLElement | null>
  announcement: SlotBox
  callout: SlotBox & { kind: CalloutKind }
  /** DOM controls that are given the nav's glass behind them. */
  glassBacked?: GlassBackedSlot[]
  onReady: () => void
}

/**
 * One full-page scene for the bento page: the nav, the announcement slab and the callout
 * surface share petals, lights and the composer. Each 3D part follows its DOM slot every
 * frame (the canvas is fixed to the viewport, so scrolling moves the slots, not the camera).
 */
/** `?slabs=buffered` restores one transmission buffer per slab (for comparison). */
const BUFFERED = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('slabs') === 'buffered'

export function BentoScene({ eventSource, navEl, announcement, callout, glassBacked = [], onReady }: BentoSceneProps) {
  return (
    <NavCanvas
      eventSource={eventSource}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      // A full-viewport canvas at 2x plus the pill's buffer is a lot of pixels; 1.5x is plenty.
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        <Slot el={navEl}>
          <NavRoot />
        </Slot>
        <Slot el={announcement}>
          {announcement.width > 0 && <AnnouncementParts width={announcement.width} height={announcement.height} sampler={!BUFFERED} shatter={announcement.shatter ?? null} print={announcement.print ?? null} ink={announcement.ink} hover={announcement.hover ?? null} />}
        </Slot>
        <Slot el={callout}>
          {callout.width > 0 && <CalloutParts kind={callout.kind} width={callout.width} height={callout.height} sampler={!BUFFERED} glyph={callout.glyph ?? null} />}
        </Slot>
        {glassBacked.map((g, i) => (
          <Slot key={i} el={g.el}>
            {g.width > 0 && (
              <GlassPlate
                width={g.width + (g.pad ?? 0) * 2}
                height={g.height + (g.pad ?? 0) * 2}
                radius={g.radius === undefined ? undefined : g.radius + (g.pad ?? 0)}
                preset={g.preset}
                sampler={!BUFFERED}
              />
            )}
          </Slot>
        ))}
        <Ready onReady={onReady} frames={4} />
      </Suspense>
      {DevHandles && (
        <Suspense fallback={null}>
          <DevHandles />
        </Suspense>
      )}
    </NavCanvas>
  )
}

/** Keeps its children centred on a DOM element, in the canvas's world units (1 unit = pxPerUnit px). */
function Slot({ el, children }: { el: RefObject<HTMLElement | null> | SlotBox; children: ReactNode }) {
  const group = useRef<THREE.Group>(null!)
  const size = useThree((s) => s.size)
  useFrame(() => {
    const node = 'current' in el ? el.current : el.el
    const g = group.current
    if (!node || !g) return
    const r = node.getBoundingClientRect()
    g.position.x = px(r.x + r.width / 2 - size.width / 2)
    g.position.y = px(size.height / 2 - (r.y + r.height / 2))
  })
  return <group ref={group}>{children}</group>
}

/**
 * The glass behind a DOM control, sized to it. Fully rounded like the pill it borrows its
 * material from unless told otherwise, and the same depth, so a control reads as a piece of the
 * nav that wandered down the page rather than a card of its own.
 */
function GlassPlate({
  width,
  height,
  radius,
  preset,
  sampler,
}: {
  width: number
  height: number
  radius?: number
  preset?: PresetName
  sampler: boolean
}) {
  const corner = radius ?? height / 2
  const geometry = useMemo(
    () => makeRoundedRectGeometry(width, height, corner, tokens.pillDepth),
    [width, height, corner],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <>
      {/* Without the buffered material's own cleared buffer, the sampler sees the page behind
          and the glass comes up pale; this gives it the same dark ground the pill has. */}
      {sampler && (
        <Backing width={width} height={height} depth={tokens.pillDepth} preset={preset} radius={corner} />
      )}
      <mesh geometry={geometry} raycast={() => null}>
        <Glass sampler={sampler} preset={preset} />
      </mesh>
    </>
  )
}
