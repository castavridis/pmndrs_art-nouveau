/**
 * The studio: the set of light panels the glass reflects (drei Lightformers rendered into
 * the environment cubemap once). The pill's front face reflects the direction straight
 * behind the camera (+z), so that is where a studio's colour has to sit; side and top panels
 * light the bevels and clusters, a ring behind gives the back bevel a rim.
 */
export interface Panel {
  form: 'rect' | 'ring' | 'circle'
  color: string
  intensity: number
  position: [number, number, number]
  /** Rect scale [w, h] or a uniform ring/circle scale. */
  scale: [number, number, number] | number
}

const key: Panel = { form: 'rect', color: '#ffffff', intensity: 3, position: [-5, 6, 4], scale: [6, 2, 1] }
const rim: Panel = { form: 'ring', color: '#ffffff', intensity: 2, position: [0, 0, -6], scale: 4 }

export const studios = {
  /** The reference look: a big white panel behind the camera with pastel panels around it. */
  studio: [
    { form: 'rect', color: '#ffffff', intensity: 1.6, position: [0, 0, 9], scale: [14, 9, 1] },
    { form: 'rect', color: '#ffd6ea', intensity: 1.4, position: [-4, 2.5, 8], scale: [5, 4, 1] },
    { form: 'rect', color: '#cde4ff', intensity: 1.4, position: [4.5, -1.5, 8], scale: [5, 4, 1] },
    { form: 'rect', color: '#d3fff1', intensity: 1.2, position: [-1.5, -3, 8], scale: [5, 3, 1] },
    { form: 'rect', color: '#fff0c8', intensity: 1.2, position: [2.5, 3, 8], scale: [4, 3, 1] },
    { form: 'rect', color: '#e6d9ff', intensity: 1.5, position: [6, 1, 6], scale: [3, 6, 1] },
    key,
    rim,
  ],
  /** Sunset: amber and rose from one side, a cool fill opposite. */
  warm: [
    { form: 'rect', color: '#ffe3c2', intensity: 1.8, position: [0, 0, 9], scale: [14, 9, 1] },
    { form: 'rect', color: '#ff9e6b', intensity: 2.2, position: [-6, 3, 7], scale: [6, 5, 1] },
    { form: 'rect', color: '#ff6f9c', intensity: 1.4, position: [-3, -3, 8], scale: [5, 3, 1] },
    { form: 'rect', color: '#8fb8ff', intensity: 0.9, position: [6, 1, 6], scale: [3, 6, 1] },
    { form: 'rect', color: '#ffd28a', intensity: 3, position: [-5, 6, 4], scale: [6, 2, 1] },
    rim,
  ],
  /** Cool: blue and teal panels, a faint violet key. */
  cool: [
    { form: 'rect', color: '#dbe9ff', intensity: 1.6, position: [0, 0, 9], scale: [14, 9, 1] },
    { form: 'rect', color: '#6fd8ff', intensity: 1.8, position: [-4, 2.5, 8], scale: [5, 4, 1] },
    { form: 'rect', color: '#4ef1c8', intensity: 1.2, position: [4.5, -1.5, 8], scale: [5, 4, 1] },
    { form: 'rect', color: '#8f7bff', intensity: 1.4, position: [6, 1, 6], scale: [3, 6, 1] },
    { form: 'rect', color: '#ffffff', intensity: 2.6, position: [-5, 6, 4], scale: [6, 2, 1] },
    rim,
  ],
  /** Neon: the pmndrs palette as panels (purple, teal, yellow, red), high contrast. */
  neon: [
    { form: 'rect', color: '#2a2a2a', intensity: 0.8, position: [0, 0, 9], scale: [14, 9, 1] },
    { form: 'rect', color: '#d855f9', intensity: 2.4, position: [-5, 2, 7], scale: [4, 6, 1] },
    { form: 'rect', color: '#00f7a3', intensity: 2.0, position: [5, -2, 7], scale: [4, 6, 1] },
    { form: 'rect', color: '#ebff0f', intensity: 2.2, position: [-4, 6, 4], scale: [6, 1.5, 1] },
    { form: 'rect', color: '#ff4980', intensity: 1.6, position: [4, -6, 4], scale: [6, 1.5, 1] },
    { form: 'ring', color: '#2bdcf6', intensity: 2, position: [0, 0, -6], scale: 4 },
  ],
  /** Mono: white panels only; the glass shows its own tint, nothing else. */
  mono: [
    { form: 'rect', color: '#ffffff', intensity: 1.6, position: [0, 0, 9], scale: [14, 9, 1] },
    { form: 'rect', color: '#ffffff', intensity: 1.0, position: [-4, 2.5, 8], scale: [5, 4, 1] },
    { form: 'rect', color: '#ffffff', intensity: 1.0, position: [4.5, -1.5, 8], scale: [5, 4, 1] },
    key,
    rim,
  ],
  /** No panels: only the rect light strips and the backdrop colour reach the glass. */
  none: [],
} satisfies Record<string, Panel[]>

export type StudioName = keyof typeof studios
