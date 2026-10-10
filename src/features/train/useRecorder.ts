import { useCallback, useEffect, useRef, useState } from 'react'
import { FEATURE_SIZE, normalizeLandmarks } from '../gesture/normalize'
import { GESTURE_CLASSES, type GestureClass } from '../gesture/gestureTypes'
import type { TrackedHand } from '../vision/HandTracker'
import { addSamples, clearAll, clearLabel, countSamples, getAllSamples, type Counts, type Sample } from './db'
import { buildDataset, downloadJson } from './dataset'

const SAMPLE_EVERY_MS = 100
const MAX_PER_TAKE = 150
const COUNTDOWN_S = 3
const MIN_SCORE = 0.6

const emptyCounts = () =>
  Object.fromEntries(GESTURE_CLASSES.map((c) => [c, { total: 0, left: 0, right: 0, takes: 0 }])) as Counts

export type RecorderPhase = 'idle' | 'countdown' | 'recording'

export function useRecorder() {
  const [counts, setCounts] = useState<Counts>(emptyCounts)
  const [phase, setPhase] = useState<RecorderPhase>('idle')
  const [countdown, setCountdown] = useState(COUNTDOWN_S)
  const [takeCount, setTakeCount] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)

  const rec = useRef({ on: false, label: 'GESTURE_1' as GestureClass, take: '', buffer: [] as Sample[], n: 0, lastTs: 0, hint: '' })
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const refresh = useCallback(async () => {
    try { setCounts(countSamples(await getAllSamples())); setStorageError(null) }
    catch { setStorageError('Samples can’t be saved in this browser. Private browsing often blocks this. Try a normal window.') }
  }, [])
  useEffect(() => { void refresh(); return () => clearInterval(timer.current) }, [refresh])

  const flush = useCallback(async () => {
    const batch = rec.current.buffer.splice(0)
    if (!batch.length) return
    try { await addSamples(batch) } catch { setStorageError('Saving failed. Your last few samples were not stored.') }
  }, [])

  const stop = useCallback(async () => {
    rec.current.on = false
    clearInterval(timer.current)
    setPhase('idle'); setHint(null)
    await flush()
    await refresh()
  }, [flush, refresh])

  const start = useCallback((label: GestureClass) => {
    const r = rec.current
    r.label = label; r.take = `${label}-${Date.now()}`; r.n = 0; r.buffer = []; r.lastTs = 0
    setTakeCount(0); setCountdown(COUNTDOWN_S); setPhase('countdown')
    let left = COUNTDOWN_S
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      left -= 1
      if (left > 0) { setCountdown(left); return }
      clearInterval(timer.current)
      r.on = true
      setPhase('recording')
    }, 1000)
  }, [])

  /** Called from the camera loop on every frame, so it must stay cheap and avoid React state unless something changed. */
  const onHands = useCallback((hands: TrackedHand[], video: HTMLVideoElement) => {
    const r = rec.current
    if (!r.on) return
    const nextHint = hands.length === 0 ? 'No hand in view. Bring your hand back.'
      : hands.length > 1 ? 'Show exactly one hand.' : ''
    if (nextHint !== r.hint) { r.hint = nextHint; setHint(nextHint || null) }
    if (hands.length !== 1) return
    const now = performance.now()
    if (now - r.lastTs < SAMPLE_EVERY_MS) return
    const h = hands[0]
    if (h.score < MIN_SCORE) return
    r.lastTs = now
    const aspect = video.videoWidth / video.videoHeight
    const features = normalizeLandmarks(h.landmarks, h.hand, aspect)
    if (features.length !== FEATURE_SIZE || features.some((v) => !Number.isFinite(v))) return
    r.buffer.push({
      label: r.label, hand: h.hand, take: r.take, aspect,
      landmarks: h.landmarks.flatMap((p) => [p.x, p.y, p.z]), features,
    })
    r.n += 1
    setTakeCount(r.n)
    if (r.buffer.length >= 25) void flush()
    if (r.n >= MAX_PER_TAKE) void stop()
  }, [flush, stop])

  const exportData = useCallback(async () => {
    downloadJson('chordhand-dataset.json', buildDataset(await getAllSamples()))
  }, [])

  const removeLabel = useCallback(async (l: GestureClass) => { await clearLabel(l); await refresh() }, [refresh])
  const removeAll = useCallback(async () => { await clearAll(); await refresh() }, [refresh])

  return { counts, phase, countdown, takeCount, maxPerTake: MAX_PER_TAKE, hint, storageError, start, stop, onHands, exportData, removeLabel, removeAll }
}
