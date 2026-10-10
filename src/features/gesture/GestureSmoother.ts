import type { GestureClass } from './gestureTypes'
import type { Prediction } from './GestureClassifier'

export type SmootherStatus =
  | 'none' // no usable hand
  | 'unsure' // hand present but no clear gesture
  | 'detecting' // a gesture is showing but hasn't been held long enough
  | 'confirmed' // held steadily with enough confidence

export interface SmootherState {
  status: SmootherStatus
  gesture: GestureClass | null
  confidence: number
  heldMs: number
}

export interface SmootherConfig {
  windowSize: number // frames voted over
  minFrames: number // frames needed before any decision
  minConfidence: number // average confidence of the winning label
  minShare: number // fraction of the window that must agree
  holdMs: number // how long a gesture must stay stable
}

export const DEFAULT_SMOOTHER: SmootherConfig = { windowSize: 8, minFrames: 4, minConfidence: 0.8, minShare: 0.75, holdMs: 350 }
export const NO_HAND: SmootherState = { status: 'none', gesture: null, confidence: 0, heldMs: 0 }

/** Turns noisy per-frame predictions into a steady, confirmed gesture. Time is passed in so it is testable. */
export class GestureSmoother {
  private buf: Prediction[] = []
  private candidate: GestureClass | null = null
  private since = 0

  constructor(private cfg: SmootherConfig = DEFAULT_SMOOTHER) {}

  reset() { this.buf = []; this.candidate = null }

  push(pred: Prediction | null, now: number): SmootherState {
    if (!pred) { this.reset(); return NO_HAND }
    const { windowSize, minFrames, minConfidence, minShare, holdMs } = this.cfg
    this.buf.push(pred)
    if (this.buf.length > windowSize) this.buf.shift()
    if (this.buf.length < minFrames) return { status: 'unsure', gesture: null, confidence: 0, heldMs: 0 }

    const votes = new Map<GestureClass, { n: number; conf: number }>()
    for (const p of this.buf) {
      const v = votes.get(p.label) ?? { n: 0, conf: 0 }
      votes.set(p.label, { n: v.n + 1, conf: v.conf + p.confidence })
    }
    let top: GestureClass = this.buf[0].label
    for (const [label, v] of votes) if (v.n > votes.get(top)!.n) top = label
    const { n, conf } = votes.get(top)!
    const avg = conf / n

    if (top === 'UNKNOWN' || n / this.buf.length < minShare || avg < minConfidence) {
      this.candidate = null
      return { status: 'unsure', gesture: top === 'UNKNOWN' ? null : top, confidence: avg, heldMs: 0 }
    }
    if (this.candidate !== top) { this.candidate = top; this.since = now }
    const heldMs = now - this.since
    return { status: heldMs >= holdMs ? 'confirmed' : 'detecting', gesture: top, confidence: avg, heldMs }
  }
}
