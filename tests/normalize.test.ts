import { describe, expect, it } from 'vitest'
import { normalizeLandmarks } from '../src/features/gesture/normalize'
import { OPEN_PALM } from '../src/components/HandMark'

const toLm = (pts: number[][], dx = 0, dy = 0, k = 1) =>
  pts.map(([x, y]) => ({ x: dx + (x / 100) * k, y: dy + (y / 100) * k, z: 0 }))
const hand = toLm(OPEN_PALM)

describe('normalizeLandmarks', () => {
  const base = normalizeLandmarks(hand, 'Right', 1)
  const close = (a: number[], b: number[], tol = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < tol)

  it('puts the wrist at the origin and the palm length at 1', () => {
    expect(base.slice(0, 3)).toEqual([0, 0, 0])
    expect(Math.hypot(base[27], base[28])).toBeCloseTo(1, 6) // landmark 9
  })
  it('points the middle knuckle straight up', () => {
    expect(base[27]).toBeCloseTo(0, 6)
    expect(base[28]).toBeCloseTo(-1, 6)
  })
  it('ignores position in the frame', () => {
    expect(close(base, normalizeLandmarks(toLm(OPEN_PALM, 0.3, -0.1), 'Right', 1))).toBe(true)
  })
  it('ignores distance from the camera (scale)', () => {
    expect(close(base, normalizeLandmarks(toLm(OPEN_PALM, 0.1, 0.1, 0.5), 'Right', 1))).toBe(true)
  })
  it('ignores in-plane rotation', () => {
    const a = 0.7
    const rotated = hand.map((p) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a), z: p.z }))
    expect(close(base, normalizeLandmarks(rotated, 'Right', 1), 1e-5)).toBe(true)
  })
  it('makes a mirrored left hand look like the right hand', () => {
    const mirrored = hand.map((p) => ({ ...p, x: 1 - p.x }))
    expect(close(base, normalizeLandmarks(mirrored, 'Left', 1), 1e-6)).toBe(true)
  })
  it('matches the Python port on a fixed example', () => {
    // Expected values produced by ml/train_gesture.py (prep + canon) for this exact input.
    const lm = OPEN_PALM.map(([x, y], i) => ({ x: x / 100, y: y / 100, z: (i % 5) * 0.01 }))
    const f = normalizeLandmarks(lm, 'Left', 4 / 3)
    expect(f.length).toBe(63)
    expect(f[3]).toBeCloseTo(PY_EXPECTED[0], 4)
    expect(f[4]).toBeCloseTo(PY_EXPECTED[1], 4)
    expect(f[59]).toBeCloseTo(PY_EXPECTED[2], 4)
  })
})

const PY_EXPECTED = [0.4666666667, -0.2, 0.1333333333]
