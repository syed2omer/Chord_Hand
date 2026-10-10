import type { SmootherState } from '../features/gesture/GestureSmoother'
import { GESTURE_LABEL, type GestureId } from '../features/songs/schema'

const STATUS: Record<SmootherState['status'], string> = {
  none: '',
  unsure: 'Hold the gesture steady',
  detecting: 'Hold it…',
  confirmed: 'Confirmed',
}

/** Small readout that stays clear of the hand. */
export default function GestureIndicator({ reading }: { reading: SmootherState }) {
  if (reading.status === 'none') return null
  const name = reading.gesture ? GESTURE_LABEL[reading.gesture as GestureId] : 'Unknown gesture'
  return (
    <div className="rounded-xl bg-teal-deep/85 px-3 py-2 text-sm leading-snug">
      <p className="font-medium">{name}</p>
      <p className="text-cream-dim">{reading.gesture ? `Confidence ${Math.round(reading.confidence * 100)}%` : ' '}</p>
      <p className={reading.status === 'confirmed' ? 'text-ok' : 'text-cream-dim'}>
        {reading.status === 'confirmed' && <span aria-hidden="true">✓ </span>}{STATUS[reading.status]}
      </p>
    </div>
  )
}
