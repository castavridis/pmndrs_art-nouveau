export const RECENTER_EVENT = 'nav3d:recenter'

/** Ask the orbit camera to return to its initial framing (from anywhere, DOM included). */
export function requestRecenter() {
  window.dispatchEvent(new Event(RECENTER_EVENT))
}
