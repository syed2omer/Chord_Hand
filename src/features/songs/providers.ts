import { SAMPLE_SONGS } from './sampleSongs'
import type { Song } from './schema'
import { isValidSong } from './validate'

/**
 * Where songs come from. The app only talks to this interface, so a licensed online chord service
 * can be added later as another provider without touching the player. No scraping is built in.
 */
export interface SongProvider {
  readonly id: string
  list(): Promise<Song[]>
  get(songId: string): Promise<Song | undefined>
}

export class LocalSongProvider implements SongProvider {
  readonly id = 'local'
  async list() { return SAMPLE_SONGS }
  async get(songId: string) { return SAMPLE_SONGS.find((s) => s.id === songId) }
}

const KEY = 'chordhand.songs.v1'
export const MAX_IMPORTED = 50

type Store = Pick<Storage, 'getItem' | 'setItem'>

/** Songs the user imported from ChordPro. Stored on this device only. */
export class ImportedSongProvider implements SongProvider {
  readonly id = 'imported'
  constructor(private store: Store = window.localStorage) {}

  private read(): Song[] {
    try {
      const raw = this.store.getItem(KEY)
      if (!raw) return []
      const data: unknown = JSON.parse(raw)
      return Array.isArray(data) ? data.filter(isValidSong) : []
    } catch { return [] }
  }

  async list() { return this.read() }
  async get(songId: string) { return this.read().find((s) => s.id === songId) }

  /** Returns an error message, or null on success. */
  save(song: Song): string | null {
    const all = this.read()
    if (all.length >= MAX_IMPORTED && !all.some((s) => s.id === song.id)) return `You can keep up to ${MAX_IMPORTED} imported songs. Remove one first.`
    try {
      this.store.setItem(KEY, JSON.stringify([song, ...all.filter((s) => s.id !== song.id)]))
      return null
    } catch { return 'This browser wouldn’t save the song. Private browsing or full storage can cause this.' }
  }

  remove(songId: string): void {
    try { this.store.setItem(KEY, JSON.stringify(this.read().filter((s) => s.id !== songId))) } catch { /* nothing to remove */ }
  }
}

/** Placeholder for a licensed provider with a permitted API. Intentionally not implemented. */
export interface ExternalSongProvider extends SongProvider { readonly requiresApiKey: true }
