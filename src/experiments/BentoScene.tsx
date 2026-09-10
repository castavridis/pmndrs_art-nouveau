import { lazy, Suspense, useRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { NavRoot } from '../nav/Nav3D/NavRoot'
import { Ready } from '../nav/Nav3D/Ready'
import { px } from '../nav/tokens'
import { AnnouncementParts, type Shatter } from './Announcement'
import { CalloutParts } from './Callout'
import type { CalloutKind } from './calloutKinds'
import { preloadNavAssets } from '../nav/Nav3D/assets'
import { preloadAnnouncementAssets } from './announcementAssets'
import { preloadCalloutIcon } from './calloutAssets'

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
}

export interface BentoSceneProps {
  /** The page element pointer events come from (the canvas itself is inert). */
  eventSource: RefObject<HTMLElement | null>
  /** The nav's `<nav>` element: the pill is centred on it. */
  navEl: RefObject<HTMLElement | null>
  announcement: SlotBox
  callout: SlotBox & { kind: CalloutKind }
  onReady: () => void
}

/**
 * One full-page scene for the bento page: the nav, the announcement slab and the callout
 * surface share petals, lights and the composer. Each 3D part follows its DOM slot every
 * frame (the canvas is fixed to the viewport, so scrolling moves the slots, not the camera).
 */
/** `?slabs=buffered` restores one transmission buffer per slab (for comparison). */
const BUFFERED = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('slabs') === 'buffered'

export function BentoScene({ eventSource, navEl, announcement, callout, onReady }: BentoSceneProps) {
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
          {announcement.width > 0 && <AnnouncementParts width={announcement.width} height={announcement.height} sampler={!BUFFERED} shatter={announcement.shatter ?? null} print={announcement.print ?? null} ink={announcement.ink} />}
        </Slot>
        <Slot el={callout}>
          {callout.width > 0 && <CalloutParts kind={callout.kind} width={callout.width} height={callout.height} sampler={!BUFFERED} />}
        </Slot>
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
