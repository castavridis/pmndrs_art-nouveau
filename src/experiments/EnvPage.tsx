import { lazy, Suspense, useState } from 'react'
import { createNavStore, NavStoreContext } from '../nav/store'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { RecenterButton } from '../nav/Nav3D/recenter'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null

/**
 * `/dev/env`: the environment itself. The cubemap the glass reflects (studio panels, the
 * rect light strips, the backdrop colour) is shown as the sky, around three probes: a mirror
 * ball (pure reflection), the live glass (what the pill sees) and a matte ball (diffuse
 * lighting only). Orbit to look around; the environment folder in the panel changes it live.
 */
export function EnvPage() {
  const [store] = useState(() => createNavStore({ links: [] }))
  return (
    <NavStoreContext.Provider value={store}>
      <div style={{ position: 'fixed', inset: 0 }}>
        <NavCanvas orbit framePosition={[0, 0.6, 7]} environmentBackground>
          <Suspense fallback={null}>
            <mesh position={[-2.2, 0, 0]}>
              <sphereGeometry args={[0.9, 64, 48]} />
              <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.9, 64, 48]} />
              <Glass />
            </mesh>
            <mesh position={[2.2, 0, 0]}>
              <sphereGeometry args={[0.9, 64, 48]} />
              <meshStandardMaterial color="#d8d8d8" metalness={0} roughness={0.9} />
            </mesh>
          </Suspense>
        </NavCanvas>
        <RecenterButton />
        <div
          style={{
            position: 'fixed',
            left: 16,
            bottom: 16,
            font: '13px/1.5 system-ui, sans-serif',
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        >
          mirror · glass · matte — drag to orbit. environment → studio / panel strength / background / rotation.
        </div>
        {DevControls && (
          <Suspense fallback={null}>
            <DevControls />
          </Suspense>
        )}
      </div>
    </NavStoreContext.Provider>
  )
}
