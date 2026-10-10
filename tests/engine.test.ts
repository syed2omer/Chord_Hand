import { describe, expect, it } from 'vitest'
import { CHORD_LIBRARY, getVoicing, isSupportedChord } from '../src/features/engine/chordLibrary'
import { midiToNote, noteToMidi, voicingNotes } from '../src/features/engine/chordNotes'
import { computeFeedback } from '../src/features/engine/feedback'
import { PerformanceController, type SessionState } from '../src/features/engine/PerformanceController'
import type { ChordRenderer, StrumEvent } from '../src/features/engine/renderer'
import { parseStrumPattern, strumSchedule } from '../src/features/engine/StrummingEngine'
import { SAMPLE_SONGS } from '../src/features/songs/sampleSongs'
import type { GestureClass } from '../src/features/gesture/gestureTypes'
import type { Song } from '../src/features/songs/schema'

const names = (chord: string) => voicingNotes(CHORD_LIBRARY[chord]).map((n) => n.note)

describe('chord notes', () => {
  it('recognizes flat-key chords independently of the per-song gesture slots', () => {
    for (const chord of ['Ab', 'Fm', 'Db', 'Eb']) {
      expect(isSupportedChord(chord)).toBe(true)
      expect(getVoicing(chord)).toBeDefined()
      expect(voicingNotes(getVoicing(chord)!).length).toBeGreaterThanOrEqual(3)
    }
    expect(isSupportedChord('H#')).toBe(false)
  })
  it('builds the right notes from the voicings', () => {
    expect(names('C')).toEqual(['C3', 'E3', 'G3', 'C4', 'E4'])
    expect(names('G')).toEqual(['G2', 'B2', 'D3', 'G3', 'B3', 'G4'])
    expect(names('Am')).toEqual(['A2', 'E3', 'A3', 'C4', 'E4'])
    expect(names('D')).toEqual(['D3', 'A3', 'D4', 'F#4'])
  })
  it('leaves out muted strings and keeps string numbers', () => {
    expect(voicingNotes(CHORD_LIBRARY.C).map((n) => n.string)).toEqual([1, 2, 3, 4, 5])
  })
  it('converts between names and MIDI numbers', () => {
    expect(noteToMidi('C4')).toBe(60)
    expect(noteToMidi('E2')).toBe(40)
    expect(midiToNote(69)).toBe('A4')
    expect(() => noteToMidi('H9')).toThrow()
  })
})

describe('strumming schedule', () => {
  const pattern = ['D', '-', 'D', 'U', '-', 'U'] as const
  it('skips rests and spaces hits by the step length', () => {
    // 60 BPM, 2 steps per beat -> 0.5 s per step
    const hits = strumSchedule([...pattern], 60, 2, 3)
    expect(hits.map((h) => h.direction)).toEqual(['D', 'D', 'U', 'U'])
    expect(hits.map((h) => h.offset)).toEqual([0, 1, 1.5, 2.5])
  })
  it('repeats the pattern until the chord ends, restarting from step one', () => {
    const hits = strumSchedule(['D', 'U'], 60, 2, 4) // 8 steps
    expect(hits).toHaveLength(8)
    expect(hits[2]).toMatchObject({ direction: 'D', step: 0 })
  })
  it('cuts the pattern off at the end of the chord', () => {
    expect(strumSchedule(['D', 'D', 'D', 'D'], 60, 2, 1)).toHaveLength(2)
  })
})

describe('strum pattern input', () => {
  it('parses spaced and compact patterns', () => {
    expect(parseStrumPattern('D D U U D U')).toEqual({ steps: ['D', 'D', 'U', 'U', 'D', 'U'] })
    expect(parseStrumPattern('d - d u - u')).toEqual({ steps: ['D', '-', 'D', 'U', '-', 'U'] })
    expect(parseStrumPattern('DDUU')).toEqual({ steps: ['D', 'D', 'U', 'U'] })
    expect(parseStrumPattern('down up rest down')).toEqual({ steps: ['D', 'U', '-', 'D'] })
  })
  it('explains bad input', () => {
    expect(parseStrumPattern('')).toHaveProperty('error')
    expect(parseStrumPattern('D X U')).toMatchObject({ error: expect.stringContaining('X') })
    expect(parseStrumPattern('- - -')).toHaveProperty('error')
  })
})

// ---------- PerformanceController, with a fake clock, timer and renderer ----------

const saints = SAMPLE_SONGS[1] // C F C G C, 100 BPM, 4 beats each = 2.4 s
const entry = (chord: string, i: number) => ({ chord, durationBeats: 4, sectionIndex: 0, lineIndex: 0, segmentIndex: i })

function rig(song: Song = saints) {
  let t = 0
  let tick: () => void = () => undefined
  const strums: StrumEvent[] = []
  const mutes: number[] = []
  const clicks: number[] = []
  const states: SessionState[] = []
  const renderer: ChordRenderer = {
    now: () => t,
    strum: (e) => strums.push(e),
    mute: (time) => mutes.push(time),
    click: (time) => clicks.push(time),
    dispose: () => undefined,
  }
  const c = new PerformanceController(song, renderer, (fn) => { tick = fn; return () => undefined }, (s) => states.push(s))
  const advance = (seconds: number) => {
    const end = t + seconds
    while (t < end - 1e-9) { t = Math.min(end, t + 0.025); tick() }
  }
  const state = () => states[states.length - 1]
  const gesture = (g: GestureClass | null) => c.setGesture(g)
  return { c, advance, state, gesture, strums, mutes, clicks, states, now: () => t }
}

