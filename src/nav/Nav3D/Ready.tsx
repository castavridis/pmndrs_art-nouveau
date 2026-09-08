import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Calls `onReady` once, after the first frames that have the scene's assets in place.
 * Mount it inside the same Suspense boundary as the assets, so it only renders once they
 * have resolved; two frames let layout (uikit) and the transmission buffer settle.
 */
export function Ready({ onReady, frames = 2 }: { onReady?: () => void; frames?: number }) {
  const count = useRef(0)
  const done = useRef(false)
  const cb = useRef(onReady)
  useEffect(() => void (cb.current = onReady), [onReady])
  useFrame(() => {
    if (!done.current && ++count.current >= frames) {
      done.current = true
      cb.current?.()
    }
  })
  return null
}
