import { test, expect, type Page } from '@playwright/test'

function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()))
  return errors
}

test.describe('Nav3D (progressive enhancement)', () => {
  test('gate: ?nav=2d keeps the DOM nav only', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/dev/demo?nav=2d')
    await expect(page.locator('[data-enhancement]')).toHaveAttribute('data-enhancement', '2d')
    await page.waitForTimeout(500)
    expect(await page.locator('canvas').count()).toBe(0)
    expect(errors).toEqual([])
  })

  test('3D layer fades in over the DOM nav without moving it', async ({ page }) => {
    const errors = collectErrors(page)
    await page.setViewportSize({ width: 1440, height: 600 })
    await page.goto('/dev/demo?nav=3d')
    const nav = page.locator('nav[aria-label=Main]')
    const before = await nav.boundingBox()
    await expect(page.locator('[data-3d]')).toBeAttached({ timeout: 15000 })
    await page.waitForTimeout(800)
    expect(await nav.boundingBox()).toEqual(before)
    // DOM visuals are hidden, anchors remain.
    expect(await page.locator('[data-id="docs"]').count()).toBe(1)
    expect(errors).toEqual([])
  })

  test('keyboard: Tab walks logo → links → Cmd and lights the 3D item', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 600 })
    await page.goto('/dev/demo?nav=3d')
    await expect(page.locator('[data-3d]')).toBeAttached({ timeout: 15000 })
    // The store handle comes from a lazily loaded dev chunk; wait for it before reading.
    await page.waitForFunction(() => !!window.__navStore)
    const seen: (string | null)[] = []
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      seen.push(await page.evaluate(() => window.__navStore?.getState().focused ?? null))
    }
    expect(seen).toEqual(['logo', 'docs', 'examples', 'blog', 'cmd'])
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible()
  })

  test('pointer: hovering and clicking the 3D item drives the DOM anchor', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 600 })
    await page.goto('/dev/demo?nav=3d')
    await expect(page.locator('[data-3d]')).toBeAttached({ timeout: 15000 })
    await page.waitForTimeout(800)
    const box = (await page.locator('nav[aria-label=Main]').boundingBox())!
    // "Blog" sits at ~62% across the nav box (tokens-driven layout; see Nav2D for the twin).
    const blog = (await page.locator('[data-id="blog"]').boundingBox())!
    await page.mouse.move(blog.x + blog.width / 2, blog.y + blog.height / 2)
    await expect.poll(() => page.evaluate(() => window.__navStore?.getState().hovered ?? null)).toBe('blog')
    await page.mouse.click(blog.x + blog.width / 2, blog.y + blog.height / 2)
    await expect(page).toHaveURL(/\/blog$/)
    expect(box.width).toBeGreaterThan(0)
  })

  test('modes: 3D walks full → compact → collapsed with the DOM nav', async ({ page }) => {
    const errors = collectErrors(page)
    await page.setViewportSize({ width: 1440, height: 600 })
    await page.goto('/dev/demo?nav=3d')
    await expect(page.locator('[data-3d]')).toBeAttached({ timeout: 15000 })
    const modes: string[] = []
    for (const w of [1440, 560, 320]) {
      await page.setViewportSize({ width: w, height: 600 })
      await page.waitForTimeout(400)
      modes.push((await page.locator('[data-mode]').getAttribute('data-mode'))!)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w)
    }
    expect(modes).toEqual(['full', 'compact', 'collapsed'])
    expect(errors).toEqual([])
  })
})
