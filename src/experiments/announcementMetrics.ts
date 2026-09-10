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
   * `inset` is the centre's distance from the banner's top and right edges, and it is negative:
   * the chip straddles the corner and hangs off it, the way the flourishes do. That also puts it
   * clear of the right blossom, which occupies the corner from 16px below the top edge down, and
   * clear of the copy, which never reaches the last 64px.
   */
  close: { size: 32, inset: -6 },
} as const
