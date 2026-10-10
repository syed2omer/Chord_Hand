import type { Phase } from '../features/engine/PerformanceController'

interface Props {
  phase: Phase
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  onStart: () => void
  onStop: () => void
  tempo: number
  timeSignature: string
  startChord: string
}

const btn = 'rounded-full px-4 py-2 text-sm font-medium border border-cream/20 hover:bg-teal-raised disabled:opacity-40 disabled:hover:bg-transparent'

export default function MusicControls({ phase, canPrev, canNext, onPrev, onNext, onStart, onStop, tempo, timeSignature, startChord }: Props) {
  const running = phase === 'count-in' || phase === 'waiting' || phase === 'playing'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-cream-dim">{tempo} BPM, {timeSignature}</p>
      <div className="flex items-center gap-2">
        <button className={btn} onClick={onPrev} disabled={running || !canPrev}>Earlier chord</button>
        {running ? (
          <button onClick={onStop} className="rounded-full bg-err px-6 py-2.5 font-medium text-teal-deep hover:brightness-110">Stop</button>
        ) : (
          <button onClick={onStart} className="rounded-full bg-gold px-6 py-2.5 font-medium text-fret hover:brightness-110">
            {phase === 'ended' ? 'Play again' : `Start session at ${startChord}`}
          </button>
        )}
        <button className={btn} onClick={onNext} disabled={running || !canNext}>Later chord</button>
      </div>
      <p className="basis-full text-xs text-cream-dim">
        No camera or model? Hold a key as your gesture: 1 to 5 for fingers, 0 for a fist, T for a thumb. The song plays only while the right gesture is shown at each chord change.
      </p>
    </div>
  )
}
