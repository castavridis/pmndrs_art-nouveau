/** Banner metrics in CSS px, from the export (652 × 94, ~6 deep). */
export const announcement = {
  width: 652,
  height: 94,
  radius: 8,
  depth: 6,
  paddingX: 40,
  /**
   * The dismiss button, and the hover chip that parks under it.
   *
   * Not in the corner itself: the right flourish's blossom is placed over that corner on
   * purpose, reaching 120px in along the bottom and to within 16px of the top edge. `insetX`
   * clears the petals at the button's own height, measured off the scene rather than guessed.
   */
  close: { size: 32, insetX: 72, insetY: 24 },
} as const
