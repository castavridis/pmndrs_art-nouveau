import { Bouquet, Chimera, Garland, Totem, Wreath } from './frankenstein'

/** The frankenstein experiments (`/dev/x/<slug>`). */
export const FRANKENSTEIN = [
  {
    slug: 'bouquet',
    title: 'Bouquet',
    text: 'Tendrils radiating from a lens, blossoms at the tips; petals cross at 45°.',
    Component: Bouquet,
  },
  { slug: 'wreath', title: 'Wreath', text: 'Flourishes around a turning ring.', Component: Wreath },
  {
    slug: 'garland',
    title: 'Garland',
    text: 'Pieces strung along a rolling wave.',
    Component: Garland,
  },
  {
    slug: 'totem',
    title: 'Totem',
    text: 'Logo blocks stacked, blossoms growing from the seams.',
    Component: Totem,
  },
  {
    slug: 'chimera',
    title: 'Chimera',
    text: 'A seeded random assembly of every part. Regenerate at will.',
    Component: Chimera,
  },
] as const
