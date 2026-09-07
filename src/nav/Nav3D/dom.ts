/** Text colour of the items, shared by the 3D labels and the 3D logo. */
export const INK = '#111111'

/**
 * Click the DOM twin (Nav2D element with the same `data-id`) so the browser and Nav2D's
 * handlers do the real work: navigation, the command palette, focus, analytics.
 */
export function triggerDom(id: string) {
  document.querySelector<HTMLElement>(`[data-id="${id}"]`)?.click()
}
