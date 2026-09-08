import { lazy, Suspense, useState } from 'react'
import { createNavStore, NavStoreContext } from '../nav/store'

const Callouts = lazy(() => import('./CalloutPageScene'))

/** `/dev/callout`: the two callout variants side by side. */
export function CalloutPage() {
  const [store] = useState(() => createNavStore({ links: [] }))
  return (
    <NavStoreContext.Provider value={store}>
      <Suspense fallback={null}>
        <Callouts />
      </Suspense>
    </NavStoreContext.Provider>
  )
}
