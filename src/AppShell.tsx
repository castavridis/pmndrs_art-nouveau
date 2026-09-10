import type { ReactNode } from 'react'
import { ThemeApplier, ThemeShortcut } from './theme'
import { ThemeToggle } from './ThemeToggle'

/**
 * Everything around a page: theme handling, the `T` shortcut and the fixed light/dark toggle.
 * Shared by the client entry and the prerender so hydration sees the same tree.
 * The toggle comes after the page in DOM order so the nav keeps the first Tab stop.
 *
 * `themeToggle={false}` for a page that switches the theme itself — the bento carries its own
 * switch as its call to action, and a second one in the corner would compete with it.
 */
export function AppShell({ children, themeToggle = true }: { children: ReactNode; themeToggle?: boolean }) {
  return (
    <>
      <ThemeApplier />
      <ThemeShortcut />
      {children}
      {themeToggle && <ThemeToggle style={{ position: 'fixed', top: 16, left: 16, zIndex: 20 }} />}
    </>
  )
}
