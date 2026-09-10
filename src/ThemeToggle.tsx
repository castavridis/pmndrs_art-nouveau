import { DEFAULT_THEME, useResolvedTheme, useThemeStore, type ThemeChoice } from './theme'
import { useIsClient } from './isClient'

// Dark and light only: the demo does not follow the OS. A legacy stored `system` steps to light.
const NEXT: Record<ThemeChoice, ThemeChoice> = { dark: 'light', light: 'dark', system: 'light' }
const LABEL: Record<ThemeChoice, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const GLYPH: Record<ThemeChoice, string> = { system: '◐', light: '☀', dark: '☾' }

/** Switches dark ↔ light. Reads the current choice and shows the resolved scheme. */
export function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  // The stored choice is only known in the browser; render the neutral state during SSR and
  // hydration so the prerendered markup matches.
  const client = useIsClient()
  const theme = useThemeStore((s) => (client ? s.theme : DEFAULT_THEME))
  const setTheme = useThemeStore((s) => s.setTheme)
  const resolvedLive = useResolvedTheme()
  const resolved = client ? resolvedLive : DEFAULT_THEME
  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`Theme: ${LABEL[theme]} (${resolved}). Switch to ${LABEL[NEXT[theme]]}`}
      title={`Theme: ${LABEL[theme]}`}
      style={{
        font: 'inherit',
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid color-mix(in srgb, currentColor 25%, transparent)',
        background: 'color-mix(in srgb, currentColor 8%, transparent)',
        color: 'inherit',
        cursor: 'pointer',
        ...style,
      }}
    >
      <span aria-hidden="true">{GLYPH[theme]}</span>
      {LABEL[theme]}
    </button>
  )
}
