import type { ReactNode } from 'react'
import { palette, type PaletteName } from '../nav/Nav3D/tuning'
import { AlertIcon, BulbIcon, InfoIcon, ReportIcon, StopIcon } from './calloutIcons'

/** GitHub's callout kinds, mapped onto the brand palette. */
export type CalloutKind = 'note' | 'tip' | 'important' | 'warning' | 'caution'

export const calloutKinds: Record<CalloutKind, { label: string; colour: PaletteName; icon: ReactNode }> = {
  note: { label: 'Note', colour: 'blue', icon: <InfoIcon /> },
  tip: { label: 'Tip', colour: 'green', icon: <BulbIcon /> },
  important: { label: 'Important', colour: 'purple', icon: <ReportIcon /> },
  warning: { label: 'Warning', colour: 'orange', icon: <AlertIcon /> },
  caution: { label: 'Caution', colour: 'red', icon: <StopIcon /> },
}

export const kindHex = (kind: CalloutKind) => palette[calloutKinds[kind].colour]
