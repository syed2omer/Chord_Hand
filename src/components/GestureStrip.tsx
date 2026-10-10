import type { Song, GestureId } from '../features/songs/schema'
import { GESTURE_LABEL, GESTURE_ORDER } from '../features/songs/schema'

/** The song's own gesture mapping. Never a universal table. */
export default function GestureStrip({ song, activeChord }: { song: Song; activeChord: string }) {
  const entries = GESTURE_ORDER.filter((g) => song.gestureMapping[g])
  return (
    <ul className="grid gap-2" style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }} aria-label="Gesture to chord mapping for this song">
      {entries.map((g: GestureId) => {
        const chord = song.gestureMapping[g]!
        const active = chord === activeChord
        return (
          <li key={g}
            aria-current={active ? 'true' : undefined}
            className={`rounded-xl px-2 py-3 text-center border ${active ? 'border-gold bg-teal-raised border-2' : 'border-transparent bg-teal-raised/60'}`}>
            <span className="block text-xs text-cream-dim">{GESTURE_LABEL[g].toLowerCase()}</span>
            <span className="block font-display text-3xl leading-tight">{chord === 'MUTE' ? 'Mute' : chord}</span>
          </li>
        )
      })}
    </ul>
  )
}
