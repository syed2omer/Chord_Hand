import { useCallback, useEffect, useMemo, useState } from 'react'
import { ImportedSongProvider, LocalSongProvider } from './providers'
import type { Song } from './schema'

/** All songs from every provider, plus a way to add and remove imported ones. */
export function useSongs() {
  const imported = useMemo(() => new ImportedSongProvider(), [])
  const providers = useMemo(() => [new LocalSongProvider(), imported], [imported])
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const lists = await Promise.all(providers.map((p) => p.list()))
    setSongs(lists.flat())
    setLoading(false)
  }, [providers])

  useEffect(() => { void reload() }, [reload])

  const saveImported = useCallback((song: Song) => { const err = imported.save(song); if (!err) void reload(); return err }, [imported, reload])
  const removeImported = useCallback((id: string) => { imported.remove(id); void reload() }, [imported, reload])

  return { songs, loading, saveImported, removeImported }
}
