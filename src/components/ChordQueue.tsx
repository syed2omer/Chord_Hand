export default function ChordQueue({ chords, index }: { chords: string[]; index: number }) {
  const window = chords.slice(index, index + 5)
  return (
    <ol className="flex items-center gap-2 text-cream-dim" aria-label="Upcoming chords">
      {window.map((c, i) => (
        <li key={`${index}-${i}`} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">→</span>}
          <span aria-current={i === 0 ? 'step' : undefined}
            className={i === 0 ? 'font-display text-3xl text-cream underline decoration-gold decoration-2 underline-offset-4' : 'font-display text-2xl'}>
            {c}
          </span>
        </li>
      ))}
    </ol>
  )
}
