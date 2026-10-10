import type { GestureClass } from '../gesture/gestureTypes'
import { chordForGesture } from '../songs/progression'
import { GESTURE_LABEL, type ChordName, type GestureId, type Song } from '../songs/schema'

export type Validation =
  | { result: 'correct'; chord: ChordName }
  | { result: 'wrong'; expected: ChordName; detected?: ChordName; message: string }
  | { result: 'none' }

/**
 * Gesture -> (this song's mapping) -> chord, compared with what the song needs next.
 * Knows nothing about cameras, audio or timing.
 */
export function validateGesture(song: Song, expected: ChordName, gesture: GestureClass | null): Validation {
  if (!gesture || gesture === 'UNKNOWN') return { result: 'none' }
  const detected = chordForGesture(song, gesture as GestureId)
  if (detected === expected) return { result: 'correct', chord: expected }
  if (!detected) {
    return { result: 'wrong', expected, message: `${GESTURE_LABEL[gesture as GestureId]} isn’t used in this song. Try ${expected} again.` }
  }
  return { result: 'wrong', expected, detected, message: `Try ${expected} again.` }
}
