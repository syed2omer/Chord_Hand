import { motion } from 'framer-motion'

/** An open palm in a 100x100 box, in MediaPipe's 21-landmark order. */
export const OPEN_PALM: [number, number][] = [
  [50, 92], [36, 84], [26, 72], [19, 60], [13, 49],
  [38, 56], [35, 40], [33, 29], [32, 19],
  [50, 52], [50, 35], [50, 23], [50, 12],
  [62, 56], [65, 41], [67, 31], [68, 22],
  [73, 64], [79, 53], [82, 45], [85, 37],
]

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

const FINGERTIPS = new Set([4, 8, 12, 16, 20])

export default function HandMark({ animate = false, className = '' }: { animate?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Hand with 21 tracked landmarks" fill="none">
      {HAND_CONNECTIONS.map(([a, b], i) => (
        <motion.line
          key={`${a}-${b}`}
          x1={OPEN_PALM[a][0]} y1={OPEN_PALM[a][1]}
          x2={OPEN_PALM[b][0]} y2={OPEN_PALM[b][1]}
          stroke="var(--color-gold)" strokeWidth={1.1} strokeLinecap="round"
          initial={animate ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: animate ? 0.15 + i * 0.05 : 0 }}
        />
      ))}
      {OPEN_PALM.map(([x, y], i) => (
        <motion.circle
          key={i} cx={x} cy={y} r={FINGERTIPS.has(i) ? 1.9 : 1.3}
          fill="var(--color-gold)"
          initial={animate ? { opacity: 0, scale: 0 } : false}
          animate={{ opacity: 1, scale: 1 }}
          style={{ transformOrigin: `${x}px ${y}px` }}
          transition={{ duration: 0.3, delay: animate ? 0.6 + i * 0.03 : 0 }}
        />
      ))}
    </svg>
  )
}
