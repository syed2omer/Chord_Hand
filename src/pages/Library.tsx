import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SongCard from '../components/SongCard'
import { useSongs } from '../features/songs/useSongs'

export default function Library() {
  const { songs: all, loading, removeImported } = useSongs()
  const [q, setQ] = useState('')
  const songs = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? all.filter((x) => `${x.title} ${x.artist}`.toLowerCase().includes(s)) : all
  }, [q, all])

  return (
    <div className="py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-6xl">Songs</h1>
          <p className="mt-2 max-w-xl text-cream-dim">Each song brings its own gesture-to-chord mapping.</p>
        </div>
        <Link to="/import" className="rounded-full bg-gold px-6 py-2.5 font-medium text-fret hover:brightness-110">Import a song</Link>
      </div>
      <label className="mt-6 block max-w-sm">
        <span className="sr-only">Search songs</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or artist" type="search"
          className="w-full rounded-full border border-cream/20 bg-teal-card px-5 py-3 placeholder:text-cream-dim" />
      </label>
      {loading ? (
        <p className="mt-10 text-cream-dim">Loading songs…</p>
      ) : songs.length ? (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {songs.map((s) => (
            <li key={s.id}>
              <SongCard song={s} />
              {s.source === 'imported' && (
                <div className="mt-2 flex items-center justify-between px-1 text-sm">
                  <span className="text-cream-dim">Imported</span>
                  <button onClick={() => { if (window.confirm(`Remove “${s.title}” from this device?`)) removeImported(s.id) }}
                    className="text-cream-dim underline hover:text-cream">Remove</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-cream-dim">No songs match “{q}”. Clear the search to see all songs.</p>
      )}
    </div>
  )
}
