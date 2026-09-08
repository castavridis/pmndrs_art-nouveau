import type { ReactNode } from 'react'
import { ThemeApplier } from './theme'
import { ThemeToggle } from './ThemeToggle'

/**
 * Everything around a page: theme handling and the fixed light/dark/system toggle.
 * Shared by the client entry and the prerender so hydration sees the same tree.
 * The toggle comes after the page in DOM order so the nav keeps the first Tab stop.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeApplier />
      {children}
      <ThemeToggle style={{ position: 'fixed', top: 16, left: 16, zIndex: 20 }} />
    </>
  )
}
