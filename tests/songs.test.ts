import { describe, expect, it } from 'vitest'
import { SAMPLE_SONGS } from '../src/features/songs/sampleSongs'
import { chordForGesture, deriveProgression, gestureForChord, unmappedChords } from '../src/features/songs/progression'
import { CHORD_LIBRARY } from '../src/features/engine/chordLibrary'

const [grace, saints] = SAMPLE_SONGS

describe('song-specific gesture mapping', () => {
  it('maps the same gesture to different chords in different songs', () => {
    expect(chordForGesture(grace, 'GESTURE_1')).toBe('G')
    expect(chordForGesture(saints, 'GESTURE_1')).toBe('C')
  })
  it('finds the gesture for a chord, per song', () => {
    expect(gestureForChord(grace, 'C')).toBe('GESTURE_2')
    expect(gestureForChord(saints, 'C')).toBe('GESTURE_1')
  })
  it('returns undefined for unmapped gestures and chords', () => {
    expect(chordForGesture(saints, 'GESTURE_5')).toBeUndefined()
    expect(gestureForChord(saints, 'Em')).toBeUndefined()
  })
})

describe('progression', () => {
  it('derives the chord order from the lyrics', () => {
    expect(deriveProgression(saints).map((p) => p.chord)).toEqual(['C', 'F', 'C', 'G', 'C'])
    expect(deriveProgression(SAMPLE_SONGS[2]).slice(0, 4).map((p) => p.chord)).toEqual(['C', 'Am', 'F', 'G'])
  })
  it('uses the song beat length for each chord', () => {
    expect(deriveProgression(grace).every((p) => p.durationBeats === 3)).toBe(true)
  })
  it('every sample song can play all of its chords with its own mapping', () => {
    SAMPLE_SONGS.forEach((s) => expect(unmappedChords(s)).toEqual([]))
  })
  it('every chord used has a diagram voicing', () => {
    SAMPLE_SONGS.flatMap((s) => deriveProgression(s).map((p) => p.chord)).forEach((c) => expect(CHORD_LIBRARY[c]).toBeDefined())
  })
})
