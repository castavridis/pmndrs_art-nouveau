import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { damp3 } from 'maath/easing'
import { RECENTER_EVENT as EVENT, requestRecenter } from './recenterEvent'

/** The bits of drei's OrbitControls this needs (three-stdlib is not a direct dependency). */
type OrbitLike = { target: THREE.Vector3; update: () => void }

/**
 * Inside the canvas: on request, eases the camera back to `framePosition` and the orbit
 * target back to the origin. Also bound to the R key.
 */
export function Recenter({ framePosition }: { framePosition: [number, number, number] }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitLike | null
  const active = useRef(false)
  const home = useRef(new THREE.Vector3(...framePosition))
  useEffect(() => void home.current.set(...framePosition), [framePosition])

  useEffect(() => {
    const start = () => (active.current = true)
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) start()
    }
    window.addEventListener(EVENT, start)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(EVENT, start)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useFrame((_, dt) => {
    if (!active.current) return
    const target = controls?.target
    const a = damp3(camera.position, home.current, 0.25, dt)
    const b = target ? damp3(target, [0, 0, 0], 0.25, dt) : false
    controls?.update()
    if (!a && !b) active.current = false
  })
  return null
}

/** DOM button for the orbit pages. */
export function RecenterButton() {
  return (
    <button
      type="button"
      onClick={requestRecenter}
      title="Re-center the view (R)"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 10,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 999,
        border: '1px solid rgb(255 255 255 / 0.15)',
        background: 'rgb(20 20 18 / 0.85)',
        color: '#eee',
        font: '500 13px/1 system-ui, sans-serif',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
      Re-center
      <kbd style={{ font: 'inherit', opacity: 0.5 }}>R</kbd>
    </button>
  )
}
