/** Outline symbols for the callout kinds (GitHub's set, drawn as simple strokes). */
const common = { width: '1em', height: '1em', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export function InfoIcon() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}
export function BulbIcon() {
  return (
    <svg {...common}>
      <path d="M9 18h6M10 21h4M8.5 14.5A6 6 0 1 1 15.5 14.5c-.7.6-1 1.4-1 2.5h-5c0-1.1-.3-1.9-1-2.5z" />
    </svg>
  )
}
export function ReportIcon() {
  return (
    <svg {...common}>
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-4 4v-4H6a2 2 0 0 1-2-2z" />
      <path d="M12 7v4M12 13.5h.01" />
    </svg>
  )
}
export function AlertIcon() {
  return (
    <svg {...common}>
      <path d="M12 3 2.5 19.5h19z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  )
}
export function StopIcon() {
  return (
    <svg {...common}>
      <path d="M7.8 3h8.4L21 7.8v8.4L16.2 21H7.8L3 16.2V7.8z" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  )
}
