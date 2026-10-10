import type { ChordVoicing } from './chordLibrary'

/** Standard tuning, low E to high e. */
export const OPEN_STRINGS = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function noteToMidi(note: string): number {
  const m = /^([A-G]#?)(-?\d+)$/.exec(note)
  if (!m) throw new Error(`Invalid note: ${note}`)
  return (Number(m[2]) + 1) * 12 + NAMES.indexOf(m[1])
}
export const midiToNote = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`

export interface StrumNote { string: number; note: string }

/** Every sounding string of a voicing as a note name. Muted strings are left out. */
export function voicingNotes(v: ChordVoicing): StrumNote[] {
  const out: StrumNote[] = []
  v.frets.forEach((fret, string) => {
    if (fret >= 0) out.push({ string, note: midiToNote(noteToMidi(OPEN_STRINGS[string]) + fret) })
  })
  return out
}
