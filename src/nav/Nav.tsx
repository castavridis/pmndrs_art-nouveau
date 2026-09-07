import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { animated, useSpring } from '@react-spring/web'
import type { NavLink } from './types'
import { useNavStore, watchReducedMotion } from './store'
import { Nav2D } from './Nav2D'
import { decideEnhancement, enhancementOverride, type Enhancement } from './gate'
import { tokens } from './tokens'
import styles from './Nav.module.css'

const Nav3D = lazy(() => import('./Nav3D'))

export interface NavProps {
  /** Middle links. Logo and Cmd are always present and are not part of this list. */
  links: NavLink[]
}

/**
 * Public entry. Renders the DOM nav immediately (and on the server); after mount decides
 * whether to layer the 3D nav on top. Nav2D always stays mounted: it is the a11y/SEO source
 * of truth and its anchors are what the 3D items focus and trigger. When 3D is up, Nav2D's
 * visuals fade out (CSS via data-3d) while its anchors stay in the tab order.
 */
export function Nav({ links }: NavProps) {
  const setLinks = useNavStore((s) => s.setLinks)
  const is3D = useNavStore((s) => s.is3D)
  const setIs3D = useNavStore((s) => s.setIs3D)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const [decided, setDecided] = useState<Enhancement | null>(null)
  // If the OS switches to reduced motion while 3D is up, drop back to 2D.
  const enhancement = useMemo<Enhancement | null>(
    () => (reducedMotion && decided && decided.level !== '2d' ? { level: '2d', reason: 'reduced-motion' } : decided),
    [reducedMotion, decided],
  )

  useEffect(() => setLinks(links), [links, setLinks])
  useEffect(watchReducedMotion, [])

  // Gate runs on the client only, so the server markup (Nav2D) hydrates without mismatch.
  useEffect(() => {
    let cancelled = false
    const override = enhancementOverride()
    ;(override ? Promise.resolve(override) : decideEnhancement()).then((e) => {
      if (!cancelled) setDecided(e)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (enhancement?.level === '2d') setIs3D(false)
  }, [enhancement, setIs3D])

  const want3D = enhancement !== null && enhancement.level !== '2d'
  const fade = useSpring({
    opacity: is3D ? 1 : 0,
    immediate: reducedMotion,
    config: { duration: tokens.swapDurationMs },
  })

  return (
    <div className={styles.root} data-3d={is3D || undefined} data-enhancement={enhancement?.level}>
      <Nav2D links={links} />
      {want3D && (
        <animated.div className={styles.overlay} style={fade} aria-hidden="true">
          <Fallback2D
            onError={(err) => {
              console.warn('[nav] 3D failed, staying 2D:', err)
              setDecided({ level: '2d', reason: '3d-error' })
              setIs3D(false)
            }}
          >
            <Suspense fallback={null}>
              <Nav3D postprocessing={enhancement.level === '3d'} onReady={() => setIs3D(true)} />
            </Suspense>
          </Fallback2D>
        </animated.div>
      )}
    </div>
  )
}

/** Any failure in the 3D layer (chunk, asset, WebGL context) must leave the DOM nav intact. */
class Fallback2D extends Component<{ children: ReactNode; onError: (err: unknown) => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    this.props.onError(err)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
