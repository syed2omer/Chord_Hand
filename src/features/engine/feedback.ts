import type { GestureClass } from '../gesture/gestureTypes'
import type { SmootherStatus } from '../gesture/GestureSmoother'
import type { ChordName, Song } from '../songs/schema'
import { validateGesture } from './ChordValidator'
import type { Phase } from './PerformanceController'

export type Feedback =
  | { kind: 'idle' }
  | { kind: 'count-in'; beats: number }
  | { kind: 'show'; expected: ChordName }
  | { kind: 'steady' }
  | { kind: 'release'; expected: ChordName }
  | { kind: 'wrong'; expected: ChordName; detected?: ChordName; message: string }
  | { kind: 'playing'; chord: ChordName; next?: ChordName }
  | { kind: 'ended' }

interface Args {
  song: Song
  phase: Phase
  expected: ChordName
  next?: ChordName
  countIn: number | null
  guard: GestureClass | null
  status: SmootherStatus
  gesture: GestureClass | null
}

/** What the player should be told right now. Pure, so every case is testable. */
export function computeFeedback(a: Args): Feedback {
  switch (a.phase) {
    case 'idle': return { kind: 'idle' }
    case 'count-in': return { kind: 'count-in', beats: a.countIn ?? 0 }
    case 'playing': return { kind: 'playing', chord: a.expected, next: a.next }
    case 'ended': return { kind: 'ended' }
    case 'waiting': {
      if (a.status === 'none') return { kind: 'show', expected: a.expected }
      if (a.status !== 'confirmed') return { kind: 'steady' }
      if (a.guard && a.gesture === a.guard) return { kind: 'release', expected: a.expected }
      const v = validateGesture(a.song, a.expected, a.gesture)
      if (v.result === 'wrong') return { kind: 'wrong', ...v }
      return { kind: 'show', expected: a.expected }
    }
  }
}
