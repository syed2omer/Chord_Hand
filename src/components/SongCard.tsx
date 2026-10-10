import { Link } from 'react-router-dom'
import type { Song } from '../features/songs/schema'
import { uniqueChords } from '../features/songs/progression'

export default function SongCard({ song }: { song: Song }) {
  return (
    <Link to={`/play/${song.id}`}
      className="group block rounded-2xl border border-cream/10 bg-teal-card p-4 transition-colors hover:bg-teal-raised">
      <div className="mb-4 grid aspect-square place-items-center rounded-xl bg-gradient-to-br from-teal-raised to-fret/70">
        <span aria-hidden="true" className="font-display text-7xl text-gold/90">{song.title[0]}</span>
      </div>
      <h3 className="font-display text-2xl leading-tight">{song.title}</h3>
      <p className="text-sm text-cream-dim">{song.artist}</p>
      <p className="mt-3 font-display text-xl text-cream">{uniqueChords(song).join(' · ')}</p>
      <p className="mt-1 text-sm text-gold">{song.difficulty}</p>
    </Link>
  )
}
