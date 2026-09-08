import { lazy, Suspense } from 'react'
import { Announcement } from './Announcement'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null

export default function AnnouncementPageScene() {
  return (
    <main
      style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', gap: 96, padding: 64 }}
    >
      <section aria-label="Announcement" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, opacity: 0.6 }}>
          Announcement · 652px
        </h2>
        <Announcement>
          <span>
            <strong>v10 is out.</strong> Petals, glass and the growing pill, in one package.
          </span>
          <a href="/blog">Read more</a>
        </Announcement>
      </section>
      <section aria-label="Announcement wide" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, opacity: 0.6 }}>
          Announcement · 900px
        </h2>
        <Announcement width={900}>
          <span>
            <strong>Workshop next week.</strong> Bring your own GLBs; we will make them iridescent.
          </span>
          <a href="/events">Register</a>
        </Announcement>
      </section>
      {DevControls && (
        <Suspense fallback={null}>
          <DevControls />
        </Suspense>
      )}
    </main>
  )
}
