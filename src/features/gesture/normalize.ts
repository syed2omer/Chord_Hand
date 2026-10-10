import type { Landmark } from '../vision/HandTracker'

/** Bump when the maths below changes; datasets and models record it. */
export const FEATURE_VERSION = 1
export const FEATURE_SIZE = 63

/**
 * Turns 21 raw landmarks into a hand-relative feature vector, so the model never sees
 * absolute pixel positions, hand size, distance or which hand it is.
 *
 *  1. correct for the video's aspect ratio (MediaPipe coordinates are 0..1 on each axis)
 *  2. move the wrist to the origin
 *  3. mirror left hands so left and right share one model
 *  4. rotate so wrist -> middle-finger knuckle points straight up
 *  5. divide by that distance (palm size)
 *
 * ml/train_gesture.py contains a port of this; it checks the two agree on every sample.
 */
export function normalizeLandmarks(lm: Landmark[], hand: 'Left' | 'Right', aspect: number): number[] {
  const wx = lm[0].x * aspect, wy = lm[0].y, wz = lm[0].z * aspect
  const rel = lm.map((p) => {
    const x = p.x * aspect - wx
    return [hand === 'Left' ? -x : x, p.y - wy, p.z * aspect - wz]
  })
  const [mx, my] = rel[9]
  const scale = Math.max(Math.hypot(mx, my), 1e-6)
  const d = -Math.PI / 2 - Math.atan2(my, mx)
  const c = Math.cos(d), s = Math.sin(d)
  const out: number[] = []
  for (const [x, y, z] of rel) out.push((x * c - y * s) / scale, (x * s + y * c) / scale, z / scale)
  return out
}
