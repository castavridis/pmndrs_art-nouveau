import { useMemo } from 'react'
import type * as THREE from 'three'
import { useNavAssets } from '../nav/Nav3D/assets'
import { useFlower } from './flowerAssets'
import { useCalloutIcon } from './calloutAssets'
import { useAnnouncementAssets } from './announcementAssets'
import { makeLogoGeometry } from './logoBlocks'
import { logoGeometry } from '../nav/Nav3D/logoGeometry'

/** Every exported piece, normalised (origin at its centre or anchor, world units). */
export interface Parts {
  navLeft: THREE.BufferGeometry
  navRight: THREE.BufferGeometry
  petal: THREE.BufferGeometry
  petalLo: THREE.BufferGeometry
  flower: THREE.BufferGeometry
  logo: THREE.BufferGeometry
  lens: THREE.BufferGeometry
  leafTop: THREE.BufferGeometry
  leafBottom: THREE.BufferGeometry
  annLeft: THREE.BufferGeometry
  annRight: THREE.BufferGeometry
  cube: THREE.BufferGeometry
  cubeBoxes: THREE.Box3[]
}

export type PartName = Exclude<keyof Parts, 'cubeBoxes'>
export const PART_NAMES: PartName[] = [
  'navLeft',
  'navRight',
  'petal',
  'petalLo',
  'flower',
  'logo',
  'lens',
  'leafTop',
  'leafBottom',
  'annLeft',
  'annRight',
  'cube',
]

/** All parts in one hook (suspends until the GLBs are in). */
export function useParts(): Parts {
  const nav = useNavAssets()
  const flower = useFlower()
  const icon = useCalloutIcon()
  const ann = useAnnouncementAssets()
  return useMemo(() => {
    const logo = makeLogoGeometry()
    return {
      navLeft: nav.left,
      navRight: nav.right,
      petal: nav.petal,
      petalLo: nav.petalLo,
      flower,
      logo: logoGeometry(),
      lens: icon.lens,
      leafTop: icon.leafTop,
      leafBottom: icon.leafBottom,
      annLeft: ann.left,
      annRight: ann.right,
      cube: logo.geometry,
      cubeBoxes: logo.boxes,
    }
  }, [nav, flower, icon, ann])
}
