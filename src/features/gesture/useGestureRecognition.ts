import { useCallback, useEffect, useRef, useState } from 'react'
import type { TrackedHand } from '../vision/HandTracker'
import { GestureClassifier, ModelInvalidError, ModelMissingError } from './GestureClassifier'
import { GestureSmoother, NO_HAND, type SmootherState } from './GestureSmoother'
import { normalizeLandmarks } from './normalize'

export type ModelState = 'loading' | 'ready' | 'missing' | 'error'

const MODEL_URL = `${import.meta.env.BASE_URL}models/gesture/model.json`

/** Wires camera frames to the classifier and smoother. React only hears about meaningful changes. */
export function useGestureRecognition() {
  const [model, setModel] = useState<ModelState>('loading')
  const [reading, setReading] = useState<SmootherState>(NO_HAND)
  const [modelError, setModelError] = useState<string | null>(null)
  const classifier = useRef<GestureClassifier | null>(null)
  const smoother = useRef(new GestureSmoother())
  const shown = useRef({ key: '', at: 0 })

  useEffect(() => {
    let alive = true
    GestureClassifier.load(MODEL_URL)
      .then((c) => { if (alive) { classifier.current = c; setModel('ready') } })
      .catch((e) => {
        if (!alive) return
        if (e instanceof ModelMissingError) setModel('missing')
        else { setModel('error'); setModelError(e instanceof ModelInvalidError ? e.message : 'The model file could not be loaded.') }
      })
    return () => { alive = false }
  }, [])

  const reset = useCallback(() => {
    smoother.current.reset()
    shown.current = { key: '', at: 0 }
    setReading(NO_HAND)
  }, [])

  const onHands = useCallback((hands: TrackedHand[], video: HTMLVideoElement) => {
    const clf = classifier.current
    if (!clf) return
    const now = performance.now()
    // Only one hand drives the chords. Two hands means "unclear", not "pick one".
    const pred = hands.length === 1
      ? clf.predict(normalizeLandmarks(hands[0].landmarks, hands[0].hand, video.videoWidth / video.videoHeight))
      : null
    const st = smoother.current.push(pred, now)
    const key = `${st.status}|${st.gesture}|${Math.round(st.confidence * 20)}`
    if (key !== shown.current.key && now - shown.current.at > 100) {
      shown.current = { key, at: now }
      setReading(st)
    }
  }, [])

  return { model, modelError, reading, onHands, reset }
}
