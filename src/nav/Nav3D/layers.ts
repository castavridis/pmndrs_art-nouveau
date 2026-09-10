import { useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

/**
 * Render layers: which passes draw which objects.
 *
 * Three passes see different subsets of the scene. The camera draws everything the viewer sees.
 * A buffered glass surface re-renders the scene into its own buffer, and must not refract the
 * text sitting on it, while light emitters show only through it. The contrast probe draws the
 * glass behind the text, so it must see neither the text nor the contrast aids laid under it.
 *
 * Before layers, each pass hid or showed objects by flipping their `visible` flag and then
 * putting it back. Three separate systems did that — uikit (which re-asserts its meshes' flags
 * during the render), the glass exclusion and the contrast probe — and each quietly undid the
 * others. A layer is set once on the object and read by a pass's camera mask; nothing else writes
 * it, so there is nothing to fight over.
 */
export const LAYER = {
  /** Everything with no special role. Every pass draws it. */
  DEFAULT: 0,
  /** Text drawn on glass: shown to the viewer, kept out of glass buffers and the probe. */
  TEXT: 1,
  /** Light emitters: seen only refracted through buffered glass, never directly. */
  BUFFER_ONLY: 2,
  /** Contrast aids (the chip's veil, the label scrim): drawn, but never measured. */
  VEIL: 3,
} as const

const maskOf = (...layers: number[]) => layers.reduce((m, l) => m | (1 << l), 0)

/** What the viewer sees: all but the emitters. */
export const VIEW_MASK = maskOf(LAYER.DEFAULT, LAYER.TEXT, LAYER.VEIL)
/** What a buffered glass surface draws into its buffer: no text on it, emitters through it. */
export const BUFFER_MASK = maskOf(LAYER.DEFAULT, LAYER.BUFFER_ONLY)
/** What the contrast probe draws: the glass and whatever is behind it, and nothing laid over it. */
export const PROBE_MASK = maskOf(LAYER.DEFAULT)

/** Runs `draw` with the camera seeing only `mask`, then gives the camera its own mask back. */
export function withLayerMask(camera: THREE.Camera, mask: number, draw: () => void) {
  const was = camera.layers.mask
  camera.layers.mask = mask
  try {
    draw()
  } finally {
    camera.layers.mask = was
  }
}

const setMask = (camera: THREE.Camera, mask: number) => {
  camera.layers.mask = mask
}

/**
 * Put every object under `root` on `layer`, and only that layer. Layers are not inherited, so
 * each descendant has to be tagged; `skip` exempts subtrees by name (the scrim inside the label
 * group belongs on another layer).
 */
export function tagLayer(root: THREE.Object3D, layer: number, skip?: (o: THREE.Object3D) => boolean) {
  root.traverse((o) => {
    if (skip?.(o)) return
    if (o.layers.mask !== 1 << layer) o.layers.set(layer)
  })
}

/**
 * Keeps `ref`'s subtree on `layer`. `live` re-tags every frame, for subtrees whose meshes are
 * created and replaced by a library (uikit adds a mesh whenever text changes); tagging is
 * idempotent and nothing else writes layers, so repeating it is just classification, not a
 * toggle that can conflict. Restores the default layer on unmount.
 */
export function useLayer(
  ref: React.RefObject<THREE.Object3D | null>,
  layer: number,
  { live = false, skip }: { live?: boolean; skip?: (o: THREE.Object3D) => boolean } = {},
) {
  useEffect(() => {
    const o = ref.current
    if (!o) return
    tagLayer(o, layer, skip)
    return () => tagLayer(o, LAYER.DEFAULT, skip)
  }, [ref, layer, skip])
  useFrame(() => {
    if (!live) return
    const o = ref.current
    if (o) tagLayer(o, layer, skip)
  })
}

/**
 * Sets the viewer's camera to its mask, and lets the raycaster reach text: uikit's pointer
 * events are raycasts, and a raycaster only sees layer 0 unless told otherwise, so moving the
 * labels to their own layer would otherwise have made the nav deaf to the pointer.
 */
export function CameraLayers() {
  const camera = useThree((s) => s.camera)
  const raycaster = useThree((s) => s.raycaster)
  useEffect(() => {
    setMask(camera, VIEW_MASK)
    raycaster.layers.enable(LAYER.TEXT)
  }, [camera, raycaster])
  return null
}
