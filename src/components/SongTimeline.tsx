const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function SongTimeline({ elapsed, total }: { elapsed: number; total: number }) {
  const pct = total ? Math.min(100, (elapsed / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm tabular-nums text-cream-dim">
      <span>{fmt(elapsed)}</span>
      <div className="relative h-1.5 flex-1 rounded-full bg-teal-raised"
        role="progressbar" aria-label="Song progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.round(elapsed)}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream" style={{ left: `${pct}%` }} />
      </div>
      <span>{fmt(total)}</span>
    </div>
  )
}
