export type GestureId =
  | 'GESTURE_0'
  | 'GESTURE_1'
  | 'GESTURE_2'
  | 'GESTURE_3'
  | 'GESTURE_4'
  | 'GESTURE_5'
  | 'GESTURE_THUMB'

export type ChordName = string
export const MUTE = 'MUTE'
export type StrumStep = 'D' | 'U' | '-'
export type Difficulty = 'Beginner' | 'Easy' | 'Intermediate'

export interface LyricSegment {
  /** Chord that starts at this segment. Omit to keep the previous chord. */
  chord?: ChordName
  text: string
}
export interface SongLine { segments: LyricSegment[] }
export interface SongSection { name: string; lines: SongLine[] }

export interface ProgressionEntry {
  chord: ChordName
  durationBeats: number
  sectionIndex: number
  lineIndex: number
  segmentIndex: number
}

/** Versioned so the format can evolve without breaking saved or imported songs. */
export interface Song {
  schemaVersion: 1
  id: string
  title: string
  artist: string
  key: string
  tempo: number
  timeSignature: string
  beatsPerChord: number
  /** How many strum-pattern steps fit in one beat (default 2, eighth notes). */
  stepsPerBeat?: number
  difficulty: Difficulty
  /** Song-specific. There is intentionally no universal gesture-to-chord table. */
  gestureMapping: Partial<Record<GestureId, ChordName>>
  sections: SongSection[]
  strummingPattern: { steps: StrumStep[] }
  /** Optional explicit override; otherwise derived from the lyric segments. */
  progression?: ProgressionEntry[]
  /** True when the song ships with chords only and the user adds their own lyrics. */
  lyricsNotIncluded?: boolean
  /** Where the song came from. Built-in samples omit this. */
  source?: 'imported'
}

export const GESTURE_LABEL: Record<GestureId, string> = {
  GESTURE_0: 'Fist',
  GESTURE_1: '1 finger',
  GESTURE_2: '2 fingers',
  GESTURE_3: '3 fingers',
  GESTURE_4: '4 fingers',
  GESTURE_5: '5 fingers',
  GESTURE_THUMB: 'Thumb',
}

export const GESTURE_ORDER: GestureId[] = [
  'GESTURE_0', 'GESTURE_1', 'GESTURE_2', 'GESTURE_3', 'GESTURE_4', 'GESTURE_5', 'GESTURE_THUMB',
]
