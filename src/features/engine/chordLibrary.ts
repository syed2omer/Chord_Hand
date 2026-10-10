/** Strings are ordered low E to high e. fret -1 = muted, 0 = open. */
export interface ChordVoicing {
  name: string
  frets: [number, number, number, number, number, number]
  /** 0 = none, 1 index, 2 middle, 3 ring, 4 pinky */
  fingers: [number, number, number, number, number, number]
  barre?: { fret: number; fromString: number; toString: number }
}

const ROOTS: Record<string, number> = { C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11 }
const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], min: [0, 3, 7], '-': [0, 3, 7],
  '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], M7: [0, 4, 7, 11],
  sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], aug: [0, 4, 8], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], add9: [0, 2, 4, 7],
}
const OPEN_MIDI = [40, 45, 50, 55, 59, 64]
const parseChord = (name: string) => {
  const m = /^(B#|C#|Db|D#|Eb|E#|F#|Gb|G#|Ab|A#|Bb|Cb|Fb|[A-G])((?:maj7|m7|sus2|sus4|dim|aug|add9|m6|min|M7|7|6|m|-|)?)$/.exec(name)
  return m && ROOTS[m[1]] !== undefined && QUALITY[m[2]] ? { root: ROOTS[m[1]], intervals: QUALITY[m[2]] } : null
}

/** All common major/minor keys plus useful extended triad/seventh qualities are musical chords,
 * independent of the finite set of hand gestures available to a song. */
export function isSupportedChord(name: string): boolean { return !!parseChord(name) }

function generatedVoicing(name: string): ChordVoicing | undefined {
  const chord = parseChord(name)
  if (!chord) return undefined
  let best: { frets: number[]; score: number } | undefined
  const choices = OPEN_MIDI.map((open) => [-1, ...Array.from({ length: 6 }, (_, i) => i)].filter((f) => f < 0 || chord.intervals.includes(((open + f - chord.root) % 12 + 12) % 12)))
  const visit = (i: number, frets: number[]) => {
    if (i === 6) {
      const played = frets.map((f, s) => f < 0 ? -1 : OPEN_MIDI[s] + f)
      const pcs = new Set(played.filter((n) => n >= 0).map((n) => ((n % 12 - chord.root + 12) % 12)))
      if (chord.intervals.some((n) => !pcs.has(n)) || played.filter((n) => n >= 0).length < 3) return
      const positive = frets.filter((f) => f > 0)
      const span = positive.length ? Math.max(...positive) - Math.min(...positive) : 0
      const score = positive.reduce((sum, f) => sum + f * f, 0) + span * 5 + (6 - played.filter((n) => n >= 0).length) * 2
      if (!best || score < best.score) best = { frets: [...frets], score }
      return
    }
    for (const f of choices[i]) visit(i + 1, [...frets, f])
  }
  visit(0, [])
  if (!best) return undefined
  return { name, frets: best.frets as ChordVoicing['frets'], fingers: [0, 0, 0, 0, 0, 0] }
}

export const CHORD_LIBRARY: Record<string, ChordVoicing> = {
  C:  { name: 'C',  frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  G:  { name: 'G',  frets: [3, 2, 0, 0, 0, 3],  fingers: [2, 1, 0, 0, 0, 3] },
  Am: { name: 'Am', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  F:  { name: 'F',  frets: [1, 3, 3, 2, 1, 1],  fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, fromString: 0, toString: 5 } },
  Em: { name: 'Em', frets: [0, 2, 2, 0, 0, 0],  fingers: [0, 2, 3, 0, 0, 0] },
  D:  { name: 'D',  frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
}

export const getVoicing = (chord: string): ChordVoicing | undefined => CHORD_LIBRARY[chord] ?? generatedVoicing(chord)
