import { useHitDebug } from './aim'

/** Dev: a list next to the cursor of the petal/flower meshes it intersects (view → hit debug). */
export function HitDebugOverlay() {
  const enabled = useHitDebug((s) => s.enabled)
  const hits = useHitDebug((s) => s.hits)
  const x = useHitDebug((s) => s.x)
  const y = useHitDebug((s) => s.y)
  if (!enabled) return null
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: x + 14,
        top: y + 14,
        zIndex: 30,
        pointerEvents: 'none',
        font: '11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
        color: '#eaeaea',
        background: 'rgb(0 0 0 / 0.72)',
        border: '1px solid rgb(255 255 255 / 0.2)',
        borderRadius: 6,
        padding: '4px 8px',
        maxWidth: 360,
        whiteSpace: 'nowrap',
      }}
    >
      {hits.length === 0 ? (
        <span style={{ opacity: 0.6 }}>no petal / flower under pointer</span>
      ) : (
        hits.map((h, i) => (
          <div key={i} style={{ opacity: i === 0 ? 1 : 0.7 }}>
            {i === 0 ? '▸ ' : '  '}
            {h.name}
            {h.instanceId !== null ? ` #${h.instanceId}` : ''} · d {h.distance} · ({h.point.join(', ')})
          </div>
        ))
      )}
    </div>
  )
}
