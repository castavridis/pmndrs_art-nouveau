import { lazy, Suspense } from 'react'
import { Callout } from './Callout'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null

export default function CalloutPageScene() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', gap: 64, padding: 64 }}>
      <section aria-label="3D surface" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, opacity: 0.6 }}>3D surface behind DOM content</h2>
        <Callout variant="surface" title="Announcing v10">
          <p>The nav, the glass and the flowers now ship as one package. Petals fall, the pill grows to fit your links.</p>
          <p>Read the release notes for the migration guide.</p>
        </Callout>
      </section>
      <section aria-label="Plain div" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, opacity: 0.6 }}>Plain div, 3D icon only</h2>
        <Callout variant="plain" title="Announcing v10">
          <p>The nav, the glass and the flowers now ship as one package. Petals fall, the pill grows to fit your links.</p>
          <p>Read the release notes for the migration guide.</p>
        </Callout>
      </section>
      {DevControls && (
        <Suspense fallback={null}>
          <DevControls />
        </Suspense>
      )}
    </main>
  )
}
