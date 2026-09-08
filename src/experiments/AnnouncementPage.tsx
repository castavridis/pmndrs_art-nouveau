import { lazy, Suspense, useState } from 'react'
import { createNavStore, NavStoreContext } from '../nav/store'

const Scene = lazy(() => import('./AnnouncementPageScene'))

/** `/dev/announcement`: the announcement banner. */
export function AnnouncementPage() {
  const [store] = useState(() => createNavStore({ links: [] }))
  return (
    <NavStoreContext.Provider value={store}>
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </NavStoreContext.Provider>
  )
}
