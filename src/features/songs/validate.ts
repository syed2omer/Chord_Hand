import { isSupportedChord } from '../engine/chordLibrary'
import { deriveProgression } from './progression'
import { GESTURE_ORDER, MUTE, type Song } from './schema'

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

/** Checks data read back from storage before it is trusted as a Song. */
export function isValidSong(x: unknown): x is Song {
  if (!isObj(x) || x.schemaVersion !== 1) return false
  if (typeof x.id !== 'string' || typeof x.title !== 'string' || typeof x.artist !== 'string' || typeof x.key !== 'string') return false
  if (typeof x.tempo !== 'number' || x.tempo < 30 || x.tempo > 240) return false
  if (typeof x.timeSignature !== 'string' || typeof x.beatsPerChord !== 'number' || x.beatsPerChord < 1) return false
  if (!isObj(x.gestureMapping)) return false
  const mappedChords = new Set<string>()
  for (const [g, c] of Object.entries(x.gestureMapping)) {
    if (!GESTURE_ORDER.includes(g as never)) return false
    if (c !== MUTE && !(typeof c === 'string' && isSupportedChord(c))) return false
    if (g === 'GESTURE_0' && c !== MUTE) return false
    if (typeof c === 'string' && c !== MUTE) mappedChords.add(c)
  }
  if (mappedChords.size > 6) return false
  if (!isObj(x.strummingPattern) || !Array.isArray(x.strummingPattern.steps) || !x.strummingPattern.steps.every((s) => s === 'D' || s === 'U' || s === '-')) return false
  if (!Array.isArray(x.sections)) return false
  for (const s of x.sections) {
    if (!isObj(s) || typeof s.name !== 'string' || !Array.isArray(s.lines)) return false
    for (const l of s.lines) {
      if (!isObj(l) || !Array.isArray(l.segments)) return false
      for (const g of l.segments) {
        if (!isObj(g) || typeof g.text !== 'string') return false
        if (g.chord !== undefined && !(typeof g.chord === 'string' && isSupportedChord(g.chord))) return false
      }
    }
  }
  return deriveProgression(x as unknown as Song).length > 0
}