describe('PerformanceController', () => {
  it('counts in, then waits silently for the first gesture', () => {
    const r = rig()
    r.c.start(0)
    expect(r.state().phase).toBe('count-in')
    expect(r.clicks).toHaveLength(4)
    r.advance(3)
    expect(r.state().phase).toBe('waiting')
    expect(r.state().index).toBe(0)
    expect(r.strums).toHaveLength(0)
  })

  it('does not start on a wrong gesture', () => {
    const r = rig()
    r.c.start(0); r.advance(3)
    r.gesture('GESTURE_3') // G, but the song needs C
    r.advance(2)
    expect(r.state().phase).toBe('waiting')
    expect(r.strums).toHaveLength(0)
  })

  it('plays the song’s own pattern once the right gesture arrives', () => {
    const r = rig()
    r.c.start(0); r.advance(3)
    r.gesture('GESTURE_1') // C in this song
    r.advance(0.2)
    expect(r.state().phase).toBe('playing')
    r.advance(2.4)
    expect(r.strums.length).toBeGreaterThan(0)
    expect(r.strums.every((s) => s.chord === 'C')).toBe(true)
    expect(r.strums[0].direction).toBe('D')
    expect(r.strums[0].notes.map((n) => n.note)).toEqual(['C3', 'E3', 'G3', 'C4', 'E4'])
  })

  it('pauses at the chord change when the next gesture is wrong, and keeps waiting', () => {
    const r = rig()
    r.c.start(0); r.advance(3)
    r.gesture('GESTURE_1')
    r.advance(3.2) // past the end of the first chord
    expect(r.state().phase).toBe('waiting')
    expect(r.state().index).toBe(1) // F
    expect(r.state().guard).toBe('GESTURE_1') // still holding C's gesture, so don't scold yet
    const before = r.strums.length
    r.advance(3)
    expect(r.strums.length).toBe(before)
    expect(r.mutes.length).toBeGreaterThan(0)
  })

  it('clears the guard and resumes with the new chord when the right gesture is shown', () => {
    const r = rig()
    r.c.start(0); r.advance(3)
    r.gesture('GESTURE_1'); r.advance(3.2)
    r.gesture('GESTURE_3') // wrong (G), guard clears
    r.advance(0.2)
    expect(r.state().guard).toBeNull()
    expect(r.state().phase).toBe('waiting')
    r.gesture('GESTURE_2') // F
    r.advance(0.3)
    expect(r.state().phase).toBe('playing')
    r.advance(1)
    expect(r.strums.some((s) => s.chord === 'F')).toBe(true)
  })

  it('moves straight to the next chord with no gap when its gesture is already showing', () => {
    const r = rig()
    r.c.start(0); r.advance(3)
    r.gesture('GESTURE_1'); r.advance(1)
    const cStart = r.strums[0].time
    r.gesture('GESTURE_2') // change early, before the chord ends
    r.advance(3)
    const firstF = r.strums.find((s) => s.chord === 'F')!
    expect(firstF.time).toBeCloseTo(cStart + 2.4, 6)
    expect(r.state().phase).toBe('playing')
  })

  it('ends after the last chord and reports the whole song as elapsed', () => {
    const song: Song = { ...saints, progression: [entry('C', 0), entry('F', 1)] }
    const r = rig(song)
    r.c.start(0); r.advance(3)
    r.gesture('GESTURE_1'); r.advance(1)
    r.gesture('GESTURE_2'); r.advance(5)
    expect(r.state().phase).toBe('ended')
    expect(r.state().elapsedBeats).toBe(8)
  })

  it('can start from a later chord', () => {
    const r = rig()
    r.c.start(3)
    r.advance(3)
    expect(r.state().index).toBe(3) // G
    r.gesture('GESTURE_3'); r.advance(0.3)
    expect(r.state().phase).toBe('playing')
  })

  it('stop() silences and returns to idle', () => {
    const r = rig()
    r.c.start(0); r.advance(3); r.gesture('GESTURE_1'); r.advance(0.5)
    const mutes = r.mutes.length
    r.c.stop()
    expect(r.state().phase).toBe('idle')
    expect(r.mutes.length).toBe(mutes + 1)
  })

  it('treats UNKNOWN like no gesture', () => {
    const r = rig()
    r.c.start(0); r.advance(3)
    r.gesture('UNKNOWN'); r.advance(1)
    expect(r.state().phase).toBe('waiting')
  })
})

describe('computeFeedback', () => {
  const base = { song: saints, phase: 'waiting' as const, expected: 'F', next: 'C', countIn: null, guard: null, status: 'confirmed' as const, gesture: 'GESTURE_1' as GestureClass }
  it('names expected and detected chords for a wrong gesture', () => {
    expect(computeFeedback(base)).toMatchObject({ kind: 'wrong', expected: 'F', detected: 'C', message: 'Try F again.' })
  })
  it('stays neutral while the previous gesture is still held', () => {
    expect(computeFeedback({ ...base, guard: 'GESTURE_1' }).kind).toBe('release')
  })
  it('asks for a steady hand until the gesture is confirmed', () => {
    expect(computeFeedback({ ...base, status: 'detecting' }).kind).toBe('steady')
    expect(computeFeedback({ ...base, status: 'unsure', gesture: null }).kind).toBe('steady')
  })
  it('prompts when no hand is visible', () => {
    expect(computeFeedback({ ...base, status: 'none', gesture: null })).toEqual({ kind: 'show', expected: 'F' })
  })
  it('covers the other phases', () => {
    expect(computeFeedback({ ...base, phase: 'idle' }).kind).toBe('idle')
    expect(computeFeedback({ ...base, phase: 'count-in', countIn: 3 })).toEqual({ kind: 'count-in', beats: 3 })
    expect(computeFeedback({ ...base, phase: 'playing' })).toEqual({ kind: 'playing', chord: 'F', next: 'C' })
    expect(computeFeedback({ ...base, phase: 'ended' }).kind).toBe('ended')
  })
})
