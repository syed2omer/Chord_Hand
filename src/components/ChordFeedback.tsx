import type { Feedback } from '../features/engine/feedback'
import type { ModelState } from '../features/gesture/useGestureRecognition'

interface Props {
  feedback: Feedback
  cameraOn: boolean
  model: ModelState
  modelError: string | null
  expected: string
  gestureLabel?: string
  nextGestureLabel?: string
}

const box = 'mt-4 rounded-xl border px-4 py-3'
const calm = `${box} border-cream/10 text-sm text-cream-dim`

export default function ChordFeedback({ feedback, cameraOn, model, modelError, expected, gestureLabel, nextGestureLabel }: Props) {
  switch (feedback.kind) {
    case 'idle': {
      const parts: string[] = []
      if (!cameraOn) parts.push('Turn on the camera to play with your hand, or use the keyboard keys shown below.')
      else if (model === 'missing') parts.push('No trained gesture model yet. Record gestures on the Train page and run ml/train_gesture.py. You can still play with the keyboard.')
      else if (model === 'loading') parts.push('Loading gesture model…')
      else parts.push(`Press Start session, then show ${gestureLabel ?? 'the gesture'} for ${expected}.`)
      return model === 'error'
        ? <div role="alert" className={`${box} border-err text-sm text-err`}>{modelError}</div>
        : <div role="status" className={calm}>{parts[0]}</div>
    }
    case 'count-in':
      return <div role="status" className={`${box} border-gold text-gold`}>Get ready. First chord {expected}. <span className="font-display text-3xl text-cream">{feedback.beats}</span></div>
    case 'show':
      return <div role="status" className={calm}>The song is paused. Show {gestureLabel ?? 'the gesture'} for {feedback.expected} to continue.</div>
    case 'steady':
      return <div role="status" className={calm}>Hold the gesture steady.</div>
    case 'release':
      return <div role="status" className={calm}>Change to {feedback.expected}{gestureLabel ? `: show ${gestureLabel}` : ''}.</div>
    case 'wrong':
      return (
        <div role="alert" className={`${box} border-err`}>
          <p className="text-err">Expected: <span className="font-display text-2xl text-cream">{feedback.expected}</span>
            {feedback.detected && <>  Detected: <span className="font-display text-2xl text-cream">{feedback.detected === 'MUTE' ? 'Mute' : feedback.detected}</span></>}
          </p>
          <p className="text-sm text-cream-dim">{feedback.message} The song stays paused.</p>
        </div>
      )
    case 'playing':
      return (
        <div role="status" className={`${box} border-ok`}>
          <p className="text-ok"><span aria-hidden="true">✓ </span>Playing {feedback.chord}</p>
          {feedback.next && <p className="text-sm text-cream-dim">Next: {feedback.next}{nextGestureLabel ? `, show ${nextGestureLabel}` : ''}</p>}
        </div>
      )
    case 'ended':
      return <div role="status" className={`${box} border-ok text-ok`}><span aria-hidden="true">✓ </span>That’s the end of the song. Nice work.</div>
  }
}
