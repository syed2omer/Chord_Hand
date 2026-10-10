import type { ChordName, GestureId, ProgressionEntry, Song } from './schema'
import { GESTURE_ORDER } from './schema'

/** What chord is required, in order? Built from where chords sit in the lyrics. */
export function deriveProgression(song: Song): ProgressionEntry[] {
  if (song.progression?.length) return song.progression
  const out: ProgressionEntry[] = []
  song.sections.forEach((section, sectionIndex) =>
    section.lines.forEach((line, lineIndex) =>
      line.segments.forEach((seg, segmentIndex) => {
        if (seg.chord) {
          out.push({
            chord: seg.chord,
            durationBeats: song.beatsPerChord,
            sectionIndex,
            lineIndex,
            segmentIndex,
          })
        }
      }),
    ),
  )
  return out
}

/** Which gesture means this chord, in this song? */
export function gestureForChord(song: Song, chord: ChordName): GestureId | undefined {
  return GESTURE_ORDER.find((g) => song.gestureMapping[g] === chord)
}

/** Which chord does this gesture mean, in this song? Undefined if unmapped. */
export function chordForGesture(song: Song, gesture: GestureId): ChordName | undefined {
  return song.gestureMapping[gesture]
}

export function uniqueChords(song: Song): ChordName[] {
  return [...new Set(deriveProgression(song).map((p) => p.chord))]
}

/** Every chord the song needs must be reachable by some gesture. Returns the missing ones. */
export function unmappedChords(song: Song): ChordName[] {
  return uniqueChords(song).filter((c) => !gestureForChord(song, c))
}

export function totalBeats(song: Song): number {
  return deriveProgression(song).reduce((n, p) => n + p.durationBeats, 0)
}
export function totalSeconds(song: Song): number {
  return Math.round((totalBeats(song) * 60) / song.tempo)
}
