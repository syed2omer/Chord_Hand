import type { StrumNote } from './chordNotes'

export interface StrumEvent {
  chord: string
  notes: StrumNote[]
  direction: 'D' | 'U'
  /** When to sound it, in seconds on the renderer's clock. */
  time: number
}

/**
 * Anything that can turn chord events into sound. The chord engine only knows this interface,
 * so browser audio, MIDI, or a virtual instrument can be swapped in.
 */
export interface ChordRenderer {
  /** Current time on the clock that `time` values use. */
  now(): number
  strum(e: StrumEvent): void
  mute(time: number): void
  click(time: number, accent: boolean): void
  dispose(): void
}
