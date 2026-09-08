import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { RootState } from '@react-three/fiber'
import { useNavStoreApi, type NavStoreApi } from '../store'

declare global {
  interface Window {
    /** Dev-only handle to the live R3F state for headless inspection scripts. */
    __nav3d?: RootState
    /** Dev-only: the store of the most recently mounted 3D nav. */
    __navStore?: NavStoreApi
    /** Dev-only: every mounted R3F root, for pages with several canvases. */
    __nav3dRoots?: RootState[]
  }
}

/** Mounted inside the canvas in dev only (see index.tsx). Renders nothing. */
export default function DevHandles() {
  const get = useThree((s) => s.get)
  const api = useNavStoreApi()
  useEffect(() => {
    const state = get()
    window.__nav3d = state
    window.__navStore = api
    ;(window.__nav3dRoots ??= []).push(state)
    return () => {
      delete window.__nav3d
      delete window.__navStore
      window.__nav3dRoots = (window.__nav3dRoots ?? []).filter((s) => s !== state)
    }
  }, [get, api])
  return null
}
