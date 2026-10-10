import type { GestureClass } from '../gesture/gestureTypes'
import { deriveProgression } from '../songs/progression'
import type { ProgressionEntry, Song } from '../songs/schema'
import { validateGesture } from './ChordValidator'
import { getVoicing } from './chordLibrary'
import { voicingNotes, type StrumNote } from './chordNotes'
import type { ChordRenderer } from './renderer'
import { stepSeconds, strumSchedule } from './StrummingEngine'

export type Phase = 'idle' | 'count-in' | 'waiting' | 'playing' | 'ended'

export interface SessionState {
  phase: Phase
  /** The chord being played, or the one the song is waiting for. */
  index: number
  /** Beats left in the count-in (4, 3, 2, 1), otherwise null. */
  countIn: number | null
  elapsedBeats: number
  /** Which strum-pattern step is sounding, for the visualizer. */
  step: number | null
  /** A gesture to ignore while waiting: the one still held from the previous chord. */
  guard: GestureClass | null
}

export const IDLE_STATE: SessionState = { phase: 'idle', index: 0, countIn: null, elapsedBeats: 0, step: null, guard: null }

export type Timer = (fn: () => void, ms: number) => () => void
export const intervalTimer: Timer = (fn, ms) => { const id = setInterval(fn, ms); return () => clearInterval(id) }

interface Hit { time: number; direction: 'D' | 'U'; step: number }
interface Segment { index: number; start: number; end: number; notes: StrumNote[]; hits: Hit[]; sent: number }

export interface ControllerConfig { lookaheadSec: number; tickMs: number; countInBeats: number }
const DEFAULTS: ControllerConfig = { lookaheadSec: 0.15, tickMs: 25, countInBeats: 4 }

/**
 * Runs a song. It never looks at the camera or at sound, only at:
 *   - the confirmed gesture (setGesture),
 *   - the song (what chord comes next, and which gesture means it),
 *   - a ChordRenderer (where chord events go) and a clock.
 *
 * Each chord plays for its full length. At the end the song continues without a gap only if the
 * right gesture for the next chord is already showing; otherwise it stops and waits.
 */
export class PerformanceController {
  private prog: ProgressionEntry[]
  private cfg: ControllerConfig
  private phase: Phase = 'idle'
  private index = 0
  private segs: Segment[] = []
  private gesture: GestureClass | null = null
  private guard: GestureClass | null = null
  private cancel: (() => void) | null = null
  private countInEnd = 0
  private decided = false
  private pendingWait: { at: number; index: number } | null = null
  private endingAt: number | null = null
  private lastKey = ''
  private lastPubAt = 0

  constructor(
    private song: Song,
    private renderer: ChordRenderer,
    private timer: Timer,
    private onState: (s: SessionState) => void,
    cfg: Partial<ControllerConfig> = {},
  ) {
    this.prog = deriveProgression(song)
    this.cfg = { ...DEFAULTS, ...cfg }
  }

  private get beatSec() { return 60 / this.song.tempo }
  private get stepsPerBeat() { return this.song.stepsPerBeat ?? 2 }

  start(fromIndex = 0) {
    this.halt()
    this.index = Math.min(Math.max(0, fromIndex), this.prog.length - 1)
    this.phase = 'count-in'
    const t0 = this.renderer.now() + 0.2
    for (let i = 0; i < this.cfg.countInBeats; i++) this.renderer.click(t0 + i * this.beatSec, i === 0)
    this.countInEnd = t0 + this.cfg.countInBeats * this.beatSec
    this.publish(true)
    this.cancel = this.timer(() => this.tick(), this.cfg.tickMs)
  }

  stop() {
    const wasRunning = this.phase !== 'idle'
    this.halt()
    if (wasRunning) this.renderer.mute(this.renderer.now())
    this.phase = 'idle'
    this.publish(true)
  }

  /** The currently confirmed gesture, or null when there isn't one. */
  setGesture(g: GestureClass | null) { this.gesture = g === 'UNKNOWN' ? null : g }

