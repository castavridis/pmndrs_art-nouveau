const pages = [
  {
    href: '/',
    title: 'Demo',
    text: 'The nav in a page, with link count, container width and current page controls.',
  },
  {
    href: '/dev/nav',
    title: 'Nav gallery',
    text: '1, 3, 6 and 10 links across full, compact and collapsed; 2D rows and a 3D row.',
  },
  {
    href: '/dev/stage',
    title: 'Stage',
    text: 'The nav alone in a tall canvas with orbit controls and the tuning panel.',
  },
  {
    href: '/dev/cube',
    title: 'Logo cube',
    text: 'The logo as glass prisms with petals and flowers floating inside and around.',
  },
  {
    href: '/dev/callout',
    title: 'Callout',
    text: 'GitHub-style callouts: 3D surface or plain div, with the lens icon.',
  },
  {
    href: '/dev/palette',
    title: 'Palette',
    text: 'Every palette colour as a glass sample, each with its own material folder in the panel.',
  },
  {
    href: '/dev/announcement',
    title: 'Announcement',
    text: 'A wide glass banner with flourishes pinned to its ends.',
  },
]

/** `/dev`: links to every experiment. Dev builds only. */
export function DevIndex() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '72px 24px 64px',
        fontFamily: "'Inter Variable', system-ui, sans-serif",
      }}
    >
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 500 }}>Experiments</h1>
      <p style={{ margin: '0 0 32px', opacity: 0.6 }}>
        Dev-only pages. Each has the leva panel; ⌘K opens the palette where a nav is present.
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
        {pages.map((p) => (
          <li key={p.href}>
            <a
              href={p.href}
              style={{
                display: 'grid',
                gap: 4,
                padding: '16px 18px',
                borderRadius: 14,
                background: 'color-mix(in srgb, currentColor 5%, transparent)',
                border: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontWeight: 500 }}>{p.title}</span>
              <span style={{ fontSize: 13, opacity: 0.6 }}>{p.text}</span>
              <code style={{ fontSize: 12, opacity: 0.45 }}>{p.href}</code>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
