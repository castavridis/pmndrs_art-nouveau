import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const root = (page: Page) => page.locator('[data-mode]')
const mode = (page: Page) => root(page).getAttribute('data-mode')
/** Resize and give ResizeObserver + React a frame to settle. */
async function resize(page: Page, width: number) {
  await page.setViewportSize({ width, height: 600 })
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))),
  )
}

async function axeCheck(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
}

test.describe('Nav2D', () => {
  for (const [w, expected] of [
    [1440, 'full'],
    [768, 'full'],
    [320, 'collapsed'],
  ] as const) {
    test(`renders ${expected} at ${w}px with no axe violations`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 600 })
      await page.goto('/')
      await expect(root(page)).toHaveAttribute('data-mode', expected)
      // Nothing may overflow the viewport horizontally.
      const sw = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(sw).toBeLessThanOrEqual(w)
      await axeCheck(page)
    })
  }

  test('walks through all three modes when resizing, with hysteresis', async ({ page }) => {
    // ~140 viewport resizes; give it room on a loaded machine.
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.setViewportSize({ width: 1440, height: 600 })
    await page.goto('/')
    await expect(root(page)).toHaveAttribute('data-mode', 'full')

    // Shrink until compact, then collapsed; record the thresholds.
    const seen: string[] = []
    let compactAt = 0
    let collapsedAt = 0
    for (let w = 1440; w >= 320; w -= 8) {
      await resize(page, w)
      const m = (await mode(page))!
      if (seen[seen.length - 1] !== m) seen.push(m)
      if (m === 'compact' && !compactAt) compactAt = w
      if (m === 'collapsed' && !collapsedAt) collapsedAt = w
    }
    expect(seen).toEqual(['full', 'compact', 'collapsed'])

    // Growing back just past the collapse threshold must NOT immediately upgrade (hysteresis).
    await resize(page, collapsedAt + 8)
    expect(await mode(page)).toBe('collapsed')
    // Growing well past it does.
    await resize(page, collapsedAt + 48)
    expect(await mode(page)).toBe('compact')
    // Same again for compact → full.
    await resize(page, compactAt + 8)
    expect(await mode(page)).toBe('compact')
    await resize(page, compactAt + 48)
    expect(await mode(page)).toBe('full')
    await resize(page, 1440)
    expect(await mode(page)).toBe('full')
    expect(errors).toEqual([])
  })

  test('keyboard order is logo → links → Cmd', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 600 })
    await page.goto('/')
    const ids: string[] = []
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      ids.push(await page.evaluate(() => document.activeElement?.getAttribute('data-id') ?? '?'))
    }
    expect(ids).toEqual(['logo', 'docs', 'examples', 'blog', 'cmd'])
  })

  test('collapsed menu is a keyboard-operable disclosure', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 })
    await page.goto('/')
    const btn = page.getByRole('button', { name: 'Menu' })
    await expect(btn).toHaveAttribute('aria-expanded', 'false')
    await btn.focus()
    await page.keyboard.press('Enter')
    await expect(btn).toHaveAttribute('aria-expanded', 'true')
    const menu = page.locator('#nav-menu')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('link')).toHaveText(['Docs', 'Examples', 'Blog'])
    await axeCheck(page)
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
  })

  test('Cmd opens the palette, ⌘K toggles it, Enter navigates', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()))
    await page.setViewportSize({ width: 1440, height: 600 })
    await page.goto('/')
    await page.getByRole('button', { name: /^Cmd/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Command palette' })
    const state = await page.evaluate(() => ({ open: document.querySelector('dialog')?.open, html: document.querySelector('dialog')?.outerHTML.slice(0, 200) }))
    await expect(dialog, JSON.stringify({ errors, state })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Search pages' })).toBeFocused()
    await axeCheck(page)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await page.keyboard.press('ControlOrMeta+k')
    await expect(dialog).toBeVisible()
    await page.keyboard.type('blo')
    await expect(dialog.getByRole('option')).toHaveText([/Blog/])
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/blog$/)
  })

  test('active link is marked with aria-current', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 600 })
    await page.goto('/docs')
    await expect(page.getByRole('link', { name: 'Docs' })).toHaveAttribute('aria-current', 'page')
  })
})
