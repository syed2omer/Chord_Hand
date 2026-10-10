import SongImporter from '../components/SongImporter'

export default function Import() {
  return (
    <div className="py-4">
      <h1 className="font-display text-6xl">Import a song</h1>
      <p className="mb-6 mt-2 max-w-2xl text-cream-dim">
        Bring your own chord sheet in ChordPro format. Chord Hand turns it into a playable song with its own gesture-to-chord mapping.
      </p>
      <SongImporter />
    </div>
  )
}
