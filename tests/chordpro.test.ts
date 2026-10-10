import { describe, expect, it } from 'vitest'
import { parseChordPro, timeSignatureDefaults, LIMITS } from '../src/features/songs/ChordProParser'
import { deriveProgression, unmappedChords } from '../src/features/songs/progression'
import { ImportedSongProvider } from '../src/features/songs/providers'
import { isValidSong } from '../src/features/songs/validate'

const SHEET = `{title: Test Song}
{artist: Someone}
{tempo: 90}
{time: 4/4}
{strum: D - D U - U D U}

{start_of_verse: Verse 1}
[C]Hello [G]darkness [Am]my [F]friend
Plain line with no chords
{end_of_verse}
{comment: Chorus}
[Em]La la [D]la
`

const ok = (text: string) => {
  const r = parseChordPro(text)
  expect(r.errors).toEqual([])
  return r.song!
}

describe('parseChordPro', () => {
  it('reads metadata and builds sections and segments', () => {
    const s = ok(SHEET)
    expect(s).toMatchObject({ title: 'Test Song', artist: 'Someone', tempo: 90, timeSignature: '4/4', key: 'C', source: 'imported' })
    expect(s.sections.map((x) => x.name)).toEqual(['Verse 1', 'Chorus'])
    expect(s.sections[0].lines[0].segments.map((g) => g.chord)).toEqual(['C', 'G', 'Am', 'F'])
    expect(s.sections[0].lines[0].segments[1].text).toBe('darkness ')
    expect(s.strummingPattern.steps).toEqual(['D', '-', 'D', 'U', '-', 'U', 'D', 'U'])
  })
  it('keeps lyrics typed before the first chord, and plain lines', () => {
    const s = ok(SHEET)
    expect(s.sections[0].lines[1].segments).toEqual([{ text: 'Plain line with no chords' }])
    const t = ok('{title: x}\nOh [C]yes')
    expect(t.sections[0].lines[0].segments[0]).toEqual({ text: 'Oh ' })
  })
  it('derives the progression in the order chords appear', () => {
    const s = ok(SHEET)
    expect(deriveProgression(s).map((p) => p.chord)).toEqual(['C', 'G', 'Am', 'F', 'Em', 'D'])
  })
  it('assigns gestures in order of first appearance and always adds mute', () => {
    const s = ok(SHEET)
    expect(s.gestureMapping).toEqual({ GESTURE_0: 'MUTE', GESTURE_1: 'C', GESTURE_2: 'G', GESTURE_3: 'Am', GESTURE_4: 'F', GESTURE_5: 'Em', GESTURE_THUMB: 'D' })
    expect(unmappedChords(s)).toEqual([])
  })
  it('uses a custom {gestures} mapping', () => {
    const s = ok('{title: x}\n{gestures: 1=G 2=D t=C}\n[G]a [D]b [C]c')
    expect(s.gestureMapping).toMatchObject({ GESTURE_1: 'G', GESTURE_2: 'D', GESTURE_THUMB: 'C' })
  })
  it('rejects a custom mapping that misses a chord, or reuses a gesture or chord', () => {
    expect(parseChordPro('{gestures: 1=G 2=D}\n[G]a [D]b [C]c').errors[0].message).toContain('no gesture for C')
    expect(parseChordPro('{gestures: 1=G 1=D}\n[G]a [D]b').errors.some((e) => e.message.includes('twice'))).toBe(true)
    expect(parseChordPro('{gestures: 1=G 2=G}\n[G]a').errors.some((e) => e.message.includes('two gestures'))).toBe(true)
  })
  it('accepts common chord spellings', () => {
    const s = ok('{title: x}\n[Cmaj]a [amin]b [Emin]c')
    expect(deriveProgression(s).map((p) => p.chord)).toEqual(['C', 'Am', 'Em'])
  })
  it('imports flat-key chords while keeping the six-gesture limit per song', () => {
    const s = ok('{title: Perfect}\n{key: Ab}\n[Ab]one [Fm]two [Db]three [Eb]four')
    expect(deriveProgression(s).map((p) => p.chord)).toEqual(['Ab', 'Fm', 'Db', 'Eb'])
    expect(Object.values(s.gestureMapping).filter((c) => c && c !== 'MUTE')).toHaveLength(4)
    expect(parseChordPro('[C]1 [G]2 [Am]3 [F]4 [Em]5 [D]6 [A]7').errors.some((e) => e.message.includes('at most six'))).toBe(true)
  })
  it('reports unsupported chords with the line number and the supported list', () => {
    const r = parseChordPro('{title: x}\n[C]ok\n[H#]nope')
    expect(r.song).toBeUndefined()
    expect(r.errors).toEqual([{ line: 3, message: expect.stringContaining('H#') }])
    expect(r.errors[0].message).toContain('common 7')
  })
  it('reports an empty chord', () => {
    expect(parseChordPro('[]oops').errors[0].message).toContain('empty chord')
  })
  it('explains a sheet with no chords, an empty sheet, and oversized input', () => {
    expect(parseChordPro('{title: x}\nJust words').errors[0].message).toContain('no chords')
    expect(parseChordPro('   ').errors[0].message).toContain('nothing to import')
    expect(parseChordPro('[C]' + 'a'.repeat(LIMITS.maxChars)).errors[0].message).toContain('too long')
    expect(parseChordPro('[C]a\n'.repeat(LIMITS.maxLines + 1)).errors[0].message).toContain('too many lines')
    expect(parseChordPro('[C]a\u0000').errors[0].message).toContain('text file')
  })
  it('validates tempo, time signature, beats and strum directives', () => {
    expect(parseChordPro('{tempo: fast}\n[C]a').errors[0].message).toContain('30 to 240')
    expect(parseChordPro('{tempo: 500}\n[C]a').errors[0].message).toContain('30 to 240')
    expect(parseChordPro('{time: 9/7}\n[C]a').errors[0].message).toContain('4/4')
    expect(parseChordPro('{beats: 0}\n[C]a').errors[0].message).toContain('1 to 16')
    expect(parseChordPro('{strum: D X U}\n[C]a').errors[0].message).toContain('X')
  })
  it('warns, but still imports, when things are missing', () => {
    const r = parseChordPro('[C]hello [G]world')
    expect(r.errors).toEqual([])
    const w = r.warnings.map((x) => x.message).join(' ')
    expect(w).toContain('title')
    expect(w).toContain('tempo')
    expect(w).toContain('strum')
    expect(r.song!.title).toBe('Untitled song')
  })
  it('marks chord-only sheets as having no lyrics', () => {
    const r = parseChordPro('{title: x}\n[C] [G] [Am] [F]')
    expect(r.song!.lyricsNotIncluded).toBe(true)
    expect(r.warnings.some((w) => w.message.includes('no lyrics'))).toBe(true)
  })
  it('ignores unknown directives with a warning', () => {
    const r = parseChordPro('{capo: 2}\n[C]a')
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => w.message.includes('capo'))).toBe(true)
  })
  it('skips comment lines starting with #', () => {
    expect(ok('# a note\n[C]hi').sections[0].lines).toHaveLength(1)
  })
  it('picks default strumming and beats from the time signature', () => {
    expect(timeSignatureDefaults('4/4')).toMatchObject({ beatsPerChord: 4, stepsPerBeat: 2 })
    expect(timeSignatureDefaults('3/4')).toMatchObject({ beatsPerChord: 3, stepsPerBeat: 2 })
    expect(timeSignatureDefaults('12/8')).toMatchObject({ beatsPerChord: 4, stepsPerBeat: 3 })
    expect(timeSignatureDefaults('6/8')).toMatchObject({ beatsPerChord: 2, stepsPerBeat: 3 })
  })
  it('produces a song that passes validation', () => {
    expect(isValidSong(ok(SHEET))).toBe(true)
  })
})