  private halt() {
    this.cancel?.(); this.cancel = null
    this.segs = []; this.decided = false; this.pendingWait = null; this.endingAt = null; this.guard = null
  }

  private correctFor(idx: number) {
    return validateGesture(this.song, this.prog[idx].chord, this.gesture).result === 'correct'
  }

  private begin(idx: number, start: number) {
    const entry = this.prog[idx]
    const voicing = getVoicing(entry.chord)
    const hits = strumSchedule(this.song.strummingPattern.steps, this.song.tempo, this.stepsPerBeat, entry.durationBeats)
      .map((h) => ({ time: start + h.offset, direction: h.direction, step: h.step }))
    this.segs.push({
      index: idx, start, end: start + entry.durationBeats * this.beatSec,
      notes: voicing ? voicingNotes(voicing) : [], hits, sent: 0,
    })
  }

  private enterWaiting(idx: number) {
    this.index = idx
    this.phase = 'waiting'
    this.guard = this.gesture
  }

  private tick() {
    const now = this.renderer.now()
    const horizon = now + this.cfg.lookaheadSec

    if (this.phase === 'count-in' && now >= this.countInEnd) this.enterWaiting(this.index)

    if (this.phase === 'waiting') {
      if (this.guard && this.gesture !== this.guard) this.guard = null
      if (this.correctFor(this.index)) {
        this.guard = null
        this.begin(this.index, now + 0.03)
        this.phase = 'playing'
      }
    }

    if (this.phase === 'playing') {
      while (this.segs.length > 1 && now >= this.segs[1].start) this.segs.shift()
      this.index = this.segs[0].index

      for (const seg of this.segs) {
        while (seg.sent < seg.hits.length && seg.hits[seg.sent].time <= horizon) {
          const h = seg.hits[seg.sent++]
          this.renderer.strum({ chord: this.prog[seg.index].chord, notes: seg.notes, direction: h.direction, time: h.time })
        }
      }

      const last = this.segs[this.segs.length - 1]
      if (!this.decided && horizon >= last.end) {
        this.decided = true
        const next = last.index + 1
        if (next >= this.prog.length) this.endingAt = last.end
        else if (this.correctFor(next)) { this.begin(next, last.end); this.decided = false }
        else this.pendingWait = { at: last.end, index: next }
      }
      if (this.pendingWait && now >= this.pendingWait.at) {
        const { at, index } = this.pendingWait
        this.pendingWait = null; this.decided = false; this.segs = []
        this.renderer.mute(at)
        this.enterWaiting(index)
      } else if (this.endingAt !== null && now >= this.endingAt) {
        this.phase = 'ended'; this.segs = []; this.endingAt = null
        this.cancel?.(); this.cancel = null
      }
    }

    this.publish(false, now)
  }

  private beatsBefore(idx: number) {
    return this.prog.slice(0, idx).reduce((n, p) => n + p.durationBeats, 0)
  }

  private publish(force: boolean, now = this.renderer.now()) {
    const seg = this.phase === 'playing' ? this.segs[0] : undefined
    let elapsedBeats = this.beatsBefore(this.index)
    let step: number | null = null
    if (this.phase === 'ended') elapsedBeats = this.beatsBefore(this.prog.length)
    if (seg) {
      const t = Math.max(0, now - seg.start)
      elapsedBeats += Math.min(t / this.beatSec, this.prog[seg.index].durationBeats)
      if (now >= seg.start) step = Math.floor(t / stepSeconds(this.song.tempo, this.stepsPerBeat)) % this.song.strummingPattern.steps.length
    }
    const countIn = this.phase === 'count-in'
      ? Math.min(this.cfg.countInBeats, Math.max(1, Math.ceil((this.countInEnd - now) / this.beatSec)))
      : null
    const state: SessionState = { phase: this.phase, index: this.index, countIn, elapsedBeats, step, guard: this.guard }
    const key = `${state.phase}|${state.index}|${countIn}|${step}|${state.guard}`
    if (force || key !== this.lastKey || (seg && now - this.lastPubAt > 0.2)) {
      this.lastKey = key; this.lastPubAt = now
      this.onState(state)
    }
  }
}
