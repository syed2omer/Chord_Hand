import { describe, expect, it } from 'vitest'
import { GestureClassifier, ModelInvalidError, type MlpModel } from '../src/features/gesture/GestureClassifier'
import { GestureSmoother, type SmootherConfig } from '../src/features/gesture/GestureSmoother'
import { GESTURE_CLASSES, type GestureClass } from '../src/features/gesture/gestureTypes'
import { validateGesture } from '../src/features/engine/ChordValidator'
import { SAMPLE_SONGS } from '../src/features/songs/sampleSongs'

const pred = (label: GestureClass, confidence = 0.95) => ({ label, confidence, probs: [] })
const cfg: SmootherConfig = { windowSize: 6, minFrames: 3, minConfidence: 0.8, minShare: 0.75, holdMs: 300 }

/** Feed one prediction every 33 ms starting at t0; returns the last state. */
function feed(s: GestureSmoother, labels: (GestureClass | null)[], t0 = 0, conf = 0.95) {
  let st = s.push(null, t0)
  labels.forEach((l, i) => { st = s.push(l ? pred(l, conf) : null, t0 + i * 33) })
  return st
}

describe('GestureSmoother', () => {
  it('confirms a gesture only after it is held long enough', () => {
    const s = new GestureSmoother(cfg)
    expect(feed(s, Array(5).fill('GESTURE_1')).status).toBe('detecting')
    const s2 = new GestureSmoother(cfg)
    const st = feed(s2, Array(14).fill('GESTURE_1'))
    expect(st.status).toBe('confirmed')
    expect(st.gesture).toBe('GESTURE_1')
  })
  it('ignores a single-frame flicker', () => {
    const s = new GestureSmoother(cfg)
    const st = feed(s, [...Array(12).fill('GESTURE_2'), 'GESTURE_4', ...Array(3).fill('GESTURE_2')])
    expect(st.gesture).toBe('GESTURE_2')
    expect(st.status).toBe('confirmed')
  })
  it('does not confirm on low confidence', () => {
    const s = new GestureSmoother(cfg)
    const st = feed(s, Array(20).fill('GESTURE_3'), 0, 0.6)
    expect(st.status).toBe('unsure')
  })
  it('treats UNKNOWN as unsure, never confirmed', () => {
    const s = new GestureSmoother(cfg)
    const st = feed(s, Array(20).fill('UNKNOWN'))
    expect(st.status).toBe('unsure')
    expect(st.gesture).toBeNull()
  })
  it('does not confirm when predictions keep disagreeing', () => {
    const s = new GestureSmoother(cfg)
    const st = feed(s, ['GESTURE_1', 'GESTURE_2', 'GESTURE_1', 'GESTURE_2', 'GESTURE_1', 'GESTURE_2', 'GESTURE_1', 'GESTURE_2'])
    expect(st.status).not.toBe('confirmed')
  })
  it('resets when the hand disappears', () => {
    const s = new GestureSmoother(cfg)
    feed(s, Array(14).fill('GESTURE_1'))
    expect(s.push(null, 1000).status).toBe('none')
    expect(s.push(pred('GESTURE_1'), 1033).status).not.toBe('confirmed')
  })
  it('restarts the hold timer when the gesture changes', () => {
    const s = new GestureSmoother(cfg)
    feed(s, Array(14).fill('GESTURE_1'))
    const st = feed(s, Array(8).fill('GESTURE_2'), 1000)
    expect(st.gesture).toBe('GESTURE_2')
    expect(st.heldMs).toBeLessThan(300)
  })
})

describe('ChordValidator', () => {
  const [grace, saints] = SAMPLE_SONGS
  it('accepts the gesture that means the expected chord in this song', () => {
    expect(validateGesture(grace, 'G', 'GESTURE_1').result).toBe('correct')
    expect(validateGesture(saints, 'C', 'GESTURE_1').result).toBe('correct')
  })
  it('rejects the same gesture when the song maps it to a different chord', () => {
    const v = validateGesture(saints, 'F', 'GESTURE_1')
    expect(v).toMatchObject({ result: 'wrong', expected: 'F', detected: 'C', message: 'Try F again.' })
  })
  it('reports a gesture the song does not use', () => {
    const v = validateGesture(saints, 'C', 'GESTURE_5')
    expect(v.result).toBe('wrong')
    expect(v).not.toHaveProperty('detected')
  })
  it('does nothing for no gesture or UNKNOWN', () => {
    expect(validateGesture(saints, 'C', null).result).toBe('none')
    expect(validateGesture(saints, 'C', 'UNKNOWN').result).toBe('none')
  })
})

describe('GestureClassifier', () => {
  const W = Array.from({ length: 63 }, (_, i) => GESTURE_CLASSES.map((_, k) => (i === 0 && k === 3 ? 10 : 0)))
  const model: MlpModel = {
    format: 'chordhand-mlp-v1', featureVersion: 1, inputSize: 63, classes: GESTURE_CLASSES,
    layers: [{ activation: 'softmax', W, b: Array(8).fill(0) }],
  }
  it('runs a forward pass and returns the most likely class', () => {
    const c = GestureClassifier.fromModel(model)
    const p = c.predict([1, ...Array(62).fill(0)])
    expect(p.label).toBe('GESTURE_3')
    expect(p.confidence).toBeGreaterThan(0.99)
    expect(p.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
  })
  it('rejects a model with the wrong classes or shapes', () => {
    expect(() => GestureClassifier.fromModel({ ...model, classes: ['A'] })).toThrow(ModelInvalidError)
    expect(() => GestureClassifier.fromModel({ ...model, layers: [{ ...model.layers[0], b: [0] }] })).toThrow(ModelInvalidError)
  })
})
