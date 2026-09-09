import { useEffect } from 'react'
import { useControls } from 'leva'
import { useCubeScene } from './cubeScene'

/** leva folder for the cube page: what floats inside the logo and (optionally) around it. */
export default function CubeControls() {
  const s = useCubeScene()
  const [scene] = useControls('scene', () => ({
    svg: { value: s.svg, label: 'svg mode' },
    insideOnly: { value: s.insideOnly, label: 'inside logo only' },
    petalsInside: { value: s.petalsInside, min: 0, max: 200, step: 1 },
    petalsOutside: { value: s.petalsOutside, min: 0, max: 300, step: 1 },
    flowersInside: { value: s.flowersInside, min: 0, max: 40, step: 1 },
    flowersOutside: { value: s.flowersOutside, min: 0, max: 60, step: 1 },
  }), { order: -65 })
  const set = useCubeScene((st) => st.set)
  useEffect(() => set(scene), [scene, set])
  return null
}
