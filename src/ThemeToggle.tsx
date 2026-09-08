import { useResolvedTheme, useThemeStore, type ThemeChoice } from './theme'

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<ThemeChoice, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const GLYPH: Record<ThemeChoice, string> = { system: '◐', light: '☀', dark: '☾' }

/** Cycles system → light → dark. Reads the current choice and shows the resolved scheme. */
export function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const resolved = useResolvedTheme()
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