describe('isValidSong', () => {
  it('rejects malformed data', () => {
    expect(isValidSong(null)).toBe(false)
    expect(isValidSong({})).toBe(false)
    const s = ok(SHEET)
    expect(isValidSong({ ...s, tempo: 9999 })).toBe(false)
    expect(isValidSong({ ...s, gestureMapping: { GESTURE_9: 'C' } })).toBe(false)
    expect(isValidSong({ ...s, strummingPattern: { steps: ['X'] } })).toBe(false)
  })
})

describe('ImportedSongProvider', () => {
  const fakeStore = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, raw: m }
  }
  it('saves, lists, gets and removes songs', async () => {
    const store = fakeStore()
    const p = new ImportedSongProvider(store)
    const song = ok(SHEET)
    expect(p.save(song)).toBeNull()
    expect((await p.list()).map((s) => s.id)).toEqual([song.id])
    expect((await p.get(song.id))?.title).toBe('Test Song')
    p.remove(song.id)
    expect(await p.list()).toEqual([])
  })
  it('drops corrupted entries instead of crashing', async () => {
    const store = fakeStore()
    store.setItem('chordhand.songs.v1', JSON.stringify([{ nope: true }, ok(SHEET)]))
    expect(await new ImportedSongProvider(store).list()).toHaveLength(1)
    store.setItem('chordhand.songs.v1', '{not json')
    expect(await new ImportedSongProvider(store).list()).toEqual([])
  })
  it('reports a friendly error when storage refuses the write', () => {
    const p = new ImportedSongProvider({ getItem: () => null, setItem: () => { throw new Error('quota') } })
    expect(p.save(ok(SHEET))).toContain('wouldn’t save')
  })
})
