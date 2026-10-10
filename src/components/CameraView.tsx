import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HandTracker, type TrackedHand } from '../features/vision/HandTracker'
import { drawHand } from '../features/vision/landmarkDraw'
import { useCamera } from '../features/vision/useCamera'
import HandMark from './HandMark'

type ModelState = 'idle' | 'loading' | 'ready' | 'error'
interface HandStatus { count: number; hand?: 'Left' | 'Right' }

interface Props {
  onHands?: (hands: TrackedHand[], video: HTMLVideoElement) => void
  /** Called when tracking stops (camera off), so listeners can clear stale readings. */
  onTrackingStop?: () => void
  /** Shown bottom-left while the camera is on. */
  overlay?: ReactNode
  /** Tells the page whether the camera is currently on. */
  onActiveChange?: (active: boolean) => void
}

export default function CameraView({ onHands, onTrackingStop, overlay, onActiveChange }: Props) {
  const { videoRef, status, error, start, stop } = useCamera()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [model, setModel] = useState<ModelState>('idle')
  const [hands, setHands] = useState<HandStatus>({ count: 0 })
  // A ref so changing the callback never restarts the camera loop.
  const onHandsRef = useRef(onHands)
  onHandsRef.current = onHands
  const onActiveRef = useRef(onActiveChange)
  onActiveRef.current = onActiveChange
  const onStopRef = useRef(onTrackingStop)
  onStopRef.current = onTrackingStop

  // The detection loop lives outside React state: it draws straight to the canvas
  // and only touches React when the hand status actually changes.
  useEffect(() => {
    if (status !== 'active') return
    let cancelled = false
    let raf = 0
    let tracker: HandTracker | null = null
    let last = ''

    setModel('loading')
    HandTracker.create()
      .then((t) => {
        if (cancelled) { t.close(); return }
        tracker = t
        setModel('ready')
        const loop = () => {
          const video = videoRef.current
          const canvas = canvasRef.current
          if (video && canvas && video.videoWidth) {
            if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight }
            const ctx = canvas.getContext('2d')!
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            const found = tracker!.detect(video)
            found.forEach((h) => drawHand(ctx, h.landmarks, canvas.width, canvas.height))
            onHandsRef.current?.(found, video)
            const key = `${found.length}:${found[0]?.hand ?? ''}`
            if (key !== last) { last = key; setHands({ count: found.length, hand: found[0]?.hand }) }
          }
          raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
      })
      .catch(() => { if (!cancelled) setModel('error') })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      tracker?.close()
      onStopRef.current?.()
      setHands({ count: 0 })
      setModel('idle')
    }
  }, [status, videoRef])

  const active = status === 'active'
  useEffect(() => { onActiveRef.current?.(active) }, [active])
  const pill = !active ? null
    : model === 'loading' ? 'Loading hand tracking…'
    : model === 'error' ? 'Hand tracking failed to load'
    : hands.count === 0 ? 'No hand detected'
    : hands.count > 1 ? 'Multiple hands detected. Use one hand.'
    : `Hand detected, ${hands.hand?.toLowerCase()} hand`

  return (
    <section aria-label="Camera" className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-cream/10 bg-teal-card">
      {/* Mirrored so it behaves like a mirror; the canvas shares the same transform so the skeleton lines up. */}
      <video ref={videoRef} playsInline muted className={`absolute inset-0 h-full w-full -scale-x-100 object-cover ${active ? '' : 'invisible'}`} />
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />

      {!active && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <HandMark className="absolute h-3/4 opacity-15" />
          <div className="relative max-w-sm">
            {status === 'error' && error ? (
              <p role="alert" className="mb-4 text-err">{error.message}</p>
            ) : (
              <p className="mb-4 text-cream-dim">Your video stays on this device. Nothing is uploaded.</p>
            )}
            <button onClick={start} disabled={status === 'starting'}
              className="rounded-full bg-gold px-7 py-3 font-medium text-fret hover:brightness-110 disabled:opacity-60">
              {status === 'starting' ? 'Starting camera…' : status === 'error' ? 'Try again' : 'Start camera'}
            </button>
          </div>
        </div>
      )}

      {active && pill && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-4 text-sm">
          <span role="status" className="inline-flex items-center gap-2 rounded-full bg-teal-deep/80 px-3 py-1.5">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${hands.count === 1 && model === 'ready' ? 'bg-ok' : 'bg-cream-dim'}`} />
            {pill}
          </span>
          <button onClick={stop} className="rounded-full bg-teal-deep/80 px-3 py-1.5 hover:bg-teal-raised">Stop camera</button>
        </div>
      )}
      {active && overlay && <div className="pointer-events-none absolute bottom-4 left-4">{overlay}</div>}
      {active && model === 'error' && (
        <p role="alert" className="absolute inset-x-0 bottom-0 bg-teal-deep/90 p-4 text-sm text-err">
          The hand tracking model couldn’t load. Check your internet connection, then press Stop camera and Start camera again.
        </p>
      )}
    </section>
  )
}
