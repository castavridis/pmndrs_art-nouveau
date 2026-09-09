/// <reference types="vite/client" />

declare module '*.glb' {
  const url: string
  export default url
}

/** apca-w3 ships no types; only the two functions the dev probes use. */
declare module 'apca-w3' {
  export function sRGBtoY(rgb: number[]): number
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number | string
}
