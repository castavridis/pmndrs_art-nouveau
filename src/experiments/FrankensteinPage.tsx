import { lazy, Suspense } from 'react'

const Scenes = lazy(() =>
  import('./frankensteinIndex').then((m) => ({
    default: ({ slug }: { slug: string }) => {
      const entry = m.FRANKENSTEIN.find((e) => e.slug === slug)
      if (!entry) return <p style={{ padding: 32 }}>Unknown experiment: {slug}</p>
      const C = entry.Component
      return <C />
    },
  })),
)

/** `/dev/x/<slug>`: one of the frankenstein experiments. */
export function FrankensteinPage({ slug }: { slug: string }) {
  return (
    <Suspense fallback={null}>
      <Scenes slug={slug} />
    </Suspense>
  )
}
