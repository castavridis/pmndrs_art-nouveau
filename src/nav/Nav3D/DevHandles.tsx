import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { RootState } from '@react-three/fiber'

declare global {
  interface Window {
    /** Dev-only handle to the live R3F state for headless inspection scripts. */
    __nav3d?: RootState
  }
}

/** Mounted inside the canvas in dev only (see index.tsx). Renders nothing. */
export default function DevHandles() {
  const get = useThree((s) => s.get)
  useEffect(() => {
    window.__nav3d = get()
    return () => {
      delete window.__nav3d
    }
  }, [get])
  return null
}
