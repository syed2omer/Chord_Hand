import type { Landmark } from './HandTracker'
import { HAND_CONNECTIONS } from '../../components/HandMark'

const FINGERTIPS = [4, 8, 12, 16, 20]

/** Draws one hand skeleton. The canvas is sized to the video frame, so coordinates scale directly. */
export function drawHand(ctx: CanvasRenderingContext2D, lm: Landmark[], w: number, h: number) {
  const gold = '#e0b04f'
  const unit = Math.max(w, h) / 640
  ctx.lineCap = 'round'
  ctx.strokeStyle = gold
  ctx.lineWidth = 3 * unit
  ctx.beginPath()
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.moveTo(lm[a].x * w, lm[a].y * h)
    ctx.lineTo(lm[b].x * w, lm[b].y * h)
  }
  ctx.stroke()
  ctx.fillStyle = gold
  lm.forEach((p, i) => {
    ctx.beginPath()
    ctx.arc(p.x * w, p.y * h, (FINGERTIPS.includes(i) ? 6 : 4) * unit, 0, Math.PI * 2)
    ctx.fill()
  })
}
